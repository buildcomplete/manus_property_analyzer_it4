# /home/ubuntu/property_analyzer/backend/src/services/calculation_service.py

"""Core calculation logic for property investment analysis."""

import datetime
import numpy as np # For standard deviation calculations
import math # Needed for interest calculation

# --- Default Assumptions (Placeholders - Fetch from config/db or past_knowledge later) ---

DEFAULT_RATES = {
    "spain": {
        "barcelona": {
            "purchase_tax_itp_new": 0.10, # ITP/AJD for new properties (example)
            "purchase_tax_itp_resale": 0.10, # ITP for resale (example, varies by region)
            "purchase_tax_vat_construction": 0.10, # IVA for new/under construction
            "purchase_tax_ajd_construction": 0.015, # AJD for new/under construction (varies by region)
            "purchase_notary_fee_rate": 0.005, # Example rate
            "purchase_registry_fee_rate": 0.004, # Example rate
            "purchase_agency_fee_rate": 0.03, # Example rate (often paid by seller, but can vary)
            "running_ibi_rate": 0.007, # Example IBI (property tax) rate based on cadastral value (needs input/estimation)
            "running_community_fee_monthly": 100, # Example
            "selling_agency_fee_rate": 0.05, # Example rate
            "selling_plusvalia_municipal": 1500, # Placeholder - complex calculation needed, depends on time held and cadastral value increase
            "capital_gains_tax_rate_spain": [ # Progressive rates (example)
                {"limit": 6000, "rate": 0.19},
                {"limit": 50000, "rate": 0.21},
                {"limit": 200000, "rate": 0.23},
                {"limit": float("inf"), "rate": 0.26}
            ],
            "beckham_law_tax_rate": 0.24, # Flat rate up to 600k EUR income
            "standard_income_tax_rate": 0.35, # Placeholder progressive rate
            "avg_appreciation_rate": 0.03,
            "appreciation_std_dev": 0.05,
            "renovation_rates": {
                "kitchen": 15000,
                "bathroom": 8000,
                "general": 500 # Per sqm
            }
        }
    },
    "denmark": {
        "copenhagen": {
            "purchase_tax_tinglysningsafgift_fixed": 1850, # DKK (as of recent data)
            "purchase_tax_tinglysningsafgift_variable": 0.006, # Rate on purchase price (for resale/existing)
            "purchase_tax_vat_construction": 0.25, # Moms (VAT) for new/under construction
            # Note: Tinglysningsafgift might still apply to land value or be different for projects - needs verification
            "purchase_stamp_duty_loan": 0.0145, # Rate on loan principal + fixed fee
            "purchase_stamp_duty_loan_fixed": 1825, # DKK
            "purchase_lawyer_fee": 15000, # Example DKK
            "purchase_agency_fee_rate": 0.01, # Example rate (can vary)
            "running_property_tax_ejendomsskat": 0.0092, # Example rate (Grundskyld) - based on land value (needs input/estimation)
            "running_property_value_tax_ejendomsværdiskat": 0.0051, # Example rate (up to threshold) - based on property value (needs input/estimation)
            "running_community_fee_monthly": 1500, # DKK Example (Ejerforening/Andelsforening)
            "selling_agency_fee_rate": 0.02, # Example rate
            "capital_gains_tax_rate_denmark": 0.42, # Example max rate, complex rules, often 0 for primary residence after time
            "standard_income_tax_rate": 0.45, # Placeholder progressive rate
            "avg_appreciation_rate": 0.04,
            "appreciation_std_dev": 0.06,
            "renovation_rates": {
                "kitchen": 100000, # DKK
                "bathroom": 60000, # DKK
                "general": 3000 # DKK Per sqm
            }
        }
    }
}

# --- Helper Functions ---

def get_rate(country, city, key, subkey=None):
    """Safely retrieve a rate from the defaults."""
    try:
        data = DEFAULT_RATES[country][city]
        if subkey:
            value = data[key][subkey]
        else:
            value = data[key]
        
        # Return copies for mutable types to avoid accidental modification
        if isinstance(value, list):
            return list(value)
        elif isinstance(value, dict):
            return dict(value)
        else:
            return value
            
    except KeyError:
        subkey_str = f" / {subkey}" if subkey else ""
        print(f"Warning: Rate not found for {country}/{city}/{key}{subkey_str}")
        if key == "capital_gains_tax_rate_spain": return []
        if key == "renovation_rates": return {}
        return 0

