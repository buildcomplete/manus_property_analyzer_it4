# Property Investment Analysis Tool - Backend (main.py)

import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, request, jsonify
from flask_cors import CORS

# Import the calculation service
from src.services.calculation_service import perform_calculation

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

    try:
        # Call the calculation service
        results = perform_calculation(data)
        return jsonify(results)
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

