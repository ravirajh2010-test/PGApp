import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import api, { setAuthData } from '../services/api';
import { Button, Input } from '../components/ui';

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
    { id: 'free', name: 'Free', price: '£0/mo', properties: 1, beds: 10, users: 5, desc: 'Get started for free' },
    { id: 'starter', name: 'Starter', price: '£5/mo', properties: 3, beds: 50, users: 20, desc: 'For small PGs' },
    { id: 'pro', name: 'Pro', price: '£15/mo', properties: 10, beds: 200, users: 100, desc: 'For growing businesses', popular: true },
    { id: 'enterprise', name: 'Enterprise', price: '£50/mo', properties: 'Unlimited', beds: 'Unlimited', users: 'Unlimited', desc: 'For large operations' },
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
      // For paid plans, redirect to Stripe Checkout
      if (form.plan !== 'free') {
        const stripeRes = await api.post('/stripe/create-checkout-session', {
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
        // Redirect to Stripe Checkout
        window.location.href = stripeRes.data.url;
        return;
      }

      // Free plan — create org directly
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 dark:from-slate-900 dark:to-slate-800 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/images/roomipilot-logo.png" alt="RoomiPilot" className="h-10 w-10" />
            <span className="text-4xl font-extrabold text-slate-800 dark:text-slate-100">Roomi<span className="text-brand-500">Pilot</span></span>
          </div>
          <p className="text-slate-600 dark:text-slate-400"><FormattedMessage id="onboarding.setupOrg" defaultMessage="Set up your organization on RoomiPilot in minutes" /></p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step >= s ? 'bg-brand-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
                {step > s ? <CheckCircleIcon className="h-5 w-5" /> : s}
              </div>
              {s < 3 && <div className={`w-16 h-1 ${step > s ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`} />}
            </div>
          ))}
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 p-4 rounded-lg mb-6">{error}</div>}

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-100 dark:border-slate-700">
          {/* Step 1: Choose Plan */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6"><FormattedMessage id="onboarding.choosePlan" defaultMessage="Choose Your Plan" /></h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => setForm({ ...form, plan: plan.id })}
                    className={`relative cursor-pointer border-2 rounded-lg p-6 transition ${
                      form.plan === plan.id
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-slate-200 dark:border-slate-600 hover:border-brand-300'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3 right-4 bg-brand-500 text-white text-xs px-3 py-1 rounded-full font-bold">
                        POPULAR
                      </span>
                    )}
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{plan.name}</h3>
                    <p className="text-2xl font-bold text-brand-500 mt-1">{plan.price}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{plan.desc}</p>
                    <div className="mt-4 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      <p><FormattedMessage id="onboarding.properties" defaultMessage="Properties" />: {plan.properties}</p>
                      <p><FormattedMessage id="onboarding.beds" defaultMessage="Beds" />: {plan.beds}</p>
                      <p><FormattedMessage id="onboarding.users" defaultMessage="Users" />: {plan.users}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="primary" fullWidth className="mt-6" onClick={() => setStep(2)}>
                <FormattedMessage id="onboarding.continue" defaultMessage="Continue" />
              </Button>
            </div>
          )}

          {/* Step 2: Organization Details */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6"><FormattedMessage id="onboarding.orgDetails" defaultMessage="Organization Details" /></h2>
              <div className="space-y-4">
                <Input
                  label={<><FormattedMessage id="onboarding.businessName" defaultMessage="Business Name" /> *</>}
                  type="text"
                  value={form.orgName}
                  onChange={handleOrgNameChange}
                  placeholder="e.g. Sunrise PG & Hostels"
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"><FormattedMessage id="onboarding.orgUrlSlug" defaultMessage="Organization URL Slug" /> *</label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap">roomipilot.com/</span>
                    <Input
                      type="text"
                      value={form.orgSlug}
                      onChange={(e) => setForm({ ...form, orgSlug: e.target.value })}
                      placeholder="sunrise-pg"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="email"
                    label={<><FormattedMessage id="onboarding.businessEmail" defaultMessage="Business Email" /> *</>}
                    value={form.orgEmail}
                    onChange={(e) => setForm({ ...form, orgEmail: e.target.value })}
                    placeholder="info@sunrise-pg.com"
                    required
                  />
                  <Input
                    type="tel"
                    label={<><FormattedMessage id="onboarding.phone" defaultMessage="Phone" /> *</>}
                    value={form.orgPhone}
                    onChange={(e) => setForm({ ...form, orgPhone: e.target.value })}
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>
                <Input
                  as="textarea"
                  label={<FormattedMessage id="onboarding.address" defaultMessage="Address" />}
                  value={form.orgAddress}
                  onChange={(e) => setForm({ ...form, orgAddress: e.target.value })}
                  placeholder="Enter your business address"
                  rows={2}
                />
              </div>
              <div className="flex gap-4 mt-6">
                <Button variant="secondary" className="flex-1" onClick={() => setStep(1)}>
                  <FormattedMessage id="onboarding.back" defaultMessage="Back" />
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => {
                    if (!form.orgName || !form.orgSlug || !form.orgEmail || !form.orgPhone) {
                      setError('Please fill in all required fields including phone number');
                      return;
                    }
                    setError('');
                    setStep(3);
                  }}
                >
                  <FormattedMessage id="onboarding.continue" defaultMessage="Continue" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Admin Account */}
          {step === 3 && (
            <form onSubmit={handleSubmit}>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6"><FormattedMessage id="onboarding.createAdmin" defaultMessage="Create Admin Account" /></h2>
              <div className="space-y-4">
                <Input
                  label={<><FormattedMessage id="onboarding.yourName" defaultMessage="Your Name" /> *</>}
                  type="text"
                  value={form.adminName}
                  onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                  placeholder="John Doe"
                  required
                />
                <Input
                  label={<><FormattedMessage id="onboarding.adminEmail" defaultMessage="Admin Email" /> *</>}
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  placeholder="you@example.com"
                  required
                />
                <Input
                  label={<><FormattedMessage id="onboarding.password" defaultMessage="Password" /> *</>}
                  type="password"
                  value={form.adminPassword}
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                />
              </div>

              {/* Summary */}
              <div className="mt-6 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-2"><FormattedMessage id="onboarding.summary" defaultMessage="Summary" /></h3>
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <p><span className="font-medium"><FormattedMessage id="onboarding.plan" defaultMessage="Plan" />:</span> {plans.find(p => p.id === form.plan)?.name}</p>
                  <p><span className="font-medium"><FormattedMessage id="onboarding.organization" defaultMessage="Organization" />:</span> {form.orgName}</p>
                  <p><span className="font-medium"><FormattedMessage id="onboarding.url" defaultMessage="URL" />:</span> /{form.orgSlug}</p>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setStep(2)}>
                  <FormattedMessage id="onboarding.back" defaultMessage="Back" />
                </Button>
                <Button type="submit" variant="primary" className="flex-1" loading={loading}>
                  {!loading && <FormattedMessage id="onboarding.createOrganization" defaultMessage="Create Organization" />}
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="text-center mt-6">
          <p className="text-slate-600 dark:text-slate-400">
            <FormattedMessage id="onboarding.alreadyHaveAccount" defaultMessage="Already have an account?" />{' '}
            <Link to="/login" className="text-brand-500 hover:text-brand-600 font-bold"><FormattedMessage id="onboarding.loginHere" defaultMessage="Login here" /></Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
