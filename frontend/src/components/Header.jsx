import { Link } from 'react-router-dom';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import AvailabilityModal from './AvailabilityModal';
import LanguageSwitcher from './LanguageSwitcher';
import { clearAuthData, getUser, getOrganization } from '../services/api';

const Header = () => {
  const user = getUser();
  const org = getOrganization();
  const [showAvailability, setShowAvailability] = useState(false);

  const handleLogout = () => {
    clearAuthData();
    window.location.href = '/';
  };

  return (
    <header className="bg-orange-500 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold">🏢 {org ? org.name : 'PG Stay'}</span>
        </Link>
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-4">
            {!user ? (
              <>
                <Link to="/login" className="hover:bg-orange-600 px-4 py-2 rounded transition">
                  <FormattedMessage id="auth.login" defaultMessage="Login" />
                </Link>
                <Link to="/onboarding" className="bg-white text-orange-500 hover:bg-orange-50 px-4 py-2 rounded transition font-medium">
                  <FormattedMessage id="app.listYourPG" defaultMessage="List Your PG" />
                </Link>
              </>
            ) : (
              <>
                <span className="text-sm">
                  <FormattedMessage id="header.welcome" defaultMessage="Welcome" />, {user.name}
                  {org && <span className="opacity-75 ml-1">({org.name})</span>}
                </span>
                {user.role === 'super_admin' && (
                  <Link to="/super_admin" className="hover:bg-orange-600 px-4 py-2 rounded">
                    <FormattedMessage id="header.superAdmin" defaultMessage="Super Admin" />
                  </Link>
                )}
                {user.role === 'admin' && (
                  <>
                    <Link to="/admin" className="hover:bg-orange-600 px-4 py-2 rounded">
                      <FormattedMessage id="dashboard.adminDashboard" defaultMessage="Dashboard" />
                    </Link>
                    <Link to="/payment-info" className="hover:bg-orange-600 px-4 py-2 rounded">
                      <FormattedMessage id="header.payments" defaultMessage="Payments" />
                    </Link>
                    <Link to="/org-settings" className="hover:bg-orange-600 px-4 py-2 rounded">
                      <FormattedMessage id="header.settings" defaultMessage="Settings" />
                    </Link>
                  </>
                )}
                {user.role === 'tenant' && <Link to="/tenant" className="hover:bg-orange-600 px-4 py-2 rounded"><FormattedMessage id="header.myProfile" defaultMessage="My Profile" /></Link>}
                <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded transition">
                  <FormattedMessage id="header.logout" defaultMessage="Logout" />
                </button>
              </>
            )}
          </nav>
          <LanguageSwitcher />
        </div>
      </div>
      <AvailabilityModal isOpen={showAvailability} onClose={() => setShowAvailability(false)} />
    </header>
  );
};

export default Header;