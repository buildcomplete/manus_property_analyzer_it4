# Property Investment Analysis Tool - Backend (main.py)

import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, request, jsonify
from flask_cors import CORS

# Import the calculation service
from src.services.calculation_service import perform_calculation_for_scenario, calculate_renting_scenario_cost # Added import

# Initialize Flask app
app = Flask(__name__)
app.config["SECRET_KEY"] = "your_very_secret_key_change_me"

# Enable CORS for all domains on all routes
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.route("/api/calculate", methods=["POST"])
def calculate_investment():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400
    
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No data provided"}), 400

    personal_finance = data.get("personal_finance", {})
    scenario_settings = data.get("scenario_settings", {})
    scenarios_data = data.get("scenarios", [])
    renting_inputs = data.get("renting_scenario_inputs") # Get renting inputs

    if not scenarios_data:
        return jsonify({"error": "No scenarios provided"}), 400
    if not scenario_settings or "years_to_sell" not in scenario_settings:
         return jsonify({"error": "Scenario settings (years_to_sell) missing"}), 400

    results = []
    warnings = set() # Collect unique warnings across scenarios
    renting_results = None
    total_renting_cost = 0

    try:
        # Calculate renting scenario first if inputs are provided
        if renting_inputs:
            # Pass scenario_settings (for years_to_sell) to renting calculation
            renting_results = calculate_renting_scenario_cost(renting_inputs, scenario_settings.get("years_to_sell"))
            if renting_results.get("error"):
                # Handle error in renting calculation if necessary, or just pass it along
                warnings.add(f"Renting scenario calculation error: {renting_results['error']}")
            else:
                total_renting_cost = renting_results.get("total_renting_cost", 0)
                if renting_results.get("warnings"):
                    warnings.update(renting_results["warnings"])

        for scenario in scenarios_data:
            scenario_id = scenario.get("id")
            country = scenario.get("country")
            city = scenario.get("city")
            inputs = scenario.get("inputs")

            if not all([scenario_id, country, city, inputs]):
                results.append({"scenario_id": scenario_id, "error": "Incomplete scenario data (missing id, country, city, or inputs)"})
                continue
            
            calculation_input = {
                "personal_finance": personal_finance,
                "scenario_settings": scenario_settings,
                "country": country,
                "city": city,
                "inputs": inputs
            }
            
            scenario_result_data = perform_calculation_for_scenario(calculation_input)
            
            if scenario_result_data.get("calculation_details", {}).get("warnings"):
                warnings.update(scenario_result_data["calculation_details"]["warnings"])
            
            # Add index_adjusted_profit if renting cost is available
            if renting_results and not renting_results.get("error"):
                current_win_loss = scenario_result_data.get("overall_summary", {}).get("win_loss_eur", 0) # Assuming win_loss_eur is the key
                scenario_result_data["overall_summary"]["index_adjusted_profit_eur"] = current_win_loss - total_renting_cost
            
            results.append({"scenario_id": scenario_id, "result": scenario_result_data})

        final_response = {
            "results_by_scenario": results,
            "global_warnings": list(warnings)
        }
        
        if renting_results:
            final_response["renting_scenario_results"] = renting_results

        return jsonify(final_response)

    except Exception as e:
        print(f"Error during calculation: {e}")
        return jsonify({"error": f"An error occurred during calculation: {str(e)}"}), 500

@app.route("/api/ping", methods=["GET"])
def ping():
    return jsonify({"message": "Backend is running"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

