# /home/ubuntu/property_analyzer/backend/tests/test_calculation_service.py

import pytest
import sys
import os
import math # Needed for interest calculation helper

# Add the src directory to the Python path to allow importing calculation_service
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../src")))

from services.calculation_service import perform_calculation, DEFAULT_RATES

# --- Helper Function for Test Expectations ---

def calculate_interest_paid(principal, annual_rate, term_years, holding_years):
    """Helper to estimate total interest paid over the holding period for test expectations."""
    if annual_rate <= 0 or term_years <= 0 or principal <= 0 or holding_years <= 0:
        return 0
    monthly_rate = annual_rate / 12
    num_payments_total = term_years * 12
    num_payments_holding = min(holding_years * 12, num_payments_total)

    if monthly_rate == 0:
        return 0

    # Calculate monthly payment
    try:
        # M = P [ i(1 + i)^n ] / [ (1 + i)^n – 1]
        monthly_payment = principal * (monthly_rate * math.pow(1 + monthly_rate, num_payments_total)) / (math.pow(1 + monthly_rate, num_payments_total) - 1)
    except (OverflowError, ValueError): # Handle potential math errors
         print(f"Warning: Math error calculating monthly payment for P={principal}, i={monthly_rate}, n={num_payments_total}")
         return 0 # Cannot reliably estimate interest

    total_paid_holding = monthly_payment * num_payments_holding
    
    # Calculate remaining balance after holding period using formula:
    # B = P (1 + i)^k - M [ ((1 + i)^k - 1) / i ]
    # where k is num_payments_holding
    try:
        remaining_balance = principal * math.pow(1 + monthly_rate, num_payments_holding) - monthly_payment * ((math.pow(1 + monthly_rate, num_payments_holding) - 1) / monthly_rate)
    except (OverflowError, ValueError):
        print(f"Warning: Math error calculating remaining balance for P={principal}, i={monthly_rate}, k={num_payments_holding}")
        return 0 # Cannot reliably estimate interest

    principal_paid_holding = principal - remaining_balance
    interest_paid_holding = total_paid_holding - principal_paid_holding
    
    # Clamp to zero if calculation results in small negative due to float precision
    return max(0, interest_paid_holding)

# --- Test Data Fixtures ---

@pytest.fixture
def base_input_data():
    """Provides a base structure for the calculation input data."""
    return {
        "personal_finance": {"salary": 100000},
        "scenario_settings": {"currency": "EUR"},
        "spain_inputs": None,
        "denmark_inputs": None
    }

# --- Educational Test Cases (Updated for Loan Interest Expectation) ---

