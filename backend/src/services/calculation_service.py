# /home/ubuntu/property_analyzer/backend/src/services/calculation_service.py

"""Core calculation logic for property investment analysis."""

import datetime
import numpy as np # For standard deviation calculations

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
        
        if isinstance(value, list):
            return list(value)
        elif isinstance(value, dict):
            return dict(value)
        else:
            return value
            
    except KeyError:
        print(f"Warning: Rate not found for {country}/{city}/{key}{" / " + subkey if subkey else ""}")
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

# --- Calculation Functions --- 

def calculate_purchase_costs(inputs, country, city):
    """Calculates initial purchase costs, considering payment schedules for under construction."""
    costs = {"total_investment_cost": 0, "initial_outlay_year0": 0, "breakdown": {}}
    price = inputs.get("new_flat_price", 0)
    prop_type = inputs.get("property_type", "new")
    payment_schedule = inputs.get("payment_schedule", [])
    if price <= 0: return costs
    
    # Total Investment Cost Breakdown (Full price + taxes/fees)
    costs["breakdown"]["property_price"] = price
    costs["total_investment_cost"] += price
    
    # Initial Outlay (Year 0) Calculation
    initial_payment_fraction = 1.0 # Default to full payment if not under construction or no schedule
    if prop_type == "under_construction" and payment_schedule:
        initial_payment_fraction = sum(p.get("percentage", 0) for p in payment_schedule if p.get("due_year", -1) == 0)
    elif prop_type == "under_construction": # No schedule provided, assume simple 10% down? Add warning.
        initial_payment_fraction = 0.10
        print("Warning: Under construction selected but no payment schedule provided. Assuming 10% initial payment.")
        # TODO: Add this warning to results
        
    initial_property_payment = price * initial_payment_fraction
    costs["initial_outlay_year0"] += initial_property_payment
    costs["breakdown"]["initial_property_payment_year0"] = initial_property_payment

    # Calculate Taxes and Fees based on FULL price, but allocate to initial outlay if paid upfront
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
        elif prop_type == "renovation_needed": # Assuming resale
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
            # Tinglysning might still apply - simplified
        elif prop_type == "ejer" or prop_type == "andels": # Assuming resale/existing
            fixed_tax = get_rate(country, city, "purchase_tax_tinglysningsafgift_fixed")
            variable_tax = price * get_rate(country, city, "purchase_tax_tinglysningsafgift_variable")
            purchase_tax = fixed_tax + variable_tax
            costs["breakdown"]["purchase_tax_tinglysningsafgift"] = purchase_tax
            purchase_tax_total += purchase_tax

        # Stamp duty on loan
        loan_amount = inputs.get("loan_details", {}).get("amount", price * 0.80)
        loan_stamp_duty_fixed = get_rate(country, city, "purchase_stamp_duty_loan_fixed")
        loan_stamp_duty_variable = loan_amount * get_rate(country, city, "purchase_stamp_duty_loan")
        loan_stamp_duty = loan_stamp_duty_fixed + loan_stamp_duty_variable
        costs["breakdown"]["loan_stamp_duty"] = loan_stamp_duty
        loan_stamp_duty_total += loan_stamp_duty

        lawyer_fee = get_rate(country, city, "purchase_lawyer_fee")
        costs["breakdown"]["lawyer_fee"] = lawyer_fee
        lawyer_fee_total += lawyer_fee
        
    # Add total taxes/fees to total investment cost
    costs["total_investment_cost"] += (purchase_tax_total + ajd_tax_total + notary_fee_total + 
                                       registry_fee_total + loan_stamp_duty_total + lawyer_fee_total)

    # Assume most fees/taxes are paid upfront (Year 0) - Add to initial outlay
    # Exception: VAT might be paid along payment schedule - simplified for now
    costs["initial_outlay_year0"] += (purchase_tax_total + ajd_tax_total + notary_fee_total + 
                                      registry_fee_total + loan_stamp_duty_total + lawyer_fee_total)
    costs["breakdown"]["taxes_fees_year0"] = (purchase_tax_total + ajd_tax_total + notary_fee_total + 
                                               registry_fee_total + loan_stamp_duty_total + lawyer_fee_total)

    # Add renovation costs (Assume paid upfront in Year 0 if renovation_needed)
    renovation_total = 0
    if prop_type == "renovation_needed":
        renovations = inputs.get("renovations", [])
        renovation_rates = get_rate(country, city, "renovation_rates")
        for reno in renovations:
            cost = reno.get("adjusted_cost")
            if cost is None:
                default_cost = renovation_rates.get(reno.get("type"))
                cost = default_cost if default_cost is not None else 0
            renovation_total += cost
            costs["breakdown"][f"renovation_{reno.get("type", "custom")}"] = cost
        costs["breakdown"]["renovation_total"] = renovation_total
        costs["total_investment_cost"] += renovation_total
        costs["initial_outlay_year0"] += renovation_total

    # Store payment schedule details if applicable
    if prop_type == "under_construction" and payment_schedule:
        costs["breakdown"]["payment_schedule"] = payment_schedule
        # Calculate remaining payments (for info, not added to initial outlay)
        remaining_payment_fraction = 1.0 - initial_payment_fraction
        costs["breakdown"]["remaining_payments_value"] = price * remaining_payment_fraction

    costs["breakdown"]["total_investment_cost"] = costs["total_investment_cost"]
    costs["breakdown"]["initial_outlay_year0"] = costs["initial_outlay_year0"]

    return costs

