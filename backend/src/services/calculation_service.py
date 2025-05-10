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

    capital_gain_base = selling_price - purchase_costs_investment_total 
    capital_gains_tax = 0
    if capital_gain_base > 0:
        if country == "spain":
            plusvalia = get_rate(country, city, "selling_plusvalia_municipal") # Placeholder
            costs["breakdown"]["selling_plusvalia_municipal"] = plusvalia
            costs["total"] += plusvalia
            
            if beckham_law_active:
                # Beckham law might have specific rules for capital gains - assuming standard rates for now
                cg_tax_rates = get_rate(country, city, "capital_gains_tax_rate_spain")
                capital_gains_tax = calculate_progressive_tax(capital_gain_base, cg_tax_rates)
            else:
                cg_tax_rates = get_rate(country, city, "capital_gains_tax_rate_spain")
                capital_gains_tax = calculate_progressive_tax(capital_gain_base, cg_tax_rates)
            costs["breakdown"]["capital_gains_tax_spain"] = capital_gains_tax
            costs["total"] += capital_gains_tax
            
        elif country == "denmark":
            # Capital gains tax rules in DK are complex, often 0 for primary residence
            # Assuming 0 for now, needs refinement based on user status/property use
            capital_gains_tax = 0 # Placeholder
            costs["breakdown"]["capital_gains_tax_denmark"] = capital_gains_tax
            costs["total"] += capital_gains_tax

    return costs

def calculate_scenario_results(purchase_costs, running_costs, selling_costs, total_interest_paid, inputs, country, city, years):
    """Calculates the final win/loss for different appreciation scenarios."""
    results = {}
    purchase_price = inputs.get("new_flat_price", 0)
    prop_type = inputs.get("property_type", "new")
    completion_years = inputs.get("construction_completion_years", 0) if prop_type == "under_construction" else 0
    effective_years = max(0, years - completion_years)
    if purchase_price <= 0: return results

    avg_rate = get_rate(country, city, "avg_appreciation_rate")
    std_dev = get_rate(country, city, "appreciation_std_dev")
    
    scenarios = {
        "average": avg_rate,
        "low_risk": avg_rate - std_dev,
        "high_risk": avg_rate + std_dev,
        "zero_growth": 0.0
    }

    total_investment = purchase_costs["total_investment_cost"]
    total_running = running_costs["total"]
    
    for scenario_name, rate in scenarios.items():
        selling_price = calculate_future_value(purchase_price, rate, effective_years)
        
        # Recalculate selling costs based on the scenario's selling price
        beckham_active = inputs.get("personal_finance", {}).get("beckham_law_active", False)
        scenario_selling_costs = calculate_selling_costs(country, city, selling_price, purchase_price, total_investment, years, beckham_active)
        total_selling = scenario_selling_costs["total"]
        
        # Calculate Win/Loss including loan interest
        win_loss = selling_price - total_investment - total_running - total_selling - total_interest_paid
        
        results[scenario_name] = {
            "selling_price": selling_price,
            "total_investment_cost": total_investment,
            "total_running_costs": total_running,
            "total_loan_interest_paid": total_interest_paid,
            "total_selling_costs": total_selling,
            "win_loss": win_loss,
            "selling_costs_breakdown": scenario_selling_costs["breakdown"]
        }
        
    return results

# --- Main Entry Point --- 

def perform_calculation_for_scenario(data):
    """Performs the full calculation for a single investment scenario."""
    
    # Extract data for the specific scenario
    personal_finance = data.get("personal_finance", {})
    scenario_settings = data.get("scenario_settings", {})
    country = data.get("country")
    city = data.get("city")
    inputs = data.get("inputs")
    
    if not all([country, city, inputs, scenario_settings]):
        return {"error": "Missing country, city, inputs, or scenario_settings"}

    years_to_sell = scenario_settings.get("years_to_sell", 10)
    
    # 1. Calculate Purchase Costs
    purchase_costs_result = calculate_purchase_costs(inputs, country, city)
    
    # 2. Calculate Running Costs (excluding interest)
    running_costs_result = calculate_running_costs(inputs, country, city, years_to_sell)
    
    # 3. Calculate Total Loan Interest Paid
    loan_details = inputs.get("loan_details", {})
    loan_amount = loan_details.get("amount", inputs.get("new_flat_price", 0) * 0.8)
    loan_rate = loan_details.get("interest_rate", 0.03) # Example default
    loan_term = loan_details.get("term_years", 30) # Example default
    total_interest_paid = calculate_total_interest_paid(loan_amount, loan_rate, loan_term, years_to_sell)

    # 4. Calculate Scenario Results (Win/Loss for Avg, Low, High, Zero)
    # Note: Selling costs are calculated *within* calculate_scenario_results for each appreciation scenario
    scenario_results = calculate_scenario_results(
        purchase_costs_result,
        running_costs_result,
        {}, # Pass empty dict, selling costs calculated inside
        total_interest_paid,
        inputs,
        country,
        city,
        years_to_sell
    )

    # 5. Consolidate Results
    final_result = {
        "inputs_summary": {
            "country": country,
            "city": city,
            "property_type": inputs.get("property_type"),
            "price": inputs.get("new_flat_price"),
            "years_held": years_to_sell,
            "loan_amount": loan_amount,
            "loan_rate": loan_rate,
            "loan_term": loan_term,
        },
        "purchase_costs": purchase_costs_result,
        "running_costs": running_costs_result,
        "total_loan_interest_paid_over_hold": total_interest_paid,
        "scenario_outcomes": scenario_results,
        "calculation_details": {
            "warnings": list(purchase_costs_result["breakdown"].get("warnings", [])) # Collect warnings
        }
    }
    
    # Clean up warnings if present
    if "warning_no_payment_schedule" in final_result["purchase_costs"]["breakdown"]:
        final_result["calculation_details"]["warnings"].append(final_result["purchase_costs"]["breakdown"].pop("warning_no_payment_schedule"))

    return final_result

