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

// --- Renting Scenario Interfaces ---
interface RentingScenarioInputs {
    monthly_rent?: number;
    monthly_water?: number;
    monthly_utilities?: number;
    monthly_parking?: number;
    annual_rent_increment?: number; // e.g., 0.02 for 2%
    annual_water_increment?: number;
    annual_utilities_increment?: number;
    annual_parking_increment?: number;
}

interface RentingScenarioYearlyBreakdown {
    year: number;
    rent_cost: number;
    water_cost: number;
    utilities_cost: number;
    parking_cost: number;
    total_annual_cost: number;
}

interface RentingScenarioResults {
    total_renting_cost: number;
    breakdown_annual: RentingScenarioYearlyBreakdown[];
    inputs_summary: RentingScenarioInputs;
    warnings?: string[];
    error?: string;
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
  renting_scenario_inputs?: RentingScenarioInputs; // Optional renting inputs
}

// --- Result Interfaces (Adjusted for Multi-Scenario) ---
interface SingleScenarioResult {
    inputs_summary: Record<string, any>;
    purchase_costs: { total_investment_cost: number; initial_outlay_year0: number; breakdown: Record<string, any> };
    running_costs: { total: number; breakdown_annual: Record<string, any>; breakdown_total: Record<string, any> };
    total_loan_interest_paid_over_hold: number;
    scenario_outcomes: {
        average: { selling_price: number; win_loss: number; index_adjusted_profit_eur?: number; [key: string]: any };
        low_risk: { selling_price: number; win_loss: number; index_adjusted_profit_eur?: number; [key: string]: any };
        high_risk: { selling_price: number; win_loss: number; index_adjusted_profit_eur?: number; [key: string]: any };
        zero_growth: { selling_price: number; win_loss: number; index_adjusted_profit_eur?: number; [key: string]: any };
    };
    calculation_details?: {
        warnings?: string[];
    };
    error?: string;
}

interface BackendResponse {
    results_by_scenario: { scenario_id: string | null; result?: SingleScenarioResult; error?: string }[];
    renting_scenario_results?: RentingScenarioResults; // Optional renting results
    global_warnings: string[];
    error?: string;
}


// --- Helper Components (Placeholder - Implement with shadcn/ui later) ---

const InputField = ({ label, type = 'number', value, onChange, placeholder, tooltip, step, disabled = false, min, max }: any) => (
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
      min={min}
      max={max}
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

// --- Renting Scenario Input Component ---
const RentingScenarioInputSection = ({ inputs, onChange, currency }: { inputs: RentingScenarioInputs, onChange: (newInputs: RentingScenarioInputs) => void, currency: string }) => {
    const handleInputChange = (field: keyof RentingScenarioInputs, value: string | number) => {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        onChange({ ...inputs, [field]: isNaN(numValue) ? undefined : numValue });
    };

    const handleIncrementChange = (field: keyof RentingScenarioInputs, value: string | number) => {
        let numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (!isNaN(numValue)) {
            numValue = numValue / 100; // Convert percentage to decimal
        }
        onChange({ ...inputs, [field]: isNaN(numValue) ? undefined : numValue });
    };

    return (
        <div className="p-6 border border-gray-300 rounded-lg shadow-md bg-blue-50">
            <h3 className="text-xl font-semibold mb-6 text-gray-800 border-b pb-2">Renting Scenario (Optional Baseline)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                <InputField
                    label={`Monthly Rent (${currency})`}
                    value={inputs.monthly_rent}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('monthly_rent', e.target.value)}
                    placeholder="e.g., 1200"
                    tooltip="Your estimated monthly rent payment."
                />
                <InputField
                    label="Annual Rent Increment (%)"
                    value={inputs.annual_rent_increment !== undefined ? inputs.annual_rent_increment * 100 : ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncrementChange('annual_rent_increment', e.target.value)}
                    placeholder="e.g., 2 for 2%"
                    tooltip="Expected annual percentage increase in rent."
                    min="0"
                />
                <InputField
                    label={`Monthly Water (${currency})`}
                    value={inputs.monthly_water}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('monthly_water', e.target.value)}
                    placeholder="e.g., 50"
                    tooltip="Estimated monthly cost for water."
                />
                <InputField
                    label="Annual Water Increment (%)"
                    value={inputs.annual_water_increment !== undefined ? inputs.annual_water_increment * 100 : ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncrementChange('annual_water_increment', e.target.value)}
                    placeholder="e.g., 1 for 1%"
                    tooltip="Expected annual percentage increase in water costs."
                    min="0"
                />
                <InputField
                    label={`Monthly Utilities (${currency})`}
                    value={inputs.monthly_utilities}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('monthly_utilities', e.target.value)}
                    placeholder="e.g., 150"
                    tooltip="Estimated monthly cost for utilities (electricity, gas, internet, etc.)."
                />
                <InputField
                    label="Annual Utilities Increment (%)"
                    value={inputs.annual_utilities_increment !== undefined ? inputs.annual_utilities_increment * 100 : ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncrementChange('annual_utilities_increment', e.target.value)}
                    placeholder="e.g., 1.5 for 1.5%"
                    tooltip="Expected annual percentage increase in utility costs."
                    min="0"
                />
                <InputField
                    label={`Monthly Parking (${currency})`}
                    value={inputs.monthly_parking}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('monthly_parking', e.target.value)}
                    placeholder="e.g., 100"
                    tooltip="Estimated monthly cost for parking, if applicable."
                />
                <InputField
                    label="Annual Parking Increment (%)"
                    value={inputs.annual_parking_increment !== undefined ? inputs.annual_parking_increment * 100 : ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncrementChange('annual_parking_increment', e.target.value)}
                    placeholder="e.g., 1 for 1%"
                    tooltip="Expected annual percentage increase in parking costs."
                    min="0"
                />
            </div>
        </div>
    );
};


