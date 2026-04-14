import { useState, useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import api from '../services/api';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { useCurrency } from '../context/LanguageContext';

const TenantDashboard = () => {
  const { currencySymbol } = useCurrency();
  const [profile, setProfile] = useState({});
  const [stay, setStay] = useState({});
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminContact, setAdminContact] = useState(null);

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
    fetchAdminContact();
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

  const fetchAdminContact = async () => {
    try {
      const res = await api.get('/tenant/admin-contact');
      setAdminContact(res.data || null);
    } catch (error) {
      console.error('Error fetching admin contact');
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
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-2">👤 <FormattedMessage id="tenant.tenantDashboard" defaultMessage="Tenant Dashboard" /></h1>
        <p className="text-gray-600 text-sm sm:text-base"><FormattedMessage id="tenant.stayDetails" defaultMessage="Manage your stay and payments" /></p>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-brand-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800"><FormattedMessage id="tenant.myProfile" defaultMessage="Profile Information" /></h2>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2 px-4 rounded-lg transition text-sm shrink-0"
          >
            🔒 <FormattedMessage id="tenant.resetPassword" defaultMessage="Reset Password" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600"><FormattedMessage id="tenant.name" defaultMessage="Name" /></p>
            <p className="text-lg font-semibold text-gray-800">{profile.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600"><FormattedMessage id="tenant.email" defaultMessage="Email" /></p>
            <p className="text-lg font-semibold text-gray-800">{profile.email || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Stay Details Section */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
        <h2 className="text-2xl font-bold text-gray-800 mb-4"><FormattedMessage id="tenant.stayDetails" defaultMessage="Stay Details" /></h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600"><FormattedMessage id="tenant.checkInDate" defaultMessage="Check-in Date" /></p>
            <p className="text-lg font-semibold text-gray-800">{stay.start_date ? new Date(stay.start_date).toLocaleDateString() : 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600"><FormattedMessage id="tenant.checkOutDate" defaultMessage="Check-out Date" /></p>
            <p className="text-lg font-semibold text-gray-800">{stay.end_date ? new Date(stay.end_date).toLocaleDateString() : 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600"><FormattedMessage id="tenant.monthlyRent" defaultMessage="Monthly Rent" /></p>
            <p className="text-2xl font-bold text-green-600">{currencySymbol}{stay.rent || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Payments Section */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800"><FormattedMessage id="tenant.paymentHistory" defaultMessage="Payment History" /></h2>
          <button 
            onClick={handlePay} 
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold py-2 px-6 rounded-lg transition"
          >
            💳 <FormattedMessage id="tenant.payRent" defaultMessage="Pay Rent" />
          </button>
        </div>
        <div className="overflow-x-auto">
          {payments.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="tenant.date" defaultMessage="Date" /></th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="tenant.amount" defaultMessage="Amount" /></th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="tenant.status" defaultMessage="Status" /></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(p.payment_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-semibold">{currencySymbol}{p.amount}</td>
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
            <p className="text-gray-500 text-center py-4"><FormattedMessage id="tenant.noPayments" defaultMessage="No payments yet" /></p>
          )}
        </div>
      </div>

      {/* Service Manager Contact */}
      {adminContact && (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📞 <FormattedMessage id="tenant.serviceManagerContact" defaultMessage="Service Manager Contact" /></h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600"><FormattedMessage id="tenant.contactName" defaultMessage="Name" /></p>
              <p className="text-lg font-semibold text-gray-800">{adminContact.adminName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600"><FormattedMessage id="tenant.contactEmail" defaultMessage="Email" /></p>
              <a href={`mailto:${adminContact.adminEmail}`} className="text-lg font-semibold text-brand-500 hover:underline">
                {adminContact.adminEmail}
              </a>
            </div>
            <div>
              <p className="text-sm text-gray-600"><FormattedMessage id="tenant.contactPhone" defaultMessage="Phone" /></p>
              {adminContact.orgPhone && adminContact.orgPhone !== 'N/A' ? (
                <a href={`tel:${adminContact.orgPhone}`} className="text-lg font-semibold text-brand-500 hover:underline">
                  {adminContact.orgPhone}
                </a>
              ) : (
                <p className="text-lg font-semibold text-gray-800">N/A</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantDashboard;