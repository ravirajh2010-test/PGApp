import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { CurrencyDollarIcon, ArrowPathIcon, MagnifyingGlassIcon, ArrowDownTrayIcon, BanknotesIcon, BellIcon, EnvelopeIcon, ChatBubbleLeftRightIcon, DocumentTextIcon, CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { exportPaymentData } from '../services/exportUtils';
import { useCurrency } from '../context/LanguageContext';
import { Button, Card, Badge, Spinner, Modal, DonutChart } from '../components/ui';

const PaymentInfo = () => {
  const navigate = useNavigate();
  const { currencySymbol } = useCurrency();
  const intl = useIntl();
  const [tenants, setTenants] = useState([]);
  const [monthName, setMonthName] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState({});
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [markingPaid, setMarkingPaid] = useState({});
  const [reminderDropdown, setReminderDropdown] = useState(null); // tenantId of open dropdown
  const [roomFilter, setRoomFilter] = useState(''); // '' = None (show all)
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Month/Year selection state — default to current month
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setReminderDropdown(null);
    if (reminderDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [reminderDropdown]);

  useEffect(() => {
    fetchPaymentInfo(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const fetchPaymentInfo = async (month, year) => {
    try {
      setLoading(true);
      const res = await api.get('/admin/payment-info', {
        params: { month, year }
      });
      setTenants(res.data.tenants || []);
      setMonthName(res.data.monthName || '');
    } catch (error) {
      console.error('Error fetching payment info:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (tenantId, tenantName, method) => {
    setReminderDropdown(null);
    setSendingReminder(prev => ({ ...prev, [tenantId]: method }));
    try {
      const res = await api.post(`/admin/payment-reminder/${tenantId}?method=${method}`);
      if (method === 'whatsapp' && res.data.whatsappUrl) {
        window.open(res.data.whatsappUrl, '_blank');
      } else {
        alert(res.data.message || 'Reminder sent successfully!');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to send reminder');
    } finally {
      setSendingReminder(prev => ({ ...prev, [tenantId]: null }));
    }
  };

  const handleMarkOfflinePay = async (tenantId, tenantName) => {
    if (!window.confirm(`Mark ${tenantName} as Paid for ${monthName}?`)) return;
    setMarkingPaid(prev => ({ ...prev, [tenantId]: true }));
    try {
      const res = await api.post(`/admin/mark-offline-pay/${tenantId}`, {
        month: selectedMonth,
        year: selectedYear
      });
      const msg = res.data.message || 'Marked as paid!';
      const emailInfo = res.data.emailSent ? '\n📧 Receipt email sent!' : '\n⚠️ Receipt email could not be sent.';
      const whatsappUrl = res.data.whatsappUrl;

      if (whatsappUrl && window.confirm(`${msg}${emailInfo}\n\nAlso send the receipt to ${tenantName} on WhatsApp?`)) {
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      } else {
        alert(msg + emailInfo);
      }
      await fetchPaymentInfo(selectedMonth, selectedYear);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to mark payment');
    } finally {
      setMarkingPaid(prev => ({ ...prev, [tenantId]: false }));
    }
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const paidCount = tenants.filter(t => t.payment_status === 'Paid').length;
      const unpaidCount = tenants.filter(t => t.payment_status === 'Bill Generated').length;
      const naCount = tenants.filter(t => t.payment_status === 'NA').length;

      const summaryStats = {
        total: tenants.length,
        paid: paidCount,
        unpaid: unpaidCount,
        na: naCount,
      };

      await exportPaymentData(format, tenants, monthName, summaryStats, currencySymbol);
      alert(`✅ Payment data exported as ${format.toUpperCase()} successfully!`);
      setShowExportModal(false);
    } catch (error) {
      alert(`❌ Export failed: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="xl" />
      </div>
    );
  }

  const paidCount = tenants.filter(t => t.payment_status === 'Paid').length;
  const unpaidCount = tenants.filter(t => t.payment_status === 'Bill Generated').length;
  const naCount = tenants.filter(t => t.payment_status === 'NA').length;

  // Get unique room numbers for the filter dropdown
  const roomOptions = [...new Set(tenants.map(t => t.room_number))].sort();

  // Apply room filter
  const filteredTenants = roomFilter
    ? tenants.filter(t => t.room_number === roomFilter)
    : tenants;

  // Generate last 12 months options
  const generateMonthYearOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.getMonth();
      const year = date.getFullYear();
      const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      options.push({ month, year, label });
    }
    return options;
  };

  const monthYearOptions = generateMonthYearOptions();

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">
            <CurrencyDollarIcon className="w-8 h-8 text-brand-500" />
            <FormattedMessage id="payment.paymentInfo" defaultMessage="Payment Info" />
          </h1>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <p className="text-slate-600 dark:text-slate-400">
              <FormattedMessage id="payment.paymentStatusFor" defaultMessage="Payment status for" /> <span className="font-semibold text-brand-600 dark:text-brand-400">{monthName}</span>
            </p>
            <div className="flex items-center gap-2">
              <select
                value={`${selectedMonth}-${selectedYear}`}
                onChange={(e) => {
                  const [month, year] = e.target.value.split('-');
                  setSelectedMonth(parseInt(month));
                  setSelectedYear(parseInt(year));
                }}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 text-sm"
              >
                {monthYearOptions.map((option) => (
                  <option key={`${option.month}-${option.year}`} value={`${option.month}-${option.year}`}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate('/admin')} className="shrink-0">
          <FormattedMessage id="property.backToDashboard" defaultMessage="← Back to Dashboard" />
        </Button>
      </div>

      {/* Combined Summary + Revenue + Chart */}
      {(() => {
        const totalReceivable = tenants
          .filter(t => t.payment_status !== 'NA')
          .reduce((sum, t) => sum + parseFloat(t.billAmount || 0), 0);
        const received = tenants
          .filter(t => t.payment_status === 'Paid')
          .reduce((sum, t) => sum + parseFloat(t.billAmount || 0), 0);
        const yetToRecover = tenants
          .filter(t => t.payment_status === 'Bill Generated')
          .reduce((sum, t) => sum + parseFloat(t.billAmount || 0), 0);
        const pct = totalReceivable > 0 ? Math.round((received / totalReceivable) * 100) : 0;
        const fmt = (n) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

        return (
          <Card>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {/* Left: 2×3 compact stat grid */}
              <div className="grid grid-cols-3 gap-2 flex-1 w-full">
                {/* Row 1 — tenant counts */}
                {[
                  { label: 'Total Tenants', value: tenants.length,  color: 'text-blue-600 dark:text-blue-400',  border: 'border-blue-200 dark:border-blue-800',  bg: 'bg-blue-50 dark:bg-blue-900/20' },
                  { label: 'Paid',          value: paidCount,       color: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800', bg: 'bg-green-50 dark:bg-green-900/20' },
                  { label: 'Unpaid',        value: unpaidCount,     color: 'text-red-600 dark:text-red-400',    border: 'border-red-200 dark:border-red-800',    bg: 'bg-red-50 dark:bg-red-900/20' },
                ].map(({ label, value, color, border, bg }) => (
                  <div key={label} className={`rounded-xl border ${border} ${bg} p-3 flex flex-col gap-0.5`}>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide leading-none">{label}</span>
                    <span className={`text-xl font-extrabold ${color} leading-tight`}>{value}</span>
                  </div>
                ))}
                {/* Row 2 — amounts */}
                {[
                  { label: 'Receivable',     value: `${currencySymbol}${fmt(totalReceivable)}`, color: 'text-brand-600 dark:text-brand-400',  border: 'border-brand-200 dark:border-brand-800',  bg: 'bg-brand-50 dark:bg-brand-900/20' },
                  { label: 'Received',       value: `${currencySymbol}${fmt(received)}`,        color: 'text-green-600 dark:text-green-400',  border: 'border-green-200 dark:border-green-800',  bg: 'bg-green-50 dark:bg-green-900/20' },
                  { label: 'Yet to Recover', value: `${currencySymbol}${fmt(yetToRecover)}`,    color: 'text-red-600 dark:text-red-400',      border: 'border-red-200 dark:border-red-800',      bg: 'bg-red-50 dark:bg-red-900/20' },
                ].map(({ label, value, color, border, bg }) => (
                  <div key={label} className={`rounded-xl border ${border} ${bg} p-3 flex flex-col gap-0.5`}>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide leading-none">{label}</span>
                    <span className={`text-base font-extrabold ${color} leading-tight`}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Right: Donut chart */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Collection</span>
                <DonutChart
                  size={130}
                  thickness={24}
                  label={`${pct}%`}
                  subLabel="Collected"
                  segments={[
                    { label: 'Received', value: received,     color: '#22c55e' },
                    { label: 'Pending',  value: yetToRecover, color: '#ef4444' },
                  ]}
                />
                <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Received</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Pending</span>
                </div>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Payment Table */}
      <Card padding={false}>
        <div className="px-4 sm:px-6 py-4 bg-brand-50 dark:bg-brand-900/20 border-b-2 border-brand-500">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100"><FormattedMessage id="payment.paymentStatusTitle" defaultMessage="Payment Status" /> — {monthName}</h2>
              <select
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 text-sm w-full sm:w-auto"
              >
                <option value="">{intl.formatMessage({ id: 'payment.allRooms', defaultMessage: 'All Rooms' })}</option>
                {roomOptions.map(room => (
                  <option key={room} value={room}>{intl.formatMessage({ id: 'payment.roomLabel', defaultMessage: 'Room {room}' }, { room })}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/tenant-payment-search')} iconLeft={<MagnifyingGlassIcon className="w-4 h-4" />}>
                <FormattedMessage id="payment.searchTenant" defaultMessage="Search Tenant" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowExportModal(true)} iconLeft={<ArrowDownTrayIcon className="w-4 h-4" />}>
                <FormattedMessage id="payment.export" defaultMessage="Export" />
              </Button>
              <Button variant="success" size="sm" onClick={() => setShowOfflineModal(true)} iconLeft={<BanknotesIcon className="w-4 h-4" />}>
                <FormattedMessage id="payment.markOfflinePayment" defaultMessage="Mark Offline Pay" />
              </Button>
              <Button variant="primary" size="sm" onClick={() => fetchPaymentInfo(selectedMonth, selectedYear)} iconLeft={<ArrowPathIcon className="w-4 h-4" />}>
                <FormattedMessage id="payment.refresh" defaultMessage="Refresh" />
              </Button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          {filteredTenants.length > 0 ? (
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-700/50 border-b dark:border-slate-600">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">#</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="payment.tenantName" defaultMessage="Tenant Name" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="payment.emailHeader" defaultMessage="Email" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="payment.bedInfo" defaultMessage="Bed Info" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="payment.rentHeader" defaultMessage={`Rent (${currencySymbol})`} /></th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="payment.monthHeader" defaultMessage="Month" /></th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="payment.statusHeader" defaultMessage="Status" /></th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="payment.actionHeader" defaultMessage="Action" /></th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((tenant, idx) => (
                  <tr key={tenant.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-3 font-medium text-slate-700 dark:text-slate-300">{idx + 1}</td>
                    <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">{tenant.name}</td>
                    <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400">{tenant.email}</td>
                    <td className="px-6 py-3">
                      <Badge variant="info">{tenant.bed_info}</Badge>
                    </td>
                    <td className="px-6 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      {currencySymbol}{tenant.billAmount}
                      {tenant.isProrated && (
                        <span className="block text-xs text-slate-500 dark:text-slate-400 font-normal">
                          ({tenant.daysStayed}/{tenant.daysInMonth} days × {currencySymbol}{tenant.rent})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{monthName}</td>
                    <td className="px-6 py-3 text-center">
                      {tenant.payment_status === 'Paid' ? (
                        <Badge variant="success" dot><FormattedMessage id="payment.paidStatus" defaultMessage="Paid" /></Badge>
                      ) : tenant.payment_status === 'NA' ? (
                        <Badge variant="neutral"><FormattedMessage id="payment.naLabel" defaultMessage="NA" /></Badge>
                      ) : (
                        <Badge variant="info" dot title={`Bill Generated: ${currencySymbol}${tenant.billAmount} due`}>
                          <FormattedMessage id="payment.billGenerated" defaultMessage="Bill Generated" />
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {tenant.payment_status === 'Bill Generated' && (
                        <div className="relative inline-block">
                          {sendingReminder[tenant.id] ? (
                            <Button variant="secondary" size="sm" loading disabled>
                              <FormattedMessage id="payment.sending" defaultMessage="Sending..." />
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="primary"
                                size="xs"
                                iconLeft={<BellIcon className="w-3.5 h-3.5" />}
                                onClick={(e) => { e.stopPropagation(); setReminderDropdown(reminderDropdown === tenant.id ? null : tenant.id); }}
                              >
                                <FormattedMessage id="payment.remind" defaultMessage="Remind" /> ▾
                              </Button>
                              {reminderDropdown === tenant.id && (
                                <div className="absolute right-0 bottom-full mb-1 w-40 bg-white dark:bg-slate-800 rounded-md shadow-xl border dark:border-slate-600 z-50">
                                  <button
                                    onClick={() => handleSendReminder(tenant.id, tenant.name, 'email')}
                                    className="w-full text-left px-3 py-2 hover:bg-brand-50 dark:hover:bg-brand-900/20 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-t-md transition flex items-center gap-1.5"
                                  >
                                    <EnvelopeIcon className="w-3.5 h-3.5" /><FormattedMessage id="payment.emailMethod" defaultMessage="Email" />
                                  </button>
                                  <button
                                    onClick={() => handleSendReminder(tenant.id, tenant.name, 'whatsapp')}
                                    className="w-full text-left px-3 py-2 hover:bg-green-50 dark:hover:bg-green-900/20 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-b-md transition flex items-center gap-1.5 border-t dark:border-slate-600"
                                  >
                                    <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" /><FormattedMessage id="payment.whatsappMethod" defaultMessage="WhatsApp" />
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-slate-500 dark:text-slate-400"><FormattedMessage id="payment.noTenantsFound" defaultMessage="No tenants found" /></p>
          )}
        </div>
      </Card>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title={intl.formatMessage({ id: 'payment.exportTitle', defaultMessage: 'Export Payment Data' })}
        maxWidth="md"
      >
        <div className="space-y-3">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            <FormattedMessage id="payment.exportStatusFor" defaultMessage="Export Payment Status for" /> <span className="font-semibold text-slate-800 dark:text-slate-200">{monthName}</span>
          </p>
          <Button
            variant="outline"
            fullWidth
            loading={exporting}
            onClick={() => handleExport('csv')}
            iconLeft={<DocumentTextIcon className="w-5 h-5" />}
          >
            {intl.formatMessage({ id: 'payment.exportCsv', defaultMessage: 'Export as CSV' })}
          </Button>
          <Button
            variant="success"
            fullWidth
            loading={exporting}
            onClick={() => handleExport('excel')}
            iconLeft={<ArrowDownTrayIcon className="w-5 h-5" />}
          >
            {intl.formatMessage({ id: 'payment.exportExcel', defaultMessage: 'Export as Excel' })}
          </Button>
          <Button
            variant="danger"
            fullWidth
            loading={exporting}
            onClick={() => handleExport('pdf')}
            iconLeft={<ArrowDownTrayIcon className="w-5 h-5" />}
          >
            {intl.formatMessage({ id: 'payment.exportPdf', defaultMessage: 'Export as PDF' })}
          </Button>
        </div>
        <div className="mt-4 flex justify-end pt-4 border-t dark:border-slate-700">
          <Button variant="secondary" onClick={() => setShowExportModal(false)}>
            <FormattedMessage id="common.cancel" defaultMessage="Cancel" />
          </Button>
        </div>
      </Modal>

      {/* Mark Offline Pay Modal */}
      <Modal
        isOpen={showOfflineModal}
        onClose={() => setShowOfflineModal(false)}
        title={`${intl.formatMessage({ id: 'payment.markOfflineTitle', defaultMessage: 'Mark Offline Payment' })} — ${monthName}`}
        maxWidth="3xl"
      >
        <div className="overflow-y-auto max-h-[60vh]">
          {tenants.length > 0 ? (
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-700/50 border-b dark:border-slate-600 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">#</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="payment.tenant" defaultMessage="Tenant" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="payment.bedInfo" defaultMessage="Bed Info" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="payment.rentHeader" defaultMessage="Rent" /></th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="payment.statusHeader" defaultMessage="Status" /></th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="payment.actionHeader" defaultMessage="Action" /></th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant, idx) => (
                  <tr key={tenant.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{idx + 1}</td>
                    <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">{tenant.name}</td>
                    <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400">{tenant.bed_info}</td>
                    <td className="px-6 py-3 font-semibold text-slate-800 dark:text-slate-200">{currencySymbol}{tenant.rent}</td>
                    <td className="px-6 py-3 text-center">
                      {tenant.payment_status === 'Paid' ? (
                        <Badge variant="success" dot><FormattedMessage id="payment.paidStatus" defaultMessage="Paid" /></Badge>
                      ) : (
                        <Badge variant="danger" dot><FormattedMessage id="payment.notPaidStatus" defaultMessage="Not Paid" /></Badge>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {tenant.payment_status !== 'Paid' ? (
                        <Button
                          variant="success"
                          size="sm"
                          loading={markingPaid[tenant.id]}
                          onClick={() => handleMarkOfflinePay(tenant.id, tenant.name)}
                          iconLeft={<CheckCircleIcon className="w-4 h-4" />}
                        >
                          <FormattedMessage id="payment.paidStatus" defaultMessage="Paid" />
                        </Button>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-slate-500 dark:text-slate-400"><FormattedMessage id="payment.noTenantsFound" defaultMessage="No tenants found" /></p>
          )}
        </div>
        <div className="mt-4 flex justify-end pt-4 border-t dark:border-slate-700">
          <Button variant="secondary" onClick={() => setShowOfflineModal(false)}>
            <FormattedMessage id="payment.close" defaultMessage="Close" />
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default PaymentInfo;