def calculate_progressive_tax(amount, rates_table):
    """Calculates tax based on a progressive rate table."""
    if not rates_table or amount <= 0:
        return 0
    tax = 0
    last_limit = 0
    for tier in rates_table:
        limit = tier["limit"]
        rate = tier["rate"]
        taxable_in_tier = max(0, min(amount, limit) - last_limit)
        tax += taxable_in_tier * rate
        if amount <= limit:
            break
        last_limit = limit
    return tax

def calculate_future_value(present_value, rate, years):
    """Calculates future value using compound growth."""
    return present_value * ((1 + rate) ** years)

def calculate_total_interest_paid(principal, annual_rate, term_years, holding_years):
    """Calculates the total interest paid on a loan over a specific holding period."""
    if annual_rate <= 0 or term_years <= 0 or principal <= 0 or holding_years <= 0:
        return 0
    monthly_rate = annual_rate / 12
    num_payments_total = term_years * 12
    # Ensure holding period doesn't exceed loan term for calculation
    num_payments_holding = min(holding_years * 12, num_payments_total)

    if monthly_rate == 0: # No interest paid if rate is 0
        return 0

    # Calculate monthly payment using the standard formula
    # M = P [ i(1 + i)^n ] / [ (1 + i)^n – 1]
    try:
        denominator = math.pow(1 + monthly_rate, num_payments_total) - 1
        if denominator == 0: # Avoid division by zero if rate and term lead to this edge case
            return 0 
        monthly_payment = principal * (monthly_rate * math.pow(1 + monthly_rate, num_payments_total)) / denominator
    except (OverflowError, ValueError): 
         print(f"Warning: Math error calculating monthly payment for P={principal}, i={monthly_rate}, n={num_payments_total}")
         return 0 # Indicate failure to calculate

    total_paid_holding = monthly_payment * num_payments_holding
    
    # Calculate remaining balance after holding period
    # B = P (1 + i)^k - M [ ((1 + i)^k - 1) / i ] where k = num_payments_holding
    try:
        remaining_balance = principal * math.pow(1 + monthly_rate, num_payments_holding) - monthly_payment * ((math.pow(1 + monthly_rate, num_payments_holding) - 1) / monthly_rate)
    except (OverflowError, ValueError):
        print(f"Warning: Math error calculating remaining balance for P={principal}, i={monthly_rate}, k={num_payments_holding}")
        return 0 # Indicate failure to calculate

    principal_paid_holding = principal - remaining_balance
    interest_paid_holding = total_paid_holding - principal_paid_holding
    
    # Return the calculated interest, ensuring it's not negative due to float precision
    return max(0, interest_paid_holding)

# --- Calculation Functions --- 

