import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import api from '../services/api';
import { exportPaymentData } from '../services/exportUtils';

const PaymentInfo = () => {
  const navigate = useNavigate();
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
      alert(res.data.message || 'Marked as paid!');
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

      await exportPaymentData(format, tenants, monthName, summaryStats);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">💰 <FormattedMessage id="payment.paymentInfo" defaultMessage="Payment Info" /></h1>
          <div className="mt-3 flex items-center gap-4">
            <p className="text-gray-600">
              Payment status for <span className="font-semibold text-brand-600">{monthName}</span>
            </p>
            <div className="flex items-center gap-2">
              <select
                value={`${selectedMonth}-${selectedYear}`}
                onChange={(e) => {
                  const [month, year] = e.target.value.split('-');
                  setSelectedMonth(parseInt(month));
                  setSelectedYear(parseInt(year));
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white font-semibold text-gray-700"
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
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
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
            <h3 className="text-sm font-semibold text-gray-600 uppercase">NA</h3>
            <p className="text-3xl font-bold text-gray-500">{naCount}</p>
          </div>
        )}
      </div>

      {/* Payment Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-brand-50 border-b-2 border-brand-500 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-800">Payment Status — {monthName}</h2>
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white font-semibold text-gray-700 text-sm"
            >
              <option value="">All Rooms</option>
              {roomOptions.map(room => (
                <option key={room} value={room}>Room {room}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/tenant-payment-search')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              🔍 Search Tenant
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              📊 Export
            </button>
            <button
              onClick={() => setShowOfflineModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
            <FormattedMessage id="payment.markOfflinePayment" defaultMessage="💵 Mark Offline Pay" />
            </button>
            <button
              onClick={() => fetchPaymentInfo(selectedMonth, selectedYear)}
              className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {filteredTenants.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">#</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Tenant Name</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Bed Info</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Rent (₹)</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Month</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">Action</th>
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
                      ₹{tenant.billAmount}
                      {tenant.isProrated && (
                        <span className="block text-xs text-gray-500 font-normal">
                          ({tenant.daysStayed}/{tenant.daysInMonth} days × ₹{tenant.rent})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3">{monthName}</td>
                    <td className="px-6 py-3 text-center">
                      {tenant.payment_status === 'Paid' ? (
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                          ✅ Paid
                        </span>
                      ) : tenant.payment_status === 'NA' ? (
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-semibold">
                          — NA
                        </span>
                      ) : (
                        <span
                          title={`Bill Generated: ₹${tenant.billAmount} due`}
                          className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold cursor-help inline-block"
                        >
                          📄 Bill Generated
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {tenant.payment_status === 'Bill Generated' && (
                        <div className="relative inline-block">
                          {sendingReminder[tenant.id] ? (
                            <span className="bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                              ⏳ Sending...
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); setReminderDropdown(reminderDropdown === tenant.id ? null : tenant.id); }}
                                className="bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition"
                              >
                                🔔 Remind ▾
                              </button>
                              {reminderDropdown === tenant.id && (
                                <div className="absolute right-0 bottom-full mb-1 w-40 bg-white rounded-md shadow-xl border z-50">
                                  <button
                                    onClick={() => handleSendReminder(tenant.id, tenant.name, 'email')}
                                    className="w-full text-left px-3 py-2 hover:bg-brand-50 text-gray-700 text-xs font-medium rounded-t-md transition flex items-center gap-1.5"
                                  >
                                    📧 Email
                                  </button>
                                  <button
                                    onClick={() => handleSendReminder(tenant.id, tenant.name, 'whatsapp')}
                                    className="w-full text-left px-3 py-2 hover:bg-green-50 text-gray-700 text-xs font-medium rounded-b-md transition flex items-center gap-1.5 border-t"
                                  >
                                    💬 WhatsApp
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
            <p className="p-6 text-center text-gray-500">No tenants found</p>
          )}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 bg-purple-50 border-b-2 border-purple-500 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">📊 Export Payment Data</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-6 space-y-3">
              <p className="text-gray-600 mb-4">
                Export Payment Status for <span className="font-semibold">{monthName}</span>
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
                📄 {exporting ? 'Exporting...' : 'Export as CSV'}
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
                📊 {exporting ? 'Exporting...' : 'Export as Excel'}
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
                🔴 {exporting ? 'Exporting...' : 'Export as PDF'}
              </button>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowExportModal(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Offline Pay Modal */}
      {showOfflineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 bg-green-50 border-b-2 border-green-500 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">💵 Mark Offline Payment — {monthName}</h2>
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
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Tenant</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Bed Info</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Rent</th>
                      <th className="px-6 py-3 text-center font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-3 text-center font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((tenant, idx) => (
                      <tr key={tenant.id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-3">{idx + 1}</td>
                        <td className="px-6 py-3 font-medium">{tenant.name}</td>
                        <td className="px-6 py-3 text-sm">{tenant.bed_info}</td>
                        <td className="px-6 py-3 font-semibold">₹{tenant.rent}</td>
                        <td className="px-6 py-3 text-center">
                          {tenant.payment_status === 'Paid' ? (
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                              ✅ Paid
                            </span>
                          ) : (
                            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                              ❌ Not Paid
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
                              {markingPaid[tenant.id] ? '⏳...' : '✅ Paid'}
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="p-6 text-center text-gray-500">No tenants found</p>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowOfflineModal(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentInfo;