def test_spain_new_3yr_avg_appreciation(base_input_data):
    """
    Educational Test: Simulates buying a NEW property in Barcelona, Spain,
    holding it for 3 years, and selling with AVERAGE market appreciation.
    **EXPECTS WIN/LOSS TO INCLUDE LOAN INTEREST PAID.**

    Financial Concepts Tested:
    - Purchase Costs (Spain, New): VAT, AJD, Notary, Registry.
    - Running Costs (Spain): IBI (proxy), Community Fees.
    - Loan Costs: **Total Interest Paid** over the 3-year holding period (based on 80% LTV, 30yr term, 3.5% rate).
    - Selling Costs (Spain): Agency Fee, Plusvalia (placeholder), Capital Gains Tax (simplified).
    - Appreciation: Future selling price based on average rate.
    - Win/Loss Calculation: Net outcome including **loan interest** (Selling Price - Total Investment Cost - Running Costs - **Interest Paid** - Selling Costs).

    Validation:
    - Checks response structure.
    - Verifies purchase, running, selling costs > 0.
    - **Confirms win/loss is calculated and reflects the estimated interest paid.**
    - Validates selling price > purchase price.
    - Checks for expected warnings.
    """
    data = base_input_data
    holding_years = 3
    loan_amount = 500000 * 0.8
    loan_rate = 0.035 # Example 3.5% annual rate
    loan_term = 30
    data["scenario_settings"]["years_to_sell"] = holding_years
    data["spain_inputs"] = {
        "city": "Barcelona",
        "property_type": "new",
        "new_flat_price": 500000,
        "renovations": [],
        "loan_details": {
            "amount": loan_amount,
            "interest_rate": loan_rate,
            "term_years": loan_term
        }
    }

    # Calculate expected interest for validation
    expected_interest_paid = calculate_interest_paid(loan_amount, loan_rate, loan_term, holding_years)

    result = perform_calculation(data)

    # Basic Structure Validation
    assert "comparison_results" in result
    assert "spain" in result["comparison_results"]
    spain_result = result["comparison_results"]["spain"]
    assert "purchase_costs" in spain_result
    assert "running_costs" in spain_result
    assert "scenarios" in spain_result
    assert "avg" in spain_result["scenarios"]
    assert "win_loss" in spain_result["scenarios"]["avg"]
    # TODO: Add assertion for interest paid breakdown once backend implements it
    # assert "loan_interest_paid" in spain_result["detailed_breakdown"]

    # Logical Validation
    assert spain_result["purchase_costs"]["total_investment_cost"] > data["spain_inputs"]["new_flat_price"]
    assert spain_result["running_costs"]["total"] >= 0
    assert spain_result["scenarios"]["avg"]["selling_costs"]["total"] >= 0
    assert spain_result["scenarios"]["avg"]["estimated_selling_price"] > data["spain_inputs"]["new_flat_price"]

    # Expected Win/Loss Calculation (based on current backend logic *before* interest fix)
    # This test WILL FAIL until backend logic is updated.
    win_loss_without_interest = (spain_result["scenarios"]["avg"]["estimated_selling_price"] -
                                 spain_result["purchase_costs"]["total_investment_cost"] -
                                 spain_result["running_costs"]["total"] -
                                 spain_result["scenarios"]["avg"]["selling_costs"]["total"])
    
    expected_win_loss_with_interest = win_loss_without_interest - expected_interest_paid
    
    # Assert that the calculated win/loss matches the expectation *including* interest
    assert spain_result["scenarios"]["avg"]["win_loss"] == pytest.approx(expected_win_loss_with_interest, rel=1e-3)

    # Check for Warnings
    assert "calculation_details" in result
    assert "warnings" in result["calculation_details"]
    assert any("IBI calculation" in w for w in result["calculation_details"]["warnings"])

def test_spain_resale_10yr_zero_appreciation(base_input_data):
    """
    Educational Test: Simulates buying a RESALE property (needs renovation) in Barcelona,
    holding it for 10 years, and selling with ZERO market appreciation.
    **EXPECTS WIN/LOSS TO INCLUDE LOAN INTEREST PAID.**

    Financial Concepts Tested:
    - Purchase Costs (Spain, Resale): ITP, Notary, Registry, Renovations.
    - Running Costs (Spain): IBI (proxy), Community Fees.
    - Loan Costs: **Total Interest Paid** over 10 years (80% LTV, 20yr term, 4% rate).
    - Selling Costs (Spain): Agency Fee, Plusvalia, Capital Gains (zero).
    - Appreciation: Zero growth.
    - Win/Loss Calculation: Net outcome including **loan interest**.

    Validation:
    - Checks structure.
    - Verifies purchase costs include renovations.
    - Confirms running costs cover 10 years.
    - Ensures zero growth scenario exists.
    - Validates selling price equals purchase price.
    - **Checks win/loss reflects total costs including estimated interest paid.**
    """
    data = base_input_data
    holding_years = 10
    purchase_price = 450000
    renovation_cost = 20000
    loan_amount = purchase_price * 0.8
    loan_rate = 0.04 # Example 4% rate
    loan_term = 20 # Example 20 year term
    data["scenario_settings"]["years_to_sell"] = holding_years
    data["spain_inputs"] = {
        "city": "Barcelona",
        "property_type": "renovation_needed",
        "new_flat_price": purchase_price,
        "renovations": [{"type": "kitchen", "adjusted_cost": renovation_cost}],
        "loan_details": {
            "amount": loan_amount,
            "interest_rate": loan_rate,
            "term_years": loan_term
        }
    }

    expected_interest_paid = calculate_interest_paid(loan_amount, loan_rate, loan_term, holding_years)

    result = perform_calculation(data)
    spain_result = result["comparison_results"]["spain"]

    # Structure & Basic Logic
    assert "purchase_costs" in spain_result
    assert "running_costs" in spain_result
    assert "scenarios" in spain_result
    assert "zero_growth" in spain_result["scenarios"]
    assert "win_loss" in spain_result["scenarios"]["zero_growth"]

    # Specific Validations
    assert spain_result["purchase_costs"]["breakdown"]["renovation_total"] == renovation_cost
    assert spain_result["purchase_costs"]["total_investment_cost"] > purchase_price + renovation_cost
    assert spain_result["running_costs"]["total"] > 0
    assert spain_result["scenarios"]["zero_growth"]["estimated_selling_price"] == purchase_price
    
    # Expected Loss Calculation (including interest)
    # Loss = -(Purchase Costs (excl price) + Renovations + Running Costs + Interest Paid + Selling Costs)
    expected_loss_approx = -( (spain_result["purchase_costs"]["total_investment_cost"] - purchase_price) +
                              spain_result["running_costs"]["total"] +
                              expected_interest_paid +
                              spain_result["scenarios"]["zero_growth"]["selling_costs"]["total"] )

    # Assert that the calculated win/loss matches the expectation *including* interest
    # This test WILL FAIL until backend logic is updated.
    assert spain_result["scenarios"]["zero_growth"]["win_loss"] == pytest.approx(expected_loss_approx, rel=1e-3)

