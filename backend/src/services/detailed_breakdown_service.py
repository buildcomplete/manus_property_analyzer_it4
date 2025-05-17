def create_detailed_breakdown(purchase_costs, running_costs, selling_costs, loan_details, years_to_sell, price, selling_price, win_loss, index_adjusted_profit=None):
    """
    Creates a structured detailed breakdown object from various cost calculations.
    
    Args:
        purchase_costs: Dictionary containing purchase cost breakdown
        running_costs: Dictionary containing running cost breakdown
        selling_costs: Dictionary containing selling cost breakdown
        loan_details: Dictionary containing loan details
        years_to_sell: Number of years property is held
        price: Purchase price of property
        selling_price: Selling price of property
        win_loss: Overall profit/loss
        index_adjusted_profit: Profit/loss adjusted against renting baseline (optional)
        
    Returns:
        Dictionary with structured detailed breakdown
    """
    detailed_breakdown = {
        "purchase_costs": {},
        "loan_costs": {},
        "running_costs": {},
        "selling_costs": {},
        "outcome": {}
    }
    
    # Purchase costs section
    if purchase_costs and "breakdown" in purchase_costs:
        # Property price
        detailed_breakdown["purchase_costs"]["property_price"] = purchase_costs["breakdown"].get("property_price", 0)
        
        # Taxes
        tax_fields = ["purchase_tax_vat", "purchase_tax_ajd", "purchase_tax_itp", 
                     "purchase_tax_tinglysningsafgift"]
        for field in tax_fields:
            if field in purchase_costs["breakdown"]:
                detailed_breakdown["purchase_costs"][field] = purchase_costs["breakdown"][field]
        
        # Fees
        fee_fields = ["notary_fee", "registry_fee", "lawyer_fee"]
        for field in fee_fields:
            if field in purchase_costs["breakdown"]:
                detailed_breakdown["purchase_costs"][field] = purchase_costs["breakdown"][field]
        
        # Renovations
        renovation_total = 0
        for key, value in purchase_costs["breakdown"].items():
            if key.startswith("renovation_") and key != "renovation_total":
                detailed_breakdown["purchase_costs"][key] = value
                renovation_total += value
        
        if renovation_total > 0:
            detailed_breakdown["purchase_costs"]["renovation_total"] = renovation_total
        
        # Subtotal
        detailed_breakdown["purchase_costs"]["total_purchase_costs"] = purchase_costs["total_investment_cost"]
    
    # Loan costs section
    if loan_details:
        loan_amount = loan_details.get("amount", 0)
        interest_rate = loan_details.get("interest_rate", 0)
        term_years = loan_details.get("term_years", 0)
        
        detailed_breakdown["loan_costs"]["loan_amount"] = loan_amount
        detailed_breakdown["loan_costs"]["interest_rate"] = interest_rate
        detailed_breakdown["loan_costs"]["term_years"] = term_years
        
        # Calculate monthly payment if not provided
        if loan_amount > 0 and interest_rate > 0 and term_years > 0:
            import math
            monthly_rate = interest_rate / 12
            num_payments = term_years * 12
            try:
                denominator = math.pow(1 + monthly_rate, num_payments) - 1
                if denominator != 0:
                    monthly_payment = loan_amount * (monthly_rate * math.pow(1 + monthly_rate, num_payments)) / denominator
                    detailed_breakdown["loan_costs"]["monthly_payment"] = round(monthly_payment, 2)
            except (OverflowError, ValueError):
                pass  # Skip if calculation fails
        
        # Total interest paid
        if "total_interest_paid" in loan_details:
            detailed_breakdown["loan_costs"]["total_interest_paid"] = loan_details["total_interest_paid"]
        
        # Subtotal (same as total interest paid)
        if "total_interest_paid" in loan_details:
            detailed_breakdown["loan_costs"]["total_loan_costs"] = loan_details["total_interest_paid"]
    
    # Running costs section
    if running_costs:
        # Annual costs
        if "breakdown_annual" in running_costs:
            for key, value in running_costs["breakdown_annual"].items():
                if key != "total_annual_running_costs":
                    detailed_breakdown["running_costs"][f"{key}_annual"] = value
        
        # Total costs over holding period
        if "breakdown_total" in running_costs:
            for key, value in running_costs["breakdown_total"].items():
                detailed_breakdown["running_costs"][key] = value
        
        # Years held
        detailed_breakdown["running_costs"]["years_held"] = years_to_sell
        
        # Subtotal
        detailed_breakdown["running_costs"]["total_running_costs"] = running_costs.get("total", 0)
    
    # Selling costs section
    if selling_costs:
        # Agency fee
        if "breakdown" in selling_costs and "selling_agency_fee" in selling_costs["breakdown"]:
            detailed_breakdown["selling_costs"]["selling_agency_fee"] = selling_costs["breakdown"]["selling_agency_fee"]
        
        # Capital gains tax
        if "breakdown" in selling_costs and "capital_gains_tax" in selling_costs["breakdown"]:
            detailed_breakdown["selling_costs"]["capital_gains_tax"] = selling_costs["breakdown"]["capital_gains_tax"]
        
        # Other selling costs
        if "breakdown" in selling_costs:
            for key, value in selling_costs["breakdown"].items():
                if key not in ["selling_agency_fee", "capital_gains_tax"]:
                    detailed_breakdown["selling_costs"][key] = value
        
        # Subtotal
        detailed_breakdown["selling_costs"]["total_selling_costs"] = selling_costs.get("total", 0)
    
    # Financial outcome section
    detailed_breakdown["outcome"]["purchase_price"] = price
    detailed_breakdown["outcome"]["total_investment"] = purchase_costs.get("total_investment_cost", price)
    detailed_breakdown["outcome"]["selling_price"] = selling_price
    
    # Total costs (running + loan interest + selling)
    total_costs = (
        running_costs.get("total", 0) + 
        (loan_details.get("total_interest_paid", 0) if loan_details else 0) + 
        selling_costs.get("total", 0)
    )
    detailed_breakdown["outcome"]["total_costs"] = total_costs
    
    # Raw profit/loss
    detailed_breakdown["outcome"]["raw_profit_loss"] = win_loss
    
    # Index adjusted profit/loss (if provided)
    if index_adjusted_profit is not None:
        detailed_breakdown["outcome"]["index_adjusted_profit_loss"] = index_adjusted_profit
    
    return detailed_breakdown
