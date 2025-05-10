import { useState, useEffect } from 'react';
import './App.css'; // Ensure Tailwind is configured via index.css or similar

// --- Interfaces (Keep or move to types.ts) ---

interface PaymentScheduleItem {
  percentage: number;
  due_year: number;
}

interface RenovationItem {
  id: string; // Add unique ID for list management
  type: string;
  description?: string;
  default_cost?: number; // Not used in input, maybe for display?
  adjusted_cost?: number;
}

interface LoanDetails {
  amount?: number;
  interest_rate?: number; // Annual rate (e.g., 0.035 for 3.5%)
  term_years?: number;
}

interface CountryInputs {
  city: string;
  property_type: 'new' | 'renovation_needed' | 'under_construction' | 'ejer' | 'andels';
  new_flat_price?: number;
  renovations: RenovationItem[];
  loan_details?: LoanDetails;
  // Spain specific
  beckham_law_active?: boolean;
  beckham_law_remaining_years?: number;
  // Denmark specific
  loan_type?: 'standard' | 'andels_laan';
  // Under Construction specific
  construction_completion_years?: number;
  payment_schedule?: PaymentScheduleItem[];
}

interface PersonalFinanceInputs {
  salary?: number;
  tax_rate_override?: number | null;
  existing_flat_value?: number;
  existing_loan_size?: number;
}

interface ScenarioSettingsInputs {
  years_to_sell: number;
  currency: 'EUR' | 'DKK';
}

interface CalculationRequest {
  personal_finance: PersonalFinanceInputs;
  scenario_settings: ScenarioSettingsInputs;
  spain_inputs?: Partial<CountryInputs>;
  denmark_inputs?: Partial<CountryInputs>;
}

// --- Result Interfaces (More Specific) ---
interface ScenarioResult {
    estimated_selling_price: number;
    total_investment_cost: number;
    total_running_costs: number;
    total_selling_costs: number;
    total_loan_interest_paid: number;
    net_win_loss: number;
    initial_outlay_year0: number;
    // Add more fields as needed from backend response
}

interface CountryResult {
    avg_case: ScenarioResult;
    low_growth_case: ScenarioResult;
    high_growth_case: ScenarioResult;
    zero_growth_case: ScenarioResult;
    purchase_costs: { total: number; breakdown: Record<string, number> };
    running_costs_annual: { total: number; breakdown: Record<string, number> };
    selling_costs: { total: number; breakdown: Record<string, number> };
    // Add more detailed fields
}

interface ComparisonResults {
    spain?: CountryResult;
    denmark?: CountryResult;
}

interface CalculationResult {
  summary?: {
    spain_scenario?: string;
    denmark_scenario?: string;
    executive_summary?: string;
  };
  comparison_results?: ComparisonResults;
  calculation_details?: {
    assumptions?: string[];
    warnings?: string[];
    message?: string;
  };
  error?: string;
}

// --- Helper Components (Placeholder - Implement with shadcn/ui later) ---

const InputField = ({ label, type = 'number', value, onChange, placeholder, tooltip, step }: any) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {tooltip && (
        // Using simple title attribute for tooltip for now
        <span className="ml-1 text-gray-400 cursor-help" title={tooltip}>ⓘ</span>
      )}
    </label>
    <input
      type={type}
      value={value === undefined || value === null ? '' : value} // Handle undefined/null for controlled input
      onChange={onChange}
      placeholder={placeholder}
      step={step}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
    />
  </div>
);