def calculate_purchase_costs(inputs, country, city):
    """Calculates initial purchase costs, considering payment schedules for under construction."""
    costs = {"total_investment_cost": 0, "initial_outlay_year0": 0, "breakdown": {}}
    price = inputs.get("new_flat_price", 0)
    prop_type = inputs.get("property_type", "new")
    payment_schedule = inputs.get("payment_schedule", [])
    loan_details = inputs.get("loan_details", {})
    loan_amount = loan_details.get("amount", price * 0.8) # Use default LTV if not provided
    if price <= 0: return costs
    
    costs["breakdown"]["property_price"] = price
    costs["total_investment_cost"] += price
    
    initial_payment_fraction = 1.0
    if prop_type == "under_construction" and payment_schedule:
        initial_payment_fraction = sum(p.get("percentage", 0) for p in payment_schedule if p.get("due_year", -1) == 0)
    elif prop_type == "under_construction":
        initial_payment_fraction = 0.10
        costs["breakdown"]["warning_no_payment_schedule"] = "Assumed 10% initial payment."
        
    initial_property_payment = price * initial_payment_fraction
    costs["initial_outlay_year0"] += initial_property_payment
    costs["breakdown"]["initial_property_payment_year0"] = initial_property_payment

    purchase_tax_total = 0
    ajd_tax_total = 0
    notary_fee_total = 0
    registry_fee_total = 0
    loan_stamp_duty_total = 0
    lawyer_fee_total = 0

    if country == "spain":
        if prop_type == "under_construction" or prop_type == "new":
            purchase_tax_vat = price * get_rate(country, city, "purchase_tax_vat_construction")
            costs["breakdown"]["purchase_tax_vat"] = purchase_tax_vat
            purchase_tax_total += purchase_tax_vat
            ajd_tax = price * get_rate(country, city, "purchase_tax_ajd_construction")
            costs["breakdown"]["purchase_tax_ajd"] = ajd_tax
            ajd_tax_total += ajd_tax
        elif prop_type == "second_hand": # Changed from renovation_needed
            purchase_tax_itp = price * get_rate(country, city, "purchase_tax_itp_resale")
            costs["breakdown"]["purchase_tax_itp"] = purchase_tax_itp
            purchase_tax_total += purchase_tax_itp
        
        notary_fee = price * get_rate(country, city, "purchase_notary_fee_rate")
        costs["breakdown"]["notary_fee"] = notary_fee
        notary_fee_total += notary_fee
        registry_fee = price * get_rate(country, city, "purchase_registry_fee_rate")
        costs["breakdown"]["registry_fee"] = registry_fee
        registry_fee_total += registry_fee
        
    elif country == "denmark":
        if prop_type == "under_construction" or prop_type == "new": 
            purchase_tax_vat = price * get_rate(country, city, "purchase_tax_vat_construction")
            costs["breakdown"]["purchase_tax_vat"] = purchase_tax_vat
            purchase_tax_total += purchase_tax_vat
        elif prop_type == "ejer" or prop_type == "andels":
            fixed_tax = get_rate(country, city, "purchase_tax_tinglysningsafgift_fixed")
            variable_tax = price * get_rate(country, city, "purchase_tax_tinglysningsafgift_variable")
            purchase_tax = fixed_tax + variable_tax
            costs["breakdown"]["purchase_tax_tinglysningsafgift"] = purchase_tax
            purchase_tax_total += purchase_tax

        loan_stamp_duty_fixed = get_rate(country, city, "purchase_stamp_duty_loan_fixed")
        loan_stamp_duty_variable = loan_amount * get_rate(country, city, "purchase_stamp_duty_loan")
        loan_stamp_duty = loan_stamp_duty_fixed + loan_stamp_duty_variable
        costs["breakdown"]["loan_stamp_duty"] = loan_stamp_duty
        loan_stamp_duty_total += loan_stamp_duty
        lawyer_fee = get_rate(country, city, "purchase_lawyer_fee")
        costs["breakdown"]["lawyer_fee"] = lawyer_fee
        lawyer_fee_total += lawyer_fee
        
    costs["total_investment_cost"] += (purchase_tax_total + ajd_tax_total + notary_fee_total + 
                                       registry_fee_total + loan_stamp_duty_total + lawyer_fee_total)
    costs["initial_outlay_year0"] += (purchase_tax_total + ajd_tax_total + notary_fee_total + 
                                      registry_fee_total + loan_stamp_duty_total + lawyer_fee_total)
    costs["breakdown"]["taxes_fees_year0"] = (purchase_tax_total + ajd_tax_total + notary_fee_total + 
                                               registry_fee_total + loan_stamp_duty_total + lawyer_fee_total)

    # Renovations are always possible, not just for second_hand (CR1.1)
    renovation_total = 0
    renovations = inputs.get("renovations", [])
    if renovations: # Only calculate if renovations are provided
        renovation_rates = get_rate(country, city, "renovation_rates")
        for reno in renovations:
            cost = reno.get("adjusted_cost")
            if cost is None:
                default_cost = renovation_rates.get(reno.get("type"))
                cost = default_cost if default_cost is not None else 0
            renovation_total += cost
            costs["breakdown"][f"renovation_{reno.get('type', 'custom')}"] = cost
        costs["breakdown"]["renovation_total"] = renovation_total
        costs["total_investment_cost"] += renovation_total
        costs["initial_outlay_year0"] += renovation_total # Assume renovations happen at year 0

    if prop_type == "under_construction" and payment_schedule:
        costs["breakdown"]["payment_schedule"] = payment_schedule
        remaining_payment_fraction = 1.0 - initial_payment_fraction
        costs["breakdown"]["remaining_payments_value"] = price * remaining_payment_fraction

    costs["breakdown"]["total_investment_cost"] = costs["total_investment_cost"]
    costs["breakdown"]["initial_outlay_year0"] = costs["initial_outlay_year0"]

    return costs

