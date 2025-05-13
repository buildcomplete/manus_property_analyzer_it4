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

// This interface defines the structure of the 'inputs' object for EACH scenario sent to the backend
interface ScenarioSpecificInputsPayload {
  property_type: 'new' | 'second_hand' | 'under_construction' | 'ejer' | 'andels';
  new_flat_price?: number;
  renovations: RenovationPayloadItem[];
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
// It includes fields that will be part of ScenarioSpecificInputsPayload, plus country, city, id, name
interface ScenarioInputsState {
    id: string; // Unique ID for the scenario itself
    name: string; // User-editable name for the scenario tab
    country: 'spain' | 'denmark';
    city: string;
    property_type: 'new' | 'second_hand' | 'under_construction' | 'ejer' | 'andels';
    new_flat_price?: number;
    renovations: RenovationItem[]; // Uses RenovationItem with client-side ID for UI
    loan_details?: LoanDetails;
    beckham_law_active?: boolean;
    beckham_law_remaining_years?: number;
    loan_type?: 'standard' | 'andels_laan';
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

// Interface for EACH scenario object in the 'scenarios' array SENT TO BACKEND
interface BackendScenarioPayload {
    id: string;
    country: 'spain' | 'denmark';
    city: string;
    inputs: ScenarioSpecificInputsPayload;
}

// Interface for the main request SENT TO BACKEND
interface CalculationRequest {
  personal_finance: PersonalFinanceInputs;
  scenario_settings: ScenarioSettingsInputs;
  scenarios: BackendScenarioPayload[]; // List of scenarios, each matching BackendScenarioPayload
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
    results_by_scenario: { scenario_id: string | null; result?: SingleScenarioResult; error?: string }[]; // scenario_id can be null if scenario itself fails validation
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
        onChange([...renovations, { id: Date.now().toString(), type: 'custom', description: '', adjusted_cost: 0 }]);
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
                        value={payment.percentage * 100} // Display as percentage
                        onChange={(e) => updatePayment(index, 'percentage', parseFloat(e.target.value) / 100)} // Store as decimal
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

    const handleInputChange = (field: keyof Omit<ScenarioInputsState, 'id' | 'name' | 'renovations'>, value: any) => {
        onChange({ ...scenario, [field]: value });
    };

    const handleNestedChange = (section: 'loan_details', field: keyof LoanDetails, value: any) => {
        onChange({ ...scenario, [section]: { ...(scenario[section] || {}), [field]: value } });
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
        { value: 'second_hand', label: 'Second Hand' },
        { value: 'under_construction', label: 'Under Construction' },
    ] : [
        { value: 'ejer', label: 'Ejerlejlighed (Owner Flat)' },
        { value: 'andels', label: 'Andelslejlighed (Cooperative Flat)' },
        { value: 'new', label: 'New Build' },
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
                            const newType = newCountry === 'spain' ? 'new' : 'ejer'; // Default type change
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
                        tooltip="Select the type of property for this scenario."
                    />
                    <InputField
                        label="Property Price / New Flat Price"
                        value={scenario.new_flat_price}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('new_flat_price', parseFloat(e.target.value) || undefined)}
                        placeholder={`Enter price in ${currency}`}
                        tooltip={`The purchase price of the property in ${currency}.`}
                    />

                    {scenario.property_type === 'under_construction' && (
                        <PaymentScheduleInput
                            schedule={scenario.payment_schedule}
                            onChange={handlePaymentScheduleChange}
                        />
                    )}

                    <RenovationInput renovations={scenario.renovations} onChange={handleRenovationChange} currency={currency} />

                </div>

                {/* Column 2 */}
                <div>
                    <h4 className="font-medium mb-2 text-md">Loan Details</h4>
                    <InputField
                        label="Loan Amount"
                        value={scenario.loan_details?.amount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNestedChange('loan_details', 'amount', parseFloat(e.target.value) || undefined)}
                        placeholder={`Loan amount in ${currency}`}
                        tooltip={`Total loan amount in ${currency}. Leave blank if no loan.`}
                    />
                    <InputField
                        label="Annual Interest Rate (%)"
                        value={scenario.loan_details?.interest_rate !== undefined ? scenario.loan_details.interest_rate * 100 : ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNestedChange('loan_details', 'interest_rate', parseFloat(e.target.value) / 100 || undefined)}
                        placeholder="e.g., 3.5 for 3.5%"
                        tooltip="Annual interest rate for the loan (e.g., 3.5 for 3.5%)."
                    />
                    <InputField
                        label="Loan Term (Years)"
                        value={scenario.loan_details?.term_years}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNestedChange('loan_details', 'term_years', parseInt(e.target.value, 10) || undefined)}
                        placeholder="e.g., 30"
                        tooltip="Total term of the loan in years."
                    />

