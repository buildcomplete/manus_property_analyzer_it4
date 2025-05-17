// DetailedBreakdownTable.tsx
import React from 'react';

interface DetailedBreakdownProps {
  breakdown: any;
  currency: string;
}

const DetailedBreakdownTable: React.FC<DetailedBreakdownProps> = ({ breakdown, currency }) => {
  if (!breakdown) return null;

  const formatCurrency = (value: number) => {
    return `${currency}${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  return (
    <div className="mt-4 mb-6 bg-white rounded-lg shadow-md overflow-hidden">
      <div className="grid grid-cols-1 divide-y divide-gray-200">
        {/* Purchase Costs Section */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Purchase Costs</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <tbody className="bg-white divide-y divide-gray-100">
                {breakdown.purchase_costs.property_price && (
                  <tr>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700">Property Price</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900 font-semibold">
                      {formatCurrency(breakdown.purchase_costs.property_price)}
                    </td>
                  </tr>
                )}
                
                {/* Taxes */}
                {breakdown.purchase_costs.purchase_tax_vat && (
                  <tr>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700">VAT</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(breakdown.purchase_costs.purchase_tax_vat)}
                    </td>
                  </tr>
                )}
                {breakdown.purchase_costs.purchase_tax_ajd && (
                  <tr>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700">AJD Tax</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(breakdown.purchase_costs.purchase_tax_ajd)}
                    </td>
                  </tr>
                )}
                {breakdown.purchase_costs.purchase_tax_itp && (
                  <tr>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700">ITP Tax</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(breakdown.purchase_costs.purchase_tax_itp)}
                    </td>
                  </tr>
                )}
                {breakdown.purchase_costs.purchase_tax_tinglysningsafgift && (
                  <tr>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700">Registration Tax</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(breakdown.purchase_costs.purchase_tax_tinglysningsafgift)}
                    </td>
                  </tr>
                )}
                
                {/* Fees */}
                {breakdown.purchase_costs.notary_fee && (
                  <tr>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700">Notary Fee</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(breakdown.purchase_costs.notary_fee)}
                    </td>
                  </tr>
                )}
                {breakdown.purchase_costs.registry_fee && (
                  <tr>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700">Registry Fee</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(breakdown.purchase_costs.registry_fee)}
                    </td>
                  </tr>
                )}
                {breakdown.purchase_costs.lawyer_fee && (
                  <tr>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700">Lawyer Fee</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(breakdown.purchase_costs.lawyer_fee)}
                    </td>
                  </tr>
                )}
                
                {/* Renovations */}
                {Object.entries(breakdown.purchase_costs)
                  .filter(([key]) => key.startsWith('renovation_') && key !== 'renovation_total')
                  .map(([key, value]) => (
                    <tr key={key}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700">
                        {key.replace('renovation_', 'Renovation: ').replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(value as number)}
                      </td>
                    </tr>
                  ))}
                
                {/* Subtotal */}
                {breakdown.purchase_costs.total_purchase_costs && (
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-gray-800">Total Purchase Costs</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-bold text-gray-800">
                      {formatCurrency(breakdown.purchase_costs.total_purchase_costs)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Loan Costs Section */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Loan Details</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <tbody className="bg-white divide-y divide-gray-100">
                {breakdown.loan_costs.loan_amount && (
                  <tr>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700">Loan Amount</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(breakdown.loan_costs.loan_amount)}
                    </td>
                  </tr>
                )}
                {breakdown.loan_costs.interest_rate && (
                  <tr>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700">Interest Rate</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatPercentage(breakdown.loan_costs.interest_rate)}
                    </td>
                  </tr>
                )}
                {breakdown.loan_costs.term_years && (
                  <tr>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700">Term (Years)</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {breakdown.loan_costs.term_years}
                    </td>
                  </tr>
                )}
                {breakdown.loan_costs.monthly_payment && (
                  <tr>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700">Monthly Payment</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(breakdown.loan_costs.monthly_payment)}
                    </td>
                  </tr>
                )}
                {breakdown.loan_costs.total_interest_paid && (
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-gray-800">Total Interest Paid</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-bold text-gray-800">
                      {formatCurrency(breakdown.loan_costs.total_interest_paid)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Running Costs Section */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Running Costs (Over {breakdown.running_costs.years_held} Years)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <tbody className="bg-white divide-y divide-gray-100">
                {/* Annual costs */}
                {Object.entries(breakdown.running_costs)
                  .filter(([key]) => key.endsWith('_annual') && key !== 'total_annual_running_costs_annual')
                  .map(([key, value]) => (
                    <tr key={key}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700">
                        {key.replace('_annual', '').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())} (Annual)
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(value as number)}
                      </td>
                    </tr>
                  ))}
                
                {/* Total costs over holding period */}
                {Object.entries(breakdown.running_costs)
                  .filter(([key]) => !key.endsWith('_annual') && !['years_held', 'total_running_costs'].includes(key))
                  .map(([key, value]) => (
                    <tr key={key}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700">
                        {key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())} (Total)
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(value as number)}
                      </td>
                    </tr>
                  ))}
                
                {/* Subtotal */}
                {breakdown.running_costs.total_running_costs && (
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-gray-800">Total Running Costs</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-bold text-gray-800">
                      {formatCurrency(breakdown.running_costs.total_running_costs)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Selling Costs Section */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Selling Costs</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <tbody className="bg-white divide-y divide-gray-100">
                {breakdown.selling_costs.selling_agency_fee && (
                  <tr>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700">Agency Fee</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(breakdown.selling_costs.selling_agency_fee)}
                    </td>
                  </tr>
                )}
                {breakdown.selling_costs.capital_gains_tax && (
                  <tr>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700">Capital Gains Tax</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(breakdown.selling_costs.capital_gains_tax)}
                    </td>
                  </tr>
                )}
                
                {/* Other selling costs */}
                {Object.entries(breakdown.selling_costs)
                  .filter(([key]) => !['selling_agency_fee', 'capital_gains_tax', 'total_selling_costs'].includes(key))
                  .map(([key, value]) => (
                    <tr key={key}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700">
                        {key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(value as number)}
                      </td>
                    </tr>
                  ))}
                
                {/* Subtotal */}
                {breakdown.selling_costs.total_selling_costs && (
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-gray-800">Total Selling Costs</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-bold text-gray-800">
                      {formatCurrency(breakdown.selling_costs.total_selling_costs)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Financial Outcome Section */}
        <div className="p-4 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Financial Outcome</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <tbody className="bg-white divide-y divide-gray-100">
                {breakdown.outcome.purchase_price && (
                  <tr>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700">Purchase Price</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(breakdown.outcome.purchase_price)}
                    </td>
                  </tr>
                )}
                {breakdown.outcome.total_investment && (
                  <tr>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700">Total Investment</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(breakdown.outcome.total_investment)}
                    </td>
                  </tr>
                )}
                {breakdown.outcome.selling_price && (
                  <tr>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700">Selling Price</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(breakdown.outcome.selling_price)}
                    </td>
                  </tr>
                )}
                {breakdown.outcome.total_costs && (
                  <tr>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-700">Total Costs</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(breakdown.outcome.total_costs)}
                    </td>
                  </tr>
                )}
                {breakdown.outcome.raw_profit_loss !== undefined && (
                  <tr className="bg-gray-100">
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-gray-800">Raw Profit/Loss</td>
                    <td className={`px-4 py-2 whitespace-nowrap text-sm text-right font-bold ${breakdown.outcome.raw_profit_loss >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatCurrency(breakdown.outcome.raw_profit_loss)}
                    </td>
                  </tr>
                )}
                {breakdown.outcome.index_adjusted_profit_loss !== undefined && (
                  <tr className="bg-blue-50">
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-blue-800">Index Adjusted Profit/Loss</td>
                    <td className={`px-4 py-2 whitespace-nowrap text-sm text-right font-bold ${breakdown.outcome.index_adjusted_profit_loss >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatCurrency(breakdown.outcome.index_adjusted_profit_loss)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedBreakdownTable;
