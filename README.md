# Property Investment Analysis Tool (v1.6.0)

## Overview

This web application provides a flexible financial analysis tool for property investments. It allows users to define and compare multiple investment scenarios across different locations (initially Barcelona, Spain, and Copenhagen, Denmark) and property types.

The tool calculates purchase costs, running costs, selling costs, and potential financial outcomes under various appreciation scenarios (average, low-risk, high-risk, zero growth) over a specified holding period, incorporating loan interest costs for a more accurate win/loss assessment.

## Tech Stack

-   **Backend:** Python (Flask)
-   **Frontend:** TypeScript (React)
-   **Containerization:** Docker, Docker Compose
-   **UI Components:** Tailwind CSS (basic implementation)

## Architecture

The project follows a monorepo structure:

-   `/backend`: Contains the Flask application handling API requests and calculations.
-   `/frontend`: Contains the React application providing the user interface.
-   `docker-compose.yml`: Defines and orchestrates the backend and frontend services for local development.
-   `Dockerfile` (in backend/ and frontend/): Define the container images.

## Features (v1.4)

-   **Multi-Scenario Comparison:** Define and compare multiple investment scenarios side-by-side.
-   **Flexible Inputs:**
    -   **Global Settings:** Years to Sell, Display Currency, Personal Finance (optional).
    -   **Per Scenario:** Country (Spain/Denmark), City (Barcelona/Copenhagen), Property Type, Price, Loan Details, Renovations, Payment Schedules (for under construction), Country-Specific options (Beckham Law, Andelslån).
-   **Property Types:**
    -   Spain: New Build, Second Hand, Under Construction
    -   Denmark: Ejerlejlighed, Andelslejlighed, New Build, Under Construction
-   **Cost Calculation:** Purchase (taxes, fees, VAT/ITP), Running (property taxes, community fees), Selling (agency fees, capital gains), Loan Interest (total paid over holding period).
-   **Scenario Analysis:** Average, Low Risk, High Risk, Zero Growth appreciation outcomes calculated for each defined scenario.
-   **User Interface:** Tabbed interface for managing multiple scenarios, grouped input sections, basic results display showing key metrics per scenario.
-   **Educational Tests:** Backend unit tests (`pytest`) with explanations of financial concepts.

## Setup and Running (Local Development)

**Prerequisites:**

-   Docker
-   Docker Compose

**Steps:**

1.  **Extract the archive (`property_analyzer_v1.6.0.tar.gz`).**
2.  **Navigate to the project root directory (`property_analyzer`).**
3.  **Build and start the services:**
    ```bash
    docker-compose up --build -d
    ```
    *Note: The initial build might take a few minutes, especially for the frontend dependencies.*
4.  **Access the application:**
    -   Frontend: `http://localhost:3000`
    -   Backend API: `http://localhost:5000`

## Environment Configuration

The application uses environment variables for flexible deployment:

-   **API URL Configuration:** The frontend uses a runtime configuration approach to connect to the backend API.
    -   In `docker-compose.yml`, set the `VITE_API_URL` environment variable (e.g., `http://localhost:5000/api`).
    -   The frontend container uses an entrypoint script to inject this value into a runtime config file.
    -   This approach allows changing the API URL without rebuilding the frontend.
    -   If not specified, the application falls back to a development proxy configuration in `vite.config.ts`.

**Example configurations in docker-compose.yml:**

```yaml
# For local development with Docker
environment:
  VITE_API_URL: "http://localhost:5000/api"

# For production deployment with a different domain
environment:
  VITE_API_URL: "https://api.example.com/api"

# For internal Docker network communication
environment:
  VITE_API_URL: "http://backend:5000/api"
```

## Development Notes

-   **Backend:**
    -   Activate virtual environment: `source backend/venv/bin/activate`
    -   Install dependencies: `pip install -r backend/requirements.txt`
    -   Run tests: `pytest` (within venv)
    -   Run development server: `flask run --host=0.0.0.0` (within venv)
-   **Frontend:**
    -   Navigate to `frontend/`
    -   Install dependencies: `npm install`
    -   Run development server: `npm run dev`

## Current Status & Limitations (as of v1.4)

-   Core backend and frontend logic for multi-scenario comparison is implemented and functional.
-   UI provides basic input fields, tabs, and results display (key metrics + raw JSON).
-   **Pending/Future Enhancements:**
    -   **Advanced Frontend:** UI refinement (e.g., using shadcn/ui components, high-contrast options), sophisticated results visualization (e.g., charts, formatted breakdown tables instead of raw JSON - CR1.4).
    -   **Backend Assumptions:** Calculations still rely on some proxy values (e.g., cadastral value for IBI) and simplified logic for complex taxes (Plusvalia, detailed capital gains rules). These are noted as warnings.
    -   **Bonus Tools:** Loan Repayment Schedule and Rental Yield Calculator are not implemented.




## Key Features (v1.6.0)

Includes all features from v1.5.3, plus:

- **Detailed Cost Breakdown:**
  - Added expandable detailed breakdown tables for each scenario and growth profile
  - Provides line-by-line breakdown of all cost items in a clear, elegant format
  - Organized into logical sections: Purchase Costs, Loan Details, Running Costs, Selling Costs, and Financial Outcome
  - Designed for both expert analysis and explanations to laypeople
  - Accessible via "View Details" button for each growth scenario (Zero Growth, Average, Low Risk, High Risk)
  - Includes subtotals for each cost category and clear financial outcome summary

## Key Features (v1.5.3)

Includes all features from v1.5.2, plus:

- **Runtime API Configuration:** 
  - Implemented a runtime configuration system for the frontend to properly connect to the backend API
  - Added an entrypoint script that dynamically updates configuration at container startup
  - Ensures the frontend can connect to the backend regardless of deployment environment

## Key Features (v1.5.2)

Includes all features from v1.5.1, plus:

- **Backend Cleanup:**
  - Removed unused boilerplate code and files for a leaner, more maintainable codebase
  - Eliminated unnecessary user routes and models that were not used by the application
  - Streamlined backend structure to focus only on the property investment analysis functionality
- **API URL Environment Variable:** Frontend now uses `VITE_API_URL` environment variable for flexible deployment
- **Backend Robustness:** Improved error handling to ensure calculation results are always properly structured