// --- Scenario Input Component ---
const ScenarioInput = ({ scenario, onChange, onRemove, currency }: { scenario: ScenarioInputsState, onChange: (updatedScenario: ScenarioInputsState) => void, onRemove: () => void, currency: string }) => {

    const handleInputChange = (field: keyof Omit<ScenarioInputsState, 'id' | 'name' | 'renovations' | 'payment_schedule' | 'loan_details'>, value: any) => {
        onChange({ ...scenario, [field]: value });
    };

    const handleNestedChange = (section: 'loan_details', field: keyof LoanDetails, value: any) => {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        onChange({ ...scenario, [section]: { ...(scenario[section] || {}), [field]: isNaN(numValue) ? undefined : numValue } });
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
        { value: 'new', label: 'New Build' }, // Keep new/under_construction for DK too
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
                        tooltip="Select the city (currently fixed based on country)."
                        disabled // Disable city selection for now as it's fixed
                    />
                    <SelectField
                        label="Property Type"
                        value={scenario.property_type}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('property_type', e.target.value)}
                        options={propertyTypeOptions}
                        tooltip="Select the type of property."
                    />
                    <InputField
                        label={`Purchase Price (${currency})`}
                        value={scenario.new_flat_price}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('new_flat_price', parseFloat(e.target.value) || undefined)}
                        placeholder="e.g., 300000"
                        tooltip="The total purchase price of the property."
                    />
                </div>

                {/* Column 2 */}
                <div>
                    <h4 className="font-medium mb-2 text-md">Loan Details</h4>
                    <div className="relative">
                        <InputField
                            label={`Loan Amount (${currency})`}
                            value={scenario.loan_details?.amount}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNestedChange('loan_details', 'amount', e.target.value)}
                            placeholder="e.g., 240000"
                            tooltip="The total amount of the loan."
                        />
                        <button 
                            onClick={() => {
                                if (scenario.new_flat_price) {
                                    const eightyPercent = Math.round(scenario.new_flat_price * 0.8);
                                    handleNestedChange('loan_details', 'amount', eightyPercent);
                                }
                            }}
                            className="absolute right-0 top-8 px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 border border-indigo-300"
                            title="Set loan amount to 80% of property price"
                            type="button"
                        >
                            Set to 80%
                        </button>
                    </div>
                    <InputField
                        label="Interest Rate (% p.a.)"
                        type="number"
                        value={scenario.loan_details?.interest_rate !== undefined ? scenario.loan_details.interest_rate * 100 : ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNestedChange('loan_details', 'interest_rate', parseFloat(e.target.value) / 100)}
                        placeholder="e.g., 3.5 for 3.5%"
                        step="0.01"
                        tooltip="Annual interest rate for the loan (e.g., 3.5 for 3.5%)."
                    />
                    <InputField
                        label="Loan Term (Years)"
                        value={scenario.loan_details?.term_years}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNestedChange('loan_details', 'term_years', parseInt(e.target.value, 10) || undefined)}
                        placeholder="e.g., 30"
                        tooltip="The total term of the loan in years."
                    />
                    {scenario.country === 'denmark' && scenario.property_type === 'andels' && (
                        <SelectField
                            label="Loan Type (Denmark - Andels)"
                            value={scenario.loan_type || 'standard'}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('loan_type', e.target.value)}
                            options={loanTypeOptions}
                            tooltip="Select the type of loan for Andelsbolig."
                        />
                    )}
                </div>
            </div>

            {/* Conditional Inputs based on Property Type / Country */}
            {scenario.property_type === 'under_construction' && (
                <PaymentScheduleInput 
                    schedule={scenario.payment_schedule}
                    onChange={handlePaymentScheduleChange} 
                />
            )}
            {scenario.property_type === 'under_construction' && (
                 <InputField
                    label="Construction Completion (Years from Purchase)"
                    value={scenario.construction_completion_years}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('construction_completion_years', parseInt(e.target.value, 10) || undefined)}
                    placeholder="e.g., 2"
                    tooltip="Number of years until the property construction is completed and habitable."
                />
            )}

            {scenario.country === 'spain' && (
                <>
                    <CheckboxField
                        label="Beckham Law Active?"
                        checked={!!scenario.beckham_law_active}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('beckham_law_active', e.target.checked)}
                        tooltip="Is the Beckham Law (special tax regime for impatriates) applicable?"
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
            
            {/* Renovations are always available */}
            <RenovationInput renovations={scenario.renovations} onChange={handleRenovationChange} currency={currency} />

        </div>
    );
};

