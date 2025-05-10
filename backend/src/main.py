# Property Investment Analysis Tool - Backend (main.py)

import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, request, jsonify
from flask_cors import CORS

# Import the calculation service
from src.services.calculation_service import perform_calculation_for_scenario # Updated import if function name changes

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

    # Expecting data in the format: 
    # {
    #   "personal_finance": {...},
    #   "scenario_settings": {...},
    #   "scenarios": [
    #     { "id": "s1", "country": "spain", "city": "barcelona", "inputs": {...} },
    #     { "id": "s2", "country": "denmark", "city": "copenhagen", "inputs": {...} }
    #   ]
    # }
    personal_finance = data.get("personal_finance", {})
    scenario_settings = data.get("scenario_settings", {})
    scenarios_data = data.get("scenarios", [])

    if not scenarios_data:
        return jsonify({"error": "No scenarios provided"}), 400
    if not scenario_settings or "years_to_sell" not in scenario_settings:
         return jsonify({"error": "Scenario settings (years_to_sell) missing"}), 400

    results = []
    warnings = set() # Collect unique warnings across scenarios

    try:
        for scenario in scenarios_data:
            scenario_id = scenario.get("id")
            country = scenario.get("country")
            city = scenario.get("city") # Assuming city is passed per scenario now
            inputs = scenario.get("inputs")

            if not all([scenario_id, country, city, inputs]):
                results.append({"scenario_id": scenario_id, "error": "Incomplete scenario data (missing id, country, city, or inputs)"})
                continue
            
            # Combine global settings with scenario-specific inputs for calculation
            calculation_input = {
                "personal_finance": personal_finance,
                "scenario_settings": scenario_settings,
                "country": country,
                "city": city,
                "inputs": inputs
            }
            
            # Call the calculation service for each scenario
            # Assuming perform_calculation_for_scenario takes this combined input
            scenario_result = perform_calculation_for_scenario(calculation_input)
            
            # Collect warnings
            if scenario_result.get("calculation_details", {}).get("warnings"):
                warnings.update(scenario_result["calculation_details"]["warnings"])
                
            results.append({"scenario_id": scenario_id, "result": scenario_result})

        # Consolidate results and warnings
        final_response = {
            "results_by_scenario": results,
            "global_warnings": list(warnings)
        }
        return jsonify(final_response)

    except Exception as e:
        # Log the error for debugging
        print(f"Error during calculation: {e}")
        # Be cautious about exposing internal error details in production
        return jsonify({"error": f"An error occurred during calculation: {str(e)}"}), 500

# Simple health check endpoint
@app.route("/api/ping", methods=["GET"])
def ping():
    return jsonify({"message": "Backend is running"})

if __name__ == "__main__":
    # Run on 0.0.0.0 to be accessible within Docker network
    app.run(host="0.0.0.0", port=5000, debug=True)