def test_denmark_ejer_3yr_avg_appreciation(base_input_data):
    """
    Educational Test: Simulates buying an EJERLEJLIGHED in Copenhagen,
    holding for 3 years, selling with AVERAGE appreciation.
    **EXPECTS WIN/LOSS TO INCLUDE LOAN INTEREST PAID.**

    Financial Concepts Tested:
    - Purchase Costs (DK, Ejer): Tinglysning, Loan Stamp Duty, Lawyer.
    - Running Costs (DK): Property Taxes (proxies), Community Fees.
    - Loan Costs: **Total Interest Paid** over 3 years (80% LTV, 30yr term, 2.5% rate).
    - Selling Costs (DK): Agency Fee, Capital Gains (simplified).
    - Appreciation: Average rate for Copenhagen.
    - Win/Loss Calculation: Net outcome including **loan interest**.

    Validation:
    - Checks structure.
    - Verifies costs > 0.
    - **Confirms win/loss reflects estimated interest paid.**
    - Validates selling price reflects appreciation.
    - Checks for DK-specific warnings.
    """
    data = base_input_data
    holding_years = 3
    purchase_price = 4000000
    loan_amount = purchase_price * 0.8
    loan_rate = 0.025 # Example 2.5% rate
    loan_term = 30
    data["scenario_settings"]["years_to_sell"] = holding_years
    data["scenario_settings"]["currency"] = "DKK"
    data["denmark_inputs"] = {
        "city": "Copenhagen",
        "property_type": "ejer",
        "new_flat_price": purchase_price,
        "renovations": [],
        "loan_details": {
            "amount": loan_amount,
            "interest_rate": loan_rate,
            "term_years": loan_term
        }
    }

    expected_interest_paid = calculate_interest_paid(loan_amount, loan_rate, loan_term, holding_years)

    result = perform_calculation(data)

    assert "comparison_results" in result
    assert "denmark" in result["comparison_results"]
    dk_result = result["comparison_results"]["denmark"]
    assert "purchase_costs" in dk_result
    assert "running_costs" in dk_result
    assert "scenarios" in dk_result
    assert "avg" in dk_result["scenarios"]
    assert "win_loss" in dk_result["scenarios"]["avg"]

    assert dk_result["purchase_costs"]["total_investment_cost"] > purchase_price
    assert dk_result["running_costs"]["total"] >= 0
    assert dk_result["scenarios"]["avg"]["selling_costs"]["total"] >= 0
    assert dk_result["scenarios"]["avg"]["estimated_selling_price"] > purchase_price

    # Expected Win/Loss Calculation (based on current backend logic *before* interest fix)
    # This test WILL FAIL until backend logic is updated.
    win_loss_without_interest = (dk_result["scenarios"]["avg"]["estimated_selling_price"] -
                                 dk_result["purchase_costs"]["total_investment_cost"] -
                                 dk_result["running_costs"]["total"] -
                                 dk_result["scenarios"]["avg"]["selling_costs"]["total"])
    
    expected_win_loss_with_interest = win_loss_without_interest - expected_interest_paid
    
    assert dk_result["scenarios"]["avg"]["win_loss"] == pytest.approx(expected_win_loss_with_interest, rel=1e-3)

    assert "calculation_details" in result
    assert "warnings" in result["calculation_details"]
    assert any("Denmark running costs use proxy" in w for w in result["calculation_details"]["warnings"])

