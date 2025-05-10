import { useState } from 'react';
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

interface BackendResponse {
    results_by_scenario: { scenario_id: string; result: SingleScenarioResult }[];
    global_warnings: string[];
    error?: string;
}


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
            <h4 className="font-medium mb-2 text-md">Renovations</h4>
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
                        X
                    </button>
                </div>
            ))}
            <button onClick={addRenovation} className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 flex items-center">
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
                        tooltip="Select the type of property."
                    />
                    <InputField
                        label="Property Price"
                        type="number"
                        value={scenario.new_flat_price}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('new_flat_price', parseInt(e.target.value, 10) || 0)}
                        placeholder="e.g., 300000"
                        tooltip={`Purchase price of the property in ${currency}.`}
                    />

                    {scenario.property_type === 'under_construction' && (
                        <InputField
                            label="Construction Completion (Years from now)"
                            type="number"
                            value={scenario.construction_completion_years}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('construction_completion_years', parseInt(e.target.value, 10) || 0)}
                            placeholder="e.g., 2"
                            tooltip="Number of years until the property construction is completed."
                        />
                    )}
                </div>

                {/* Column 2 */}
                <div>
                    <InputField
                        label="Loan Amount"
                        type="number"
                        value={scenario.loan_details?.amount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNestedChange('loan_details', 'amount', parseInt(e.target.value, 10) || 0)}
                        placeholder="e.g., 240000"
                        tooltip={`Total loan amount in ${currency}.`}
                    />
                    <InputField
                        label="Annual Interest Rate (%)"
                        type="number"
                        value={scenario.loan_details?.interest_rate !== undefined ? scenario.loan_details.interest_rate * 100 : ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNestedChange('loan_details', 'interest_rate', parseFloat(e.target.value) / 100 || 0)}
                        placeholder="e.g., 3.5"
                        step="0.01"
                        tooltip="Annual interest rate for the loan (e.g., 3.5 for 3.5%)."
                    />
                    <InputField
                        label="Loan Term (Years)"
                        type="number"
                        value={scenario.loan_details?.term_years}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNestedChange('loan_details', 'term_years', parseInt(e.target.value, 10) || 0)}
                        placeholder="e.g., 30"
                        tooltip="Total term of the loan in years."
                    />

                    {scenario.country === 'spain' && (
                        <>
                            <CheckboxField
                                label="Beckham Law Active?"
                                checked={scenario.beckham_law_active || false}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('beckham_law_active', e.target.checked)}
                                tooltip="Is the Beckham Law (special tax regime for impatriates) applicable?"
                            />
                            {scenario.beckham_law_active && (
                                <InputField
                                    label="Beckham Law Remaining Years"
                                    type="number"
                                    value={scenario.beckham_law_remaining_years}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('beckham_law_remaining_years', parseInt(e.target.value, 10) || 0)}
                                    placeholder="e.g., 4"
                                    tooltip="Number of years remaining under the Beckham Law."
                                />
                            )}
                        </>
                    )}

                    {scenario.country === 'denmark' && scenario.property_type === 'andels' && (
                        <SelectField
                            label="Loan Type (for Andels)"
                            value={scenario.loan_type || 'standard'}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('loan_type', e.target.value)}
                            options={loanTypeOptions}
                            tooltip="Select the type of loan for the Andelsbolig."
                        />
                    )}
                </div>
            </div>

            <RenovationInput renovations={scenario.renovations} onChange={handleRenovationChange} currency={currency} />

            {scenario.property_type === 'under_construction' && (
                <PaymentScheduleInput schedule={scenario.payment_schedule} onChange={handlePaymentScheduleChange} />
            )}
        </div>
    );
};

