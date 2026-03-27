import { useState, useEffect } from 'react';
import api from '../services/api';
import ChangePasswordModal from '../components/ChangePasswordModal';

const TenantDashboard = () => {
  const [profile, setProfile] = useState({});
  const [stay, setStay] = useState({});
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    // Get user from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      if (userData.is_first_login) {
        setShowPasswordModal(true);
      }
    }
    
    fetchProfile();
    fetchStay();
    fetchPayments();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/tenant/profile');
      setProfile(res.data || {});
    } catch (error) {
      console.error('Error fetching profile');
    }
  };

  const fetchStay = async () => {
    try {
      const res = await api.get('/tenant/stay-details');
      setStay(res.data || {});
    } catch (error) {
      console.error('Error fetching stay details');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await api.get('/tenant/payments');
      setPayments(res.data || []);
    } catch (error) {
      console.error('Error fetching payments');
    }
  };

  const handlePay = async () => {
    try {
      const res = await api.post('/tenant/pay');
      alert('Payment initiated! Please complete the payment.');
    } catch (error) {
      alert('Error initiating payment');
    }
  };

  const handlePasswordChangeSuccess = () => {
    // Update user data in localStorage
    const updatedUser = { ...user, is_first_login: false };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setShowPasswordModal(false);
    setUser(updatedUser);
    alert('Password changed successfully!');
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {showPasswordModal && user && (
        <ChangePasswordModal 
          user={user}
          onClose={() => setShowPasswordModal(false)}
          onSuccess={handlePasswordChangeSuccess}
        />
      )}

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">👤 Tenant Dashboard</h1>
        <p className="text-gray-600">Manage your stay and payments</p>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Profile Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Name</p>
            <p className="text-lg font-semibold text-gray-800">{profile.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="text-lg font-semibold text-gray-800">{profile.email || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Stay Details Section */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Stay Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Check-in Date</p>
            <p className="text-lg font-semibold text-gray-800">{stay.start_date ? new Date(stay.start_date).toLocaleDateString() : 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Check-out Date</p>
            <p className="text-lg font-semibold text-gray-800">{stay.end_date ? new Date(stay.end_date).toLocaleDateString() : 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Monthly Rent</p>
            <p className="text-2xl font-bold text-green-600">₹{stay.rent || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Payments Section */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Payment History</h2>
          <button 
            onClick={handlePay} 
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-lg transition"
          >
            💳 Pay Rent
          </button>
        </div>
        <div className="overflow-x-auto">
          {payments.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(p.payment_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-semibold">₹{p.amount}</td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        p.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 text-center py-4">No payments yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantDashboard;