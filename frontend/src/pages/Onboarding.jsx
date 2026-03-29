import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import api, { setAuthData } from '../services/api';

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    orgName: '',
    orgSlug: '',
    orgEmail: '',
    orgPhone: '',
    orgAddress: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    plan: 'free',
  });

  const plans = [
    { id: 'free', name: 'Free', price: '₹0/mo', properties: 1, beds: 10, users: 5, desc: 'Get started for free' },
    { id: 'starter', name: 'Starter', price: '₹499/mo', properties: 3, beds: 50, users: 20, desc: 'For small PGs' },
    { id: 'pro', name: 'Pro', price: '₹1,499/mo', properties: 10, beds: 200, users: 100, desc: 'For growing businesses', popular: true },
    { id: 'enterprise', name: 'Enterprise', price: '₹4,999/mo', properties: 'Unlimited', beds: 'Unlimited', users: 'Unlimited', desc: 'For large operations' },
  ];

  const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const handleOrgNameChange = (e) => {
    const name = e.target.value;
    setForm({ ...form, orgName: name, orgSlug: generateSlug(name) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/register-organization', {
        orgName: form.orgName,
        orgSlug: form.orgSlug,
        orgEmail: form.orgEmail,
        orgPhone: form.orgPhone,
        orgAddress: form.orgAddress,
        adminName: form.adminName,
        adminEmail: form.adminEmail,
        adminPassword: form.adminPassword,
        plan: form.plan,
      });

      setAuthData(res.data.token, res.data.user, res.data.organization);
      window.location.href = '/admin';
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-100 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🏢 <FormattedMessage id="onboarding.registerBusiness" defaultMessage="Register Your PG Business" /></h1>
          <p className="text-gray-600"><FormattedMessage id="onboarding.setupOrg" defaultMessage="Set up your organization on PG Stay in minutes" /></p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step >= s ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {s}
              </div>
              {s < 3 && <div className={`w-16 h-1 ${step > s ? 'bg-orange-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">{error}</div>}

        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Step 1: Choose Plan */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6"><FormattedMessage id="onboarding.choosePlan" defaultMessage="Choose Your Plan" /></h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => setForm({ ...form, plan: plan.id })}
                    className={`relative cursor-pointer border-2 rounded-lg p-6 transition ${
                      form.plan === plan.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3 right-4 bg-orange-500 text-white text-xs px-3 py-1 rounded-full font-bold">
                        POPULAR
                      </span>
                    )}
                    <h3 className="text-xl font-bold text-gray-800">{plan.name}</h3>
                    <p className="text-2xl font-bold text-orange-500 mt-1">{plan.price}</p>
                    <p className="text-sm text-gray-500 mt-1">{plan.desc}</p>
                    <div className="mt-4 space-y-1 text-sm text-gray-600">
                      <p><FormattedMessage id="onboarding.properties" defaultMessage="Properties" />: {plan.properties}</p>
                      <p><FormattedMessage id="onboarding.beds" defaultMessage="Beds" />: {plan.beds}</p>
                      <p><FormattedMessage id="onboarding.users" defaultMessage="Users" />: {plan.users}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition"
              >
                <FormattedMessage id="onboarding.continue" defaultMessage="Continue" />
              </button>
            </div>
          )}

          {/* Step 2: Organization Details */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6"><FormattedMessage id="onboarding.orgDetails" defaultMessage="Organization Details" /></h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1"><FormattedMessage id="onboarding.businessName" defaultMessage="Business Name" /> *</label>
                  <input
                    type="text"
                    value={form.orgName}
                    onChange={handleOrgNameChange}
                    placeholder="e.g. Sunrise PG & Hostels"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1"><FormattedMessage id="onboarding.orgUrlSlug" defaultMessage="Organization URL Slug" /> *</label>
                  <div className="flex items-center">
                    <span className="text-gray-500 text-sm mr-2">pgstay.com/</span>
                    <input
                      type="text"
                      value={form.orgSlug}
                      onChange={(e) => setForm({ ...form, orgSlug: e.target.value })}
                      placeholder="sunrise-pg"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1"><FormattedMessage id="onboarding.businessEmail" defaultMessage="Business Email" /> *</label>
                    <input
                      type="email"
                      value={form.orgEmail}
                      onChange={(e) => setForm({ ...form, orgEmail: e.target.value })}
                      placeholder="info@sunrise-pg.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1"><FormattedMessage id="onboarding.phone" defaultMessage="Phone" /></label>
                    <input
                      type="tel"
                      value={form.orgPhone}
                      onChange={(e) => setForm({ ...form, orgPhone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1"><FormattedMessage id="onboarding.address" defaultMessage="Address" /></label>
                  <textarea
                    value={form.orgAddress}
                    onChange={(e) => setForm({ ...form, orgAddress: e.target.value })}
                    placeholder="Enter your business address" // text field
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border-2 border-gray-300 text-gray-700 font-bold py-3 rounded-lg transition hover:bg-gray-50"
                >
                <FormattedMessage id="onboarding.back" defaultMessage="Back" />
                </button>
                <button
                  onClick={() => {
                    if (!form.orgName || !form.orgSlug || !form.orgEmail) {
                      setError('Please fill in all required fields');
                      return;
                    }
                    setError('');
                    setStep(3);
                  }}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition"
                >
                  <FormattedMessage id="onboarding.continue" defaultMessage="Continue" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Admin Account */}
          {step === 3 && (
            <form onSubmit={handleSubmit}>
              <h2 className="text-2xl font-bold text-gray-800 mb-6"><FormattedMessage id="onboarding.createAdmin" defaultMessage="Create Admin Account" /></h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1"><FormattedMessage id="onboarding.yourName" defaultMessage="Your Name" /> *</label>
                  <input
                    type="text"
                    value={form.adminName}
                    onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1"><FormattedMessage id="onboarding.adminEmail" defaultMessage="Admin Email" /> *</label>
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1"><FormattedMessage id="onboarding.password" defaultMessage="Password" /> *</label>
                  <input
                    type="password"
                    value={form.adminPassword}
                    onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                    placeholder="Min 6 characters" // password field
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-700 mb-2"><FormattedMessage id="onboarding.summary" defaultMessage="Summary" /></h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><span className="font-medium"><FormattedMessage id="onboarding.plan" defaultMessage="Plan" />:</span> {plans.find(p => p.id === form.plan)?.name}</p>
                  <p><span className="font-medium"><FormattedMessage id="onboarding.organization" defaultMessage="Organization" />:</span> {form.orgName}</p>
                  <p><span className="font-medium"><FormattedMessage id="onboarding.url" defaultMessage="URL" />:</span> /{form.orgSlug}</p>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 border-2 border-gray-300 text-gray-700 font-bold py-3 rounded-lg transition hover:bg-gray-50"
                >
                  <FormattedMessage id="onboarding.back" defaultMessage="Back" />
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
                >
                  {loading ? <FormattedMessage id="onboarding.creating" defaultMessage="Creating..." /> : <FormattedMessage id="onboarding.createOrganization" defaultMessage="Create Organization" />}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="text-center mt-6">
          <p className="text-gray-600">
            <FormattedMessage id="onboarding.alreadyHaveAccount" defaultMessage="Already have an account?" />{' '}
            <Link to="/login" className="text-orange-500 hover:text-orange-600 font-bold"><FormattedMessage id="onboarding.loginHere" defaultMessage="Login here" /></Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
