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

  const navLinkClass = 'rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:bg-white/10 hover:text-white whitespace-nowrap';

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[linear-gradient(135deg,rgba(2,6,23,0.96),rgba(12,74,110,0.92),rgba(2,6,23,0.96))] text-white shadow-xl shadow-slate-950/10 backdrop-blur-xl" ref={menuRef}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" onClick={closeMobileMenu}>
          <div className="rounded-xl border border-white/10 bg-white/10 p-1 shadow-lg shadow-brand-500/10">
            <img src="/images/roomipilot-logo.png" alt="RoomiPilot" className="h-7 w-7" />
          </div>
          <div className="min-w-0 leading-tight">
            <span className="block truncate text-base font-extrabold sm:text-lg">
              {org ? org.name : <span>Roomi<span className="text-brand-300">Pilot</span></span>}
            </span>
            <span className="hidden truncate text-[10px] uppercase tracking-[0.18em] text-white/55 sm:block">
              {user ? 'Multi-tenant operations workspace' : 'Property operations platform'}
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2">
          <nav className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-1.5 py-1 shadow-inner">
            {!user ? (
              <>
                <Link to="/contact" className={navLinkClass}>
                  <FormattedMessage id="header.contactUs" defaultMessage="Contact Us" />
                </Link>
                <Link to="/login" className={navLinkClass}>
                  <FormattedMessage id="auth.login" defaultMessage="Login" />
                </Link>
                <Link to="/onboarding" className="rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-50 hover:text-brand-600 shadow-lg shadow-white/10">
                  <FormattedMessage id="app.listYourPG" defaultMessage="List Your PG" />
                </Link>
              </>
            ) : (
              <>
                <span
                  className="hidden lg:inline-block max-w-[18rem] truncate whitespace-nowrap rounded-xl bg-white/5 px-3 py-1.5 text-xs text-white/85"
                  title={`${user.name}${org ? ` (${org.name})` : ''}`}
                >
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
                <button onClick={handleLogout} className="rounded-xl bg-red-500/85 px-3 py-1.5 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-500">
                  <FormattedMessage id="header.logout" defaultMessage="Logout" />
                </button>
              </>
            )}
          </nav>

          {/* Dark mode toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-xl border border-white/10 bg-white/5 p-1.5 hover:bg-white/10 transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode
              ? <SunIcon className="w-4 h-4 text-amber-300" />
              : <MoonIcon className="w-4 h-4 text-slate-300" />
            }
          </button>

          <LanguageSwitcher />
        </div>

        {/* Mobile right controls */}
        <div className="md:hidden flex items-center gap-1">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-xl border border-white/10 bg-white/5 p-1.5 hover:bg-white/10 transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode
              ? <SunIcon className="w-4 h-4 text-amber-300" />
              : <MoonIcon className="w-4 h-4 text-slate-300" />
            }
          </button>
          <button
            className="rounded-xl border border-white/10 bg-white/5 p-1.5 hover:bg-white/10 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen
              ? <XMarkIcon className="w-5 h-5" />
              : <Bars3Icon className="w-5 h-5" />
            }
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-sm">
          <nav className="flex flex-col px-4 py-3 space-y-1">
            {!user ? (
              <>
                <Link to="/contact" className={`${navLinkClass} py-3`} onClick={closeMobileMenu}>
                  <FormattedMessage id="header.contactUs" defaultMessage="Contact Us" />
                </Link>
                <Link to="/login" className={`${navLinkClass} py-3`} onClick={closeMobileMenu}>
                  <FormattedMessage id="auth.login" defaultMessage="Login" />
                </Link>
                <Link to="/onboarding" className="rounded-xl bg-white px-4 py-3 text-center font-semibold text-slate-900 transition-colors hover:bg-brand-50" onClick={closeMobileMenu}>
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
                <button onClick={() => { closeMobileMenu(); handleLogout(); }} className="rounded-xl bg-red-500/80 px-4 py-3 text-left transition-colors hover:bg-red-500">
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