                    {scenario.country === 'spain' && (
                        <>
                            <h4 className="font-medium mb-2 mt-4 text-md">Spain Specific</h4>
                            <CheckboxField
                                label="Beckham Law Active?"
                                checked={!!scenario.beckham_law_active}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('beckham_law_active', e.target.checked)}
                                tooltip="Is the Beckham Law applicable for tax calculations?"
                            />
                            {scenario.beckham_law_active && (
                                <InputField
                                    label="Beckham Law Remaining Years"
                                    value={scenario.beckham_law_remaining_years}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('beckham_law_remaining_years', parseInt(e.target.value, 10) || undefined)}
                                    placeholder="e.g., 3"
                                    tooltip="Number of years remaining under the Beckham Law."
                                />
                            )}
                        </>
                    )}

                    {scenario.country === 'denmark' && scenario.property_type === 'andels' && (
                        <>
                            <h4 className="font-medium mb-2 mt-4 text-md">Denmark Specific (Andelslejlighed)</h4>
                            <SelectField
                                label="Loan Type for Andelsbolig"
                                value={scenario.loan_type || 'standard'}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('loan_type', e.target.value)}
                                options={loanTypeOptions}
                                tooltip="Select the type of loan for the Andelsbolig."
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Main App Component ---
function App() {
    const [activeTab, setActiveTab] = useState<string>('scenario-1'); // ID of the active scenario
    const [scenarios, setScenarios] = useState<ScenarioInputsState[]>([
        {
            id: 'scenario-1',
            name: 'Scenario 1',
            country: 'spain',
            city: 'barcelona',
            property_type: 'new',
            new_flat_price: 300000,
            renovations: [],
            loan_details: { amount: 240000, interest_rate: 0.035, term_years: 30 },
            beckham_law_active: false,
            beckham_law_remaining_years: 0,
        }
    ]);

    const [personalFinance, setPersonalFinance] = useState<PersonalFinanceInputs>({});
    const [scenarioSettings, setScenarioSettings] = useState<ScenarioSettingsInputs>({ years_to_sell: 5, currency: 'EUR' });
    const [results, setResults] = useState<BackendResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePersonalFinanceChange = (field: keyof PersonalFinanceInputs, value: any) => {
        setPersonalFinance(prev => ({ ...prev, [field]: value }));
    };

    const handleScenarioSettingsChange = (field: keyof ScenarioSettingsInputs, value: any) => {
        setScenarioSettings(prev => ({ ...prev, [field]: value }));
        if (field === 'currency') {
            // Potentially reset monetary values in scenarios or provide conversion if complex
            // For now, just updating currency symbol display
        }
    };

    const addScenario = () => {
        const newScenarioId = `scenario-${Date.now()}`;
        setScenarios(prev => [...prev, {
            id: newScenarioId,
            name: `Scenario ${prev.length + 1}`,
            country: 'spain', // Default new scenario
            city: 'barcelona',
            property_type: 'new',
            renovations: [],
            loan_details: {},
        }]);
        setActiveTab(newScenarioId);
    };

    const updateScenario = (id: string, updatedScenarioData: ScenarioInputsState) => {
        setScenarios(prev => prev.map(sc => sc.id === id ? updatedScenarioData : sc));
    };

    const removeScenario = (idToRemove: string) => {
        setScenarios(prev => {
            const newScenarios = prev.filter(sc => sc.id !== idToRemove);
            if (newScenarios.length > 0 && activeTab === idToRemove) {
                setActiveTab(newScenarios[0].id);
            }
            return newScenarios;
        });
    };

    const handleCalculate = async () => {
        setIsLoading(true);
        setError(null);
        setResults(null);

        // Transform frontend state scenarios to backend payload structure
        const scenariosForApi: BackendScenarioPayload[] = scenarios.map(scenarioState => {
            const {
                // Fields for the top-level of the scenario object sent to backend
                id,
                country,
                city,

                // Fields to be nested under 'inputs'
                property_type,
                new_flat_price,
                renovations, // This needs cleaning (remove client-side ID from items)
                loan_details,
                beckham_law_active,
                beckham_law_remaining_years,
                loan_type,
                construction_completion_years,
                payment_schedule,                // Fields to exclude from \'inputs\' (like \'name\' which is UI-only)
                // name, // Exclude name from \'inputs\'
            } = scenarioState;

            const cleanedRenovations = renovations.map(({ id: renoId, ...reno }) => reno);

            const scenarioSpecificInputs: ScenarioSpecificInputsPayload = {
                property_type,
                new_flat_price,
                renovations: cleanedRenovations,
                loan_details,
                beckham_law_active,
                beckham_law_remaining_years,
                loan_type,
                construction_completion_years,
                payment_schedule,
            };

            // Remove undefined keys from scenarioSpecificInputs to keep payload clean
            Object.keys(scenarioSpecificInputs).forEach(keyStr => {
                const key = keyStr as keyof ScenarioSpecificInputsPayload;
                if (scenarioSpecificInputs[key] === undefined) {
                    delete scenarioSpecificInputs[key];
                }
            });

            return {
                id,
                country,
                city,
                inputs: scenarioSpecificInputs
            };
        });

        const requestBody: CalculationRequest = {
            personal_finance: personalFinance,
            scenario_settings: scenarioSettings,
            scenarios: scenariosForApi,
        };

        try {
            const response = await fetch('http://localhost:5000/api/calculate', {
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
        } catch (err: any) {
            setError(err.message || 'Failed to fetch results');
            console.error("Calculation error:", err);
        }
        setIsLoading(false);
    };

    const activeScenarioData = scenarios.find(sc => sc.id === activeTab);

    return (
        <div className="container mx-auto p-4 font-sans">
            <header className="mb-8 text-center">
                <h1 className="text-4xl font-bold text-indigo-700">Property Investment Analysis Tool</h1>
                <p className="text-gray-600">Compare investment scenarios across different markets.</p>
            </header>

            {/* Global Settings & Personal Finance */}
            <section className="mb-6 p-4 border rounded-lg shadow-md bg-slate-50">
                <h2 className="text-2xl font-semibold mb-3 text-indigo-600">Global Configuration</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <h3 className="text-lg font-medium mb-2 text-gray-700">Scenario Settings</h3>
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
                            options={[{ value: 'EUR', label: 'EUR (€)' }, { value: 'DKK', label: 'DKK (kr.)' }]}
                            tooltip="Currency for displaying financial figures."
                        />
                    </div>
                    <div className="md:col-span-2">
                        <h3 className="text-lg font-medium mb-2 text-gray-700">Personal Finance (Optional)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                            <InputField
                                label="Annual Salary"
                                value={personalFinance.salary}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePersonalFinanceChange('salary', parseFloat(e.target.value) || undefined)}
                                placeholder={`Enter salary in ${scenarioSettings.currency}`}
                                tooltip={`Your gross annual salary in ${scenarioSettings.currency}. Used for some tax calculations if applicable.`}
                            />
                            <InputField
                                label="Tax Rate Override (%)"
                                value={personalFinance.tax_rate_override !== undefined && personalFinance.tax_rate_override !== null ? personalFinance.tax_rate_override * 100 : ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const val = parseFloat(e.target.value);
                                    handlePersonalFinanceChange('tax_rate_override', isNaN(val) ? null : val / 100);
                                }}
                                placeholder="e.g., 25 for 25% (optional)"
                                tooltip="Override default income tax rate. Leave blank to use defaults."
                            />
                            <InputField
                                label="Existing Flat Value (if selling)"
                                value={personalFinance.existing_flat_value}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePersonalFinanceChange('existing_flat_value', parseFloat(e.target.value) || undefined)}
                                placeholder={`Value in ${scenarioSettings.currency}`}
                                tooltip={`Value of your current property if you plan to sell it to fund the new purchase, in ${scenarioSettings.currency}.`}
                            />
                            <InputField
                                label="Existing Loan Size (if selling)"
                                value={personalFinance.existing_loan_size}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePersonalFinanceChange('existing_loan_size', parseFloat(e.target.value) || undefined)}
                                placeholder={`Loan amount in ${scenarioSettings.currency}`}
                                tooltip={`Outstanding loan on your current property, in ${scenarioSettings.currency}.`}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Scenario Tabs & Inputs */}
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
                    <button onClick={addScenario} className="py-2 px-4 text-indigo-600 hover:text-indigo-800 font-medium text-sm">+ Add Scenario</button>
                </div>

                {activeScenarioData && (
                    <ScenarioInput
                        scenario={activeScenarioData}
                        onChange={(updatedData) => updateScenario(activeScenarioData.id, updatedData)}
                        onRemove={() => removeScenario(activeScenarioData.id)}
                        currency={scenarioSettings.currency}
                    />
                )}
            </section>

            {/* Calculate Button */}
            <div className="text-center my-8">
                <button
                    onClick={handleCalculate}
                    disabled={isLoading}
                    className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 disabled:opacity-50"
                >
                    {isLoading ? 'Calculating...' : 'Calculate Investment Scenarios'}
                </button>
            </div>

            {/* Results Section */}
            {error && <div className="my-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded-md">Error: {error}</div>}

            {results && (
                <section className="mt-8 p-4 border rounded-lg shadow-lg bg-white">
                    <h2 className="text-2xl font-semibold mb-4 text-indigo-700">Calculation Results</h2>
                    {results.global_warnings && results.global_warnings.length > 0 && (
                        <div className="mb-4 p-3 bg-yellow-100 text-yellow-700 border border-yellow-300 rounded-md">
                            <h4 className="font-medium">Global Warnings:</h4>
                            <ul className="list-disc list-inside text-sm">
                                {results.global_warnings.map((warn, idx) => <li key={idx}>{warn}</li>)}
                            </ul>
                        </div>
                    )}
                    {results.results_by_scenario.map(({ scenario_id, result, error: scenarioError }) => (
                        <div key={scenario_id || `error-${Math.random()}`} className="mb-6 p-4 border rounded-md bg-slate-50">
                            <h3 className="text-xl font-semibold mb-2 text-indigo-600">
                                Scenario: {scenarios.find(s => s.id === scenario_id)?.name || scenario_id || 'Unknown Scenario'}
                            </h3>
                            {scenarioError && (
                                <p className="text-red-600">Error for this scenario: {scenarioError}</p>
                            )}
                            {result && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p><strong>Total Investment Cost:</strong> {result.purchase_costs?.total_investment_cost?.toLocaleString(undefined, { style: 'currency', currency: scenarioSettings.currency })}</p>
                                        <p><strong>Initial Outlay (Year 0):</strong> {result.purchase_costs?.initial_outlay_year0?.toLocaleString(undefined, { style: 'currency', currency: scenarioSettings.currency })}</p>
                                        <p><strong>Total Running Costs (over {scenarioSettings.years_to_sell} years):</strong> {result.running_costs?.total?.toLocaleString(undefined, { style: 'currency', currency: scenarioSettings.currency })}</p>
                                        <p><strong>Total Loan Interest Paid (over {scenarioSettings.years_to_sell} years):</strong> {result.total_loan_interest_paid_over_hold?.toLocaleString(undefined, { style: 'currency', currency: scenarioSettings.currency })}</p>
                                    </div>
                                    <div>
                                        <h5 className="font-medium mt-2 mb-1">Projected Win/Loss (after {scenarioSettings.years_to_sell} years):</h5>
                                        <p>Avg. Growth: <span className="font-semibold">{result.scenario_outcomes?.average?.win_loss?.toLocaleString(undefined, { style: 'currency', currency: scenarioSettings.currency })}</span> (Selling Price: {result.scenario_outcomes?.average?.selling_price?.toLocaleString(undefined, { style: 'currency', currency: scenarioSettings.currency })})</p>
                                        <p>Low Risk: <span className="font-semibold">{result.scenario_outcomes?.low_risk?.win_loss?.toLocaleString(undefined, { style: 'currency', currency: scenarioSettings.currency })}</span> (Selling Price: {result.scenario_outcomes?.low_risk?.selling_price?.toLocaleString(undefined, { style: 'currency', currency: scenarioSettings.currency })})</p>
                                        <p>High Risk: <span className="font-semibold">{result.scenario_outcomes?.high_risk?.win_loss?.toLocaleString(undefined, { style: 'currency', currency: scenarioSettings.currency })}</span> (Selling Price: {result.scenario_outcomes?.high_risk?.selling_price?.toLocaleString(undefined, { style: 'currency', currency: scenarioSettings.currency })})</p>
                                        <p>Zero Growth: <span className="font-semibold">{result.scenario_outcomes?.zero_growth?.win_loss?.toLocaleString(undefined, { style: 'currency', currency: scenarioSettings.currency })}</span> (Selling Price: {result.scenario_outcomes?.zero_growth?.selling_price?.toLocaleString(undefined, { style: 'currency', currency: scenarioSettings.currency })})</p>
                                    </div>
                                    {result.calculation_details?.warnings && result.calculation_details.warnings.length > 0 && (
                                        <div className="col-span-full mt-2 p-2 bg-yellow-50 text-yellow-600 border border-yellow-200 rounded-md text-xs">
                                            <h5 className="font-medium">Warnings for this scenario:</h5>
                                            <ul className="list-disc list-inside">
                                                {result.calculation_details.warnings.map((warn, idx) => <li key={idx}>{warn}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    {/* Raw JSON for debugging/detailed view - can be improved */}
                                    <details className="col-span-full mt-3 text-xs">
                                        <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Show Raw Scenario Result Data</summary>
                                        <pre className="mt-1 p-2 bg-gray-100 rounded overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
                                    </details>
                                </div>
                            )}
                        </div>
                    ))}
                    {results.error && (
                         <div className="mt-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded-md">
                            Overall Calculation Error: {results.error}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}

export default App;

