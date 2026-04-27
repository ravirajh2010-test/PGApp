import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import {
  BuildingOffice2Icon,
  CheckCircleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import api, { setAuthData } from '../services/api';
import { Button, Input } from '../components/ui';

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addSecondaryAdmin, setAddSecondaryAdmin] = useState(false);
  const [form, setForm] = useState({
    orgName: '',
    orgSlug: '',
    orgEmail: '',
    orgPhone: '',
    orgAddress: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    secondaryAdminName: '',
    secondaryAdminEmail: '',
    secondaryAdminPassword: '',
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

  const updateForm = (updates) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const handleOrgNameChange = (e) => {
    const name = e.target.value;
    updateForm({ orgName: name, orgSlug: generateSlug(name) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!form.adminName || !form.adminEmail || !form.adminPassword) {
      setError('Please fill in the primary admin details to continue.');
      setLoading(false);
      return;
    }

    if (addSecondaryAdmin) {
      if (!form.secondaryAdminName || !form.secondaryAdminEmail || !form.secondaryAdminPassword) {
        setError('Please complete the secondary admin details or remove the secondary admin.');
        setLoading(false);
        return;
      }
      if (form.secondaryAdminEmail.trim().toLowerCase() === form.adminEmail.trim().toLowerCase()) {
        setError('Primary and secondary admin emails must be different.');
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        orgName: form.orgName,
        orgSlug: form.orgSlug,
        orgEmail: form.orgEmail,
        orgPhone: form.orgPhone,
        orgAddress: form.orgAddress,
        adminName: form.adminName,
        adminEmail: form.adminEmail,
        adminPassword: form.adminPassword,
        plan: form.plan,
      };

      if (addSecondaryAdmin) {
        payload.secondaryAdminName = form.secondaryAdminName;
        payload.secondaryAdminEmail = form.secondaryAdminEmail;
        payload.secondaryAdminPassword = form.secondaryAdminPassword;
      }

      // For paid plans, redirect to Stripe Checkout
      if (form.plan !== 'free') {
        const stripeRes = await api.post('/stripe/create-checkout-session', payload);
        // Redirect to Stripe Checkout
        window.location.href = stripeRes.data.url;
        return;
      }

      // Free plan — create org directly
      const res = await api.post('/auth/register-organization', payload);

      setAuthData(res.data.token, res.data.user, res.data.organization);
      window.location.href = '/admin';
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find((plan) => plan.id === form.plan) || plans[0];
  const stepLabels = [
    { id: 1, title: 'Choose a plan', icon: SparklesIcon },
    { id: 2, title: 'Business details', icon: BuildingOffice2Icon },
    { id: 3, title: 'Admin accounts', icon: UserGroupIcon },
  ];

  return (
    <div className="relative min-h-[calc(100vh-8rem)] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(135deg,#f8fafc_0%,#eef6ff_45%,#f8fafc_100%)] py-4 dark:bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_28%),linear-gradient(135deg,#020617_0%,#0f172a_50%,#111827_100%)] sm:py-6">
      <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-brand-500/10 to-transparent blur-3xl" />
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/70 bg-white/80 px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm backdrop-blur dark:border-brand-500/30 dark:bg-slate-900/70 dark:text-brand-300">
              <SparklesIcon className="h-4 w-4" />
              <span>Launch-ready onboarding for modern PG operations</span>
            </div>

            <div>
              <div className="mb-4 flex items-center gap-3">
                <img src="/images/roomipilot-logo.png" alt="RoomiPilot" className="h-12 w-12 rounded-2xl shadow-lg shadow-brand-500/20" />
                <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Roomi<span className="text-brand-500">Pilot</span>
                </span>
              </div>
              <h1 className="max-w-xl text-3xl font-black leading-tight text-slate-900 dark:text-white sm:text-4xl">
                Set up your organization with a cleaner, faster onboarding flow.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                Choose your plan, add your business details, and create your primary admin account. You can optionally add a backup admin now or later from settings.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/80 p-3.5 shadow-lg shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
                <div className="mb-3 inline-flex rounded-xl bg-brand-100 p-2 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <ShieldCheckIcon className="h-5 w-5" />
                </div>
                <p className="font-semibold text-slate-900 dark:text-white">Flexible admin setup</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Start solo, then invite a backup admin from settings whenever you are ready.</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-3.5 shadow-lg shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
                <div className="mb-3 inline-flex rounded-xl bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <BuildingOffice2Icon className="h-5 w-5" />
                </div>
                <p className="font-semibold text-slate-900 dark:text-white">Business-ready workspace</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Plans, organization records, and workspace data are provisioned automatically.</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-3.5 shadow-lg shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
                <div className="mb-3 inline-flex rounded-xl bg-violet-100 p-2 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                  <UserGroupIcon className="h-5 w-5" />
                </div>
                <p className="font-semibold text-slate-900 dark:text-white">Faster team launch</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Shared access helps operations, collections, and support start in parallel.</p>
              </div>
            </div>
          </div>

          <div>
            {/* Progress Steps */}
            <div className="mb-4 rounded-3xl border border-white/70 bg-white/85 p-3.5 shadow-xl shadow-slate-200/50 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {stepLabels.map(({ id, title, icon: Icon }, index) => (
                  <div key={id} className="flex flex-1 items-center gap-3 min-w-[150px]">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-sm font-bold ${
                      step >= id
                        ? 'border-brand-500 bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                        : 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {step > id ? <CheckCircleIcon className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Step {id}</p>
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
                    </div>
                    {index < stepLabels.length - 1 && <div className="hidden h-px flex-1 bg-slate-200 dark:bg-slate-700 xl:block" />}
                  </div>
                ))}
              </div>
            </div>

            {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50/90 p-3.5 text-red-700 shadow-sm dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</div>}

            <div className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-2xl shadow-slate-200/60 backdrop-blur dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-500">Organization onboarding</p>
                  <h2 className="mt-1.5 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
                    {step === 1 && <FormattedMessage id="onboarding.choosePlan" defaultMessage="Choose Your Plan" />}
                    {step === 2 && <FormattedMessage id="onboarding.orgDetails" defaultMessage="Organization Details" />}
                    {step === 3 && <FormattedMessage id="onboarding.createAdmin" defaultMessage="Create Admin Accounts" />}
                  </h2>
                </div>
                <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-2.5 text-right dark:border-brand-500/20 dark:bg-brand-500/10">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">Selected plan</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{selectedPlan?.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{selectedPlan?.price}</p>
                </div>
              </div>

          {/* Step 1: Choose Plan */}
          {step === 1 && (
            <div>
              <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                Pick the plan that matches your current stage. Every plan supports up to two admin accounts; the secondary admin is optional and can be added anytime later.
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => updateForm({ plan: plan.id })}
                    className={`relative cursor-pointer rounded-3xl border p-5 transition-all duration-200 ${
                      form.plan === plan.id
                        ? 'border-brand-500 bg-brand-50 shadow-lg shadow-brand-500/10 dark:bg-brand-900/20'
                        : 'border-slate-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg dark:border-slate-700'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3 right-4 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-brand-500/25">
                        POPULAR
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{plan.name}</h3>
                        <p className="mt-1 text-3xl font-black text-brand-500">{plan.price}</p>
                      </div>
                      {form.plan === plan.id && (
                        <div className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-600 dark:text-brand-300">
                          Selected
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{plan.desc}</p>
                    <div className="mt-4 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                      <p><FormattedMessage id="onboarding.properties" defaultMessage="Properties" />: {plan.properties}</p>
                      <p><FormattedMessage id="onboarding.beds" defaultMessage="Beds" />: {plan.beds}</p>
                      <p><FormattedMessage id="onboarding.users" defaultMessage="Users" />: {plan.users}</p>
                      <p><FormattedMessage id="onboarding.adminSeats" defaultMessage="Admin seats" />: <FormattedMessage id="onboarding.adminSeatsValue" defaultMessage="Up to 2" /></p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="primary" fullWidth className="mt-5" onClick={() => setStep(2)}>
                <FormattedMessage id="onboarding.continue" defaultMessage="Continue" />
              </Button>
            </div>
          )}

          {/* Step 2: Organization Details */}
          {step === 2 && (
            <div>
              <div className="space-y-3.5">
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
                      onChange={(e) => updateForm({ orgSlug: e.target.value })}
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
                    onChange={(e) => updateForm({ orgEmail: e.target.value })}
                    placeholder="info@sunrise-pg.com"
                    required
                  />
                  <Input
                    type="tel"
                    label={<><FormattedMessage id="onboarding.phone" defaultMessage="Phone" /> *</>}
                    value={form.orgPhone}
                    onChange={(e) => updateForm({ orgPhone: e.target.value })}
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>
                <Input
                  as="textarea"
                  label={<FormattedMessage id="onboarding.address" defaultMessage="Address" />}
                  value={form.orgAddress}
                  onChange={(e) => updateForm({ orgAddress: e.target.value })}
                  placeholder="Enter your business address"
                  rows={2}
                />
              </div>
              <div className="mt-5 flex gap-3">
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
              <div className="mb-5 rounded-2xl border border-brand-100 bg-brand-50/80 p-3.5 text-sm text-slate-600 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-slate-300">
                <FormattedMessage
                  id="onboarding.adminIntro"
                  defaultMessage="Add your primary admin now. A secondary admin is optional and can be invited later from settings."
                />
              </div>
              <div className={`grid gap-4 ${addSecondaryAdmin ? 'xl:grid-cols-2' : ''}`}>
                <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-2xl bg-brand-500/10 p-2 text-brand-500">
                      <ShieldCheckIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        <FormattedMessage id="onboarding.primaryAdmin" defaultMessage="Primary admin" />
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        <FormattedMessage id="onboarding.primaryAdminDesc" defaultMessage="Main owner for login and billing updates." />
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Input
                      label={<><FormattedMessage id="onboarding.yourName" defaultMessage="Your Name" /> *</>}
                      type="text"
                      value={form.adminName}
                      onChange={(e) => updateForm({ adminName: e.target.value })}
                      placeholder="John Doe"
                      required
                    />
                    <Input
                      label={<><FormattedMessage id="onboarding.adminEmail" defaultMessage="Admin Email" /> *</>}
                      type="email"
                      value={form.adminEmail}
                      onChange={(e) => updateForm({ adminEmail: e.target.value })}
                      placeholder="owner@example.com"
                      required
                    />
                    <Input
                      label={<><FormattedMessage id="onboarding.password" defaultMessage="Password" /> *</>}
                      type="password"
                      value={form.adminPassword}
                      onChange={(e) => updateForm({ adminPassword: e.target.value })}
                      placeholder="Min 6 characters"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                {addSecondaryAdmin && (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-violet-500/10 p-2 text-violet-500">
                          <UserGroupIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            <FormattedMessage id="onboarding.secondaryAdmin" defaultMessage="Secondary admin" />
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            <FormattedMessage id="onboarding.secondaryAdminDesc" defaultMessage="Backup access for operations, support, or collections." />
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAddSecondaryAdmin(false);
                          updateForm({ secondaryAdminName: '', secondaryAdminEmail: '', secondaryAdminPassword: '' });
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-red-500"
                      >
                        <FormattedMessage id="onboarding.removeSecondaryAdmin" defaultMessage="Remove" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <Input
                        label={<FormattedMessage id="onboarding.secondaryAdminName" defaultMessage="Secondary Admin Name" />}
                        type="text"
                        value={form.secondaryAdminName}
                        onChange={(e) => updateForm({ secondaryAdminName: e.target.value })}
                        placeholder="Jane Smith"
                        required
                      />
                      <Input
                        label={<FormattedMessage id="onboarding.secondaryAdminEmail" defaultMessage="Secondary Admin Email" />}
                        type="email"
                        value={form.secondaryAdminEmail}
                        onChange={(e) => updateForm({ secondaryAdminEmail: e.target.value })}
                        placeholder="operations@example.com"
                        required
                      />
                      <Input
                        label={<FormattedMessage id="onboarding.secondaryAdminPassword" defaultMessage="Secondary Admin Password" />}
                        type="password"
                        value={form.secondaryAdminPassword}
                        onChange={(e) => updateForm({ secondaryAdminPassword: e.target.value })}
                        placeholder="Min 6 characters"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                )}
              </div>

              {!addSecondaryAdmin && (
                <button
                  type="button"
                  onClick={() => setAddSecondaryAdmin(true)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-300 bg-violet-50/60 px-4 py-3 text-sm font-semibold text-violet-700 transition-colors hover:border-violet-400 hover:bg-violet-100/60 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200 dark:hover:bg-violet-500/15"
                >
                  <UserGroupIcon className="h-4 w-4" />
                  <FormattedMessage id="onboarding.addSecondaryAdmin" defaultMessage="Add a secondary admin (optional)" />
                </button>
              )}

              {/* Summary */}
              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <h3 className="mb-2 font-bold text-slate-700 dark:text-slate-200"><FormattedMessage id="onboarding.summary" defaultMessage="Summary" /></h3>
                <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                  <p><span className="font-medium"><FormattedMessage id="onboarding.plan" defaultMessage="Plan" />:</span> {selectedPlan?.name}</p>
                  <p><span className="font-medium"><FormattedMessage id="onboarding.organization" defaultMessage="Organization" />:</span> {form.orgName}</p>
                  <p><span className="font-medium"><FormattedMessage id="onboarding.url" defaultMessage="URL" />:</span> /{form.orgSlug}</p>
                  <p>
                    <span className="font-medium"><FormattedMessage id="onboarding.adminCount" defaultMessage="Admin accounts" />:</span>{' '}
                    {addSecondaryAdmin ? 2 : 1}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
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
          </div>
        </div>

        <div className="mt-4 text-center">
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