// --- Main App Component ---
function App() {
  const [personalFinance, setPersonalFinance] = useState<PersonalFinanceInputs>({});
  const [scenarioSettings, setScenarioSettings] = useState<ScenarioSettingsInputs>({ years_to_sell: 5, currency: 'EUR' });
  const [scenarios, setScenarios] = useState<ScenarioInputsState[]>([
    { id: 's1', name: 'Scenario 1', country: 'spain', city: 'barcelona', property_type: 'new', new_flat_price: 300000, renovations: [], loan_details: { amount: 240000, interest_rate: 0.035, term_years: 30 } },
  ]);
  const [activeTab, setActiveTab] = useState<string>('s1');
  const [results, setResults] = useState<BackendResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePersonalFinanceChange = (field: keyof PersonalFinanceInputs, value: any) => {
    setPersonalFinance(prev => ({ ...prev, [field]: value === '' ? undefined : value }));
  };

  const handleScenarioSettingsChange = (field: keyof ScenarioSettingsInputs, value: any) => {
    setScenarioSettings(prev => ({ ...prev, [field]: value }));
    if (field === 'currency') {
        // Potentially convert existing monetary values or clear them
        console.log("Currency changed, consider value conversions or resets.");
    }
  };

  const addScenario = () => {
    const newScenarioId = `s${Date.now()}`;
    setScenarios(prev => [...prev, {
        id: newScenarioId,
        name: `Scenario ${prev.length + 1}`,
        country: 'spain',
        city: 'barcelona',
        property_type: 'new',
        new_flat_price: undefined,
        renovations: [],
        loan_details: { amount: undefined, interest_rate: undefined, term_years: undefined }
    }]);
    setActiveTab(newScenarioId);
  };

  const updateScenario = (updatedScenario: ScenarioInputsState) => {
    setScenarios(prev => prev.map(s => s.id === updatedScenario.id ? updatedScenario : s));
  };

  const removeScenario = (idToRemove: string) => {
    setScenarios(prev => prev.filter(s => s.id !== idToRemove));
    if (activeTab === idToRemove && scenarios.length > 1) {
        setActiveTab(scenarios.filter(s => s.id !== idToRemove)[0].id);
    } else if (scenarios.length <= 1) {
        setActiveTab(''); // Or add a default scenario if all are removed
    }
  };

  // Function to clean client-side IDs from renovations before sending to backend
  const cleanRenovationsForPayload = (renos: RenovationItem[]): RenovationPayloadItem[] => {
    return renos.map(({ id, ...rest }) => rest);
  };

  const handleCalculate = async () => {
    setIsLoading(true);
    setError(null);
    setResults(null);

    const scenariosPayload: ScenarioInputsPayload[] = scenarios.map(s => {
        const { id, name, renovations, ...payload } = s; // Exclude client-side id and name
        return { ...payload, renovations: cleanRenovationsForPayload(renovations) };
    });

    const requestBody: CalculationRequest = {
      personal_finance: personalFinance,
      scenario_settings: scenarioSettings,
      scenarios: scenariosPayload,
    };

    try {
      const response = await fetch('http://localhost:5000/api/calculate', { // Corrected API endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data: BackendResponse = await response.json();
      setResults(data);
      if (data.error) {
        setError(data.error);
      }
    } catch (err: any) { // Explicitly type err as any or unknown
      setError(err.message || 'An unknown error occurred');
      console.error('Calculation error:', err);
    }
    setIsLoading(false);
  };

  const activeScenario = scenarios.find(s => s.id === activeTab);

  return (
    <div className="container mx-auto p-4 font-sans bg-gray-50 min-h-screen">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-indigo-700">Property Investment Analyzer</h1>
        <p className="text-md text-gray-600">Compare property investment scenarios in Spain & Denmark</p>
      </header>

      {/* Global Settings Section */}
      <section className="mb-6 p-4 bg-white shadow-md rounded-lg">
        <h2 className="text-xl font-semibold mb-3 text-indigo-600 border-b pb-2">Global Simulation Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField
                label="Years to Sell"
                type="number"
                value={scenarioSettings.years_to_sell}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleScenarioSettingsChange('years_to_sell', parseInt(e.target.value, 10) || 0)}
                tooltip="Number of years you plan to hold the property before selling."
            />
            <SelectField
                label="Display Currency"
                value={scenarioSettings.currency}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleScenarioSettingsChange('currency', e.target.value)}
                options={[{ value: 'EUR', label: 'EUR (€)' }, { value: 'DKK', label: 'DKK (kr.)' }]}
                tooltip="Currency for all monetary inputs and results."
            />
        </div>
      </section>

      <section className="mb-6 p-4 bg-white shadow-md rounded-lg">
        <h2 className="text-xl font-semibold mb-3 text-indigo-600 border-b pb-2">Personal Finance (Optional)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <InputField 
                label="Annual Gross Salary"
                value={personalFinance.salary}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePersonalFinanceChange('salary', parseInt(e.target.value, 10) || undefined)}
                placeholder="e.g., 60000"
                tooltip={`Your annual gross salary in ${scenarioSettings.currency}. Used for some tax estimations.`}
            />
            {/* Add other personal finance fields here if needed */}
        </div>
      </section>

      {/* Scenarios Section */}
      <section className="mb-6">
        <div className="flex border-b mb-4">
            {scenarios.map(scenario => (
                <button
                    key={scenario.id}
                    className={`py-2 px-4 -mb-px font-medium text-sm focus:outline-none 
                                ${activeTab === scenario.id 
                                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    onClick={() => setActiveTab(scenario.id)}
                >
                    {scenario.name}
                </button>
            ))}
            <button onClick={addScenario} className="py-2 px-4 text-indigo-600 hover:text-indigo-800 text-sm">+ Add Scenario</button>
        </div>

        {activeScenario && (
            <ScenarioInput 
                key={activeScenario.id} // Ensure re-render on tab change if needed
                scenario={activeScenario} 
                onChange={updateScenario} 
                onRemove={() => removeScenario(activeScenario.id)}
                currency={scenarioSettings.currency}
            />
        )}
      </section>

      <div className="text-center mb-8">
        <button
          onClick={handleCalculate}
          disabled={isLoading}
          className="px-8 py-3 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Calculating...' : 'Calculate Investment Scenarios'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded-md">
          <h3 className="font-bold">Error:</h3>
          <pre className="whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      {results && (
        <section className="p-4 bg-white shadow-md rounded-lg">
          <h2 className="text-2xl font-semibold mb-4 text-indigo-700">Calculation Results</h2>
          {results.global_warnings && results.global_warnings.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-md">
                <h4 className="font-bold">Global Warnings:</h4>
                <ul className="list-disc list-inside text-sm">
                    {results.global_warnings.map((warn, idx) => <li key={idx}>{warn}</li>)}
                </ul>
            </div>
          )}
          {results.results_by_scenario?.map(({ scenario_id, result }) => {
            const scenarioName = scenarios.find(s => s.id === scenario_id)?.name || scenario_id;
            if (result.error) {
                return (
                    <div key={scenario_id} className="mb-6 p-3 border border-red-300 rounded-md bg-red-50">
                        <h3 className="text-xl font-semibold text-red-600">{scenarioName} - Error</h3>
                        <p className="text-red-700">{result.error}</p>
                    </div>
                );
            }
            return (
                <div key={scenario_id} className="mb-6 p-4 border border-gray-200 rounded-lg shadow">
                    <h3 className="text-xl font-semibold mb-3 text-indigo-600">Results for: {scenarioName}</h3>
                    
                    {result.calculation_details?.warnings && result.calculation_details.warnings.length > 0 && (
                        <div className="mb-3 p-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-md text-sm">
                            <h5 className="font-semibold">Scenario Warnings:</h5>
                            <ul className="list-disc list-inside">
                                {result.calculation_details.warnings.map((warn, idx) => <li key={idx}>{warn}</li>)}
                            </ul>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                            <p className="text-sm text-gray-600">Total Investment Cost:</p>
                            <p className="text-lg font-semibold">{scenarioSettings.currency} {result.purchase_costs?.total_investment_cost?.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Initial Outlay (Year 0):</p>
                            <p className="text-lg font-semibold">{scenarioSettings.currency} {result.purchase_costs?.initial_outlay_year0?.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Running Costs (over {scenarioSettings.years_to_sell} years):</p>
                            <p className="text-lg font-semibold">{scenarioSettings.currency} {result.running_costs?.total?.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Loan Interest Paid (over {scenarioSettings.years_to_sell} years):</p>
                            <p className="text-lg font-semibold">{scenarioSettings.currency} {result.total_loan_interest_paid_over_hold?.toLocaleString()}</p>
                        </div>
                    </div>

                    <h4 className="text-md font-semibold mt-4 mb-2 text-gray-700">Win/Loss Scenarios (after {scenarioSettings.years_to_sell} years):</h4>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scenario</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Selling Price</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Win/Loss</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {Object.entries(result.scenario_outcomes || {}).map(([key, outcome]) => (
                                    <tr key={key}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{scenarioSettings.currency} {outcome.selling_price?.toLocaleString()}</td>
                                        <td className={`px-4 py-2 whitespace-nowrap text-sm font-semibold ${outcome.win_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {scenarioSettings.currency} {outcome.win_loss?.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <details className="mt-4 text-xs text-gray-500">
                        <summary className="cursor-pointer hover:text-gray-700">View Raw Scenario Result JSON</summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-60">{JSON.stringify(result, null, 2)}</pre>
                    </details>
                </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

export default App;

