import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import api, { setAuthData } from '../services/api';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '', orgSlug: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [orgList, setOrgList] = useState(null); // For multi-org selection

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { email: form.email, password: form.password };
      if (form.orgSlug) payload.orgSlug = form.orgSlug;

      const res = await api.post('/auth/login', payload);

      // Multi-org response â€” user belongs to multiple orgs
      if (res.status === 300 || res.data.organizations) {
        setOrgList(res.data.organizations);
        setLoading(false);
        return;
      }

      setAuthData(res.data.token, res.data.user, res.data.organization);

      if (res.data.user.role === 'super_admin') {
        window.location.href = '/super_admin';
      } else {
        window.location.href = `/${res.data.user.role}`;
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleOrgSelect = async (slug) => {
    setForm({ ...form, orgSlug: slug });
    setOrgList(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        email: form.email,
        password: form.password,
        orgSlug: slug,
      });
      setAuthData(res.data.token, res.data.user, res.data.organization);
      window.location.href = `/${res.data.user.role}`;
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-brand-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-4xl border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Branding Section */}
          <div className="hidden md:flex flex-col items-center justify-center bg-gradient-to-br from-dark-900 via-dark-800 to-brand-950 p-10 relative overflow-hidden">
            <div className="absolute top-10 left-10 w-40 h-40 bg-brand-400/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-10 right-10 w-56 h-56 bg-brand-600/10 rounded-full blur-2xl"></div>
            <div className="relative text-center text-white">
              <img src="/images/roomipilot-logo.png" alt="RoomiPilot" className="h-24 w-24 mx-auto mb-6 drop-shadow-lg" />
              <h2 className="text-3xl font-extrabold mb-2">Roomi<span className="text-brand-400">Pilot</span></h2>
              <p className="text-gray-300 text-lg">Manage your PG/Hostel business with ease</p>
              <div className="mt-8 flex gap-3 justify-center">
                <div className="w-2 h-2 bg-brand-400 rounded-full"></div>
                <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                <div className="w-2 h-2 bg-brand-600 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-2 md:hidden">
                <img src="/images/roomipilot-logo.png" alt="RoomiPilot" className="h-10 w-10" />
                <span className="text-3xl font-extrabold text-gray-800">Roomi<span className="text-brand-500">Pilot</span></span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">
                <FormattedMessage id="auth.loginTitle" defaultMessage="Admin Login" />
              </h2>
            </div>
            
            {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4">{error}</div>}

            {/* Multi-org selection */}
            {orgList ? (
              <div className="space-y-4">
                <p className="text-gray-700 font-medium">Select your organization:</p>
                {orgList.map((org) => (
                  <button
                    key={org.slug}
                    onClick={() => handleOrgSelect(org.slug)}
                    className="w-full text-left px-4 py-3 border border-gray-200 rounded-xl hover:bg-brand-50 hover:border-brand-300 transition"
                  >
                    <p className="font-semibold text-gray-800">{org.name}</p>
                    <p className="text-sm text-gray-500">{org.slug}</p>
                  </button>
                ))}
                <button
                  onClick={() => setOrgList(null)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Back to login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FormattedMessage id="auth.email" defaultMessage="Email" />
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FormattedMessage id="auth.password" defaultMessage="Password" />
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FormattedMessage id="auth.orgSlug" defaultMessage="Organization ID" /> <span className="text-gray-400">(<FormattedMessage id="auth.askAdmin" defaultMessage="optional" />)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. bajrang-hostels"
                    value={form.orgSlug}
                    onChange={(e) => setForm({ ...form, orgSlug: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-4 rounded-xl transition disabled:opacity-50 shadow-lg shadow-brand-500/20"
                >
                  {loading ? (
                    <FormattedMessage id="common.loading" defaultMessage="Loading..." />
                  ) : (
                    <FormattedMessage id="auth.login" defaultMessage="Login" />
                  )}
                </button>
              </form>
            )}

            <div className="mt-6 text-center space-y-2">
              <p className="text-gray-600">
                Want to list your PG?{' '}
                <Link to="/onboarding" className="text-brand-500 hover:text-brand-600 font-bold">
                  <FormattedMessage id="auth.registerBusiness" defaultMessage="Register your business" />
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;