import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const TenantPaymentSearch = () => {
  const navigate = useNavigate();
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
      await api.post(`/admin/mark-offline-pay/${tenantId}`, { month: month - 1, year });
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">🔍 Search Tenant Payments</h1>
        <button onClick={() => navigate('/payment-info')} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition">
          ← Back to Payment Info
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by tenant name, email, or mobile number..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-lg"
          />
          <button
            onClick={handleSearch}
            disabled={searching || query.trim().length < 2}
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3 rounded-xl transition shadow-lg shadow-brand-500/20 disabled:opacity-50"
          >
            {searching ? '⏳ Searching...' : '🔍 Search'}
          </button>
        </div>
      </div>

      {/* Search Results (before selecting a tenant) */}
      {!selectedTenant && searched && (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-lg font-bold text-gray-800">
              {results.length > 0 ? `Found ${results.length} tenant(s)` : 'No tenants found'}
            </h2>
          </div>
          {results.length > 0 && (
            <div className="divide-y">
              {results.map(tenant => (
                <div
                  key={tenant.id}
                  onClick={() => handleSelectTenant(tenant)}
                  className="px-6 py-4 hover:bg-brand-50 cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-800 text-lg">{tenant.name}</p>
                    <div className="flex gap-4 text-sm text-gray-500 mt-1">
                      <span>📧 {tenant.email}</span>
                      {tenant.phone && <span>📱 {tenant.phone}</span>}
                      <span>🛏️ {tenant.bed_info}</span>
                    </div>
                  </div>
                  <div className="text-brand-500 font-semibold text-sm">
                    View Payments →
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Tenant - Payment History */}
      {selectedTenant && (
        <>
          {/* Tenant Info Card */}
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{selectedTenant.name}</h2>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
                  <span>📧 {selectedTenant.email}</span>
                  {selectedTenant.phone && <span>📱 {selectedTenant.phone}</span>}
                  <span>🛏️ {selectedTenant.bed_info}</span>
                  <span>💰 ₹{selectedTenant.rent}/month</span>
                  <span>📅 Since {new Date(selectedTenant.start_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                  {selectedTenant.end_date && <span>📅 Until {new Date(selectedTenant.end_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>}
                </div>
              </div>
              <button
                onClick={() => { setSelectedTenant(null); setMonths([]); }}
                className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-blue-500">
              <h3 className="text-sm font-semibold text-gray-600 uppercase">Total Months</h3>
              <p className="text-3xl font-bold text-blue-600">{months.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-green-500">
              <h3 className="text-sm font-semibold text-gray-600 uppercase">Paid</h3>
              <p className="text-3xl font-bold text-green-600">{paidCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-red-500">
              <h3 className="text-sm font-semibold text-gray-600 uppercase">Unpaid</h3>
              <p className="text-3xl font-bold text-red-600">{unpaidCount}</p>
            </div>
          </div>

          {/* Payment History Grid */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-brand-50 border-b-2 border-brand-500">
              <h2 className="text-xl font-bold text-gray-800">Month-wise Payment History</h2>
            </div>
            {loadingHistory ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">#</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Month</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Rent (₹)</th>
                      <th className="px-6 py-3 text-center font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Payment Date</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Reference</th>
                      <th className="px-6 py-3 text-center font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((m, idx) => {
                      const key = `${m.month}-${m.year}`;
                      return (
                        <tr key={key} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium">{idx + 1}</td>
                          <td className="px-6 py-3 font-medium">{m.monthName}</td>
                          <td className="px-6 py-3 font-semibold">₹{m.billAmount}</td>
                          <td className="px-6 py-3 text-center">
                            {m.status === 'Paid' ? (
                              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">✅ Paid</span>
                            ) : (
                              <span
                                title={`Bill Generated: ₹${m.billAmount} due`}
                                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold cursor-help inline-block"
                              >
                                📄 Bill Generated
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-500">
                            {m.payment?.payment_date ? new Date(m.payment.payment_date).toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-500 font-mono">
                            {m.payment?.razorpay_payment_id
                              ? (m.payment.razorpay_payment_id.startsWith('OFFLINE_') ? 'Offline' : m.payment.razorpay_payment_id.substring(0, 16) + '...')
                              : '—'}
                          </td>
                          <td className="px-6 py-3 text-center">
                            {m.status !== 'Paid' ? (
                              <button
                                onClick={() => handleMarkPaid(selectedTenant.id, m.month, m.year, m.monthName)}
                                disabled={markingPaid[key]}
                                className={`${
                                  markingPaid[key] ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                                } text-white px-4 py-2 rounded-lg text-sm font-semibold transition`}
                              >
                                {markingPaid[key] ? '⏳ Marking...' : '✅ Mark Paid'}
                              </button>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TenantPaymentSearch;