def calculate_running_costs(inputs, country, city, years):
    """Calculates total running costs over the holding period (excluding loan interest)."""
    costs = {"total": 0, "breakdown_annual": {}, "breakdown_total": {}}
    price = inputs.get("new_flat_price", 0)
    prop_type = inputs.get("property_type", "new")
    completion_years = inputs.get("construction_completion_years", 0) if prop_type == "under_construction" else 0
    effective_years = max(0, years - completion_years)
    if price <= 0 or effective_years <= 0: return costs
    
    annual_total = 0
    if country == "spain":
        cadastral_value_proxy = price * 0.5 # USER INPUT NEEDED
        ibi_annual = cadastral_value_proxy * get_rate(country, city, "running_ibi_rate")
        costs["breakdown_annual"]["property_tax_ibi"] = ibi_annual
        annual_total += ibi_annual
        community_fee_monthly = get_rate(country, city, "running_community_fee_monthly")
        community_fee_annual = community_fee_monthly * 12
        costs["breakdown_annual"]["community_fees"] = community_fee_annual
        annual_total += community_fee_annual
    elif country == "denmark":
        land_value_proxy = price * 0.3 # USER INPUT NEEDED
        ejendomsskat_annual = land_value_proxy * get_rate(country, city, "running_property_tax_ejendomsskat")
        costs["breakdown_annual"]["property_tax_ejendomsskat"] = ejendomsskat_annual
        annual_total += ejendomsskat_annual
        property_value_proxy = price # USER INPUT NEEDED
        ejendomsværdiskat_annual = property_value_proxy * get_rate(country, city, "running_property_value_tax_ejendomsværdiskat")
        costs["breakdown_annual"]["property_value_tax_ejendomsværdiskat"] = ejendomsværdiskat_annual
        annual_total += ejendomsværdiskat_annual
        community_fee_monthly = get_rate(country, city, "running_community_fee_monthly")
        community_fee_annual = community_fee_monthly * 12
        costs["breakdown_annual"]["community_fees"] = community_fee_annual
        annual_total += community_fee_annual

    costs["breakdown_annual"]["total_annual_running_costs"] = annual_total
    costs["total"] = annual_total * effective_years
    for key, value in costs["breakdown_annual"].items():
        costs["breakdown_total"][key + "_total"] = value * effective_years
    return costs

def calculate_selling_costs(country, city, selling_price, purchase_price, purchase_costs_investment_total, years_held, beckham_law_active=False):
    """Calculates costs associated with selling the property."""
    costs = {"total": 0, "breakdown": {}}
    if selling_price <= 0 or purchase_price <= 0: return costs
    
    agency_fee = selling_price * get_rate(country, city, "selling_agency_fee_rate")
    costs["breakdown"]["selling_agency_fee"] = agency_fee
    costs["total"] += agency_fee

    capital_gain = selling_price - purchase_costs_investment_total
    costs["breakdown"]["capital_gain"] = capital_gain
    
    # Capital gains tax calculation
    capital_gains_tax = 0
    
    # For Denmark, capital gains tax is 0 when tax resident in Denmark
    if country == "denmark":
        # No capital gains tax for Danish properties when tax resident in Denmark
        costs["breakdown"]["capital_gains_tax_note"] = "No capital gains tax applied (assumes tax residence in Denmark)"
        capital_gains_tax = 0
    elif country == "spain":
        if beckham_law_active:
            # Beckham law flat rate on capital gains
            beckham_rate = get_rate(country, city, "beckham_law_tax_rate")
            capital_gains_tax = capital_gain * beckham_rate if capital_gain > 0 else 0
            costs["breakdown"]["capital_gains_tax_beckham"] = capital_gains_tax
        else:
            # Standard progressive capital gains tax
            rates_table = get_rate(country, city, "capital_gains_tax_rate_spain")
            capital_gains_tax = calculate_progressive_tax(capital_gain, rates_table) if capital_gain > 0 else 0
            costs["breakdown"]["capital_gains_tax_standard"] = capital_gains_tax
    
    costs["breakdown"]["capital_gains_tax"] = capital_gains_tax
    costs["total"] += capital_gains_tax
    
    if country == "spain":
        plusvalia_municipal = get_rate(country, city, "selling_plusvalia_municipal")
        costs["breakdown"]["plusvalia_municipal"] = plusvalia_municipal
        costs["total"] += plusvalia_municipal
    
    # Calculate costs_gains but don't return it prematurely
    costs_gains = max(0, selling_price - purchase_costs_investment_total)
    costs["breakdown"]["costs_gains"] = costs_gains
    
    return costs

def calculate_renting_scenario_cost(renting_inputs, years_to_sell):
    """Calculates the total cost of renting over the specified period."""
    if not renting_inputs:
        return {"error": "No renting scenario inputs provided"}
    
    try:
        # Extract inputs with defaults
        monthly_rent = float(renting_inputs.get("monthly_rent", 0))
        monthly_water = float(renting_inputs.get("monthly_water", 0))
        monthly_utilities = float(renting_inputs.get("monthly_utilities", 0))
        monthly_parking = float(renting_inputs.get("monthly_parking", 0))
        
        annual_rent_increment = float(renting_inputs.get("annual_rent_increment", 0))
        annual_water_increment = float(renting_inputs.get("annual_water_increment", 0))
        annual_utilities_increment = float(renting_inputs.get("annual_utilities_increment", 0))
        annual_parking_increment = float(renting_inputs.get("annual_parking_increment", 0))
        
        if monthly_rent <= 0:
            return {"error": "Monthly rent must be greater than 0"}
        
        if years_to_sell <= 0:
            return {"error": "Years to sell must be greater than 0"}
        
        # Calculate costs with annual increments
        total_rent = 0
        total_water = 0
        total_utilities = 0
        total_parking = 0
        
        # Calculate costs for each year with appropriate increments
        for year in range(years_to_sell):
            year_rent = monthly_rent * 12 * ((1 + annual_rent_increment) ** year)
            year_water = monthly_water * 12 * ((1 + annual_water_increment) ** year)
            year_utilities = monthly_utilities * 12 * ((1 + annual_utilities_increment) ** year)
            year_parking = monthly_parking * 12 * ((1 + annual_parking_increment) ** year)
            
            total_rent += year_rent
            total_water += year_water
            total_utilities += year_utilities
            total_parking += year_parking
        
        total_renting_cost = total_rent + total_water + total_utilities + total_parking
        
        # Prepare breakdown of costs
        breakdown_annual = {
            "monthly_rent": monthly_rent,
            "monthly_water": monthly_water,
            "monthly_utilities": monthly_utilities,
            "monthly_parking": monthly_parking,
            "annual_rent": monthly_rent * 12,
            "annual_water": monthly_water * 12,
            "annual_utilities": monthly_utilities * 12,
            "annual_parking": monthly_parking * 12,
            "annual_total": (monthly_rent + monthly_water + monthly_utilities + monthly_parking) * 12
        }
        
        breakdown_total = {
            "total_rent": total_rent,
            "total_water": total_water,
            "total_utilities": total_utilities,
            "total_parking": total_parking
        }
        
        return {
            "total_renting_cost": total_renting_cost,
            "breakdown_annual": breakdown_annual,
            "breakdown_total": breakdown_total,
            "years": years_to_sell
        }
        
    except (ValueError, TypeError) as e:
        return {"error": f"Error calculating renting costs: {str(e)}"}

def perform_calculation_for_scenario(calculation_input):
    """Main calculation function that orchestrates all sub-calculations for a scenario."""
    # Extract inputs
    personal_finance = calculation_input.get("personal_finance", {})
    scenario_settings = calculation_input.get("scenario_settings", {})
    country = calculation_input.get("country", "")
    city = calculation_input.get("city", "")
    inputs = calculation_input.get("inputs", {})
    
    # Validate essential inputs
    if not country or not city or not inputs:
        return {"error": "Missing required inputs (country, city, or property details)"}
    
    years_to_sell = scenario_settings.get("years_to_sell", 10)
    if years_to_sell <= 0:
        return {"error": "Years to sell must be greater than 0"}
    
    price = inputs.get("new_flat_price", 0)
    if price <= 0:
        return {"error": "Property price must be greater than 0"}
    
    # Calculate purchase costs
    purchase_costs = calculate_purchase_costs(inputs, country, city)
    
    # Calculate running costs over the holding period
    running_costs = calculate_running_costs(inputs, country, city, years_to_sell)
    
    # Calculate loan interest costs if applicable
    loan_details = inputs.get("loan_details", {})
    loan_interest_costs = 0
    if loan_details and loan_details.get("amount", 0) > 0:
        loan_amount = loan_details.get("amount", 0)
        interest_rate = loan_details.get("interest_rate", 0)
        term_years = loan_details.get("term_years", 30)
        
        loan_interest_costs = calculate_total_interest_paid(
            loan_amount, interest_rate, term_years, years_to_sell
        )
        loan_details["total_interest_paid"] = loan_interest_costs
    
    # Calculate property value at sale time under different scenarios
    avg_appreciation_rate = get_rate(country, city, "avg_appreciation_rate")
    std_dev = get_rate(country, city, "appreciation_std_dev")
    
    # Calculate selling values for different scenarios
    selling_values = {
        "zero_growth": price,  # No appreciation scenario
        "avg_growth": calculate_future_value(price, avg_appreciation_rate, years_to_sell),
        "low_risk": calculate_future_value(price, max(0, avg_appreciation_rate - std_dev), years_to_sell),
        "high_risk": calculate_future_value(price, avg_appreciation_rate + std_dev, years_to_sell)
    }
    
    # Store growth rates for frontend display
    growth_rates = {
        "zero_growth": 0,
        "avg_growth": avg_appreciation_rate,
        "low_risk": max(0, avg_appreciation_rate - std_dev),
        "high_risk": avg_appreciation_rate + std_dev
    }
    
    # Debug log to ensure growth rates are defined
    print(f"Growth rates for {country}/{city}: {growth_rates}")
    
    # Calculate selling costs and capital gains tax for each scenario
    selling_scenarios = {}
    beckham_law_active = inputs.get("beckham_law_active", False)
    
    # Import the detailed breakdown service
    from src.services.detailed_breakdown_service import create_detailed_breakdown
    
    # Create detailed breakdowns for each scenario
    detailed_breakdowns = {}
    
    for scenario_name, selling_price in selling_values.items():
        selling_costs = calculate_selling_costs(
            country, city, selling_price, price, 
            purchase_costs["total_investment_cost"], 
            years_to_sell, beckham_law_active
        )
        
        # Calculate win/loss (profit/loss)
        win_loss = selling_price - purchase_costs["total_investment_cost"] - running_costs["total"] - loan_interest_costs - selling_costs["total"]
        
        selling_scenarios[scenario_name] = {
            "selling_price": selling_price,
            "selling_costs": selling_costs,
            "win_loss_eur": win_loss
        }
        
        # Create detailed breakdown for this scenario
        detailed_breakdowns[scenario_name] = create_detailed_breakdown(
            purchase_costs=purchase_costs,
            running_costs=running_costs,
            selling_costs=selling_costs,
            loan_details=loan_details,
            years_to_sell=years_to_sell,
            price=price,
            selling_price=selling_price,
            win_loss=win_loss
        )
    
    # Prepare the final result
    result = {
        "purchase_costs": purchase_costs,
        "running_costs": running_costs,
        "loan_interest_costs": loan_interest_costs,
        "selling_scenarios": selling_scenarios,
        "overall_summary": {
            "win_loss_eur": selling_scenarios["avg_growth"]["win_loss_eur"]  # Default to average growth
        },
        "calculation_details": {
            "years_to_sell": years_to_sell,
            "warnings": []
        },
        "detailed_breakdowns": detailed_breakdowns,  # Add detailed breakdowns to the result
        "growth_rates": growth_rates  # Add growth rates for frontend display
    }
    
    return result
