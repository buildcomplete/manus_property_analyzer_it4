import { useState, useEffect } from 'react';
import './App.css'; // Ensure Tailwind is configured via index.css or similar

// --- Interfaces (Keep or move to types.ts) ---

interface PaymentScheduleItem {
  percentage: number;
  due_year: number;
}

// Interface for frontend state management (includes client-side ID)
interface RenovationItem {
  id: string; // Unique ID for list management in UI
  type: string;
  description?: string;
  default_cost?: number; // Not used in input, maybe for display?
  adjusted_cost?: number;
}

// Interface for the renovation data sent to the backend (excludes client-side ID)
type RenovationPayloadItem = Omit<RenovationItem, 'id'>;

interface LoanDetails {
  amount?: number;
  interest_rate?: number; // Annual rate (e.g., 0.035 for 3.5%)
  term_years?: number;
}

// Interface for scenario-specific inputs SENT TO BACKEND
interface ScenarioInputsPayload {
  country: 'spain' | 'denmark';
  city: string; // e.g., 'barcelona', 'copenhagen'
  property_type: 'new' | 'second_hand' | 'under_construction' | 'ejer' | 'andels'; // 'second_hand' replaces 'renovation_needed'
  new_flat_price?: number;
  renovations: RenovationPayloadItem[]; // Renovations always possible
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

// Interface for scenario-specific inputs used in FRONTEND STATE
// Extends the payload but uses the RenovationItem with ID for state management
interface ScenarioInputsState extends Omit<ScenarioInputsPayload, 'renovations'> {
    id: string; // Unique ID for the scenario itself
    name: string; // User-editable name for the scenario tab
    renovations: RenovationItem[];
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

// Interface for the main request SENT TO BACKEND
interface CalculationRequest {
  personal_finance: PersonalFinanceInputs;
  scenario_settings: ScenarioSettingsInputs;
  scenarios: ScenarioInputsPayload[]; // List of scenarios
}

// --- Result Interfaces (Adjusted for Multi-Scenario) ---
interface SingleScenarioResult {
    // Corresponds to the output of perform_calculation_for_scenario
    inputs_summary: Record<string, any>;
    purchase_costs: { total_investment_cost: number; initial_outlay_year0: number; breakdown: Record<string, any> };
    running_costs: { total: number; breakdown_annual: Record<string, any>; breakdown_total: Record<string, any> };
    total_loan_interest_paid_over_hold: number;
    scenario_outcomes: {
        average: { selling_price: number; win_loss: number; [key: string]: any };
        low_risk: { selling_price: number; win_loss: number; [key: string]: any };
        high_risk: { selling_price: number; win_loss: number; [key: string]: any };
        zero_growth: { selling_price: number; win_loss: number; [key: string]: any };
    };
    calculation_details?: {
        warnings?: string[];
    };
    error?: string;
}

// The backend now returns a list of results, one per input scenario
type CalculationResponse = SingleScenarioResult[];

// --- Helper Components (Placeholder - Implement with shadcn/ui later) ---

const InputField = ({ label, type = 'number', value, onChange, placeholder, tooltip, step, disabled = false }: any) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {tooltip && (
        <span className="ml-1 text-gray-400 cursor-help" title={tooltip}>ⓘ</span>
      )}
    </label>
    <input
      type={type}
      value={value === undefined || value === null ? '' : value} // Handle undefined/null for controlled input
      onChange={onChange}
      placeholder={placeholder}
      step={step}
      disabled={disabled}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
    />
  </div>
);

const SelectField = ({ label, value, onChange, options, tooltip, disabled = false }: any) => (
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
      disabled={disabled}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
    >
      {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

const CheckboxField = ({ label, checked, onChange, tooltip, disabled = false }: any) => (
    <div className="flex items-center mb-4">
        <input
            id={label.replace(/\s+/g, '-')}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className={`h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 ${disabled ? 'cursor-not-allowed' : ''}`}
        />
        <label htmlFor={label.replace(/\s+/g, '-')}
               className={`ml-2 block text-sm ${disabled ? 'text-gray-500' : 'text-gray-900'}`}>
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

// --- Payment Schedule Input Component ---
const PaymentScheduleInput = ({ schedule, onChange }: { schedule: PaymentScheduleItem[] | undefined, onChange: (schedule: PaymentScheduleItem[]) => void }) => {
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

    // Calculate total percentage
    const totalPercentage = (schedule || []).reduce((sum, p) => sum + (p.percentage || 0), 0);

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
            <p className={`text-xs mt-2 ${Math.abs(totalPercentage - 1.0) > 0.001 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                Total Percentage: {(totalPercentage * 100).toFixed(1)}%
            </p>
        </div>
    );
};

// --- Scenario Input Component ---
const ScenarioInput = ({ scenario, onChange, onRemove, currency }: { scenario: ScenarioInputsState, onChange: (updatedScenario: ScenarioInputsState) => void, onRemove: () => void, currency: string }) => {

    const handleInputChange = (field: keyof ScenarioInputsPayload, value: any) => {
        onChange({ ...scenario, [field]: value });
    };

    const handleNestedChange = (section: 'loan_details', field: keyof LoanDetails, value: any) => {
        onChange({ ...scenario, [section]: { ...scenario[section], [field]: value } });
    };

    const handleRenovationChange = (renos: RenovationItem[]) => {
        onChange({ ...scenario, renovations: renos });
    };

    const handlePaymentScheduleChange = (schedule: PaymentScheduleItem[]) => {
        onChange({ ...scenario, payment_schedule: schedule });
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ ...scenario, name: e.target.value });
    };

    const countryOptions = [
        { value: 'spain', label: 'Spain' },
        { value: 'denmark', label: 'Denmark' },
    ];

    const cityOptions = scenario.country === 'spain' ? [{ value: 'barcelona', label: 'Barcelona' }] : [{ value: 'copenhagen', label: 'Copenhagen' }];

    const propertyTypeOptions = scenario.country === 'spain' ? [
        { value: 'new', label: 'New Build' },
        { value: 'second_hand', label: 'Second Hand' }, // Renamed
        { value: 'under_construction', label: 'Under Construction' },
    ] : [
        { value: 'ejer', label: 'Ejerlejlighed (Owner Flat)' },
        { value: 'andels', label: 'Andelslejlighed (Cooperative Flat)' },
        { value: 'new', label: 'New Build' }, // New build possible in DK too
        { value: 'under_construction', label: 'Under Construction' },
    ];

    const loanTypeOptions = [
        { value: 'standard', label: 'Standard Mortgage' },
        { value: 'andels_laan', label: 'Andelslån (Cooperative Loan)' },
    ];

    return (
        <div className="p-4 border border-gray-200 rounded-lg mb-4 bg-white shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <input
                    type="text"
                    value={scenario.name}
                    onChange={handleNameChange}
                    className="text-lg font-semibold border-b-2 border-transparent focus:border-indigo-500 outline-none"
                />
                <button onClick={onRemove} className="text-sm text-red-600 hover:text-red-800">Remove Scenario</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                {/* Column 1 */}
                <div>
                    <SelectField
                        label="Country"
                        value={scenario.country}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            const newCountry = e.target.value as 'spain' | 'denmark';
                            // Reset city and potentially type when country changes
                            const newCity = newCountry === 'spain' ? 'barcelona' : 'copenhagen';
                            const newType = newCountry === 'spain' ? 'new' : 'ejer';
                            onChange({ ...scenario, country: newCountry, city: newCity, property_type: newType });
                        }}
                        options={countryOptions}
                        tooltip="Select the country for this scenario."
                    />
                    <SelectField
                        label="City"
                        value={scenario.city}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('city', e.target.value)}
                        options={cityOptions}
                        disabled={true} // Only one city per country for now
                        tooltip="City within the selected country (currently fixed)."
                    />
                    <SelectField
                        label="Property Type"
                        value={scenario.property_type}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('property_type', e.target.value)}
                        options={propertyTypeOptions}
                        tooltip="Type of property being considered."
                    />
                    <InputField
                        label="Property Price"
                        value={scenario.new_flat_price}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('new_flat_price', parseInt(e.target.value, 10) || undefined)}
                        placeholder={`Enter price in ${currency}`}
                        tooltip={`Purchase price of the property in ${currency}.`}
                    />

                    {/* Conditional: Under Construction */}
                    {scenario.property_type === 'under_construction' && (
                        <>
                            <InputField
                                label="Completion (Years from now)"
                                value={scenario.construction_completion_years}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('construction_completion_years', parseInt(e.target.value, 10) || undefined)}
                                placeholder="e.g., 2"
                                tooltip="Estimated number of years until construction is complete and property is usable."
                            />
                            <PaymentScheduleInput
                                schedule={scenario.payment_schedule}
                                onChange={handlePaymentScheduleChange}
                            />
                        </>
                    )}
                </div>

                {/* Column 2 */}
                <div>
                    <h4 className="font-medium mb-2 text-md">Loan Details (Optional)</h4>
                    <InputField
                        label="Loan Amount"
                        value={scenario.loan_details?.amount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNestedChange('loan_details', 'amount', parseInt(e.target.value, 10) || undefined)}
                        placeholder={`Defaults to 80% of price`}
                        tooltip={`Amount borrowed in ${currency}. Leave blank to use 80% LTV.`}
                    />
                    <InputField
                        label="Interest Rate (% p.a.)"
                        value={scenario.loan_details?.interest_rate !== undefined ? scenario.loan_details.interest_rate * 100 : ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNestedChange('loan_details', 'interest_rate', parseFloat(e.target.value) / 100 || undefined)}
                        placeholder="e.g., 3.5"
                        step="0.01"
                        tooltip="Annual interest rate for the loan (e.g., 3.5 for 3.5%)."
                    />
                    <InputField
                        label="Loan Term (Years)"
                        value={scenario.loan_details?.term_years}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNestedChange('loan_details', 'term_years', parseInt(e.target.value, 10) || undefined)}
                        placeholder="e.g., 30"
                        tooltip="Total duration of the loan in years."
                    />

                    {/* Conditional: Denmark */}
                    {scenario.country === 'denmark' && (
                        <SelectField
                            label="Loan Type (Denmark)"
                            value={scenario.loan_type || 'standard'}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('loan_type', e.target.value)}
                            options={loanTypeOptions}
                            disabled={scenario.property_type !== 'andels'} // Only relevant for Andels
                            tooltip="Specific loan type, relevant for Andelslejlighed."
                        />
                    )}

                    {/* Conditional: Spain */}
                    {scenario.country === 'spain' && (
                        <>
                            <CheckboxField
                                label="Beckham Law Active?"
                                checked={scenario.beckham_law_active || false}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('beckham_law_active', e.target.checked)}
                                tooltip="Check if the special Beckham Law tax regime applies."
                            />
                            <InputField
                                label="Beckham Law Remaining Years"
                                value={scenario.beckham_law_remaining_years}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('beckham_law_remaining_years', parseInt(e.target.value, 10) || undefined)}
                                placeholder="e.g., 4"
                                disabled={!scenario.beckham_law_active}
                                tooltip="Number of years remaining under the Beckham Law regime."
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Renovations - Always visible (CR1.1) */}
            <RenovationInput
                renovations={scenario.renovations}
                onChange={handleRenovationChange}
                currency={currency}
            />
        </div>
    );
};


// --- Results Display Component (Adjusted for Multi-Scenario) ---
const ResultsDisplay = ({ results, currency }: { results: CalculationResponse | null, currency: string }) => {
    const formatCurrency = (value: number | undefined) => {
        if (value === undefined || value === null) return '-';
        return new Intl.NumberFormat(currency === 'EUR' ? 'de-DE' : 'da-DK', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(value);
    };

    if (!results) {
        return null; // Don't render if no results
    }

    if (results.some(r => r.error)) {
        return (
            <div className="mt-6 p-4 bg-red-100 border border-red-300 rounded-md">
                <h3 className="font-medium text-red-800 mb-2">Calculation Error</h3>
                {results.map((result, index) => result.error ? <p key={index} className="text-sm text-red-700">Scenario {index + 1}: {result.error}</p> : null)}
            </div>
        );
    }

    // Placeholder for a more sophisticated table/chart view (CR1.4)
    // For now, display key metrics per scenario
    return (
        <div className="mt-8 pt-6 border-t">
            <h2 className="text-2xl font-semibold mb-4 text-center">Calculation Results</h2>
            <div className="space-y-6">
                {results.map((result, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50 shadow-sm">
                        <h3 className="text-lg font-semibold mb-3">
                            Scenario {index + 1}: {result.inputs_summary?.country?.toUpperCase()} - {result.inputs_summary?.city} ({result.inputs_summary?.property_type})
                        </h3>
                        {result.calculation_details?.warnings && result.calculation_details.warnings.length > 0 && (
                            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-xs">
                                <h5 className="font-medium text-yellow-800 mb-1">Warnings:</h5>
                                <ul className="list-disc list-inside text-yellow-700">
                                    {result.calculation_details.warnings.map((warn, idx) => <li key={idx}>{warn}</li>)}
                                </ul>
                            </div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                            {Object.entries(result.scenario_outcomes || {}).map(([scenarioName, outcome]) => (
                                <div key={scenarioName} className="p-3 border rounded-md bg-white">
                                    <h4 className="text-sm font-medium mb-1 capitalize">{scenarioName.replace('_', ' ')}</h4>
                                    <p className="text-xs text-gray-600">Net Win/Loss:</p>
                                    <p className={`text-lg font-semibold ${outcome.win_loss >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                        {formatCurrency(outcome.win_loss)}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">Initial Outlay:</p>
                                    <p className="text-sm text-gray-800">{formatCurrency(result.purchase_costs?.initial_outlay_year0)}</p>
                                </div>
                            ))}
                        </div>
                        <details className="mt-4 text-sm">
                            <summary className="cursor-pointer text-indigo-600 hover:underline">Show Full Details (Raw JSON)</summary>
                            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto mt-2">{JSON.stringify(result, null, 2)}</pre>
                        </details>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main App Component ---

function App() {
  const [backendStatus, setBackendStatus] = useState<string>('Checking...');
  const [calculationResult, setCalculationResult] = useState<CalculationResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('scenario-0'); // ID of the active scenario tab

  // --- Form State (Refactored for Multi-Scenario) --- 
  const [personalFinance, setPersonalFinance] = useState<PersonalFinanceInputs>({});
  const [scenarioSettings, setScenarioSettings] = useState<ScenarioSettingsInputs>({ years_to_sell: 10, currency: 'EUR' });
  const [scenarios, setScenarios] = useState<ScenarioInputsState[]>([
      // Initial default scenario
      { id: 'scenario-0', name: 'Scenario 1', country: 'spain', city: 'barcelona', property_type: 'new', renovations: [] }
  ]);

  // --- Handlers --- 

  const handlePersonalFinanceChange = (field: keyof PersonalFinanceInputs, value: any) => {
    setPersonalFinance(prev => ({ ...prev, [field]: value }));
  };

  const handleScenarioSettingsChange = (field: keyof ScenarioSettingsInputs, value: any) => {
    setScenarioSettings(prev => ({ ...prev, [field]: value }));
    // Potentially reset results when settings change?
    setCalculationResult(null);
  };

  const handleScenarioChange = (updatedScenario: ScenarioInputsState) => {
    setScenarios(prev => prev.map(s => s.id === updatedScenario.id ? updatedScenario : s));
    setCalculationResult(null); // Reset results on input change
  };

  const addScenario = () => {
      const newId = `scenario-${Date.now()}`;
      setScenarios(prev => [
          ...prev,
          // Add a default new scenario (e.g., copy of the first one or a blank one)
          { id: newId, name: `Scenario ${prev.length + 1}`, country: 'denmark', city: 'copenhagen', property_type: 'ejer', renovations: [] }
      ]);
      setActiveTab(newId); // Switch to the new tab
      setCalculationResult(null);
  };

  const removeScenario = (idToRemove: string) => {
      if (scenarios.length <= 1) return; // Don't remove the last scenario
      setScenarios(prev => prev.filter(s => s.id !== idToRemove));
      // If the active tab was removed, switch to the first remaining tab
      if (activeTab === idToRemove) {
          setActiveTab(scenarios.filter(s => s.id !== idToRemove)[0]?.id || '');
      }
      setCalculationResult(null);
  };

  // Helper to remove client-side IDs before sending to backend
  const cleanScenarioForPayload = (scenario: ScenarioInputsState): ScenarioInputsPayload => {
      const { id, name, renovations, ...payload } = scenario;
      const cleanedRenovations = renovations.map(({ id: renoId, ...renoPayload }) => renoPayload);
      return { ...payload, renovations: cleanedRenovations };
  };

  const handleCalculate = async () => {
    setIsLoading(true);
    setError(null);
    setCalculationResult(null);

    const requestPayload: CalculationRequest = {
        personal_finance: personalFinance,
        scenario_settings: scenarioSettings,
        scenarios: scenarios.map(cleanScenarioForPayload) // Send cleaned scenarios
    };

    console.log("Sending request:", JSON.stringify(requestPayload, null, 2));

    try {
      // Use environment variable for API URL if available, otherwise default
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'; 
      const response = await fetch(`${apiUrl}/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result: CalculationResponse = await response.json();
      console.log("Received result:", result);
      setCalculationResult(result);

    } catch (err: any) {
      console.error("Calculation error:", err);
      setError(err.message || 'Failed to fetch calculation results.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Effects --- 
  useEffect(() => {
    // Check backend status on load
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    fetch(`${apiUrl}/status`)
      .then(response => response.json())
      .then(data => setBackendStatus(data.status || 'Error'))
      .catch(() => setBackendStatus('Unreachable'));
  }, []);

  // --- Render --- 
  return (
    <div className="container mx-auto p-4 md:p-8 font-sans">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800">Property Investment Analysis Tool</h1>
        <p className="text-sm text-gray-500">Compare property investment scenarios (v1.4 - Multi-Scenario)</p>
        <p className="text-xs text-gray-400">Backend Status: {backendStatus}</p>
      </header>

      {/* --- Global Settings --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-4 border rounded-lg bg-gray-100">
          <div>
              <h3 className="font-semibold mb-2 text-lg">Simulation Settings</h3>
              <InputField
                  label="Years to Sell"
                  value={scenarioSettings.years_to_sell}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleScenarioSettingsChange('years_to_sell', parseInt(e.target.value, 10) || 0)}
                  tooltip="Number of years you plan to hold the property before selling."
              />
              <SelectField
                  label="Display Currency"
                  value={scenarioSettings.currency}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleScenarioSettingsChange('currency', e.target.value)}
                  options={[{ value: 'EUR', label: 'EUR (€)' }, { value: 'DKK', label: 'DKK (kr)' }]}
                  tooltip="Select the currency for displaying results."
              />
          </div>
          <div className="md:col-span-2">
              <h3 className="font-semibold mb-2 text-lg">Personal Finance (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                  <InputField
                      label="Annual Salary"
                      value={personalFinance.salary}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePersonalFinanceChange('salary', parseInt(e.target.value, 10) || undefined)}
                      placeholder={`Enter salary in ${scenarioSettings.currency}`}
                      tooltip={`Your gross annual salary (used for potential tax calculations) in ${scenarioSettings.currency}.`}
                  />
                  {/* Add other personal finance fields here if needed */}
                  {/* <InputField label="Tax Rate Override (%)" ... /> */}
                  {/* <InputField label="Existing Flat Value" ... /> */}
                  {/* <InputField label="Existing Loan Size" ... /> */}
              </div>
          </div>
      </div>

      {/* --- Scenario Tabs --- */}
      <div className="mb-6">
          <div className="flex border-b mb-4 space-x-1">
              {scenarios.map((scenario, index) => (
                  <button
                      key={scenario.id}
                      onClick={() => setActiveTab(scenario.id)}
                      className={`py-2 px-4 text-sm font-medium ${activeTab === scenario.id ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      {scenario.name || `Scenario ${index + 1}`}
                  </button>
              ))}
              <button onClick={addScenario} className="py-2 px-4 text-sm font-medium text-indigo-600 hover:text-indigo-800">+ Add Scenario</button>
          </div>

          {/* Render only the active scenario's input form */}
          {scenarios.map((scenario) => (
              <div key={scenario.id} className={activeTab === scenario.id ? 'block' : 'hidden'}>
                  <ScenarioInput
                      scenario={scenario}
                      onChange={handleScenarioChange}
                      onRemove={() => removeScenario(scenario.id)}
                      currency={scenarioSettings.currency}
                  />
              </div>
          ))}
      </div>

      {/* --- Calculate Button --- */}
      <div className="text-center my-8">
        <button
          onClick={handleCalculate}
          disabled={isLoading}
          className={`px-6 py-3 text-white font-semibold rounded-md shadow ${isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'}`}
        >
          {isLoading ? 'Calculating...' : 'Calculate Comparison'}
        </button>
        {error && <p className="text-red-600 mt-2 text-sm">Error: {error}</p>}
      </div>

      {/* --- Results Section --- */}
      {calculationResult && (
          <ResultsDisplay results={calculationResult} currency={scenarioSettings.currency} />
      )}

    </div>
  );
}

export default App;