// --- Main App Component ---
function App() {
    const [personalFinance, setPersonalFinance] = useState<PersonalFinanceInputs>({});
    const [scenarioSettings, setScenarioSettings] = useState<ScenarioSettingsInputs>({ years_to_sell: 10, currency: 'EUR' });
    const [scenarios, setScenarios] = useState<ScenarioInputsState[]>([
        { id: 's1', name: 'Scenario 1', country: 'spain', city: 'barcelona', property_type: 'new', renovations: [], loan_details: { interest_rate: 0.035, term_years: 30} },
    ]);
    const [rentingInputs, setRentingInputs] = useState<RentingScenarioInputs>({}); // State for renting inputs
    const [activeTab, setActiveTab] = useState<string>(scenarios[0]?.id || 's1');
    const [results, setResults] = useState<BackendResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePersonalFinanceChange = (field: keyof PersonalFinanceInputs, value: any) => {
        setPersonalFinance(prev => ({ ...prev, [field]: parseFloat(value) || undefined }));
    };

    const handleScenarioSettingsChange = (field: keyof ScenarioSettingsInputs, value: any) => {
        if (field === 'currency') {
            setScenarioSettings(prev => ({ ...prev, [field]: value as 'EUR' | 'DKK' }));
        } else {
            setScenarioSettings(prev => ({ ...prev, [field]: parseInt(value, 10) || 0 }));
        }
    };

    const handleRentingInputChange = (updatedInputs: RentingScenarioInputs) => {
        setRentingInputs(updatedInputs);
    };

    const addScenario = () => {
        const newId = `s${Date.now()}`;
        const newScenario: ScenarioInputsState = {
            id: newId,
            name: `Scenario ${scenarios.length + 1}`,
            country: 'spain', // Default to Spain
            city: 'barcelona',
            property_type: 'new',
            renovations: [],
            loan_details: { interest_rate: 0.035, term_years: 30}
        };
        setScenarios(prev => [...prev, newScenario]);
        setActiveTab(newId);
    };

    const updateScenario = (id: string, updatedScenarioData: ScenarioInputsState) => {
        setScenarios(prev => prev.map(sc => sc.id === id ? updatedScenarioData : sc));
    };

    const removeScenario = (idToRemove: string) => {
        setScenarios(prev => prev.filter(sc => sc.id !== idToRemove));
        if (activeTab === idToRemove && scenarios.length > 1) {
            setActiveTab(scenarios.filter(sc => sc.id !== idToRemove)[0].id);
        } else if (scenarios.length <= 1) {
            // If last tab is removed, or only one tab existed
            // Consider adding a default scenario or handling empty state
            if (scenarios.length === 1 && scenarios[0].id === idToRemove) {
                 // Potentially add a new default scenario or clear activeTab
                 // For now, just clear activeTab if it was the one removed and no others exist
                 setActiveTab(''); 
            }
        }
    };

    const cleanRenovationsForApi = (renovations: RenovationItem[]): RenovationPayloadItem[] => {
        return renovations.map(({ id, ...rest }) => rest); // Remove client-side 'id'
    };

    const handleCalculate = async () => {
        setIsLoading(true);
        setError(null);
        setResults(null);

        const scenariosForApi: BackendScenarioPayload[] = scenarios.map(scenarioState => {
            const { id, country, city, name: _name, renovations, ...inputsWithoutClientFields } = scenarioState; // _name to avoid unused var
            const cleanedRenovations = cleanRenovationsForApi(renovations);
            
            // Ensure loan_details are passed correctly, even if partially filled
            const loanDetailsPayload = scenarioState.loan_details ? {
                amount: scenarioState.loan_details.amount,
                interest_rate: scenarioState.loan_details.interest_rate,
                term_years: scenarioState.loan_details.term_years,
            } : undefined;

            const scenarioSpecificInputs: ScenarioSpecificInputsPayload = {
                ...inputsWithoutClientFields,
                renovations: cleanedRenovations,
                loan_details: loanDetailsPayload,
                // Ensure property_type is always passed
                property_type: scenarioState.property_type,
            };

            return {
                id,
                country,
                city,
                inputs: scenarioSpecificInputs,
            };
        });

        const requestPayload: CalculationRequest = {
            personal_finance: personalFinance,
            scenario_settings: scenarioSettings,
            scenarios: scenariosForApi,
            renting_scenario_inputs: Object.keys(rentingInputs).length > 0 ? rentingInputs : undefined,
        };

        try {
            // Get API URL from environment variable or use default
            const apiUrl = import.meta.env.VITE_API_URL || '/api';
            console.log(`Using API URL: ${apiUrl}`);
            
            const response = await fetch(`${apiUrl}/calculate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestPayload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
                throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
            }
            const data: BackendResponse = await response.json();
            setResults(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch results.');
            console.error("Calculation error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const activeScenario = scenarios.find(sc => sc.id === activeTab);

    const currencySymbol = scenarioSettings.currency === 'EUR' ? '€' : 'DKK';

    // Define the order for result rows
    const resultRowOrder: (keyof SingleScenarioResult['scenario_outcomes'])[] = ['zero_growth', 'average', 'low_risk', 'high_risk'];
    const resultRowLabels: Record<keyof SingleScenarioResult['scenario_outcomes'], string> = {
        zero_growth: 'Zero Growth',
        average: 'Average Growth',
        low_risk: 'Low Risk (Pessimistic)',
        high_risk: 'High Risk (Optimistic)',
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
            <header className="mb-8 text-center">
                <h1 className="text-4xl font-bold text-indigo-700">Property Investment Analyzer</h1>
                <p className="text-md text-gray-600">Compare property investments across different scenarios and locations.</p>
            </header>

            {/* --- Global Settings & Personal Finance --- */}
            <section className="mb-8 p-6 bg-white rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold mb-4 text-gray-700 border-b pb-2">Global Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InputField
                        label="Years to Sell"
                        type="number"
                        value={scenarioSettings.years_to_sell}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleScenarioSettingsChange('years_to_sell', e.target.value)}
                        placeholder="e.g., 10"
                        tooltip="Number of years you plan to hold the property before selling."
                        min="1"
                    />
                    <SelectField
                        label="Display Currency"
                        value={scenarioSettings.currency}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleScenarioSettingsChange('currency', e.target.value)}
                        options={[{ value: 'EUR', label: 'EUR (€)' }, { value: 'DKK', label: 'DKK (kr.)' }]}
                        tooltip="Select the currency for displaying financial values."
                    />
                    <div> {/* Placeholder for potential third global setting */}
                    </div>
                </div>
                <h3 className="text-xl font-semibold mt-6 mb-4 text-gray-700 border-b pb-2">Personal Finance (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <InputField
                        label={`Annual Gross Salary (${currencySymbol})`}
                        value={personalFinance.salary}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePersonalFinanceChange('salary', e.target.value)}
                        placeholder="e.g., 60000"
                        tooltip="Your annual gross salary (used for some tax calculations if applicable)."
                    />
                    <InputField
                        label="Tax Rate Override (%)"
                        value={personalFinance.tax_rate_override !== undefined && personalFinance.tax_rate_override !== null ? personalFinance.tax_rate_override * 100 : ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePersonalFinanceChange('tax_rate_override', parseFloat(e.target.value) / 100)}
                        placeholder="e.g., 30 for 30% (optional)"
                        tooltip="Override default income tax calculations with a flat rate (e.g., 0.30 for 30%). Leave blank to use defaults."
                        min="0"
                        max="100"
                    />
                </div>
            </section>

            {/* --- Renting Scenario Input Section --- */}
            <section className="mb-8">
                <RentingScenarioInputSection 
                    inputs={rentingInputs} 
                    onChange={handleRentingInputChange} 
                    currency={currencySymbol} 
                />
            </section>

            {/* --- Purchase Scenarios Section --- */}
            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-gray-700 border-b pb-2">Purchase Scenarios</h2>
                <div className="mb-4 flex items-center space-x-2 border-b border-gray-300">
                    {scenarios.map(sc => (
                        <button
                            key={sc.id}
                            onClick={() => setActiveTab(sc.id)}
                            className={`py-2 px-4 text-sm font-medium focus:outline-none 
                                        ${activeTab === sc.id 
                                            ? 'border-b-2 border-indigo-500 text-indigo-600'
                                            : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            {sc.name}
                        </button>
                    ))}
                    <button onClick={addScenario} className="ml-auto py-2 px-3 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-md flex items-center">
                        + Add Scenario
                    </button>
                </div>

                {activeScenario && (
                    <ScenarioInput
                        key={activeScenario.id} // Important for re-rendering when tab changes
                        scenario={activeScenario}
                        onChange={(updatedData) => updateScenario(activeScenario.id, updatedData)}
                        onRemove={() => removeScenario(activeScenario.id)}
                        currency={currencySymbol}
                    />
                )}
                {scenarios.length === 0 && <p className="text-center text-gray-500 py-4">No purchase scenarios defined. Click "+ Add Scenario" to begin.</p>}
            </section>

            <div className="text-center my-10">
                <button
                    onClick={handleCalculate}
                    disabled={isLoading || scenarios.length === 0}
                    className="px-12 py-4 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out text-lg"
                >
                    {isLoading ? 'Calculating...' : 'Calculate Investment'}
                </button>
            </div>

            {error && (
                <div className="my-6 p-4 bg-red-100 text-red-700 border border-red-300 rounded-md shadow-sm">
                    <h3 className="font-semibold">Error:</h3>
                    <p>{error}</p>
                </div>
            )}

            {results && (
                <section className="mt-10 p-6 bg-white rounded-lg shadow-xl">
                    <h2 className="text-3xl font-bold mb-6 text-center text-indigo-700">Calculation Results</h2>
                    
                    {results.renting_scenario_results && !results.renting_scenario_results.error && (
                        <div className="mb-8 p-4 bg-blue-50 rounded-md shadow">
                            <h3 className="text-xl font-semibold text-blue-700 mb-2">Renting Scenario (Base Index)</h3>
                            <p className="text-lg">
                                Total Cost of Renting over {scenarioSettings.years_to_sell} years: 
                                <strong className="ml-2">{currencySymbol}{results.renting_scenario_results.total_renting_cost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</strong>
                            </p>
                            {/* Optionally display more breakdown from results.renting_scenario_results.breakdown_annual here */}
                        </div>
                    )}
                    {results.renting_scenario_results?.error && (
                         <div className="mb-4 p-3 bg-yellow-100 text-yellow-700 border border-yellow-300 rounded-md">
                            <p><strong>Renting Scenario Warning:</strong> {results.renting_scenario_results.error}</p>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Scenario Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Growth Scenario</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Est. Selling Value ({currencySymbol})</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Raw Profit / (Loss) ({currencySymbol})</th>
                                    {results.renting_scenario_results && !results.renting_scenario_results.error && (
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Index Adj. Profit / (Loss) ({currencySymbol})</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {results.results_by_scenario.map(scenarioResult => {
                                    const scenarioDetails = scenarios.find(s => s.id === scenarioResult.scenario_id);
                                    if (!scenarioResult.result || scenarioResult.error) {
                                        return (
                                            <tr key={scenarioResult.scenario_id || `error-${Math.random()}`}>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800">{scenarioDetails?.name || scenarioResult.scenario_id || 'Unknown Scenario'}</td>
                                                <td colSpan={results.renting_scenario_results && !results.renting_scenario_results.error ? 4 : 3} className="px-4 py-3 whitespace-nowrap text-sm text-red-600">
                                                    Error: {scenarioResult.error || 'Calculation failed for this scenario.'}
                                                </td>
                                            </tr>
                                        );
                                    }
                                    const outcomes = scenarioResult.result.scenario_outcomes;
                                    return resultRowOrder.map((key, index) => (
                                        <tr key={`${scenarioResult.scenario_id}-${key}`} className={index === 0 ? "border-t-2 border-gray-400" : ""}>
                                            {index === 0 && (
                                                <td rowSpan={resultRowOrder.length} className="px-4 py-3 whitespace-nowrap text-sm font-bold text-indigo-700 align-top border-r">
                                                    {scenarioDetails?.name || scenarioResult.scenario_id}
                                                </td>
                                            )}
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{resultRowLabels[key]}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-right">
                                                {outcomes[key].selling_price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </td>
                                            <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${outcomes[key].win_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {outcomes[key].win_loss.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </td>
                                            {results.renting_scenario_results && !results.renting_scenario_results.error && (
                                                <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-semibold ${outcomes[key].index_adjusted_profit_eur !== undefined && outcomes[key].index_adjusted_profit_eur! >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                                    {outcomes[key].index_adjusted_profit_eur?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) ?? 'N/A'}
                                                </td>
                                            )}
                                        </tr>
                                    ));
                                })}
                            </tbody>
                        </table>
                    </div>

                    {results.global_warnings && results.global_warnings.length > 0 && (
                        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-300 rounded-md">
                            <h4 className="font-semibold text-yellow-800">Global Warnings:</h4>
                            <ul className="list-disc list-inside text-sm text-yellow-700">
                                {results.global_warnings.map((warn, idx) => <li key={idx}>{warn}</li>)}
                            </ul>
                        </div>
                    )}

                    <details className="mt-8 p-3 bg-gray-50 rounded-md shadow-inner cursor-pointer">
                        <summary className="font-medium text-gray-700 hover:text-indigo-600">View Raw JSON Response</summary>
                        <pre className="mt-2 p-4 bg-gray-800 text-white text-xs rounded overflow-auto max-h-96">
                            {JSON.stringify(results, null, 2)}
                        </pre>
                    </details>
                </section>
            )}
        </div>
    );
}

export default App;

