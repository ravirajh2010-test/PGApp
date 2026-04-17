import { useState, useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { UserIcon, LockClosedIcon, PhoneIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { useCurrency } from '../context/LanguageContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';

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
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size="xl" className="text-brand-500" />
      </div>
    );
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
        <h1 className="text-2xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center justify-center gap-2">
          <UserIcon className="w-8 h-8 text-brand-500" />
          <FormattedMessage id="tenant.tenantDashboard" defaultMessage="Tenant Dashboard" />
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base"><FormattedMessage id="tenant.stayDetails" defaultMessage="Manage your stay and payments" /></p>
      </div>

      {/* Profile Section */}
      <Card accent="brand">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100"><FormattedMessage id="tenant.myProfile" defaultMessage="Profile Information" /></h2>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowPasswordModal(true)}
            iconLeft={<LockClosedIcon />}
          >
            <FormattedMessage id="tenant.resetPassword" defaultMessage="Reset Password" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400"><FormattedMessage id="tenant.name" defaultMessage="Name" /></p>
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{profile.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400"><FormattedMessage id="tenant.email" defaultMessage="Email" /></p>
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{profile.email || 'N/A'}</p>
          </div>
        </div>
      </Card>

      {/* Stay Details Section */}
      <Card accent="blue">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4"><FormattedMessage id="tenant.stayDetails" defaultMessage="Stay Details" /></h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400"><FormattedMessage id="tenant.checkInDate" defaultMessage="Check-in Date" /></p>
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{stay.start_date ? new Date(stay.start_date).toLocaleDateString() : 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400"><FormattedMessage id="tenant.checkOutDate" defaultMessage="Check-out Date" /></p>
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{stay.end_date ? new Date(stay.end_date).toLocaleDateString() : 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400"><FormattedMessage id="tenant.monthlyRent" defaultMessage="Monthly Rent" /></p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{currencySymbol}{stay.rent || 'N/A'}</p>
          </div>
        </div>
      </Card>

      {/* Payments Section */}
      <Card accent="purple">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100"><FormattedMessage id="tenant.paymentHistory" defaultMessage="Payment History" /></h2>
          <Button variant="primary" onClick={handlePay} iconLeft={<CreditCardIcon />}>
            <FormattedMessage id="tenant.payRent" defaultMessage="Pay Rent" />
          </Button>
        </div>
        <div className="overflow-x-auto">
          {payments.length > 0 ? (
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="tenant.date" defaultMessage="Date" /></th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="tenant.amount" defaultMessage="Amount" /></th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="tenant.status" defaultMessage="Status" /></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{new Date(p.payment_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">{currencySymbol}{p.amount}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.status === 'completed' ? 'success' : 'warning'}>
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-center py-4"><FormattedMessage id="tenant.noPayments" defaultMessage="No payments yet" /></p>
          )}
        </div>
      </Card>

      {/* Service Manager Contact */}
      {adminContact && (
        <Card accent="green">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <PhoneIcon className="w-6 h-6 text-green-500" />
            <FormattedMessage id="tenant.serviceManagerContact" defaultMessage="Service Manager Contact" />
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400"><FormattedMessage id="tenant.contactName" defaultMessage="Name" /></p>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{adminContact.adminName}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400"><FormattedMessage id="tenant.contactEmail" defaultMessage="Email" /></p>
              <a href={`mailto:${adminContact.adminEmail}`} className="text-lg font-semibold text-brand-500 hover:underline">
                {adminContact.adminEmail}
              </a>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400"><FormattedMessage id="tenant.contactPhone" defaultMessage="Phone" /></p>
              {adminContact.orgPhone && adminContact.orgPhone !== 'N/A' ? (
                <a href={`tel:${adminContact.orgPhone}`} className="text-lg font-semibold text-brand-500 hover:underline">
                  {adminContact.orgPhone}
                </a>
              ) : (
                <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">N/A</p>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TenantDashboard;