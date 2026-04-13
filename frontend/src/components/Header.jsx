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
    <header className="bg-gradient-to-r from-dark-900 to-brand-950 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <img src="/images/aupl8-logo.svg" alt="RoomiPilot" className="h-9 w-9" />
          <span className="text-xl font-extrabold">{org ? org.name : <span>Roomi<span className="text-brand-400">Pilot</span></span>}</span>
        </Link>
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-4">
            {!user ? (
              <>
                <Link to="/contact" className="hover:bg-white/10 px-4 py-2 rounded-lg transition">
                  <FormattedMessage id="header.contactUs" defaultMessage="Contact Us" />
                </Link>
                <Link to="/login" className="hover:bg-white/10 px-4 py-2 rounded-lg transition">
                  <FormattedMessage id="auth.login" defaultMessage="Login" />
                </Link>
                <Link to="/onboarding" className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg transition font-medium shadow-md shadow-brand-500/20">
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
                  <Link to="/super_admin" className="hover:bg-white/10 px-4 py-2 rounded-lg">
                    <FormattedMessage id="header.superAdmin" defaultMessage="Super Admin" />
                  </Link>
                )}
                {user.role === 'admin' && (
                  <>
                    <Link to="/admin" className="hover:bg-white/10 px-4 py-2 rounded-lg">
                      <FormattedMessage id="dashboard.adminDashboard" defaultMessage="Dashboard" />
                    </Link>
                    <Link to="/payment-info" className="hover:bg-white/10 px-4 py-2 rounded-lg">
                      <FormattedMessage id="header.payments" defaultMessage="Payments" />
                    </Link>
                    <Link to="/org-settings" className="hover:bg-white/10 px-4 py-2 rounded-lg">
                      <FormattedMessage id="header.settings" defaultMessage="Settings" />
                    </Link>
                  </>
                )}
                {user.role === 'tenant' && <Link to="/tenant" className="hover:bg-white/10 px-4 py-2 rounded-lg"><FormattedMessage id="header.myProfile" defaultMessage="My Profile" /></Link>}
                <button onClick={handleLogout} className="bg-red-500/80 hover:bg-red-500 px-4 py-2 rounded-lg transition">
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