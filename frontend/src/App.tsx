import { useState, useEffect } from 'react';
import './App.css'; // Assuming default CSS or Tailwind is configured

// Define interfaces for structure (can be moved to separate files)
interface PaymentScheduleItem {
  percentage: number;
  due_year: number;
}

interface RenovationItem {
  type: string;
  description?: string;
  default_cost?: number;
  adjusted_cost?: number;
}

interface CountryInputs {
  city: string;
  property_type: 'new' | 'renovation_needed' | 'under_construction' | 'ejer' | 'andels';
  new_flat_price: number;
  renovations: RenovationItem[];
  // Spain specific
  beckham_law_active?: boolean;
  beckham_law_remaining_years?: number;
  // Denmark specific
  loan_type?: 'standard' | 'andels_laan';
  // Under Construction specific
  construction_completion_years?: number;
  payment_schedule?: PaymentScheduleItem[];
}

interface CalculationRequest {
  personal_finance: {
    salary?: number;
    tax_rate_override?: number | null;
    existing_flat_value?: number;
    existing_loan_size?: number;
  };
  scenario_settings: {
    years_to_sell: number;
    currency: 'EUR' | 'DKK';
  };
  spain_inputs?: Partial<CountryInputs>; // Use Partial if inputs might be optional
  denmark_inputs?: Partial<CountryInputs>;
}

// Define the expected structure for the calculation response
interface CalculationResult {
  summary?: {
    spain_scenario?: string;
    denmark_scenario?: string;
    executive_summary?: string;
  };
  comparison_results?: {
    spain?: any; // Define more specific types later
    denmark?: any;
  };
  calculation_details?: {
    assumptions?: string[];
    warnings?: string[];
    message?: string;
  };
  error?: string; // To handle potential errors from the backend
}

function App() {
  const [backendStatus, setBackendStatus] = useState<string>('Checking...');
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // --- Form State --- 
  // Simplified state for now, will need proper form management (e.g., react-hook-form)
  const [spainPropertyType, setSpainPropertyType] = useState<CountryInputs['property_type']>('new');
  const [spainPrice, setSpainPrice] = useState<number>(500000);
  const [spainCompletionYears, setSpainCompletionYears] = useState<number>(2);
  const [denmarkPropertyType, setDenmarkPropertyType] = useState<CountryInputs['property_type']>('ejer');
  const [denmarkPrice, setDenmarkPrice] = useState<number>(4000000);
  const [yearsToSell, setYearsToSell] = useState<number>(10);

  const API_BASE_URL = 'http://localhost:5000/api';

  useEffect(() => {
    fetch(`${API_BASE_URL}/ping`)
      .then(response => response.ok ? response.json() : Promise.reject(`HTTP ${response.status}`))
      .then(data => setBackendStatus(data.message || 'Connected'))
      .catch(error => {
        console.error("Error pinging backend:", error);
        setBackendStatus(`Error connecting: ${error}. Is backend running on ${API_BASE_URL}?`);
      });
  }, []);

  const handleCalculate = () => {
    setIsLoading(true);
    setError(null);
    setCalculationResult(null);

    // Build request data based on form state
    const requestData: CalculationRequest = {
      personal_finance: { salary: 100000 }, // Placeholder
      scenario_settings: { years_to_sell: yearsToSell, currency: "EUR" }, // Assume EUR for now
      spain_inputs: {
        city: "Barcelona",
        property_type: spainPropertyType,
        new_flat_price: spainPrice,
        renovations: [], // Placeholder
        ...(spainPropertyType === 'under_construction' && {
          construction_completion_years: spainCompletionYears,
          // Placeholder payment schedule
          payment_schedule: [{ percentage: 0.1, due_year: 0 }, { percentage: 0.9, due_year: spainCompletionYears }]
        })
      },
      denmark_inputs: {
        city: "Copenhagen",
        property_type: denmarkPropertyType,
        new_flat_price: denmarkPrice,
        renovations: [], // Placeholder
        // Add under_construction fields for Denmark if needed
      }
    };

    fetch(`${API_BASE_URL}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => Promise.reject(err.error || `HTTP ${response.status}`))
                           .catch(() => Promise.reject(`HTTP ${response.status}`));
        }
        return response.json();
      })
      .then((data: CalculationResult) => setCalculationResult(data))
      .catch(error => {
        console.error("Error calling calculation API:", error);
        setError(`Calculation failed: ${error}`);
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Property Investment Analyzer</h1>
        <p>Backend Status: {backendStatus}</p>
      </header>
      <main>
        {/* --- Placeholder Input Form --- */}
        <div>
          <h2>Inputs (Simplified)</h2>
          <div>
            <label>Years to Sell: </label>
            <input type="number" value={yearsToSell} onChange={e => setYearsToSell(parseInt(e.target.value, 10))} />
          </div>
          <hr />
          <div>
            <h3>Spain (Barcelona)</h3>
            <label>Property Type: </label>
            <select value={spainPropertyType} onChange={e => setSpainPropertyType(e.target.value as CountryInputs['property_type'])}>
              <option value="new">New</option>
              <option value="renovation_needed">Renovation Needed</option>
              <option value="under_construction">Under Construction</option>
            </select>
            <br />
            <label>Price (EUR): </label>
            <input type="number" value={spainPrice} onChange={e => setSpainPrice(parseInt(e.target.value, 10))} />
            <br />
            {spainPropertyType === 'under_construction' && (
              <div>
                <label>Completion (Years): </label>
                <input type="number" value={spainCompletionYears} onChange={e => setSpainCompletionYears(parseInt(e.target.value, 10))} />
                {/* Payment schedule input would go here */}
              </div>
            )}
          </div>
          <hr />
          <div>
            <h3>Denmark (Copenhagen)</h3>
            <label>Property Type: </label>
            <select value={denmarkPropertyType} onChange={e => setDenmarkPropertyType(e.target.value as CountryInputs['property_type'])}>
              <option value="ejer">Ejerlejlighed</option>
              <option value="andels">Andelslejlighed</option>
              {/* Add under_construction for Denmark if needed */}
            </select>
            <br />
            <label>Price (DKK): </label>
            <input type="number" value={denmarkPrice} onChange={e => setDenmarkPrice(parseInt(e.target.value, 10))} />
          </div>
        </div>
        <hr />

        <button onClick={handleCalculate} disabled={isLoading}>
          {isLoading ? 'Calculating...' : 'Run Calculation'}
        </button>

        {error && <p style={{ color: 'red' }}>Error: {error}</p>}

        {calculationResult && (
          <div>
            <h2>Calculation Results</h2>
            {calculationResult.summary && (
              <div>
                <h3>Summary</h3>
                <p>Spain: {calculationResult.summary.spain_scenario}</p>
                <p>Denmark: {calculationResult.summary.denmark_scenario}</p>
                <p>Executive Summary: {calculationResult.summary.executive_summary}</p>
              </div>
            )}
            {calculationResult.calculation_details?.warnings && calculationResult.calculation_details.warnings.length > 0 && (
                 <div>
                    <h4>Warnings:</h4>
                    <ul>
                        {calculationResult.calculation_details.warnings.map((warn, index) => <li key={index}>{warn}</li>)}
                    </ul>
                 </div>
            )}
            <pre>{JSON.stringify(calculationResult.comparison_results, null, 2)}</pre>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;

