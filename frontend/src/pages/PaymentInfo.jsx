import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import api from '../services/api';
import { exportPaymentData } from '../services/exportUtils';
import { useCurrency } from '../context/LanguageContext';

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
      alert(msg + emailInfo);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">💰 <FormattedMessage id="payment.paymentInfo" defaultMessage="Payment Info" /></h1>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <p className="text-gray-600">
              <FormattedMessage id="payment.paymentStatusFor" defaultMessage="Payment status for" /> <span className="font-semibold text-brand-600">{monthName}</span>
            </p>
            <div className="flex items-center gap-2">
              <select
                value={`${selectedMonth}-${selectedYear}`}
                onChange={(e) => {
                  const [month, year] = e.target.value.split('-');
                  setSelectedMonth(parseInt(month));
                  setSelectedYear(parseInt(year));
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white font-semibold text-gray-700 text-sm"
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
        <button
          onClick={() => navigate('/admin')}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition text-sm shrink-0"
        >
          <FormattedMessage id="property.backToDashboard" defaultMessage="← Back to Dashboard" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-blue-500">
          <h3 className="text-sm font-semibold text-gray-600 uppercase"><FormattedMessage id="dashboard.tenantsSection" defaultMessage="Total Tenants" /></h3>
          <p className="text-3xl font-bold text-blue-600">{tenants.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-green-500">
          <h3 className="text-sm font-semibold text-gray-600 uppercase"><FormattedMessage id="payment.paid" defaultMessage="Paid" /></h3>
          <p className="text-3xl font-bold text-green-600">{paidCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-red-500">
          <h3 className="text-sm font-semibold text-gray-600 uppercase"><FormattedMessage id="payment.unpaid" defaultMessage="Not Paid" /></h3>
          <p className="text-3xl font-bold text-red-600">{unpaidCount}</p>
        </div>
        {naCount > 0 && (
          <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-gray-400">
            <h3 className="text-sm font-semibold text-gray-600 uppercase"><FormattedMessage id="payment.naLabel" defaultMessage="NA" /></h3>
            <p className="text-3xl font-bold text-gray-500">{naCount}</p>
          </div>
        )}
      </div>

      {/* Payment Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-4 sm:px-6 py-4 bg-brand-50 border-b-2 border-brand-500">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800"><FormattedMessage id="payment.paymentStatusTitle" defaultMessage="Payment Status" /> — {monthName}</h2>
              <select
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white font-semibold text-gray-700 text-sm w-full sm:w-auto"
              >
                <option value="">{intl.formatMessage({ id: 'payment.allRooms', defaultMessage: 'All Rooms' })}</option>
                {roomOptions.map(room => (
                  <option key={room} value={room}>{intl.formatMessage({ id: 'payment.roomLabel', defaultMessage: 'Room {room}' }, { room })}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => navigate('/tenant-payment-search')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-semibold transition text-xs sm:text-sm"
              >
                🔍 <FormattedMessage id="payment.searchTenant" defaultMessage="Search Tenant" />
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-semibold transition text-xs sm:text-sm"
              >
                📊 <FormattedMessage id="payment.export" defaultMessage="Export" />
              </button>
              <button
                onClick={() => setShowOfflineModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-semibold transition text-xs sm:text-sm"
              >
              <FormattedMessage id="payment.markOfflinePayment" defaultMessage="💵 Mark Offline Pay" />
              </button>
              <button
                onClick={() => fetchPaymentInfo(selectedMonth, selectedYear)}
                className="bg-brand-500 hover:bg-brand-600 text-white px-3 py-2 rounded-lg font-semibold transition text-xs sm:text-sm"
              >
                🔄 <FormattedMessage id="payment.refresh" defaultMessage="Refresh" />
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          {filteredTenants.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">#</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="payment.tenantName" defaultMessage="Tenant Name" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="payment.emailHeader" defaultMessage="Email" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="payment.bedInfo" defaultMessage="Bed Info" /></th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="payment.rentHeader" defaultMessage={`Rent (${currencySymbol})`} /></th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="payment.monthHeader" defaultMessage="Month" /></th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700"><FormattedMessage id="payment.statusHeader" defaultMessage="Status" /></th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700"><FormattedMessage id="payment.actionHeader" defaultMessage="Action" /></th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((tenant, idx) => (
                  <tr key={tenant.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{idx + 1}</td>
                    <td className="px-6 py-3 font-medium">{tenant.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{tenant.email}</td>
                    <td className="px-6 py-3">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-semibold">
                        {tenant.bed_info}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-semibold">
                      {currencySymbol}{tenant.billAmount}
                      {tenant.isProrated && (
                        <span className="block text-xs text-gray-500 font-normal">
                          ({tenant.daysStayed}/{tenant.daysInMonth} days × {currencySymbol}{tenant.rent})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3">{monthName}</td>
                    <td className="px-6 py-3 text-center">
                      {tenant.payment_status === 'Paid' ? (
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                          ✅ <FormattedMessage id="payment.paidStatus" defaultMessage="Paid" />
                        </span>
                      ) : tenant.payment_status === 'NA' ? (
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-semibold">
                          — <FormattedMessage id="payment.naLabel" defaultMessage="NA" />
                        </span>
                      ) : (
                        <span
                          title={`Bill Generated: ${currencySymbol}${tenant.billAmount} due`}
                          className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold cursor-help inline-block"
                        >
                          📄 <FormattedMessage id="payment.billGenerated" defaultMessage="Bill Generated" />
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {tenant.payment_status === 'Bill Generated' && (
                        <div className="relative inline-block">
                          {sendingReminder[tenant.id] ? (
                            <span className="bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                              ⏳ <FormattedMessage id="payment.sending" defaultMessage="Sending..." />
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); setReminderDropdown(reminderDropdown === tenant.id ? null : tenant.id); }}
                                className="bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition"
                              >
                                🔔 <FormattedMessage id="payment.remind" defaultMessage="Remind" /> ▾
                              </button>
                              {reminderDropdown === tenant.id && (
                                <div className="absolute right-0 bottom-full mb-1 w-40 bg-white rounded-md shadow-xl border z-50">
                                  <button
                                    onClick={() => handleSendReminder(tenant.id, tenant.name, 'email')}
                                    className="w-full text-left px-3 py-2 hover:bg-brand-50 text-gray-700 text-xs font-medium rounded-t-md transition flex items-center gap-1.5"
                                  >
                                    📧 <FormattedMessage id="payment.emailMethod" defaultMessage="Email" />
                                  </button>
                                  <button
                                    onClick={() => handleSendReminder(tenant.id, tenant.name, 'whatsapp')}
                                    className="w-full text-left px-3 py-2 hover:bg-green-50 text-gray-700 text-xs font-medium rounded-b-md transition flex items-center gap-1.5 border-t"
                                  >
                                    💬 <FormattedMessage id="payment.whatsappMethod" defaultMessage="WhatsApp" />
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
            <p className="p-6 text-center text-gray-500"><FormattedMessage id="payment.noTenantsFound" defaultMessage="No tenants found" /></p>
          )}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 bg-purple-50 border-b-2 border-purple-500 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">📊 <FormattedMessage id="payment.exportTitle" defaultMessage="Export Payment Data" /></h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-6 space-y-3">
              <p className="text-gray-600 mb-4">
                <FormattedMessage id="payment.exportStatusFor" defaultMessage="Export Payment Status for" /> <span className="font-semibold">{monthName}</span>
              </p>
              <button
                onClick={() => handleExport('csv')}
                disabled={exporting}
                className={`w-full ${
                  exporting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2`}
              >
                📄 {exporting ? intl.formatMessage({ id: 'payment.exporting', defaultMessage: 'Exporting...' }) : intl.formatMessage({ id: 'payment.exportCsv', defaultMessage: 'Export as CSV' })}
              </button>
              <button
                onClick={() => handleExport('excel')}
                disabled={exporting}
                className={`w-full ${
                  exporting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2`}
              >
                📊 {exporting ? intl.formatMessage({ id: 'payment.exporting', defaultMessage: 'Exporting...' }) : intl.formatMessage({ id: 'payment.exportExcel', defaultMessage: 'Export as Excel' })}
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={exporting}
                className={`w-full ${
                  exporting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                } text-white px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2`}
              >
                🔴 {exporting ? intl.formatMessage({ id: 'payment.exporting', defaultMessage: 'Exporting...' }) : intl.formatMessage({ id: 'payment.exportPdf', defaultMessage: 'Export as PDF' })}
              </button>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowExportModal(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition"
              >
                <FormattedMessage id="common.cancel" defaultMessage="Cancel" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Offline Pay Modal */}
      {showOfflineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden mx-4">
            <div className="px-4 sm:px-6 py-4 bg-green-50 border-b-2 border-green-500 flex justify-between items-center gap-2">
              <h2 className="text-base sm:text-xl font-bold text-gray-800">💵 <FormattedMessage id="payment.markOfflineTitle" defaultMessage="Mark Offline Payment" /> — {monthName}</h2>
              <button
                onClick={() => setShowOfflineModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh]">
              {tenants.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-100 border-b sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">#</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="payment.tenant" defaultMessage="Tenant" /></th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="payment.bedInfo" defaultMessage="Bed Info" /></th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="payment.rentHeader" defaultMessage="Rent" /></th>
                      <th className="px-6 py-3 text-center font-semibold text-gray-700"><FormattedMessage id="payment.statusHeader" defaultMessage="Status" /></th>
                      <th className="px-6 py-3 text-center font-semibold text-gray-700"><FormattedMessage id="payment.actionHeader" defaultMessage="Action" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((tenant, idx) => (
                      <tr key={tenant.id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-3">{idx + 1}</td>
                        <td className="px-6 py-3 font-medium">{tenant.name}</td>
                        <td className="px-6 py-3 text-sm">{tenant.bed_info}</td>
                        <td className="px-6 py-3 font-semibold">{currencySymbol}{tenant.rent}</td>
                        <td className="px-6 py-3 text-center">
                          {tenant.payment_status === 'Paid' ? (
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                              ✅ <FormattedMessage id="payment.paidStatus" defaultMessage="Paid" />
                            </span>
                          ) : (
                            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                              ❌ <FormattedMessage id="payment.notPaidStatus" defaultMessage="Not Paid" />
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-center">
                          {tenant.payment_status !== 'Paid' ? (
                            <button
                              onClick={() => handleMarkOfflinePay(tenant.id, tenant.name)}
                              disabled={markingPaid[tenant.id]}
                              className={`${
                                markingPaid[tenant.id]
                                  ? 'bg-gray-400 cursor-not-allowed'
                                  : 'bg-green-600 hover:bg-green-700'
                              } text-white px-3 py-1 rounded-md text-xs font-semibold transition`}
                            >
                              {markingPaid[tenant.id] ? '⏳...' : '✅ ' + intl.formatMessage({ id: 'payment.paidStatus', defaultMessage: 'Paid' })}
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="p-6 text-center text-gray-500"><FormattedMessage id="payment.noTenantsFound" defaultMessage="No tenants found" /></p>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowOfflineModal(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition"
              >
                <FormattedMessage id="payment.close" defaultMessage="Close" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentInfo;
