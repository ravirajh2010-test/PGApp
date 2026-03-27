import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const PaymentInfo = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [monthName, setMonthName] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState({});
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [markingPaid, setMarkingPaid] = useState({});

  useEffect(() => {
    fetchPaymentInfo();
  }, []);

  const fetchPaymentInfo = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/payment-info');
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

  const handleSendReminder = async (tenantId, tenantName) => {
    if (!window.confirm(`Send payment reminder to ${tenantName}?`)) return;
    setSendingReminder(prev => ({ ...prev, [tenantId]: true }));
    try {
      const res = await api.post(`/admin/payment-reminder/${tenantId}`);
      alert(res.data.message || 'Reminder sent successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to send reminder');
    } finally {
      setSendingReminder(prev => ({ ...prev, [tenantId]: false }));
    }
  };

  const handleMarkOfflinePay = async (tenantId, tenantName) => {
    if (!window.confirm(`Mark ${tenantName} as Paid for ${monthName}?`)) return;
    setMarkingPaid(prev => ({ ...prev, [tenantId]: true }));
    try {
      const res = await api.post(`/admin/mark-offline-pay/${tenantId}`);
      alert(res.data.message || 'Marked as paid!');
      await fetchPaymentInfo();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to mark payment');
    } finally {
      setMarkingPaid(prev => ({ ...prev, [tenantId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const paidCount = tenants.filter(t => t.payment_status === 'Paid').length;
  const unpaidCount = tenants.filter(t => t.payment_status === 'Not Paid').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">💰 Payment Info</h1>
          <p className="text-gray-600 mt-1">
            Payment status for <span className="font-semibold text-orange-600">{monthName}</span>
          </p>
        </div>
        <button
          onClick={() => navigate('/admin')}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-blue-500">
          <h3 className="text-sm font-semibold text-gray-600 uppercase">Total Tenants</h3>
          <p className="text-3xl font-bold text-blue-600">{tenants.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-green-500">
          <h3 className="text-sm font-semibold text-gray-600 uppercase">Paid</h3>
          <p className="text-3xl font-bold text-green-600">{paidCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-red-500">
          <h3 className="text-sm font-semibold text-gray-600 uppercase">Not Paid</h3>
          <p className="text-3xl font-bold text-red-600">{unpaidCount}</p>
        </div>
      </div>

      {/* Payment Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-orange-50 border-b-2 border-orange-500 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Payment Status — {monthName}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowOfflineModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              💵 Mark Offline Pay
            </button>
            <button
              onClick={fetchPaymentInfo}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {tenants.length > 0 ? (
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
                {tenants.map((tenant, idx) => (
                  <tr key={tenant.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{idx + 1}</td>
                    <td className="px-6 py-3 font-medium">{tenant.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{tenant.email}</td>
                    <td className="px-6 py-3">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-semibold">
                        {tenant.bed_info}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-semibold">₹{tenant.rent}</td>
                    <td className="px-6 py-3">{monthName}</td>
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
                      {tenant.payment_status === 'Not Paid' && (
                        <button
                          onClick={() => handleSendReminder(tenant.id, tenant.name)}
                          disabled={sendingReminder[tenant.id]}
                          className={`${
                            sendingReminder[tenant.id]
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-orange-500 hover:bg-orange-600'
                          } text-white px-4 py-2 rounded-lg text-sm font-semibold transition`}
                        >
                          {sendingReminder[tenant.id] ? '⏳ Sending...' : '📧 Remind'}
                        </button>
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
                          {tenant.payment_status === 'Not Paid' ? (
                            <button
                              onClick={() => handleMarkOfflinePay(tenant.id, tenant.name)}
                              disabled={markingPaid[tenant.id]}
                              className={`${
                                markingPaid[tenant.id]
                                  ? 'bg-gray-400 cursor-not-allowed'
                                  : 'bg-green-600 hover:bg-green-700'
                              } text-white px-4 py-2 rounded-lg text-sm font-semibold transition`}
                            >
                              {markingPaid[tenant.id] ? '⏳ Marking...' : '✅ Mark Paid'}
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