const SelectField = ({ label, value, onChange, options, tooltip }: any) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {tooltip && (
        <span className="ml-1 text-gray-400 cursor-help" title={tooltip}>ⓘ</span>
      )}
    </label>
    <select
      value={value}
      onChange={onChange}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white"
    >
      {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

const CheckboxField = ({ label, checked, onChange, tooltip }: any) => (
    <div className="flex items-center mb-4">
        <input
            id={label.replace(/\s+/g, '-')}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label htmlFor={label.replace(/\s+/g, '-')}
               className="ml-2 block text-sm text-gray-900">
            {label}
            {tooltip && (
                <span className="ml-1 text-gray-400 cursor-help" title={tooltip}>ⓘ</span>
            )}
        </label>
    </div>
);

// --- Renovation Input Component ---
const RenovationInput = ({ renovations, onChange, currency }: { renovations: RenovationItem[], onChange: (renos: RenovationItem[]) => void, currency: string }) => {
    const addRenovation = () => {
        onChange([...renovations, { id: Date.now().toString(), type: 'custom', adjusted_cost: 0 }]);
    };

    const updateRenovation = (id: string, field: keyof RenovationItem, value: any) => {
        onChange(renovations.map(reno => reno.id === id ? { ...reno, [field]: value } : reno));
    };

    const removeRenovation = (id: string) => {
        onChange(renovations.filter(reno => reno.id !== id));
    };

    return (
        <div className="mb-4 p-3 border rounded-md bg-gray-50">
            <h4 className="font-medium mb-2 text-md">Renovations (Optional)</h4>
            {renovations.length === 0 && <p className="text-xs text-gray-500 italic">No renovations added.</p>}
            {renovations.map((reno) => (
                <div key={reno.id} className="flex items-center space-x-2 mb-2 border-b pb-2">
                    <input
                        type="text"
                        value={reno.description || ''}
                        onChange={(e) => updateRenovation(reno.id, 'description', e.target.value)}
                        placeholder="Description (e.g., Kitchen, Paint)"
                        className="flex-grow px-2 py-1 border border-gray-300 rounded-md text-sm"
                        title="Brief description of the renovation work."
                    />
                    <div className="relative">
                        <input
                            type="number"
                            value={reno.adjusted_cost === undefined ? '' : reno.adjusted_cost}
                            onChange={(e) => updateRenovation(reno.id, 'adjusted_cost', parseInt(e.target.value, 10) || 0)}
                            placeholder="Cost"
                            className="w-28 pl-4 pr-2 py-1 border border-gray-300 rounded-md text-sm"
                            title={`Estimated cost of this renovation in ${currency}.`}
                        />
                        <span className="absolute left-1.5 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">{currency}</span>
                    </div>
                    <button onClick={() => removeRenovation(reno.id)} className="text-red-500 hover:text-red-700 p-1" title="Remove this renovation item">
                        {/* Placeholder for Trash icon */}
                        X
                    </button>
                </div>
            ))}
            <button onClick={addRenovation} className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 flex items-center">
                {/* Placeholder for Plus icon */}
                +
                Add Renovation Item
            </button>
        </div>
    );
};

// --- Payment Schedule Input Component (Placeholder) ---
const PaymentScheduleInput = ({ schedule, onChange }: { schedule: PaymentScheduleItem[] | undefined, onChange: (schedule: PaymentScheduleItem[]) => void }) => {
    // Basic placeholder - needs proper implementation with add/remove/edit
    const addPayment = () => {
        const currentSchedule = schedule || [];
        onChange([...currentSchedule, { percentage: 0, due_year: 0 }]);
    };

    const updatePayment = (index: number, field: keyof PaymentScheduleItem, value: any) => {
        const currentSchedule = schedule || [];
        onChange(currentSchedule.map((p, i) => i === index ? { ...p, [field]: parseFloat(value) || 0 } : p));
    };

    const removePayment = (index: number) => {
        const currentSchedule = schedule || [];
        onChange(currentSchedule.filter((_, i) => i !== index));
    };

    return (
        <div className="mb-4 p-3 border rounded-md bg-gray-50">
            <h4 className="font-medium mb-2 text-md">Payment Schedule (Under Construction)</h4>
            <p className="text-xs text-gray-500 mb-2 italic">Define payments made before completion (e.g., 10% at signing, 90% at completion). Total must be 100%.</p>
            {(schedule || []).map((payment, index) => (
                 <div key={index} className="flex items-center space-x-2 mb-2 border-b pb-2">
                     <input
                        type="number"
                        value={payment.percentage * 100}
                        onChange={(e) => updatePayment(index, 'percentage', parseFloat(e.target.value) / 100)}
                        placeholder="%"
                        className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm"
                        title="Percentage of purchase price due."
                    />
                    <span className="text-sm">% due in year</span>
                    <input
                        type="number"
                        value={payment.due_year}
                        onChange={(e) => updatePayment(index, 'due_year', parseInt(e.target.value, 10))}
                        placeholder="Year"
                        className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm"
                        title="Year payment is due (0 = signing/start, completion year = final payment)."
                    />
                     <button onClick={() => removePayment(index)} className="text-red-500 hover:text-red-700 p-1" title="Remove payment stage">
                        X
                    </button>
                 </div>
            ))}
             <button onClick={addPayment} className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 flex items-center">
                +
                Add Payment Stage
            </button>
        </div>
    );
};


// --- Results Display Component ---
const ResultsDisplay = ({ result, currency }: { result: CalculationResult, currency: string }) => {
    const formatCurrency = (value: number | undefined) => {
        if (value === undefined || value === null) return '-';
        return new Intl.NumberFormat(currency === 'EUR' ? 'de-DE' : 'da-DK', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(value);
    };

    const renderCountryResults = (countryData: CountryResult | undefined, countryName: string) => {
        if (!countryData) return <p className="text-gray-500 italic">No data entered for {countryName}.</p>;

        const scenarios = [
            { name: 'Avg Growth', data: countryData.avg_case, tooltip: 'Based on average market appreciation assumptions.' },
            { name: 'Low Growth', data: countryData.low_growth_case, tooltip: 'Assumes lower than average market appreciation.' },
            { name: 'High Growth', data: countryData.high_growth_case, tooltip: 'Assumes higher than average market appreciation.' },
            { name: 'Zero Growth', data: countryData.zero_growth_case, tooltip: 'Assumes no property value appreciation (comparison vs renting).' },
        ];

        return (
            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-center">{countryName}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    {scenarios.map(scenario => (
                        <div key={scenario.name} className="p-3 border rounded-md bg-gray-50 relative group">
                            <h4 className="text-sm font-medium mb-1">
                                {scenario.name}
                                <span className="ml-1 text-gray-400 cursor-help" title={scenario.tooltip}>ⓘ</span>
                            </h4>
                            <p className="text-xs text-gray-600">Net Win/Loss:</p>
                            <p className={`text-lg font-semibold ${scenario.data?.net_win_loss >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {formatCurrency(scenario.data?.net_win_loss)}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">Initial Outlay:</p>
                            <p className="text-sm text-gray-800">{formatCurrency(scenario.data?.initial_outlay_year0)}</p>
                        </div>
                    ))}
                </div>
                {/* Placeholder for detailed breakdown table */}
                <details className="mt-4 text-sm">
                    <summary className="cursor-pointer text-indigo-600 hover:underline">Show Detailed Breakdown (Raw JSON)</summary>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto mt-2">{JSON.stringify(countryData, null, 2)}</pre>
                </details>
            </div>
        );
    };

    return (
        <div>
            {result.summary && (
                <div className="mb-4 p-3 bg-indigo-50 rounded-md">
                    <h3 className="font-medium text-lg mb-2">Summary</h3>
                    {result.summary.spain_scenario && <p><strong>Spain:</strong> {result.summary.spain_scenario}</p>}
                    {result.summary.denmark_scenario && <p><strong>Denmark:</strong> {result.summary.denmark_scenario}</p>}
                </div>
            )}

            {result.calculation_details?.warnings && result.calculation_details.warnings.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <h4 className="font-medium text-yellow-800 mb-1">Warnings & Assumptions:</h4>
                    <ul className="list-disc list-inside text-sm text-yellow-700">
                        {result.calculation_details.warnings.map((warn, index) => <li key={index}>{warn}</li>)}
                    </ul>
                </div>
            )}

            {renderCountryResults(result.comparison_results?.spain, 'Spain (Barcelona)')}
            {renderCountryResults(result.comparison_results?.denmark, 'Denmark (Copenhagen)')}
        </div>
    );
};

// --- Main App Component ---

function App() {
  const [backendStatus, setBackendStatus] = useState<string>('Checking...');
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // --- Form State --- 
  const [personalFinance, setPersonalFinance] = useState<PersonalFinanceInputs>({});
  const [scenarioSettings, setScenarioSettings] = useState<ScenarioSettingsInputs>({ years_to_sell: 10, currency: 'EUR' });
  const [spainInputs, setSpainInputs] = useState<Partial<CountryInputs>>({ city: 'Barcelona', property_type: 'new', renovations: [], loan_details: {}, payment_schedule: [] });
  const [denmarkInputs, setDenmarkInputs] = useState<Partial<CountryInputs>>({ city: 'Copenhagen', property_type: 'ejer', renovations: [], loan_details: {}, payment_schedule: [] });

  const API_BASE_URL = 'http://localhost:5000/api'; // Make this configurable if needed

  useEffect(() => {
    // Ping backend on initial load
    fetch(`${API_BASE_URL}/ping`)
      .then(response => response.ok ? response.json() : Promise.reject(`HTTP ${response.status}`))
      .then(data => setBackendStatus(data.message || 'Connected'))
      .catch(error => {
        console.error("Error pinging backend:", error);
        setBackendStatus(`Error connecting: ${error}. Is backend running on ${API_BASE_URL}?`);
      });
  }, []);

  // --- Input Handlers --- 
  const handleScenarioChange = (field: keyof ScenarioSettingsInputs, value: any) => {
    // Ensure years_to_sell is a number
    const processedValue = field === 'years_to_sell' ? (parseInt(value, 10) || 0) : value;
    setScenarioSettings(prev => ({ ...prev, [field]: processedValue }));
  };

  const handlePersonalFinanceChange = (field: keyof PersonalFinanceInputs, value: any) => {
    // Ensure numeric fields are numbers or undefined
    const numericFields: (keyof PersonalFinanceInputs)[] = ['salary', 'tax_rate_override', 'existing_flat_value', 'existing_loan_size'];
    const processedValue = numericFields.includes(field) ? (value === '' ? undefined : parseFloat(value)) : value;
    setPersonalFinance(prev => ({ ...prev, [field]: processedValue }));
  };

  const handleCountryInputChange = (country: 'spain' | 'denmark', field: keyof CountryInputs | `loan_${keyof LoanDetails}` | 'renovations' | 'payment_schedule', value: any) => {
    const setter = country === 'spain' ? setSpainInputs : setDenmarkInputs;
    setter(prev => {
        const newState = { ...prev };
        const numericFields: (keyof CountryInputs | `loan_${keyof LoanDetails}`)[] = [
            'new_flat_price', 'construction_completion_years', 'beckham_law_remaining_years',
            'loan_amount', 'loan_interest_rate', 'loan_term_years'
        ];
        let processedValue = value;
        if (typeof field === 'string' && numericFields.includes(field)) {
            processedValue = value === '' ? undefined : parseFloat(value);
            // Handle percentage conversion for interest rate
            if (field === 'loan_interest_rate') {
                processedValue = processedValue !== undefined ? processedValue / 100 : undefined;
            }
        }

        if (field === 'renovations') {
            newState.renovations = value as RenovationItem[];
        } else if (field === 'payment_schedule') {
            newState.payment_schedule = value as PaymentScheduleItem[];
        } else if (typeof field === 'string' && field.startsWith('loan_')) {
            const loanField = field.substring(5) as keyof LoanDetails;
            newState.loan_details = { ...(newState.loan_details || {}), [loanField]: processedValue };
        } else {
            (newState as any)[field] = processedValue;
        }
        // Reset conditional fields if property type changes
        if (field === 'property_type') {
            if (value !== 'under_construction') {
                delete newState.construction_completion_years;
                newState.payment_schedule = []; // Clear schedule when not under construction
            }
            if (country === 'denmark' && value !== 'andels') {
                delete newState.loan_type;
            }
        }
        return newState;
    });
  };

  // --- Calculation Trigger --- 
  const handleCalculate = () => {
    setIsLoading(true);
    setError(null);
    setCalculationResult(null);

    // Basic validation (can be expanded)
    if (!scenarioSettings.years_to_sell || scenarioSettings.years_to_sell <= 0) {
        setError("Please enter a valid number of years to sell.");
        setIsLoading(false);
        return;
    }
    if (!spainInputs.new_flat_price && !denmarkInputs.new_flat_price) {
        setError("Please enter a purchase price for at least one country.");
        setIsLoading(false);
        return;
    }

    // Validate Payment Schedule for 'under_construction'
    const validatePaymentSchedule = (inputs: Partial<CountryInputs> | undefined): string | null => {
        if (inputs?.property_type === 'under_construction') {
            const schedule = inputs.payment_schedule || [];
            if (schedule.length === 0) return "Payment schedule is required for 'Under Construction' properties.";
            const totalPercentage = schedule.reduce((sum, p) => sum + (p.percentage || 0), 0);
            if (Math.abs(totalPercentage - 1) > 0.001) { // Allow for floating point inaccuracies
                return `Payment schedule percentages must sum to 100% (currently ${ (totalPercentage * 100).toFixed(1) }%).`;
            }
            if (!schedule.some(p => p.due_year === inputs.construction_completion_years)) {
                // Optional: Could enforce final payment at completion year
            }
        }
        return null;
    };

    const spainPaymentError = validatePaymentSchedule(spainInputs);
    const denmarkPaymentError = validatePaymentSchedule(denmarkInputs);
    if (spainPaymentError) {
        setError(`Spain Input Error: ${spainPaymentError}`);
        setIsLoading(false);
        return;
    }
     if (denmarkPaymentError) {
        setError(`Denmark Input Error: ${denmarkPaymentError}`);
        setIsLoading(false);
        return;
    }

    // Clean up renovation items with no cost or description before sending
    const cleanRenovations = (renos: RenovationItem[]) => 
        renos.filter(r => r.adjusted_cost && r.adjusted_cost > 0 && r.description && r.description.trim() !== '')
             .map(({ id, ...rest }) => rest); // Remove client-side ID before sending
    
    // Clean up payment schedule items
    const cleanPaymentSchedule = (schedule: PaymentScheduleItem[] | undefined) => 
        schedule?.filter(p => p.percentage > 0 && p.due_year >= 0);

    // Build request data
    const requestData: CalculationRequest = {
      personal_finance: personalFinance,
      scenario_settings: scenarioSettings,
      spain_inputs: spainInputs.new_flat_price ? { 
          ...spainInputs, 
          city: 'Barcelona', 
          renovations: cleanRenovations(spainInputs.renovations || []), 
          payment_schedule: cleanPaymentSchedule(spainInputs.payment_schedule)
      } : undefined,
      denmark_inputs: denmarkInputs.new_flat_price ? { 
          ...denmarkInputs, 
          city: 'Copenhagen', 
          renovations: cleanRenovations(denmarkInputs.renovations || []), 
          payment_schedule: cleanPaymentSchedule(denmarkInputs.payment_schedule)
      } : undefined,
    };

    // Clean up empty loan details before sending
    const cleanLoanDetails = (inputs: Partial<CountryInputs> | undefined) => {
        if (inputs?.loan_details) {
            const { amount, interest_rate, term_years } = inputs.loan_details;
            // Only include loan details if all required fields are present and valid
            if (amount === undefined || interest_rate === undefined || term_years === undefined || amount <= 0 || interest_rate <= 0 || term_years <= 0) {
                 delete inputs.loan_details; // Remove if incomplete or invalid
            }
        }
    };
    cleanLoanDetails(requestData.spain_inputs);
    cleanLoanDetails(requestData.denmark_inputs);

    console.log("Sending request:", JSON.stringify(requestData, null, 2)); // Log request for debugging

    fetch(`${API_BASE_URL}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => Promise.reject(err.error || `HTTP ${response.status}: ${err.message || 'Unknown error'}`))
                           .catch(() => Promise.reject(`HTTP ${response.status}`));
        }
        return response.json();
      })
      .then((data: CalculationResult) => {
        console.log("Received result:", data); // Log result for debugging
        setCalculationResult(data);
      })
      .catch(error => {
        console.error("Error calling calculation API:", error);
        setError(`Calculation failed: ${error}`);
      })
      .finally(() => setIsLoading(false));
  };

  // --- Render --- 
  return (
    <div className="container mx-auto p-4 font-sans">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800">Property Investment Analyzer</h1>
        <p className="text-sm text-gray-500">Barcelona vs. Copenhagen</p>
        <p className="text-xs text-gray-400 mt-2">Backend Status: {backendStatus}</p>
      </header>

      {/* Main Content Area - Use Grid for Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Input Section (Spans 2 columns on medium screens) */}
        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-6 border-b pb-2">Inputs</h2>

          {/* Scenario Settings */}
          <div className="mb-6 p-4 border rounded-md bg-gray-50">
            <h3 className="font-medium mb-3 text-lg">Scenario Settings</h3>
            <InputField
              label="Years to Sell"
              value={scenarioSettings.years_to_sell}
              onChange={(e: any) => handleScenarioChange('years_to_sell', e.target.value)}
              tooltip="The number of years you plan to hold the property before selling. Affects appreciation and total costs."
            />
            <SelectField
              label="Display Currency"
              value={scenarioSettings.currency}
              onChange={(e: any) => handleScenarioChange('currency', e.target.value)}
              options={[{ value: 'EUR', label: 'EUR' }, { value: 'DKK', label: 'DKK' }]}
              tooltip="Select the primary currency for displaying results. Calculations are performed in local currency and converted if necessary (Note: Conversion not yet implemented)."
            />
          </div>

          {/* Personal Finance */}
          <div className="mb-6 p-4 border rounded-md bg-gray-50">
             <h3 className="font-medium mb-3 text-lg">Personal Finance (Optional)</h3>
             <InputField
                label="Gross Annual Salary"
                value={personalFinance.salary}
                onChange={(e: any) => handlePersonalFinanceChange('salary', e.target.value)}
                tooltip="Your gross annual income. Used for potential future affordability/tax calculations (currently basic implementation)."
             />
             {/* Add other personal finance inputs here if needed */}
          </div>

          {/* Country Inputs - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spain Inputs */}
            <div className="p-4 border rounded-md">
              <h3 className="font-medium mb-3 text-lg text-center">Spain (Barcelona)</h3>
              <InputField
                label="Purchase Price (EUR)"
                value={spainInputs.new_flat_price}
                onChange={(e: any) => handleCountryInputChange('spain', 'new_flat_price', e.target.value)}
                placeholder="e.g., 500000"
                tooltip="The agreed purchase price of the property in EUR."
              />
              <SelectField
                label="Property Type"
                value={spainInputs.property_type}
                onChange={(e: any) => handleCountryInputChange('spain', 'property_type', e.target.value)}
                options={[
                  { value: 'new', label: 'New Build' },
                  { value: 'renovation_needed', label: 'Resale (Needs Renovation)' },
                  { value: 'under_construction', label: 'Under Construction' },
                ]}
                tooltip="Select the type of property. Affects purchase taxes (VAT vs ITP) and input options."
              />
              {spainInputs.property_type === 'under_construction' && (
                <>
                  <InputField
                    label="Completion Time (Years)"
                    value={spainInputs.construction_completion_years}
                    onChange={(e: any) => handleCountryInputChange('spain', 'construction_completion_years', e.target.value)}
                    tooltip="Estimated years from purchase until the property construction is complete and habitable."
                  />
                  <PaymentScheduleInput 
                    schedule={spainInputs.payment_schedule}
                    onChange={(schedule) => handleCountryInputChange('spain', 'payment_schedule', schedule)}
                  />
                </>
              )}
              <RenovationInput 
                renovations={spainInputs.renovations || []} 
                onChange={(renos) => handleCountryInputChange('spain', 'renovations', renos)}
                currency="EUR"
              />
              
              <h4 className="font-medium mt-4 mb-2 text-md">Loan Details (Optional)</h4>
              <InputField
                label="Loan Amount (EUR)"
                value={spainInputs.loan_details?.amount}
                onChange={(e: any) => handleCountryInputChange('spain', 'loan_amount', e.target.value)}
                tooltip="Amount borrowed for the purchase. Required if you want loan interest costs included in the win/loss calculation."
              />
              <InputField
                label="Interest Rate (% Annual)"
                value={spainInputs.loan_details?.interest_rate !== undefined ? spainInputs.loan_details.interest_rate * 100 : ''}
                onChange={(e: any) => handleCountryInputChange('spain', 'loan_interest_rate', e.target.value)}
                placeholder="e.g., 3.5"
                tooltip="Annual interest rate for the loan (e.g., 3.5 for 3.5%). Required for interest calculation."
                step="0.01"
              />
              <InputField
                label="Loan Term (Years)"
                value={spainInputs.loan_details?.term_years}
                onChange={(e: any) => handleCountryInputChange('spain', 'loan_term_years', e.target.value)}
                tooltip="Total duration of the loan in years (e.g., 30). Required for interest calculation."
              />
               <CheckboxField
                    label="Beckham Law Active?"
                    checked={spainInputs.beckham_law_active || false}
                    onChange={(e: any) => handleCountryInputChange('spain', 'beckham_law_active', e.target.checked)}
                    tooltip="Check if you are eligible for Spain's special Beckham Law tax regime for impatriates. Affects capital gains tax calculation (simplified)."
                />
                {spainInputs.beckham_law_active && (
                    <InputField
                        label="Beckham Law Remaining Years"
                        value={spainInputs.beckham_law_remaining_years}
                        onChange={(e: any) => handleCountryInputChange('spain', 'beckham_law_remaining_years', e.target.value)}
                        tooltip="How many years remain on your Beckham Law eligibility at the time of selling (max 6 total). Affects capital gains tax rate."
                    />
                )}
            </div>

            {/* Denmark Inputs */}
            <div className="p-4 border rounded-md">
              <h3 className="font-medium mb-3 text-lg text-center">Denmark (Copenhagen)</h3>
              <InputField
                label="Purchase Price (DKK)"
                value={denmarkInputs.new_flat_price}
                onChange={(e: any) => handleCountryInputChange('denmark', 'new_flat_price', e.target.value)}
                placeholder="e.g., 4000000"
                tooltip="The agreed purchase price of the property in DKK."
              />
              <SelectField
                label="Property Type"
                value={denmarkInputs.property_type}
                onChange={(e: any) => handleCountryInputChange('denmark', 'property_type', e.target.value)}
                options={[
                  { value: 'ejer', label: 'Ejerlejlighed (Owner)' },
                  { value: 'andels', label: 'Andelslejlighed (Cooperative)' },
                  { value: 'under_construction', label: 'Under Construction' },
                ]}
                tooltip="Select the type of property. Affects costs and available loan types."
              />
               {denmarkInputs.property_type === 'andels' && (
                 <SelectField
                    label="Loan Type"
                    value={denmarkInputs.loan_type || 'standard'}
                    onChange={(e: any) => handleCountryInputChange('denmark', 'loan_type', e.target.value)}
                    options={[
                        { value: 'standard', label: 'Standard Mortgage' },
                        { value: 'andels_laan', label: 'Andelsboliglån (Co-op Loan)' },
                    ]}
                    tooltip="Select loan type. Andelsboliglån often has different terms/rates."
                 />
               )}
              {denmarkInputs.property_type === 'under_construction' && (
                <>
                  <InputField
                    label="Completion Time (Years)"
                    value={denmarkInputs.construction_completion_years}
                    onChange={(e: any) => handleCountryInputChange('denmark', 'construction_completion_years', e.target.value)}
                    tooltip="Estimated years from purchase until the property construction is complete and habitable."
                  />
                   <PaymentScheduleInput 
                    schedule={denmarkInputs.payment_schedule}
                    onChange={(schedule) => handleCountryInputChange('denmark', 'payment_schedule', schedule)}
                  />
                </>
              )}
              <RenovationInput 
                renovations={denmarkInputs.renovations || []} 
                onChange={(renos) => handleCountryInputChange('denmark', 'renovations', renos)}
                currency="DKK"
              />
              
              <h4 className="font-medium mt-4 mb-2 text-md">Loan Details (Optional)</h4>
              <InputField
                label="Loan Amount (DKK)"
                value={denmarkInputs.loan_details?.amount}
                onChange={(e: any) => handleCountryInputChange('denmark', 'loan_amount', e.target.value)}
                tooltip="Amount borrowed for the purchase. Required if you want loan interest costs included in the win/loss calculation."
              />
              <InputField
                label="Interest Rate (% Annual)"
                value={denmarkInputs.loan_details?.interest_rate !== undefined ? denmarkInputs.loan_details.interest_rate * 100 : ''}
                onChange={(e: any) => handleCountryInputChange('denmark', 'loan_interest_rate', e.target.value)}
                placeholder="e.g., 2.5"
                tooltip="Annual interest rate for the loan (e.g., 2.5 for 2.5%). Required for interest calculation."
                step="0.01"
              />
              <InputField
                label="Loan Term (Years)"
                value={denmarkInputs.loan_details?.term_years}
                onChange={(e: any) => handleCountryInputChange('denmark', 'loan_term_years', e.target.value)}
                tooltip="Total duration of the loan in years (e.g., 30). Required for interest calculation."
              />
            </div>
          </div>

          {/* Calculation Button */}
          <div className="mt-8 text-center">
            <button
              onClick={handleCalculate}
              disabled={isLoading}
              className={`px-6 py-3 font-semibold rounded-md text-white ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'}`}
            >
              {isLoading ? 'Calculating...' : 'Run Calculation'}
            </button>
          </div>

        </div>

        {/* Results Section (Spans 1 column) */}
        <div className="md:col-span-1">
          <div className="sticky top-4 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-6 border-b pb-2">Results</h2>
            {error && <p className="text-red-600 bg-red-100 p-3 rounded-md mb-4">Error: {error}</p>}
            {isLoading && <p className="text-gray-600">Loading results...</p>}
            {!isLoading && !error && !calculationResult && <p className="text-gray-500">Enter details and run calculation.</p>}
            
            {calculationResult && (
              <ResultsDisplay result={calculationResult} currency={scenarioSettings.currency} />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;

