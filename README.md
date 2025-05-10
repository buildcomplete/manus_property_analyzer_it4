# Property Investment Analysis Tool

## Overview

This web application provides a comparative financial analysis for property investments in Barcelona, Spain, and Copenhagen, Denmark. It allows users to simulate different scenarios based on property types (including new, resale, renovation-needed, Danish Ejer/Andels, and **properties under construction**), personal financial inputs, and market assumptions.

The tool calculates purchase costs, running costs, selling costs, and potential financial outcomes under various appreciation scenarios (average, low-risk, high-risk, zero growth) over a specified holding period.

## Tech Stack

-   **Backend:** Python (Flask)
-   **Frontend:** TypeScript (React)
-   **Containerization:** Docker, Docker Compose
-   **UI Components:** Tailwind CSS, shadcn/ui (planned for full implementation)

## Architecture

The project follows a monorepo structure:

-   `/backend`: Contains the Flask application handling API requests and calculations.
-   `/frontend`: Contains the React application providing the user interface.
-   `docker-compose.yml`: Defines and orchestrates the backend and frontend services for local development.
-   `Dockerfile` (in backend/ and frontend/): Define the container images.

## Features

-   **Comparison:** Barcelona vs. Copenhagen.
-   **Property Types:**
    -   Spain: New, Renovation Needed, Under Construction
    -   Denmark: Ejerlejlighed, Andelslejlighed, Under Construction
-   **Cost Calculation:** Purchase (taxes, fees, VAT/ITP), Running (property taxes, community fees), Selling (agency fees, capital gains).
-   **Scenario Analysis:** Average, Low Risk, High Risk, Zero Growth appreciation.
-   **User Inputs:** Property price, type, location, renovation details, personal finance (salary, etc.), holding period.
-   **Specific Logic:**
    -   Handles Spanish Beckham Law (basic tax rate application).
    -   Handles Danish Andels lån (loan type option).
    -   Handles Under Construction properties (VAT, payment schedules - initial outlay calculation, timeline adjustments).
-   **Customization:** Adjustable default rates (planned), multiple renovation options.

## Setup and Running (Local Development)

**Prerequisites:**

-   Docker
-   Docker Compose

**Steps:**

1.  **Clone the repository (or ensure files are in the correct structure).**
2.  **Navigate to the project root directory (`/home/ubuntu/property_analyzer`).**
3.  **Build and start the services:**
    ```bash
    docker-compose up --build -d
    ```
4.  **Access the application:**
    -   Frontend: `http://localhost:3000` (or the mapped port)
    -   Backend API: `http://localhost:5000` (or the mapped port)

## Development Notes

-   **Backend:**
    -   Activate virtual environment: `source backend/venv/bin/activate`
    -   Install dependencies: `pip install -r backend/requirements.txt`
    -   Run development server: `flask run --host=0.0.0.0` (within venv)
-   **Frontend:**
    -   Navigate to `frontend/`
    -   Install dependencies: `npm install` (or `pnpm install` if using pnpm)
    -   Run development server: `npm run dev` (or `pnpm dev`)

## Current Status & Limitations (as of v1.1)

-   Backend logic implemented for core comparison and under-construction scenarios (VAT, timeline, basic payment schedule impact).
-   Frontend structure implemented with basic inputs and results display, including conditional fields for under-construction.
-   **Pending Full Frontend Implementation:** Detailed UI styling (branding, high contrast, etc.), advanced input components (payment schedule table, renovation list), sophisticated results visualization (charts, side-by-side cards).
-   **Backend Assumptions/Placeholders:** Calculations rely on proxy values for certain taxes (IBI, Danish property taxes) and simplified logic for others (Plusvalia, capital gains basis/rules, Beckham law impact, DK tax rules). These are noted as warnings in the API response.
-   Optional bonus tools (Loan Repayment, Rental Yield) are not yet implemented.

