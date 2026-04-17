import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { FormattedMessage } from 'react-intl';
import { Bars3Icon, XMarkIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import AvailabilityModal from './AvailabilityModal';
import LanguageSwitcher from './LanguageSwitcher';
import { clearAuthData, getUser, getOrganization } from '../services/api';

const Header = () => {
  const user = getUser();
  const org = getOrganization();
  const [showAvailability, setShowAvailability] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const menuRef = useRef(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleLogout = () => {
    clearAuthData();
    window.location.href = '/';
  };

  // Close mobile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const navLinkClass = 'hover:bg-white/10 px-4 py-2 rounded-lg transition-colors duration-150';

  return (
    <header className="bg-gradient-to-r from-dark-900 to-brand-950 text-white shadow-lg sticky top-0 z-50" ref={menuRef}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 shrink-0" onClick={closeMobileMenu}>
          <img src="/images/roomipilot-logo.png" alt="RoomiPilot" className="h-9 w-9" />
          <span className="text-xl font-extrabold truncate">
            {org ? org.name : <span>Roomi<span className="text-brand-400">Pilot</span></span>}
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-3">
          <nav className="flex items-center gap-1">
            {!user ? (
              <>
                <Link to="/contact" className={navLinkClass}>
                  <FormattedMessage id="header.contactUs" defaultMessage="Contact Us" />
                </Link>
                <Link to="/login" className={navLinkClass}>
                  <FormattedMessage id="auth.login" defaultMessage="Login" />
                </Link>
                <Link to="/onboarding" className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-md shadow-brand-500/20">
                  <FormattedMessage id="app.listYourPG" defaultMessage="List Your PG" />
                </Link>
              </>
            ) : (
              <>
                <span className="text-sm px-3 opacity-90">
                  <FormattedMessage id="header.welcome" defaultMessage="Welcome" />, {user.name}
                  {org && <span className="opacity-60 ml-1">({org.name})</span>}
                </span>
                {user.role === 'super_admin' && (
                  <Link to="/super_admin" className={navLinkClass}>
                    <FormattedMessage id="header.superAdmin" defaultMessage="Super Admin" />
                  </Link>
                )}
                {user.role === 'admin' && (
                  <>
                    <Link to="/admin" className={navLinkClass}>
                      <FormattedMessage id="dashboard.adminDashboard" defaultMessage="Dashboard" />
                    </Link>
                    <Link to="/payment-info" className={navLinkClass}>
                      <FormattedMessage id="header.payments" defaultMessage="Payments" />
                    </Link>
                    <Link to="/org-settings" className={navLinkClass}>
                      <FormattedMessage id="header.settings" defaultMessage="Settings" />
                    </Link>
                  </>
                )}
                {user.role === 'tenant' && (
                  <Link to="/tenant" className={navLinkClass}>
                    <FormattedMessage id="header.myProfile" defaultMessage="My Profile" />
                  </Link>
                )}
                <button onClick={handleLogout} className="bg-red-500/80 hover:bg-red-500 px-4 py-2 rounded-lg transition-colors">
                  <FormattedMessage id="header.logout" defaultMessage="Logout" />
                </button>
              </>
            )}
          </nav>

          {/* Dark mode toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode
              ? <SunIcon className="w-5 h-5 text-amber-300" />
              : <MoonIcon className="w-5 h-5 text-slate-300" />
            }
          </button>

          <LanguageSwitcher />
        </div>

        {/* Mobile right controls */}
        <div className="md:hidden flex items-center gap-1">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode
              ? <SunIcon className="w-5 h-5 text-amber-300" />
              : <MoonIcon className="w-5 h-5 text-slate-300" />
            }
          </button>
          <button
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen
              ? <XMarkIcon className="w-6 h-6" />
              : <Bars3Icon className="w-6 h-6" />
            }
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-dark-900/95 backdrop-blur-sm">
          <nav className="flex flex-col px-4 py-3 space-y-1">
            {!user ? (
              <>
                <Link to="/contact" className={`${navLinkClass} py-3`} onClick={closeMobileMenu}>
                  <FormattedMessage id="header.contactUs" defaultMessage="Contact Us" />
                </Link>
                <Link to="/login" className={`${navLinkClass} py-3`} onClick={closeMobileMenu}>
                  <FormattedMessage id="auth.login" defaultMessage="Login" />
                </Link>
                <Link to="/onboarding" className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-3 rounded-lg transition-colors font-medium text-center" onClick={closeMobileMenu}>
                  <FormattedMessage id="app.listYourPG" defaultMessage="List Your PG" />
                </Link>
              </>
            ) : (
              <>
                <div className="px-4 py-3 text-sm border-b border-white/10 mb-1">
                  <FormattedMessage id="header.welcome" defaultMessage="Welcome" />, {user.name}
                  {org && <span className="opacity-75 ml-1">({org.name})</span>}
                </div>
                {user.role === 'super_admin' && (
                  <Link to="/super_admin" className={`${navLinkClass} py-3`} onClick={closeMobileMenu}>
                    <FormattedMessage id="header.superAdmin" defaultMessage="Super Admin" />
                  </Link>
                )}
                {user.role === 'admin' && (
                  <>
                    <Link to="/admin" className={`${navLinkClass} py-3`} onClick={closeMobileMenu}>
                      <FormattedMessage id="dashboard.adminDashboard" defaultMessage="Dashboard" />
                    </Link>
                    <Link to="/payment-info" className={`${navLinkClass} py-3`} onClick={closeMobileMenu}>
                      <FormattedMessage id="header.payments" defaultMessage="Payments" />
                    </Link>
                    <Link to="/org-settings" className={`${navLinkClass} py-3`} onClick={closeMobileMenu}>
                      <FormattedMessage id="header.settings" defaultMessage="Settings" />
                    </Link>
                  </>
                )}
                {user.role === 'tenant' && (
                  <Link to="/tenant" className={`${navLinkClass} py-3`} onClick={closeMobileMenu}>
                    <FormattedMessage id="header.myProfile" defaultMessage="My Profile" />
                  </Link>
                )}
                <button onClick={() => { closeMobileMenu(); handleLogout(); }} className="bg-red-500/80 hover:bg-red-500 px-4 py-3 rounded-lg transition-colors text-left">
                  <FormattedMessage id="header.logout" defaultMessage="Logout" />
                </button>
              </>
            )}
            <div className="pt-2 border-t border-white/10">
              <LanguageSwitcher />
            </div>
          </nav>
        </div>
      )}
      <AvailabilityModal isOpen={showAvailability} onClose={() => setShowAvailability(false)} />
    </header>
  );
};

export default Header;