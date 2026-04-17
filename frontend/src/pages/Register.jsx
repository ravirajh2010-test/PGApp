import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import api from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-brand-50 dark:from-slate-900 dark:to-dark-900">
      <div className="bg-white dark:bg-dark-700 rounded-2xl shadow-xl p-8 w-full max-w-md border border-slate-100 dark:border-slate-700">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/images/roomipilot-logo.png" alt="RoomiPilot" className="h-10 w-10" />
            <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Roomi<span className="text-brand-500">Pilot</span></span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100"><FormattedMessage id="auth.register" defaultMessage="Register" /></h2>
        </div>
        
        {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 p-3 rounded-xl mb-4">{error}</div>}
        {success && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 p-3 rounded-xl mb-4">{success}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={<FormattedMessage id="auth.orgSlug" defaultMessage="Organization Slug" />}
            type="text"
            placeholder="e.g. bajrang-hostels"
            value={form.orgSlug}
            onChange={(e) => setForm({ ...form, orgSlug: e.target.value })}
            helper="Ask your PG admin for this ID"
            required
          />
          <Input
            label={<FormattedMessage id="auth.name" defaultMessage="Full Name" />}
            type="text"
            placeholder="John Doe"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label={<FormattedMessage id="auth.email" defaultMessage="Email" />}
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            label={<FormattedMessage id="auth.password" defaultMessage="Password" />}
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <Button type="submit" variant="primary" fullWidth loading={loading}>
            <FormattedMessage id="auth.register" defaultMessage="Register" />
          </Button>
        </form>
        
        <div className="mt-6 text-center space-y-2">
          <p className="text-slate-600 dark:text-slate-400"><FormattedMessage id="auth.alreadyHaveAccount" defaultMessage="Already have an account?" /> <Link to="/login" className="text-brand-500 hover:text-brand-600 font-bold"><FormattedMessage id="auth.login" defaultMessage="Login" /></Link></p>
          <p className="text-slate-600 dark:text-slate-400">Want to list your PG? <Link to="/onboarding" className="text-brand-500 hover:text-brand-600 font-bold">Register your business</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;