def calculate_running_costs(inputs, country, city, years):
    """Calculates total running costs over the holding period."""
    costs = {"total": 0, "breakdown_annual": {}, "breakdown_total": {}}
    price = inputs.get("new_flat_price", 0)
    prop_type = inputs.get("property_type", "new")
    completion_years = inputs.get("construction_completion_years", 0) if prop_type == "under_construction" else 0
    
    effective_years = max(0, years - completion_years)
    if price <= 0 or effective_years <= 0: return costs
    
    annual_total = 0
    # ... (rest of running cost calculation remains the same) ...
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

    # Capital Gain Basis: Selling Price - Total Investment Cost (Price + Purchase Costs + Renovations)
    # Using purchase_costs_investment_total which includes price, taxes, fees, renovations
    capital_gain_base = selling_price - purchase_costs_investment_total 
    capital_gains_tax = 0
    if capital_gain_base > 0:
        if country == "spain":
            plusvalia = get_rate(country, city, "selling_plusvalia_municipal") 
            costs["breakdown"]["selling_plusvalia_municipal"] = plusvalia
            costs["total"] += plusvalia
            
            rates_table = get_rate(country, city, "capital_gains_tax_rate_spain")
            capital_gains_tax = calculate_progressive_tax(capital_gain_base, rates_table)
            costs["breakdown"]["capital_gains_tax"] = capital_gains_tax
            costs["total"] += capital_gains_tax

        elif country == "denmark":
            # TODO: Add input for primary residence status
            capital_gains_tax = capital_gain_base * get_rate(country, city, "capital_gains_tax_rate_denmark")
            costs["breakdown"]["capital_gains_tax"] = capital_gains_tax
            costs["total"] += capital_gains_tax
            
    return costs

def calculate_scenario_results(inputs, purchase_costs, running_costs, years_to_sell, country, city, avg_appreciation, std_dev_appreciation, beckham_law_active):
    """Calculates results for different appreciation scenarios."""
    results = {}
    purchase_price = inputs.get("new_flat_price", 0)
    prop_type = inputs.get("property_type", "new")
    completion_years = inputs.get("construction_completion_years", 0) if prop_type == "under_construction" else 0
    
    effective_years_appreciation = years_to_sell 

    scenarios = {
        "avg": avg_appreciation,
        "low_risk": max(0, avg_appreciation - std_dev_appreciation),
        "high_risk": avg_appreciation + std_dev_appreciation,
        "zero_growth": 0
    }

    for scenario_name, rate in scenarios.items():
        selling_price = calculate_future_value(purchase_price, rate, effective_years_appreciation)
        
        effective_years_held_tax = max(0, years_to_sell - completion_years)
        
        # Use total_investment_cost from purchase_costs for capital gain calculation basis
        selling_costs = calculate_selling_costs(country, city, selling_price, purchase_price, purchase_costs["total_investment_cost"], effective_years_held_tax, beckham_law_active)
        
        # Win/Loss = Selling Price - Total Investment Cost - Total Running Costs - Total Selling Costs
        # Need to account for remaining payments if under construction
        remaining_payments = purchase_costs.get("breakdown", {}).get("remaining_payments_value", 0)
        total_outlay = purchase_costs["total_investment_cost"] # Includes full price + costs
        
        # Alternative Win/Loss based on cash flow could be: Selling Price - Initial Outlay - Remaining Payments - Running Costs - Selling Costs
        # Let's stick to Selling Price - Total Investment Cost - Running Costs - Selling Costs for now
        win_loss = selling_price - purchase_costs["total_investment_cost"] - running_costs["total"] - selling_costs["total"]
        
        results[scenario_name] = {
            "estimated_selling_price": selling_price,
            "selling_costs": selling_costs,
            "win_loss": win_loss
        }
        
    return results

# --- Main Calculation Function --- 

