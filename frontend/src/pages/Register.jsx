import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import api from '../services/api';

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', orgSlug: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        orgSlug: form.orgSlug,
      });
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-brand-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/images/aupl8-logo.svg" alt="Aupl8" className="h-10 w-10" />
            <span className="text-3xl font-extrabold text-gray-800">Aupl8 <span className="text-brand-500">Stay</span></span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800"><FormattedMessage id="auth.register" defaultMessage="Register" /></h2>
        </div>
        
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg mb-4">{success}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1"><FormattedMessage id="auth.orgSlug" defaultMessage="Organization Slug" /></label>
            <input
              type="text"
              placeholder="e.g. bajrang-hostels"
              value={form.orgSlug}
              onChange={(e) => setForm({ ...form, orgSlug: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Ask your PG admin for this ID</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1"><FormattedMessage id="auth.name" defaultMessage="Full Name" /></label>
            <input
              type="text"
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1"><FormattedMessage id="auth.email" defaultMessage="Email" /></label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1"><FormattedMessage id="auth.password" defaultMessage="Password" /></label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2 px-4 rounded-xl transition shadow-lg shadow-brand-500/20 disabled:opacity-50"
          >
            {loading ? <FormattedMessage id="common.loading" defaultMessage="Loading..." /> : <FormattedMessage id="auth.register" defaultMessage="Register" />}
          </button>
        </form>
        
        <div className="mt-6 text-center space-y-2">
          <p className="text-gray-600"><FormattedMessage id="auth.alreadyHaveAccount" defaultMessage="Already have an account?" /> <Link to="/login" className="text-brand-500 hover:text-brand-600 font-bold"><FormattedMessage id="auth.login" defaultMessage="Login" /></Link></p>
          <p className="text-gray-600">Want to list your PG? <Link to="/onboarding" className="text-brand-500 hover:text-brand-600 font-bold">Register your business</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;