def test_denmark_andels_10yr_zero_appreciation(base_input_data):
    """
    Educational Test: Simulates buying an ANDELSLEJLIGHED in Copenhagen,
    holding for 10 years, selling with ZERO appreciation.
    **EXPECTS WIN/LOSS TO INCLUDE LOAN INTEREST PAID.**

    Financial Concepts Tested:
    - Purchase Costs (DK, Andels): Tinglysning (differs), Loan Stamp Duty, Lawyer.
    - Running Costs (DK): Boligafgift (community fee).
    - Loan Costs: **Total Interest Paid** over 10 years (80% LTV, 20yr term, 3% rate).
    - Selling Costs (DK): Agency/Coop Fee, Capital Gains (differs).
    - Appreciation: Zero growth.
    - Win/Loss Calculation: Net outcome including **loan interest**.

    Validation:
    - Checks structure.
    - Verifies costs.
    - Ensures zero growth scenario exists.
    - Validates selling price = purchase price.
    - **Checks win/loss reflects total costs including estimated interest paid.**
    """
    data = base_input_data
    holding_years = 10
    purchase_price = 1500000
    loan_amount = purchase_price * 0.8
    loan_rate = 0.03 # Example 3% rate
    loan_term = 20
    data["scenario_settings"]["years_to_sell"] = holding_years
    data["scenario_settings"]["currency"] = "DKK"
    data["denmark_inputs"] = {
        "city": "Copenhagen",
        "property_type": "andels",
        "new_flat_price": purchase_price,
        "renovations": [],
        "loan_type": "andels_laan",
        "loan_details": {
            "amount": loan_amount,
            "interest_rate": loan_rate,
            "term_years": loan_term
        }
    }

    expected_interest_paid = calculate_interest_paid(loan_amount, loan_rate, loan_term, holding_years)

    result = perform_calculation(data)
    dk_result = result["comparison_results"]["denmark"]

    assert "purchase_costs" in dk_result
    assert "running_costs" in dk_result
    assert "scenarios" in dk_result
    assert "zero_growth" in dk_result["scenarios"]
    assert "win_loss" in dk_result["scenarios"]["zero_growth"]

    assert dk_result["purchase_costs"]["total_investment_cost"] > purchase_price
    assert dk_result["running_costs"]["total"] > 0
    assert dk_result["scenarios"]["zero_growth"]["estimated_selling_price"] == purchase_price

    # Expected Loss Calculation (including interest)
    expected_loss_approx = -( (dk_result["purchase_costs"]["total_investment_cost"] - purchase_price) +
                              dk_result["running_costs"]["total"] +
                              expected_interest_paid +
                              dk_result["scenarios"]["zero_growth"]["selling_costs"]["total"] )

    # Assert that the calculated win/loss matches the expectation *including* interest
    # This test WILL FAIL until backend logic is updated.
    assert dk_result["scenarios"]["zero_growth"]["win_loss"] == pytest.approx(expected_loss_approx, rel=1e-3)

    assert any("Denmark running costs use proxy" in w for w in result["calculation_details"]["warnings"])

# TODO: Add tests for 'under_construction' scenarios, ensuring interest calc starts appropriately.

