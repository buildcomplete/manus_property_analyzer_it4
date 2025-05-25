import { useState, Fragment, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './App.css'; // Ensure Tailwind is configured via index.css or similar
import DetailedBreakdownTable from './DetailedBreakdownTable';
import ErrorBoundary from './ErrorBoundary';

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
interface DetailedBreakdown {
    purchase_costs: Record<string, any>;
    loan_costs: Record<string, any>;
    running_costs: Record<string, any>;
    selling_costs: Record<string, any>;
    outcome: Record<string, any>;
}

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
    detailed_breakdowns?: {
        average?: DetailedBreakdown;
        low_risk?: DetailedBreakdown;
        high_risk?: DetailedBreakdown;
        zero_growth?: DetailedBreakdown;
        [key: string]: DetailedBreakdown | undefined;
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
    growth_rates?: {
        zero_growth: number;
        avg_growth: number;
        low_risk: number;
        high_risk: number;
        [key: string]: number;
    };
    error?: string;
}

// --- Loan Payback Schedule Interface ---
interface LoanPaymentItem {
    payment_number: number;
    payment_date: string;
    payment_amount: number;
    principal_payment: number;
    interest_payment: number;
    remaining_balance: number;
}

interface LoanPaybackSchedule {
    monthly_payment: number;
    total_payments: number;
    total_interest: number;
    total_principal: number;
    payments: LoanPaymentItem[];
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

// --- Scenario Input Component ---
const ScenarioInput = ({ scenario, onChange, onRemove, currency }: { scenario: ScenarioInputsState, onChange: (updatedData: ScenarioInputsState) => void, onRemove: () => void, currency: string }) => {
    // Options for dropdowns
    const countryOptions = [
        { value: 'spain', label: 'Spain' },
        { value: 'denmark', label: 'Denmark' },
    ];
    
    const cityOptions = {
        spain: [{ value: 'barcelona', label: 'Barcelona' }],
        denmark: [{ value: 'copenhagen', label: 'Copenhagen' }],
    };
    
    const propertyTypeOptions = [
        { value: 'new', label: 'New Construction (Completed)' },
        { value: 'second_hand', label: 'Second-Hand' },
        { value: 'under_construction', label: 'Under Construction' },
    ];
    
    if (scenario.country === 'denmark') {
        propertyTypeOptions.push({ value: 'ejer', label: 'Ejer Lejlighed' });
        propertyTypeOptions.push({ value: 'andels', label: 'Andels Lejlighed' });
    }
    
    const loanTypeOptions = [
        { value: 'standard', label: 'Standard Loan' },
        { value: 'andels_laan', label: 'Andels Lån' },
    ];

    // Handle input changes
    const handleInputChange = (field: keyof ScenarioInputsState, value: any) => {
        const updatedScenario = { ...scenario, [field]: value };
        
        // Special handling for country changes
        if (field === 'country') {
            // Reset city to first option of new country
            updatedScenario.city = cityOptions[value as 'spain' | 'denmark'][0].value;
            
            // Reset property type if it's Denmark-specific and switching to Spain
            if (value === 'spain' && (scenario.property_type === 'ejer' || scenario.property_type === 'andels')) {
                updatedScenario.property_type = 'new';
            }
        }
        
        onChange(updatedScenario);
    };
    
    const handleNestedChange = (parentField: keyof ScenarioInputsState, childField: string, value: any) => {
        // Handle nested objects like loan_details
        const parentValue = scenario[parentField] as Record<string, any> || {};
        const updatedParent = { ...parentValue, [childField]: parseFloat(value) || undefined };
        handleInputChange(parentField, updatedParent);
    };
    
    // Remove unused function
    const handleRenovationChange = (renovations: RenovationItem[]) => {
        handleInputChange('renovations', renovations);
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-4">
                    <input
                        type="text"
                        value={scenario.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Scenario Name"
                    />
                </div>
                <button
                    onClick={onRemove}
                    className="text-red-500 hover:text-red-700 px-3 py-1 border border-red-300 rounded-md hover:bg-red-50"
                    title="Remove this scenario"
                >
                    Remove
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1 */}
                <div>
                    <SelectField
                        label="Country"
                        value={scenario.country}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('country', e.target.value)}
                        options={countryOptions}
                    />
                    
                    <SelectField
                        label="City"
                        value={scenario.city}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('city', e.target.value)}
                        options={cityOptions[scenario.country]}
                    />
                    
                    <SelectField
                        label="Property Type"
                        value={scenario.property_type}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('property_type', e.target.value)}
                        options={propertyTypeOptions}
                    />
                    
                    <InputField
                        label={`Property Price (${currency})`}
                        value={scenario.new_flat_price}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('new_flat_price', parseFloat(e.target.value) || undefined)}
                        placeholder="e.g., 500000"
                        tooltip="The purchase price of the property."
                    />
                    
                    {scenario.country === 'spain' && (
                        <>
                            <CheckboxField
                                label="Beckham Law Active"
                                checked={scenario.beckham_law_active || false}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('beckham_law_active', e.target.checked)}
                                tooltip="Whether you qualify for the Beckham Law tax regime."
                            />
                            
                            {scenario.beckham_law_active && (
                                <InputField
                                    label="Beckham Law Remaining Years"
                                    value={scenario.beckham_law_remaining_years}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('beckham_law_remaining_years', parseInt(e.target.value, 10) || undefined)}
                                    placeholder="e.g., 5"
                                    tooltip="Number of years remaining on your Beckham Law eligibility."
                                    min={0}
                                    max={6}
                                />
                            )}
                        </>
                    )}
                    
                    {scenario.country === 'denmark' && scenario.property_type === 'andels' && (
                        <SelectField
                            label="Loan Type"
                            value={scenario.loan_type || 'standard'}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('loan_type', e.target.value)}
                            options={loanTypeOptions}
                            tooltip="Type of loan for Andels property."
                        />
                    )}
                    
                    {scenario.property_type === 'under_construction' && (
                        <InputField
                            label="Completion Time (Years)"
                            value={scenario.construction_completion_years}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('construction_completion_years', parseFloat(e.target.value) || undefined)}
                            placeholder="e.g., 2"
                            tooltip="Expected time until construction is completed (in years)."
                            step="0.5"
                            min={0}
                        />
                    )}
                    
                    <RenovationInput
                        renovations={scenario.renovations}
                        onChange={handleRenovationChange}
                        currency={currency}
                    />
                </div>
                
                {/* Column 2 */}
                <div>
                    <div className="mb-6 p-4 border rounded-md bg-gray-50">
                        <h4 className="font-medium mb-3 text-md">Loan Details</h4>
                        
                        <div className="mb-4">
                            <InputField
                                label={`Loan Amount (${currency})`}
                                value={scenario.loan_details?.amount}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNestedChange('loan_details', 'amount', e.target.value)}
                                placeholder="e.g., 400000"
                                tooltip="The principal amount of the loan."
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    if (scenario.new_flat_price) {
                                        const eightyPercentAmount = Math.round(scenario.new_flat_price * 0.8);
                                        handleNestedChange('loan_details', 'amount', eightyPercentAmount);
                                    }
                                }}
                                className="mt-1 text-sm bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100"
                                disabled={!scenario.new_flat_price}
                            >
                                Set to 80% of property price
                            </button>
                        </div>
                        
                        <InputField
                            label="Interest Rate (%)"
                            value={scenario.loan_details?.interest_rate !== undefined ? scenario.loan_details.interest_rate * 100 : ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const value = e.target.value === '' ? undefined : parseFloat(e.target.value) / 100;
                                handleNestedChange('loan_details', 'interest_rate', value);
                            }}
                            placeholder="e.g., 3.5"
                            tooltip="Annual interest rate (e.g., 3.5 for 3.5%)."
                            step="0.01"
                            min={0}
                            max={20}
                        />
                        
                        <InputField
                            label="Term (Years)"
                            value={scenario.loan_details?.term_years}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNestedChange('loan_details', 'term_years', e.target.value)}
                            placeholder="e.g., 30"
                            tooltip="Duration of the loan in years."
                            min={1}
                            max={50}
                        />
                        
                        {/* Loan Payback Schedule Component */}
                        {scenario.loan_details?.amount && scenario.loan_details?.interest_rate && scenario.loan_details?.term_years && (
                            <LoanPaybackScheduleComponent 
                                loanDetails={scenario.loan_details} 
                                currency={currency} 
                            />
                        )}
                    </div>
                    
                    {scenario.property_type === 'under_construction' && (
                        <div className="mb-6 p-4 border rounded-md bg-gray-50">
                            <h4 className="font-medium mb-3 text-md">Payment Schedule</h4>
                            <p className="text-xs text-gray-500 mb-3">Define when payments are due during construction.</p>
                            
                            {/* Payment schedule component would go here */}
                            <p className="text-sm text-gray-600">Payment schedule implementation coming soon.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Loan Payback Schedule Component ---
const LoanPaybackScheduleComponent = ({ loanDetails, currency }: { loanDetails: LoanDetails, currency: string }) => {
    const [schedule, setSchedule] = useState<LoanPaybackSchedule | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showFullSchedule, setShowFullSchedule] = useState(false);
    
    const calculateSchedule = () => {
        setIsLoading(true);
        
        try {
            const { amount = 0, interest_rate = 0, term_years = 0 } = loanDetails;
            
            if (!amount || !interest_rate || !term_years) {
                throw new Error("Missing loan details");
            }
            
            // Calculate monthly payment
            const monthlyRate = interest_rate / 12;
            const totalPayments = term_years * 12;
            const monthlyPayment = amount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / (Math.pow(1 + monthlyRate, totalPayments) - 1);
            
            // Generate amortization schedule
            let remainingBalance = amount;
            const payments: LoanPaymentItem[] = [];
            let totalInterest = 0;
            let totalPrincipal = 0;
            
            for (let i = 1; i <= totalPayments; i++) {
                // Calculate interest for this period
                const interestPayment = remainingBalance * monthlyRate;
                
                // Calculate principal for this period
                const principalPayment = monthlyPayment - interestPayment;
                
                // Update remaining balance
                remainingBalance -= principalPayment;
                
                // Update totals
                totalInterest += interestPayment;
                totalPrincipal += principalPayment;
                
                // Calculate payment date
                const currentDate = new Date();
                currentDate.setMonth(currentDate.getMonth() + i);
                const paymentDate = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                
                // Add payment to schedule
                payments.push({
                    payment_number: i,
                    payment_date: paymentDate,
                    payment_amount: monthlyPayment,
                    principal_payment: principalPayment,
                    interest_payment: interestPayment,
                    remaining_balance: Math.max(0, remainingBalance) // Ensure we don't show negative balance due to rounding
                });
            }
            
            setSchedule({
                monthly_payment: monthlyPayment,
                total_payments: totalPayments,
                total_interest: totalInterest,
                total_principal: totalPrincipal,
                payments
            });
        } catch (error) {
            console.error("Error calculating loan schedule:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Display a limited number of payments initially
    const displayedPayments = showFullSchedule ? schedule?.payments : schedule?.payments?.slice(0, 12);

    return (
        <div className="mt-4 p-4 border rounded-md bg-gray-50">
            <h3 className="text-lg font-semibold mb-4">Loan Payback Schedule</h3>
            
            {!schedule && (
                <div className="text-center">
                    <button 
                        onClick={calculateSchedule}
                        disabled={isLoading || !loanDetails.amount || !loanDetails.interest_rate || !loanDetails.term_years}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Calculating...' : 'Calculate Loan Schedule'}
                    </button>
                    {(!loanDetails.amount || !loanDetails.interest_rate || !loanDetails.term_years) && (
                        <p className="mt-2 text-sm text-red-500">Please fill in all loan details (amount, interest rate, term) to calculate the schedule.</p>
                    )}
                </div>
            )}
            
            {schedule && (
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="p-3 bg-white rounded border">
                            <h4 className="font-medium text-gray-700">Monthly Payment</h4>
                            <p className="text-xl font-bold text-indigo-700">{currency}{schedule.monthly_payment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-3 bg-white rounded border">
                            <h4 className="font-medium text-gray-700">Total Interest</h4>
                            <p className="text-xl font-bold text-indigo-700">{currency}{schedule.total_interest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 border">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">Payment #</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase">Payment</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase">Principal</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase">Interest</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase">Remaining</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {displayedPayments?.map((payment) => (
                                    <tr key={payment.payment_number} className={payment.payment_number % 2 === 0 ? 'bg-gray-50' : ''}>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{payment.payment_number}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{payment.payment_date}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 text-right">
                                            {currency}{payment.payment_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-green-600 text-right">
                                            {currency}{payment.principal_payment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-red-600 text-right">
                                            {currency}{payment.interest_payment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 text-right">
                                            {currency}{payment.remaining_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="mt-4 text-center">
                        <button 
                            onClick={() => setShowFullSchedule(!showFullSchedule)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                            {showFullSchedule ? 'Show First Year Only' : 'Show Full Schedule'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Renting Scenario Input Component ---
const RentingScenarioInputComponent = ({ inputs, onChange }: { inputs: RentingScenarioInputs, onChange: (updatedInputs: RentingScenarioInputs) => void }) => {
    // Handle input changes
    const handleInputChange = (field: keyof RentingScenarioInputs, value: any) => {
        onChange({ ...inputs, [field]: value });
    };
    
    // Handle percentage inputs (convert from display % to decimal)
    const handleIncrementChange = (field: keyof RentingScenarioInputs, value: string) => {
        const numValue = value === '' ? undefined : parseFloat(value) / 100;
        handleInputChange(field, numValue);
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Renting Scenario</h3>
            <p className="text-sm text-gray-600 mb-4">Define the costs associated with renting instead of buying.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1: Monthly Costs */}
                <div>
                    <h4 className="font-medium mb-3 text-md">Monthly Costs</h4>
                    <InputField
                        label="Monthly Rent"
                        value={inputs.monthly_rent}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('monthly_rent', parseFloat(e.target.value) || undefined)}
                        placeholder="e.g., 1500"
                        tooltip="Your monthly rent payment."
                    />
                    <InputField
                        label="Monthly Water"
                        value={inputs.monthly_water}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('monthly_water', parseFloat(e.target.value) || undefined)}
                        placeholder="e.g., 50"
                        tooltip="Your estimated monthly water costs."
                    />
                    <InputField
                        label="Monthly Utilities"
                        value={inputs.monthly_utilities}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('monthly_utilities', parseFloat(e.target.value) || undefined)}
                        placeholder="e.g., 100"
                        tooltip="Your estimated monthly utility costs (electricity, gas, etc.)."
                    />
                    <InputField
                        label="Monthly Parking"
                        value={inputs.monthly_parking}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('monthly_parking', parseFloat(e.target.value) || undefined)}
                        placeholder="e.g., 75"
                        tooltip="Your estimated monthly parking costs (if applicable)."
                    />
                </div>
                
                {/* Column 2: Annual Increments */}
                <div>
                    <h4 className="font-medium mb-3 text-md">Annual Percentage Increases</h4>
                    <InputField
                        label="Annual Rent Increment (%)"
                        value={inputs.annual_rent_increment !== undefined ? inputs.annual_rent_increment * 100 : ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncrementChange('annual_rent_increment', e.target.value)}
                        placeholder="e.g., 2"
                        tooltip="Annual percentage increase in rent (e.g., 2 for 2%)."
                    />
                    <InputField
                        label="Annual Water Increment (%)"
                        value={inputs.annual_water_increment !== undefined ? inputs.annual_water_increment * 100 : ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncrementChange('annual_water_increment', e.target.value)}
                        placeholder="e.g., 1"
                        tooltip="Annual percentage increase in water costs (e.g., 1 for 1%)."
                    />
                    <InputField
                        label="Annual Utilities Increment (%)"
                        value={inputs.annual_utilities_increment !== undefined ? inputs.annual_utilities_increment * 100 : ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncrementChange('annual_utilities_increment', e.target.value)}
                        placeholder="e.g., 1"
                        tooltip="Annual percentage increase in utility costs (e.g., 1 for 1%)."
                    />
                    <InputField
                        label="Annual Parking Increment (%)"
                        value={inputs.annual_parking_increment !== undefined ? inputs.annual_parking_increment * 100 : ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncrementChange('annual_parking_increment', e.target.value)}
                        placeholder="e.g., 1"
                        tooltip="Annual percentage increase in parking costs (e.g., 1 for 1%)."
                    />
                </div>
            </div>
        </div>
    );
};

// --- Main App Component ---
function App() {
    // State for app version
    const [appVersion, setAppVersion] = useState<string>("");
    
    // Load app version from config
    useEffect(() => {
        try {
            if (window && window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.VERSION) {
                setAppVersion(window.RUNTIME_CONFIG.VERSION);
            }
        } catch (error) {
            console.error("Error loading app version:", error);
            setAppVersion("4.2.0"); // Fallback version
        }
    }, []);
    
    // State for scenarios
    const [scenarios, setScenarios] = useState<ScenarioInputsState[]>([]);
    
    // State for personal finance inputs
    const [personalFinance, setPersonalFinance] = useState<PersonalFinanceInputs>({
        salary: undefined,
        tax_rate_override: null,
        existing_flat_value: undefined,
        existing_loan_size: undefined
    });
    
    // State for scenario settings
    const [scenarioSettings, setScenarioSettings] = useState<ScenarioSettingsInputs>({
        years_to_sell: 5,
        currency: 'EUR'
    });
    
    // State for renting scenario
    const [rentingScenarioInputs, setRentingScenarioInputs] = useState<RentingScenarioInputs>({
        monthly_rent: undefined,
        monthly_water: undefined,
        monthly_utilities: undefined,
        monthly_parking: undefined,
        annual_rent_increment: 0,
        annual_water_increment: 0,
        annual_utilities_increment: 0,
        annual_parking_increment: 0
    });
    
    // State for calculation results
    const [results, setResults] = useState<BackendResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // State for expanded detailed breakdowns and active scenario tab
    const [expandedScenarios, setExpandedScenarios] = useState<Record<string, boolean>>({});
    
    // Currency symbol based on selected currency
    const currencySymbol = scenarioSettings.currency === 'EUR' ? '€' : 'kr';
    
    // Add a new scenario
    const addScenario = () => {
        const newScenario: ScenarioInputsState = {
            id: uuidv4(),
            name: `Scenario ${scenarios.length + 1}`,
            country: 'spain',
            city: 'barcelona',
            property_type: 'new',
            renovations: [],
            loan_details: {
                amount: undefined,
                interest_rate: undefined,
                term_years: undefined
            }
        };
        const newScenarios = [...scenarios, newScenario];
        setScenarios(newScenarios);
        
        // Set the newly added scenario as active in tabs
        const newExpandedState: Record<string, boolean> = {};
        newScenarios.forEach(s => {
            newExpandedState[s.id] = s.id === newScenario.id;
        });
        setExpandedScenarios(newExpandedState);
    };
    
    // Update a scenario
    const updateScenario = (id: string, updatedData: ScenarioInputsState) => {
        setScenarios(scenarios.map(s => s.id === id ? updatedData : s));
    };
    
    // Remove a scenario
    const removeScenario = (id: string) => {
        const remainingScenarios = scenarios.filter(s => s.id !== id);
        setScenarios(remainingScenarios);
        
        // If we removed the active scenario, activate another one if available
        if (expandedScenarios[id] && remainingScenarios.length > 0) {
            const newExpandedState: Record<string, boolean> = {};
            remainingScenarios.forEach((s, index) => {
                // Activate the first scenario by default
                newExpandedState[s.id] = index === 0;
            });
            setExpandedScenarios(newExpandedState);
        }
    };
    
    // Toggle detailed breakdown visibility
    const toggleDetailedBreakdown = (scenarioId: string, key: string) => {
        const expandKey = `${scenarioId}-${key}`;
        setExpandedScenarios({
            ...expandedScenarios,
            [expandKey]: !expandedScenarios[expandKey]
        });
    };
    
    // Format growth rate for display
    const formatGrowthRate = (rate: number): string => {
        return `${(rate * 100).toFixed(1)}%`;
    };
    
    // Get result row label with growth rate
    const getResultRowLabel = (key: string): string => {
        // Use type assertion to safely access resultRowLabels with string key
        const baseLabel = (resultRowLabels as Record<string, string>)[key] || key;
        
        // If no growth rates available, return base label
        if (!results?.growth_rates) return baseLabel;
        
        const growthRates = results.growth_rates;
        
        // Map frontend keys to backend keys
        const backendKeyMap: Record<string, string> = {
            'zero_growth': 'zero_growth',
            'average': 'avg_growth',
            'low_risk': 'low_risk',
            'high_risk': 'high_risk'
        };
        
        const backendKey = backendKeyMap[key];
        if (!backendKey || !growthRates[backendKey]) return baseLabel;
        
        return `${baseLabel} (${formatGrowthRate(growthRates[backendKey])})`;
    };
    
    const resultRowLabels: Record<keyof SingleScenarioResult['scenario_outcomes'], string> = {
        zero_growth: 'Zero Growth',
        average: 'Average Growth',
        low_risk: 'Low Risk (Pessimistic)',
        high_risk: 'High Risk (Optimistic)',
    };

    // Map backend keys to frontend expected keys
    const mapBackendToFrontendKeys = (result: any) => {
        if (!result) return result;
        
        try {
            console.log("Mapping backend keys for result:", result);
            
            // Create a mapped structure for scenario outcomes
            const mappedOutcomes: any = {};
            
            // Get renting cost for index adjustment
            const rentingCost = results?.renting_scenario_results?.total_renting_cost || 0;
            
            // Map selling scenarios to expected frontend keys
            if (result.selling_scenarios) {
                // Map 'avg_growth' to 'average'
                if (result.selling_scenarios.avg_growth) {
                    mappedOutcomes.average = {
                        selling_price: result.selling_scenarios.avg_growth.selling_price,
                        win_loss: result.selling_scenarios.avg_growth.win_loss_eur,
                        // Calculate index adjusted profit for each growth profile individually
                        // ADD renting cost to raw profit (not subtract) as this represents avoided cost
                        index_adjusted_profit_eur: result.selling_scenarios.avg_growth.win_loss_eur + rentingCost
                    };
                }
                
                // Map other keys (these already match)
                if (result.selling_scenarios.zero_growth) {
                    mappedOutcomes.zero_growth = {
                        selling_price: result.selling_scenarios.zero_growth.selling_price,
                        win_loss: result.selling_scenarios.zero_growth.win_loss_eur,
                        // Calculate index adjusted profit for each growth profile individually
                        // ADD renting cost to raw profit (not subtract) as this represents avoided cost
                        index_adjusted_profit_eur: result.selling_scenarios.zero_growth.win_loss_eur + rentingCost
                    };
                }
                
                if (result.selling_scenarios.low_risk) {
                    mappedOutcomes.low_risk = {
                        selling_price: result.selling_scenarios.low_risk.selling_price,
                        win_loss: result.selling_scenarios.low_risk.win_loss_eur,
                        // Calculate index adjusted profit for each growth profile individually
                        // ADD renting cost to raw profit (not subtract) as this represents avoided cost
                        index_adjusted_profit_eur: result.selling_scenarios.low_risk.win_loss_eur + rentingCost
                    };
                }
                
                if (result.selling_scenarios.high_risk) {
                    mappedOutcomes.high_risk = {
                        selling_price: result.selling_scenarios.high_risk.selling_price,
                        win_loss: result.selling_scenarios.high_risk.win_loss_eur,
                        // Calculate index adjusted profit for each growth profile individually
                        // ADD renting cost to raw profit (not subtract) as this represents avoided cost
                        index_adjusted_profit_eur: result.selling_scenarios.high_risk.win_loss_eur + rentingCost
                    };
                }
            }
            
            // Map detailed breakdowns
            const mappedDetailedBreakdowns: any = {};
            if (result.detailed_breakdowns) {
                // Map 'avg_growth' to 'average'
                if (result.detailed_breakdowns.avg_growth) {
                    mappedDetailedBreakdowns.average = result.detailed_breakdowns.avg_growth;
                }
                
                // Copy other keys (these already match)
                if (result.detailed_breakdowns.zero_growth) {
                    mappedDetailedBreakdowns.zero_growth = result.detailed_breakdowns.zero_growth;
                }
                
                if (result.detailed_breakdowns.low_risk) {
                    mappedDetailedBreakdowns.low_risk = result.detailed_breakdowns.low_risk;
                }
                
                if (result.detailed_breakdowns.high_risk) {
                    mappedDetailedBreakdowns.high_risk = result.detailed_breakdowns.high_risk;
                }
            }
            
            // Add mapped structures to result
            result.scenario_outcomes = mappedOutcomes;
            result.mapped_detailed_breakdowns = mappedDetailedBreakdowns;
            
            return result;
        } catch (error) {
            console.error("Error mapping backend keys:", error);
            return result;
        }
    };
    
    // Define the order for result rows
    const resultRowOrder = ['zero_growth', 'average', 'low_risk', 'high_risk'];
    
    // Handle calculation
    const handleCalculate = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            // Prepare backend payload
            const backendScenarios: BackendScenarioPayload[] = scenarios.map(scenario => {
                // Convert renovations to backend format (remove client-side IDs)
                const renovations: RenovationPayloadItem[] = scenario.renovations.map(({ id, ...rest }) => rest);
                
                return {
                    id: scenario.id,
                    country: scenario.country,
                    city: scenario.city,
                    inputs: {
                        property_type: scenario.property_type,
                        new_flat_price: scenario.new_flat_price,
                        renovations,
                        loan_details: scenario.loan_details,
                        beckham_law_active: scenario.beckham_law_active,
                        beckham_law_remaining_years: scenario.beckham_law_remaining_years,
                        loan_type: scenario.loan_type,
                        construction_completion_years: scenario.construction_completion_years,
                        payment_schedule: scenario.payment_schedule
                    }
                };
            });
            
            const payload: CalculationRequest = {
                personal_finance: personalFinance,
                scenario_settings: scenarioSettings,
                scenarios: backendScenarios,
                renting_scenario_inputs: rentingScenarioInputs.monthly_rent ? rentingScenarioInputs : undefined
            };
            
            console.log("Sending calculation request:", payload);
            
            // Get API URL from config
            const apiUrl = window.RUNTIME_CONFIG?.API_URL || 'http://localhost:5000/api';
            
            // Send request to backend
            const response = await fetch(`${apiUrl}/calculate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Received calculation response:", data);
            
            setResults(data);
        } catch (err) {
            console.error("Calculation error:", err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <header className="mb-8 text-center">
                <h1 className="text-4xl font-bold text-primary mb-2">
                    <span className="brand-name">
                        <span className="regular">build</span><span className="bold">complete</span>
                    </span> Property Investment Analyzer
                </h1>
                <p className="text-lg text-foreground mb-2">Compare property investment scenarios across different countries and growth profiles.</p>
                <p className="text-sm text-muted-foreground">Building the future, one line at a time.</p>
                {appVersion && (
                    <p className="text-sm text-primary mt-2">Version {appVersion}</p>
                )}
            </header>

            <div className="mb-8 p-6 terminal-box rounded-lg">
                <h2 className="text-2xl font-semibold mb-4 text-primary">Personal Finance</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <InputField
                            label="Annual Salary"
                            value={personalFinance.salary}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPersonalFinance({...personalFinance, salary: parseFloat(e.target.value) || undefined})}
                            placeholder="e.g., 100000"
                            tooltip="Your annual gross salary."
                        />
                        <InputField
                            label="Tax Rate Override (%)"
                            value={personalFinance.tax_rate_override !== null ? personalFinance.tax_rate_override : ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const value = e.target.value === '' ? null : parseFloat(e.target.value) / 100;
                                setPersonalFinance({...personalFinance, tax_rate_override: value});
                            }}
                            placeholder="e.g., 30"
                            tooltip="Override the default tax rate calculation (optional)."
                        />
                    </div>
                    <div>
                        <InputField
                            label="Existing Flat Value"
                            value={personalFinance.existing_flat_value}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPersonalFinance({...personalFinance, existing_flat_value: parseFloat(e.target.value) || undefined})}
                            placeholder="e.g., 400000"
                            tooltip="Value of your current property (if applicable)."
                        />
                        <InputField
                            label="Existing Loan Size"
                            value={personalFinance.existing_loan_size}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPersonalFinance({...personalFinance, existing_loan_size: parseFloat(e.target.value) || undefined})}
                            placeholder="e.g., 300000"
                            tooltip="Outstanding balance on your current property loan (if applicable)."
                        />
                    </div>
                </div>
            </div>

            <div className="mb-8 p-6 terminal-box rounded-lg">
                <h2 className="text-2xl font-semibold mb-4 text-primary">Scenario Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <InputField
                            label="Years to Sell"
                            value={scenarioSettings.years_to_sell}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScenarioSettings({...scenarioSettings, years_to_sell: parseInt(e.target.value, 10) || 5})}
                            placeholder="e.g., 5"
                            tooltip="Number of years before selling the property."
                            min={1}
                            max={50}
                        />
                    </div>
                    <div>
                        <SelectField
                            label="Currency"
                            value={scenarioSettings.currency}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setScenarioSettings({...scenarioSettings, currency: e.target.value as 'EUR' | 'DKK'})}
                            options={[
                                { value: 'EUR', label: 'Euro (€)' },
                                { value: 'DKK', label: 'Danish Krone (kr)' },
                            ]}
                            tooltip="Currency for all calculations."
                        />
                    </div>
                </div>
            </div>

            <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-primary">Renting Scenario</h2>
                <div className="terminal-box p-6 rounded-lg">
                <RentingScenarioInputComponent
                    inputs={rentingScenarioInputs}
                    onChange={setRentingScenarioInputs}
                />
                </div>
            </div>

            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-primary">Purchase Scenarios</h2>
                    <button
                        onClick={addScenario}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
                    >
                        Add Scenario
                    </button>
                </div>
                
                {scenarios.length === 0 && (
                    <div className="text-center p-8 terminal-box rounded-lg">
                        <p className="text-foreground mb-4">No scenarios added yet.</p>
                        <button
                            onClick={addScenario}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
                        >
                            Add Your First Scenario
                        </button>
                    </div>
                )}
                
                {scenarios.length > 0 && (
                    <div className="mb-4">
                        {/* Scenario Tabs Navigation */}
                        <div className="flex overflow-x-auto border-b border-primary mb-4">
                            {scenarios.map((scenario, index) => (
                                <button
                                    key={scenario.id}
                                    onClick={() => {
                                        // Create a new object with all scenarios set to false
                                        const newExpandedState: Record<string, boolean> = {};
                                        // Then set the current scenario to true
                                        scenarios.forEach(s => {
                                            newExpandedState[s.id] = s.id === scenario.id;
                                        });
                                        setExpandedScenarios(newExpandedState);
                                    }}
                                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                                        expandedScenarios[scenario.id] 
                                            ? 'border-b-2 border-secondary text-secondary' 
                                            : 'text-muted-foreground hover:text-foreground hover:border-muted'
                                    }`}
                                >
                                    {scenario.name || `Scenario ${index + 1}`}
                                </button>
                            ))}
                        </div>
                        
                        {/* Scenario Content */}
                        {scenarios.map((scenario) => (
                            <div 
                                key={scenario.id} 
                                className={expandedScenarios[scenario.id] ? 'block terminal-box p-6 rounded-lg' : 'hidden'}
                            >
                                <ScenarioInput
                                    scenario={scenario}
                                    onChange={(updatedData) => updateScenario(scenario.id, updatedData)}
                                    onRemove={() => removeScenario(scenario.id)}
                                    currency={currencySymbol}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

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
                                    
                                    // Map backend keys to frontend expected keys
                                    const mappedResult = mapBackendToFrontendKeys(scenarioResult.result);
                                    
                                    // Use mapped result
                                    const outcomes = mappedResult.scenario_outcomes || {};
                                    
                                    return resultRowOrder.map((key, index) => {
                                        // Skip if this outcome doesn't exist
                                        if (!outcomes[key]) {
                                            console.warn(`Missing outcome for key: ${key}`);
                                            return null;
                                        }
                                        
                                        const scenarioId = scenarioResult.scenario_id || '';
                                        const expandKey = `${scenarioId}-${key}`;
                                        const isExpanded = expandedScenarios[expandKey];
                                        
                                        // Map key for detailed breakdowns (average -> avg_growth)
                                        const detailedBreakdownKey = key === 'average' ? 'avg_growth' : key;
                                        const hasDetailedBreakdown = mappedResult.mapped_detailed_breakdowns?.[key] || 
                                                                    scenarioResult.result?.detailed_breakdowns?.[detailedBreakdownKey];
                                        
                                        return (
                                            <Fragment key={`${scenarioId}-${key}`}>
                                                <tr className={index === 0 ? "border-t-2 border-gray-400" : ""}>
                                                    {index === 0 && (
                                                        <td rowSpan={resultRowOrder.length} className="px-4 py-3 whitespace-nowrap text-sm font-bold text-indigo-700 align-top border-r">
                                                            {scenarioDetails?.name || scenarioId}
                                                        </td>
                                                    )}
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                        {getResultRowLabel(key)}
                                                        {hasDetailedBreakdown && (
                                                            <button 
                                                                onClick={() => toggleDetailedBreakdown(scenarioId, key)}
                                                                className="ml-2 text-xs text-indigo-600 hover:text-indigo-800 underline focus:outline-none"
                                                                title="View detailed breakdown"
                                                            >
                                                                {isExpanded ? 'Hide Details' : 'View Details'}
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-right">
                                                        {outcomes[key]?.selling_price?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || 'N/A'}
                                                    </td>
                                                    <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${outcomes[key]?.win_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {outcomes[key]?.win_loss?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || 'N/A'}
                                                    </td>
                                                    {results.renting_scenario_results && !results.renting_scenario_results.error && (
                                                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-semibold ${outcomes[key]?.index_adjusted_profit_eur !== undefined && outcomes[key]?.index_adjusted_profit_eur! >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                                            {outcomes[key]?.index_adjusted_profit_eur?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) ?? 'N/A'}
                                                        </td>
                                                    )}
                                                </tr>
                                                {isExpanded && hasDetailedBreakdown && (
                                                    <tr>
                                                        <td colSpan={results.renting_scenario_results && !results.renting_scenario_results.error ? 5 : 4} className="p-0 border-b">
                                                            <div className="px-4 py-2 bg-gray-50">
                                                                <ErrorBoundary>
                                                                    <DetailedBreakdownTable 
                                                                        breakdown={mappedResult.mapped_detailed_breakdowns?.[key] || 
                                                                                scenarioResult.result?.detailed_breakdowns?.[detailedBreakdownKey]} 
                                                                        currency={currencySymbol} 
                                                                    />
                                                                </ErrorBoundary>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    }).filter(Boolean); // Filter out null entries
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
            
            <footer className="mt-12 pt-6 border-t border-gray-200 text-center text-gray-600 text-sm">
                <p>Property Investment Analyzer v{appVersion || "4.0.0"}</p>
                <p className="mt-1">© {new Date().getFullYear()} Property Analyzer Tool</p>
            </footer>
        </div>
    );
}

export default App;
