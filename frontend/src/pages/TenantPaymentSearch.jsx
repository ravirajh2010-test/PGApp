import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { MagnifyingGlassIcon, EnvelopeIcon, PhoneIcon, HomeIcon, CurrencyDollarIcon, CalendarIcon, XMarkIcon, CheckCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { useCurrency } from '../context/LanguageContext';
import { Button, Card, Badge, Spinner } from '../components/ui';

const TenantPaymentSearch = () => {
  const navigate = useNavigate();
  const intl = useIntl();
  const { currencySymbol } = useCurrency();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  // Selected tenant state
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [months, setMonths] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [markingPaid, setMarkingPaid] = useState({});

  const handleSearch = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    setSearched(true);
    setSelectedTenant(null);
    setMonths([]);
    try {
      const res = await api.get('/admin/search-tenants', { params: { q: query.trim() } });
      setResults(res.data || []);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectTenant = async (tenant) => {
    setSelectedTenant(tenant);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/admin/tenant-payment-history/${tenant.id}`);
      setSelectedTenant(res.data.tenant);
      setMonths(res.data.months || []);
    } catch (error) {
      console.error('Failed to load payment history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleMarkPaid = async (tenantId, month, year, monthName) => {
    const key = `${month}-${year}`;
    if (!window.confirm(`Mark payment as Paid for ${monthName}?`)) return;
    setMarkingPaid(prev => ({ ...prev, [key]: true }));
    try {
      // Convert 1-based DB month back to 0-based JS month for the API
      const response = await api.post(`/admin/mark-offline-pay/${tenantId}`, { month: month - 1, year });
      const emailInfo = response.data?.emailSent ? ' 📧 Receipt sent!' : '';
      alert((response.data?.message || 'Marked as paid!') + emailInfo);
      // Refresh history
      const res = await api.get(`/admin/tenant-payment-history/${tenantId}`);
      setSelectedTenant(res.data.tenant);
      setMonths(res.data.months || []);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to mark payment');
    } finally {
      setMarkingPaid(prev => ({ ...prev, [key]: false }));
    }
  };

  const paidCount = months.filter(m => m.status === 'Paid').length;
  const unpaidCount = months.filter(m => m.status === 'Bill Generated').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">
          <MagnifyingGlassIcon className="w-8 h-8 text-brand-500" />
          <FormattedMessage id="tenantSearch.title" defaultMessage="Search Tenant Payments" />
        </h1>
        <Button variant="secondary" size="sm" onClick={() => navigate('/payment-info')} className="shrink-0">
          <FormattedMessage id="tenantSearch.backToPayments" defaultMessage="← Back to Payment Info" />
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={intl.formatMessage({ id: 'tenantSearch.placeholder', defaultMessage: 'Search by tenant name, email, or mobile number...' })}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-base sm:text-lg"
            />
          </div>
          <Button
            variant="primary"
            size="lg"
            loading={searching}
            onClick={handleSearch}
            disabled={query.trim().length < 2}
            iconLeft={<MagnifyingGlassIcon className="w-5 h-5" />}
            className="shrink-0"
          >
            <FormattedMessage id="tenantSearch.search" defaultMessage="Search" />
          </Button>
        </div>
      </Card>

      {/* Search Results (before selecting a tenant) */}
      {!selectedTenant && searched && (
        <Card padding={false}>
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-600">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {results.length > 0 ? intl.formatMessage({ id: 'tenantSearch.found', defaultMessage: 'Found {count} tenant(s)' }, { count: results.length }) : intl.formatMessage({ id: 'tenantSearch.noResults', defaultMessage: 'No tenants found' })}
            </h2>
          </div>
          {results.length > 0 && (
            <div className="divide-y dark:divide-slate-600">
              {results.map(tenant => (
                <div
                  key={tenant.id}
                  onClick={() => handleSelectTenant(tenant)}
                  className="flex items-center justify-between px-5 py-3.5 transition-colors cursor-pointer hover:bg-brand-50 dark:hover:bg-brand-900/20"
                >
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-base sm:text-lg">{tenant.name}</p>
                    <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                      <span className="flex items-center gap-1"><EnvelopeIcon className="w-3.5 h-3.5" />{tenant.email}</span>
                      {tenant.phone && <span className="flex items-center gap-1"><PhoneIcon className="w-3.5 h-3.5" />{tenant.phone}</span>}
                      <span className="flex items-center gap-1"><HomeIcon className="w-3.5 h-3.5" />{tenant.bed_info}</span>
                    </div>
                  </div>
                  <div className="text-brand-500 font-semibold text-sm">
                    <FormattedMessage id="tenantSearch.viewPayments" defaultMessage="View Payments →" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Selected Tenant - Payment History */}
      {selectedTenant && (
        <>
          {/* Tenant Info Card */}
          <Card accent="brand">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{selectedTenant.name}</h2>
                <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-400 mt-2">
                  <span className="flex items-center gap-1"><EnvelopeIcon className="w-4 h-4" />{selectedTenant.email}</span>
                  {selectedTenant.phone && <span className="flex items-center gap-1"><PhoneIcon className="w-4 h-4" />{selectedTenant.phone}</span>}
                  <span className="flex items-center gap-1"><HomeIcon className="w-4 h-4" />{selectedTenant.bed_info}</span>
                  <span className="flex items-center gap-1"><CurrencyDollarIcon className="w-4 h-4" />{intl.formatMessage({ id: 'tenantSearch.perMonth', defaultMessage: '{symbol}{rent}/month' }, { symbol: currencySymbol, rent: selectedTenant.rent })}</span>
                  <span className="flex items-center gap-1"><CalendarIcon className="w-4 h-4" />{intl.formatMessage({ id: 'tenantSearch.since', defaultMessage: 'Since {date}' }, { date: new Date(selectedTenant.start_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) })}</span>
                  {selectedTenant.end_date && <span className="flex items-center gap-1"><CalendarIcon className="w-4 h-4" />{intl.formatMessage({ id: 'tenantSearch.until', defaultMessage: 'Until {date}' }, { date: new Date(selectedTenant.end_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) })}</span>}
                </div>
              </div>
              <button
                onClick={() => { setSelectedTenant(null); setMonths([]); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card accent="blue">
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase"><FormattedMessage id="tenantSearch.totalMonths" defaultMessage="Total Months" /></h3>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">{months.length}</p>
            </Card>
            <Card accent="green">
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase"><FormattedMessage id="payment.paid" defaultMessage="Paid" /></h3>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{paidCount}</p>
            </Card>
            <Card accent="red">
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase"><FormattedMessage id="payment.unpaid" defaultMessage="Unpaid" /></h3>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">{unpaidCount}</p>
            </Card>
          </div>

          {/* Payment History Grid */}
          <Card padding={false}>
            <div className="px-6 py-4 bg-brand-50 dark:bg-brand-900/20 border-b-2 border-brand-500">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100"><FormattedMessage id="tenantSearch.monthWiseHistory" defaultMessage="Month-wise Payment History" /></h2>
            </div>
            {loadingHistory ? (
              <div className="flex justify-center items-center h-32">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-100 dark:bg-slate-700/50 border-b dark:border-slate-600">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">#</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="tenantSearch.month" defaultMessage="Month" /></th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="tenantSearch.rent" defaultMessage={`Rent (${currencySymbol})`} /></th>
                      <th className="px-6 py-3 text-center font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="payment.statusHeader" defaultMessage="Status" /></th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="tenantSearch.paymentDate" defaultMessage="Payment Date" /></th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="tenantSearch.reference" defaultMessage="Reference" /></th>
                      <th className="px-6 py-3 text-center font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="payment.actionHeader" defaultMessage="Action" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((m, idx) => {
                      const key = `${m.month}-${m.year}`;
                      return (
                        <tr key={key} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="px-6 py-3 font-medium text-slate-700 dark:text-slate-300">{idx + 1}</td>
                          <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">{m.monthName}</td>
                          <td className="px-6 py-3 font-semibold text-slate-800 dark:text-slate-200">{currencySymbol}{m.billAmount}</td>
                          <td className="px-6 py-3 text-center">
                            {m.status === 'Paid' ? (
                              <Badge variant="success" dot><FormattedMessage id="payment.paidStatus" defaultMessage="Paid" /></Badge>
                            ) : (
                              <Badge variant="info" dot title={`Bill Generated: ${currencySymbol}${m.billAmount} due`}>
                                <FormattedMessage id="payment.billGenerated" defaultMessage="Bill Generated" />
                              </Badge>
                            )}
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">
                            {m.payment?.payment_date ? new Date(m.payment.payment_date).toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400 font-mono">
                            {m.payment?.razorpay_payment_id
                              ? (m.payment.razorpay_payment_id.startsWith('OFFLINE_') ? intl.formatMessage({ id: 'tenantSearch.offline', defaultMessage: 'Offline' }) : m.payment.razorpay_payment_id.substring(0, 16) + '...')
                              : '—'}
                          </td>
                          <td className="px-6 py-3 text-center">
                            {m.status !== 'Paid' ? (
                              <Button
                                variant="success"
                                size="sm"
                                loading={markingPaid[key]}
                                onClick={() => handleMarkPaid(selectedTenant.id, m.month, m.year, m.monthName)}
                                iconLeft={<CheckCircleIcon className="w-4 h-4" />}
                              >
                                <FormattedMessage id="tenantSearch.markPaid" defaultMessage="Mark Paid" />
                              </Button>
                            ) : (
                              <span className="text-slate-400 text-sm">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default TenantPaymentSearch;