def perform_calculation(data):
    """Main function to orchestrate the investment calculation."""
    results = {
        "summary": {},
        "comparison_results": {},
        "calculation_details": {"assumptions": [], "warnings": []}
    }
    
    personal_finance = data.get("personal_finance", {})
    scenario_settings = data.get("scenario_settings", {})
    spain_inputs = data.get("spain_inputs", {})
    denmark_inputs = data.get("denmark_inputs", {})
    years_to_sell = scenario_settings.get("years_to_sell", 10)

    # --- Spain Calculation ---
    if spain_inputs:
        city_spain = spain_inputs.get("city", "barcelona").lower()
        purchase_price_spain = spain_inputs.get("new_flat_price")
        if purchase_price_spain:
            purchase_costs_spain = calculate_purchase_costs(spain_inputs, "spain", city_spain)
            running_costs_spain = calculate_running_costs(spain_inputs, "spain", city_spain, years_to_sell)
            
            avg_appreciation_spain = get_rate("spain", city_spain, "avg_appreciation_rate")
            std_dev_appreciation_spain = get_rate("spain", city_spain, "appreciation_std_dev")
            beckham_law_active_spain = spain_inputs.get("beckham_law_active", False)
            
            scenario_results_spain = calculate_scenario_results(
                spain_inputs, purchase_costs_spain, running_costs_spain, years_to_sell,
                "spain", city_spain, avg_appreciation_spain, std_dev_appreciation_spain, beckham_law_active_spain
            )
            
            results["comparison_results"]["spain"] = {
                "purchase_costs": purchase_costs_spain, # Contains total_investment_cost and initial_outlay_year0
                "running_costs": running_costs_spain,
                "scenarios": scenario_results_spain,
                "detailed_breakdown": {
                    **purchase_costs_spain["breakdown"],
                    **running_costs_spain["breakdown_total"],
                    **scenario_results_spain["avg"]["selling_costs"]["breakdown"]
                }
            }
            prop_type_spain = spain_inputs.get("property_type", "N/A").replace("_", " ").capitalize()
            results["summary"]["spain_scenario"] = f"{city_spain.capitalize()} - {prop_type_spain}"
            results["calculation_details"]["warnings"].append("Spain running costs use proxy values for IBI calculation.")
            results["calculation_details"]["warnings"].append("Spain selling costs use placeholder for Plusvalia and simplified capital gains basis.")
            results["calculation_details"]["warnings"].append("Beckham law impact on capital gains needs verification.")
            if spain_inputs.get("property_type") == "under_construction":
                 results["calculation_details"]["warnings"].append("Spain under construction logic uses simplified payment schedule impact (initial outlay calculated, win/loss uses total cost).")
                 if not spain_inputs.get("payment_schedule"): results["calculation_details"]["warnings"].append("Spain: No payment schedule provided for under construction, assumed 10% initial.")
        else:
             results["comparison_results"]["spain"] = {"error": "Missing purchase price for Spain."}

    # --- Denmark Calculation ---
    if denmark_inputs:
        city_denmark = denmark_inputs.get("city", "copenhagen").lower()
        purchase_price_denmark = denmark_inputs.get("new_flat_price")
        if purchase_price_denmark:
            purchase_costs_denmark = calculate_purchase_costs(denmark_inputs, "denmark", city_denmark)
            running_costs_denmark = calculate_running_costs(denmark_inputs, "denmark", city_denmark, years_to_sell)

            avg_appreciation_denmark = get_rate("denmark", city_denmark, "avg_appreciation_rate")
            std_dev_appreciation_denmark = get_rate("denmark", city_denmark, "appreciation_std_dev")

            scenario_results_denmark = calculate_scenario_results(
                denmark_inputs, purchase_costs_denmark, running_costs_denmark, years_to_sell,
                "denmark", city_denmark, avg_appreciation_denmark, std_dev_appreciation_denmark, False
            )

            results["comparison_results"]["denmark"] = {
                "purchase_costs": purchase_costs_denmark,
                "running_costs": running_costs_denmark,
                "scenarios": scenario_results_denmark,
                "detailed_breakdown": {
                    **purchase_costs_denmark["breakdown"],
                    **running_costs_denmark["breakdown_total"],
                    **scenario_results_denmark["avg"]["selling_costs"]["breakdown"]
                }
            }
            prop_type_dk = denmark_inputs.get("property_type", "N/A")
            if prop_type_dk == "ejer": prop_type_dk_display = "Ejerlejlighed"
            elif prop_type_dk == "andels": prop_type_dk_display = "Andelslejlighed"
            elif prop_type_dk == "under_construction": prop_type_dk_display = "Under Construction"
            else: prop_type_dk_display = "N/A"
            results["summary"]["denmark_scenario"] = f"{city_denmark.capitalize()} - {prop_type_dk_display}"
            results["calculation_details"]["warnings"].append("Denmark running costs use proxy values for tax calculations.")
            results["calculation_details"]["warnings"].append("Denmark selling costs use simplified capital gains (may be exempt for primary residence - check needed).")
            results["calculation_details"]["warnings"].append("Denmark VAT/Tinglysning rules for new builds need verification.")
            if denmark_inputs.get("property_type") == "under_construction":
                 results["calculation_details"]["warnings"].append("Denmark under construction logic uses simplified payment schedule impact (initial outlay calculated, win/loss uses total cost).")
                 if not denmark_inputs.get("payment_schedule"): results["calculation_details"]["warnings"].append("Denmark: No payment schedule provided for under construction, assumed 10% initial.")
        else:
            results["comparison_results"]["denmark"] = {"error": "Missing purchase price for Denmark."}

    # --- Final Summary ---
    results["summary"]["executive_summary"] = "Comparison results generated. Review scenarios and detailed breakdowns. Note warnings regarding assumptions."
    results["calculation_details"]["message"] = "Core calculation logic updated for under construction (VAT, timeline, basic payment schedule impact on initial outlay). Further refinement needed."

    return results

