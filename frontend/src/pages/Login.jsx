import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import api, { setAuthData } from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '', orgCode: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [orgList, setOrgList] = useState(null); // For multi-org selection

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { email: form.email, password: form.password };
      if (form.orgCode) payload.orgCode = form.orgCode.toUpperCase();

      const res = await api.post('/auth/login', payload);

      // Multi-org response — user belongs to multiple orgs
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

  const handleOrgSelect = async (organizationCode) => {
    setForm({ ...form, orgCode: organizationCode });
    setOrgList(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        email: form.email,
        password: form.password,
        orgCode: organizationCode,
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
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-gradient-to-br from-slate-50 to-brand-50 dark:from-slate-900 dark:to-dark-900 px-3 py-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-dark-700">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Branding Section */}
          <div className="relative hidden overflow-hidden bg-gradient-to-br from-dark-900 via-dark-800 to-brand-950 p-8 md:flex md:flex-col md:items-center md:justify-center">
            <div className="absolute left-8 top-8 h-32 w-32 rounded-full bg-brand-400/10 blur-2xl"></div>
            <div className="absolute bottom-8 right-8 h-44 w-44 rounded-full bg-brand-600/10 blur-2xl"></div>
            <div className="relative text-center text-white">
              <img src="/images/roomipilot-logo.png" alt="RoomiPilot" className="mx-auto mb-4 h-20 w-20 drop-shadow-lg" />
              <h2 className="mb-2 text-3xl font-extrabold">Roomi<span className="text-brand-400">Pilot</span></h2>
              <p className="text-base text-gray-300">Manage your PG/Hostel business with ease</p>
              <div className="mt-6 flex justify-center gap-3">
                <div className="w-2 h-2 bg-brand-400 rounded-full"></div>
                <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                <div className="w-2 h-2 bg-brand-600 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-6">
            <div className="mb-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2 md:hidden">
                <img src="/images/roomipilot-logo.png" alt="RoomiPilot" className="h-10 w-10" />
                <span className="text-3xl font-extrabold text-gray-800">Roomi<span className="text-brand-500">Pilot</span></span>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                <FormattedMessage id="auth.loginTitle" defaultMessage="Admin Login" />
              </h2>
            </div>
            
            {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 p-3 rounded-xl mb-4">{error}</div>}

            {/* Multi-org selection */}
            {orgList ? (
              <div className="space-y-3">
                <p className="text-slate-700 dark:text-slate-300 font-medium">Select your organization:</p>
                {orgList.map((org) => (
                  <button
                    key={org.organizationCode || org.slug}
                    onClick={() => handleOrgSelect(org.organizationCode)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50 dark:border-slate-600 dark:bg-dark-700 dark:hover:border-brand-600 dark:hover:bg-brand-900/20"
                  >
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{org.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{org.organizationCode || org.slug}</p>
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
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label={<FormattedMessage id="auth.email" defaultMessage="Email" />}
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="sm:col-span-2"
                  />
                  <Input
                    label={<FormattedMessage id="auth.password" defaultMessage="Password" />}
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <Input
                    label={
                      <>
                        <FormattedMessage id="auth.orgSlug" defaultMessage="Organization ID" />{' '}
                        <span className="text-slate-400 font-normal">(<FormattedMessage id="auth.askAdmin" defaultMessage="optional" />)</span>
                      </>
                    }
                    type="text"
                    placeholder="e.g. ORG-000123"
                    value={form.orgCode}
                    onChange={(e) => setForm({ ...form, orgCode: e.target.value.toUpperCase() })}
                  />
                </div>
                <Button type="submit" variant="primary" fullWidth loading={loading}>
                  <FormattedMessage id="auth.login" defaultMessage="Login" />
                </Button>
              </form>
            )}

            <div className="mt-5 text-center space-y-1.5">
              <p className="text-slate-600 dark:text-slate-400">
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