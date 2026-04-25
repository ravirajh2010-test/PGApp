import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { ArrowPathIcon, EnvelopeIcon, NoSymbolIcon, TrashIcon } from '@heroicons/react/24/outline';
import api, { getUser } from '../services/api';
import { useCurrency } from '../context/LanguageContext';
import { Button, Card, Badge, Spinner } from '../components/ui';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const user = getUser();
  const { currencySymbol } = useCurrency();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inactiveUsers, setInactiveUsers] = useState([]);
  const [inactiveDays, setInactiveDays] = useState(30);
  const [loadingInactive, setLoadingInactive] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [subscriberFilter, setSubscriberFilter] = useState('all');
  const [emailForm, setEmailForm] = useState({ category: 'paid', subject: '', message: '' });
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const intl = useIntl();

  useEffect(() => {
    if (!user || user.role !== 'super_admin') {
      navigate('/login');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, orgsRes, subsRes] = await Promise.all([
        api.get('/super-admin/stats'),
        api.get('/super-admin/organizations'),
        api.get('/super-admin/subscriptions'),
      ]);
      setStats(statsRes.data);
      setOrganizations(orgsRes.data);
      setSubscriptions(subsRes.data?.subscribers || []);
    } catch (error) {
      console.error('Error fetching super admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendOrg = async (orgId) => {
    if (!window.confirm('Are you sure you want to suspend this organization?')) return;
    try {
      await api.post(`/super-admin/organizations/${orgId}/suspend`);
      fetchData();
    } catch (error) {
      alert('Error suspending organization');
    }
  };

  const handleActivateOrg = async (orgId) => {
    try {
      await api.post(`/super-admin/organizations/${orgId}/activate`);
      fetchData();
    } catch (error) {
      alert('Error activating organization');
    }
  };

  const handleDeleteOrg = async (orgId, orgName) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE "${orgName}"?\n\nThis will remove all data including users, tenants, buildings, rooms, beds, and payments.\n\nThis action CANNOT be undone.`)) return;
    if (!window.confirm(`FINAL WARNING: Type OK to confirm deletion of "${orgName}". All organization data will be lost forever.`)) return;
    try {
      await api.delete(`/super-admin/organizations/${orgId}`);
      fetchData();
    } catch (error) {
      alert('Error deleting organization: ' + (error.response?.data?.message || error.message));
    }
  };

  const fetchInactiveUsers = async (days) => {
    setLoadingInactive(true);
    try {
      const res = await api.get('/super-admin/inactive-users', { params: { days } });
      setInactiveUsers(res.data);
    } catch (error) {
      console.error('Error fetching inactive users:', error);
    } finally {
      setLoadingInactive(false);
    }
  };

  const handleDisableUser = async (orgId, userId, userName) => {
    if (!window.confirm(`Disable user "${userName}"? They won't be able to log in.`)) return;
    setActionLoading(prev => ({ ...prev, [`disable-${orgId}-${userId}`]: true }));
    try {
      await api.post(`/super-admin/inactive-users/${orgId}/${userId}/disable`);
      setInactiveUsers(prev => prev.filter(u => !(u.org_id === orgId && u.id === userId)));
    } catch (error) {
      alert('Error disabling user');
    } finally {
      setActionLoading(prev => ({ ...prev, [`disable-${orgId}-${userId}`]: false }));
    }
  };

  const handleDeleteUser = async (orgId, userId, userName) => {
    if (!window.confirm(`Permanently delete user "${userName}"? This cannot be undone.`)) return;
    setActionLoading(prev => ({ ...prev, [`delete-${orgId}-${userId}`]: true }));
    try {
      await api.delete(`/super-admin/inactive-users/${orgId}/${userId}`);
      setInactiveUsers(prev => prev.filter(u => !(u.org_id === orgId && u.id === userId)));
    } catch (error) {
      alert('Error deleting user');
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete-${orgId}-${userId}`]: false }));
    }
  };

  const handleSendReminder = async (orgId, userId) => {
    setActionLoading(prev => ({ ...prev, [`remind-${orgId}-${userId}`]: true }));
    try {
      await api.post(`/super-admin/inactive-users/${orgId}/${userId}/remind`);
      alert('Reminder sent successfully!');
    } catch (error) {
      alert('Error sending reminder');
    } finally {
      setActionLoading(prev => ({ ...prev, [`remind-${orgId}-${userId}`]: false }));
    }
  };

  const handleSendSubscriberEmail = async () => {
    if (!emailForm.subject || !emailForm.message) {
      alert('Please enter both subject and message.');
      return;
    }
    setSendingCampaign(true);
    try {
      const res = await api.post('/super-admin/subscriber-emails/send', emailForm);
      alert(res.data.message);
      setEmailForm((prev) => ({ ...prev, subject: '', message: '' }));
    } catch (error) {
      alert(error.response?.data?.message || 'Error sending subscriber email');
    } finally {
      setSendingCampaign(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter((subscription) => (
    subscriberFilter === 'all' || subscription.subscriber_category === subscriberFilter
  ));

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Spinner size="xl" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold text-slate-800 dark:text-slate-100 sm:text-3xl"><FormattedMessage id="superAdmin.title" defaultMessage="Platform Administration" /></h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base"><FormattedMessage id="superAdmin.platformOverview" defaultMessage="Manage all organizations and platform settings" /></p>
      </div>

      {/* Platform Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card accent="brand">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase"><FormattedMessage id="superAdmin.organizations" defaultMessage="Organizations" /></h3>
            <p className="text-3xl font-bold text-brand-500 mt-1">{stats.total_organizations || 0}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stats.active_organizations || 0} active</p>
          </Card>
          <Card accent="blue">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase"><FormattedMessage id="superAdmin.totalUsers" defaultMessage="Total Users" /></h3>
            <p className="text-3xl font-bold text-blue-500 mt-1">{stats.total_users || 0}</p>
          </Card>
          <Card accent="green">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase"><FormattedMessage id="superAdmin.totalBeds" defaultMessage="Total Beds" /></h3>
            <p className="text-3xl font-bold text-green-500 mt-1">{stats.total_beds || 0}</p>
          </Card>
          <Card accent="purple">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase"><FormattedMessage id="superAdmin.monthlyRevenue" defaultMessage="Monthly Revenue" /></h3>
            <p className="text-3xl font-bold text-purple-500 mt-1">{currencySymbol}{stats.monthly_revenue || 0}</p>
          </Card>
        </div>
      )}

      {/* Plan Distribution */}
      {stats?.plan_distribution && (
        <Card>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4"><FormattedMessage id="superAdmin.planDistribution" defaultMessage="Plan Distribution" /></h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.plan_distribution.map((p) => (
              <div key={p.plan} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 capitalize">{p.plan}</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{p.count}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2 dark:border-slate-700">
        {['overview', 'organizations', 'subscribers', 'inactive-users'].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              if (tab === 'inactive-users' && inactiveUsers.length === 0) {
                fetchInactiveUsers(inactiveDays);
              }
            }}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold capitalize transition-colors ${
              activeTab === tab
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab === 'inactive-users'
              ? intl.formatMessage({ id: 'superAdmin.inactiveUsers', defaultMessage: 'Inactive Users' })
              : tab === 'subscribers'
                ? 'Subscribers'
              : tab}
          </button>
        ))}
      </div>

      {/* Organizations Table */}
      {activeTab === 'organizations' && (
        <Card padding={false}>
          <div className="px-6 py-4 bg-brand-50 dark:bg-brand-900/20 border-b-2 border-brand-500">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100"><FormattedMessage id="superAdmin.organizations" defaultMessage="All Organizations" /></h2>
          </div>
          <div className="overflow-x-auto">
            {organizations.length > 0 ? (
              <table className="w-full">
                <thead className="bg-slate-100 dark:bg-slate-700/50 border-b dark:border-slate-600">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="dashboard.name" defaultMessage="Name" /></th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="superAdmin.slug" defaultMessage="Slug" /></th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="superAdmin.plan" defaultMessage="Plan" /></th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="superAdmin.status" defaultMessage="Status" /></th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="property.buildings" defaultMessage="Buildings" /></th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="property.beds" defaultMessage="Beds" /></th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="onboarding.users" defaultMessage="Users" /></th>
                    <th className="px-6 py-3 text-center font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="superAdmin.actions" defaultMessage="Actions" /></th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <tr key={org.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">{org.name}</td>
                      <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{org.slug}</td>
                      <td className="px-6 py-3"><Badge variant="info">{org.plan}</Badge></td>
                      <td className="px-6 py-3">
                        <Badge variant={org.status === 'active' ? 'success' : org.status === 'suspended' ? 'danger' : 'warning'} dot>
                          {org.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{org.building_count || 0}</td>
                      <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{org.bed_count || 0}</td>
                      <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{org.user_count || 0}</td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          {org.status === 'active' ? (
                            <Button variant="danger" size="xs" onClick={() => handleSuspendOrg(org.id)}>
                              <FormattedMessage id="superAdmin.suspend" defaultMessage="Suspend" />
                            </Button>
                          ) : (
                            <Button variant="success" size="xs" onClick={() => handleActivateOrg(org.id)}>
                              <FormattedMessage id="superAdmin.activate" defaultMessage="Activate" />
                            </Button>
                          )}
                          <Button variant="secondary" size="xs" onClick={() => handleDeleteOrg(org.id, org.name)}>
                            <FormattedMessage id="superAdmin.delete" defaultMessage="Delete" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="p-6 text-center text-slate-500 dark:text-slate-400"><FormattedMessage id="superAdmin.noOrganizations" defaultMessage="No organizations found" /></p>
            )}
          </div>
        </Card>
      )}

      {/* Overview - recent activity placeholder */}
      {activeTab === 'overview' && (
        <Card>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
            <FormattedMessage id="superAdmin.recentOrganizations" defaultMessage="Recent Organizations" />
          </h2>
          {organizations.slice(0, 5).map((org) => (
            <div key={org.id} className="flex items-center justify-between py-3 border-b dark:border-slate-700 last:border-0">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">{org.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{org.email} | Plan: {org.plan}</p>
              </div>
              <Badge variant={org.status === 'active' ? 'success' : 'danger'} dot>{org.status}</Badge>
            </div>
          ))}
        </Card>
      )}

      {activeTab === 'subscribers' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card accent="green">
              <h3 className="text-sm font-semibold uppercase text-slate-500 dark:text-slate-400">
                <FormattedMessage id="superAdmin.paidSubscribers" defaultMessage="Paid Subscribers" />
              </h3>
              <p className="mt-1 text-3xl font-bold text-green-500">{subscriptions.filter((item) => item.subscriber_category === 'paid').length}</p>
            </Card>
            <Card accent="amber">
              <h3 className="text-sm font-semibold uppercase text-slate-500 dark:text-slate-400">
                <FormattedMessage id="superAdmin.nonPaidSubscribers" defaultMessage="Non-paid Subscribers" />
              </h3>
              <p className="mt-1 text-3xl font-bold text-amber-500">{subscriptions.filter((item) => item.subscriber_category === 'non_paid').length}</p>
            </Card>
            <Card accent="brand">
              <h3 className="text-sm font-semibold uppercase text-slate-500 dark:text-slate-400">
                <FormattedMessage id="superAdmin.totalSubscribers" defaultMessage="Total Subscribers" />
              </h3>
              <p className="mt-1 text-3xl font-bold text-brand-500">{subscriptions.length}</p>
            </Card>
          </div>

          <Card>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="lg:w-48">
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <FormattedMessage id="superAdmin.sendTo" defaultMessage="Send To" />
                </label>
                <select
                  value={emailForm.category}
                  onChange={(e) => setEmailForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="paid">{intl.formatMessage({ id: 'superAdmin.paidOption', defaultMessage: 'Paid subscribers' })}</option>
                  <option value="non_paid">{intl.formatMessage({ id: 'superAdmin.nonPaidOption', defaultMessage: 'Non-paid subscribers' })}</option>
                  <option value="all">{intl.formatMessage({ id: 'superAdmin.allOption', defaultMessage: 'All subscribers' })}</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <FormattedMessage id="superAdmin.campaignSubject" defaultMessage="Subject" />
                </label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm((prev) => ({ ...prev, subject: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  placeholder={intl.formatMessage({ id: 'superAdmin.campaignSubjectPlaceholder', defaultMessage: 'Campaign subject' })}
                />
              </div>
            </div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              <FormattedMessage id="superAdmin.campaignMessage" defaultMessage="Message" />
            </label>
            <textarea
              value={emailForm.message}
              onChange={(e) => setEmailForm((prev) => ({ ...prev, message: e.target.value }))}
              className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              placeholder={intl.formatMessage({ id: 'superAdmin.campaignMessagePlaceholder', defaultMessage: 'Write the message for your subscriber campaign...' })}
            />
            <div className="mt-4 flex justify-end">
              <Button variant="primary" loading={sendingCampaign} onClick={handleSendSubscriberEmail}>
                <FormattedMessage id="superAdmin.sendCampaign" defaultMessage="Send Campaign" />
              </Button>
            </div>
          </Card>

          <Card padding={false}>
            <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-700 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                <FormattedMessage id="superAdmin.subscriberCategories" defaultMessage="Subscriber Categories" />
              </h2>
              <div className="flex gap-2">
                {[
                  ['all', intl.formatMessage({ id: 'superAdmin.filterAll', defaultMessage: 'All' })],
                  ['paid', intl.formatMessage({ id: 'superAdmin.filterPaid', defaultMessage: 'Paid' })],
                  ['non_paid', intl.formatMessage({ id: 'superAdmin.filterNonPaid', defaultMessage: 'Non-paid' })],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setSubscriberFilter(value)}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                      subscriberFilter === value
                        ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300'
                        : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              {filteredSubscriptions.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-slate-100 dark:bg-slate-700/50 border-b dark:border-slate-600">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        <FormattedMessage id="superAdmin.organization" defaultMessage="Organization" />
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        <FormattedMessage id="superAdmin.subscriberEmail" defaultMessage="Email" />
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        <FormattedMessage id="superAdmin.plan" defaultMessage="Plan" />
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        <FormattedMessage id="superAdmin.amount" defaultMessage="Amount" />
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        <FormattedMessage id="superAdmin.status" defaultMessage="Status" />
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        <FormattedMessage id="superAdmin.category" defaultMessage="Category" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubscriptions.map((subscription) => (
                      <tr key={subscription.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">{subscription.org_name}</td>
                        <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{subscription.org_email}</td>
                        <td className="px-6 py-3"><Badge variant="info">{subscription.plan}</Badge></td>
                        <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{currencySymbol}{subscription.amount || 0}</td>
                        <td className="px-6 py-3">
                          <Badge variant={subscription.status === 'active' ? 'success' : 'warning'}>{subscription.status}</Badge>
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant={subscription.subscriber_category === 'paid' ? 'success' : 'warning'}>
                            {subscription.subscriber_category === 'paid'
                              ? <FormattedMessage id="superAdmin.filterPaid" defaultMessage="Paid" />
                              : <FormattedMessage id="superAdmin.filterNonPaid" defaultMessage="Non-paid" />}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="p-6 text-center text-slate-500 dark:text-slate-400">
                  <FormattedMessage id="superAdmin.noSubscribers" defaultMessage="No subscribers found for this category." />
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Inactive Users Tab */}
      {activeTab === 'inactive-users' && (
        <Card padding={false}>
          <div className="px-6 py-4 bg-amber-50 dark:bg-amber-900/20 border-b-2 border-amber-500 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              <FormattedMessage id="superAdmin.inactiveUsers" defaultMessage="Inactive Users" />
            </h2>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                <FormattedMessage id="superAdmin.inactiveDays" defaultMessage="Inactive for" />:
              </label>
              <select
                value={inactiveDays}
                onChange={(e) => {
                  const d = parseInt(e.target.value);
                  setInactiveDays(d);
                  fetchInactiveUsers(d);
                }}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 text-sm"
              >
                <option value={30}>30+ {intl.formatMessage({ id: 'superAdmin.days', defaultMessage: 'days' })}</option>
                <option value={60}>60+ {intl.formatMessage({ id: 'superAdmin.days', defaultMessage: 'days' })}</option>
                <option value={90}>90+ {intl.formatMessage({ id: 'superAdmin.days', defaultMessage: 'days' })}</option>
                <option value={180}>180+ {intl.formatMessage({ id: 'superAdmin.days', defaultMessage: 'days' })}</option>
              </select>
              <Button variant="outline" size="sm" iconLeft={<ArrowPathIcon className="w-4 h-4" />} onClick={() => fetchInactiveUsers(inactiveDays)}>
                <FormattedMessage id="dashboard.refresh" defaultMessage="Refresh" />
              </Button>
            </div>
          </div>
          {loadingInactive ? (
            <div className="flex justify-center items-center h-32">
              <Spinner size="lg" />
            </div>
          ) : inactiveUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 dark:bg-slate-700/50 border-b dark:border-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="dashboard.name" defaultMessage="Name" /></th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="dashboard.email" defaultMessage="Email" /></th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="superAdmin.organization" defaultMessage="Organization" /></th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="dashboard.status" defaultMessage="Role" /></th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="superAdmin.daysInactive" defaultMessage="Days Inactive" /></th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="superAdmin.lastActive" defaultMessage="Last Active" /></th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="superAdmin.actions" defaultMessage="Actions" /></th>
                  </tr>
                </thead>
                <tbody>
                  {inactiveUsers.map((user, idx) => (
                    <tr key={`${user.org_id}-${user.id}`} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{user.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{user.email}</td>
                      <td className="px-4 py-3"><Badge variant="info" size="sm">{user.org_name}</Badge></td>
                      <td className="px-4 py-3">
                        <Badge variant={user.role === 'admin' ? 'brand' : 'neutral'} size="sm">{user.role}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={user.days_inactive > 90 ? 'danger' : user.days_inactive > 60 ? 'warning' : 'warning'}
                          size="sm"
                        >
                          {user.days_inactive}d
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {user.last_active
                          ? new Date(user.last_active).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : intl.formatMessage({ id: 'superAdmin.neverLoggedIn', defaultMessage: 'Never logged in' })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button
                            variant="outline"
                            size="xs"
                            loading={actionLoading[`remind-${user.org_id}-${user.id}`]}
                            onClick={() => handleSendReminder(user.org_id, user.id)}
                            iconLeft={<EnvelopeIcon className="w-3.5 h-3.5" />}
                            title={intl.formatMessage({ id: 'superAdmin.sendReminder', defaultMessage: 'Send Reminder' })}
                          />
                          <Button
                            variant="warning"
                            size="xs"
                            loading={actionLoading[`disable-${user.org_id}-${user.id}`]}
                            onClick={() => handleDisableUser(user.org_id, user.id, user.name)}
                            iconLeft={<NoSymbolIcon className="w-3.5 h-3.5" />}
                            title={intl.formatMessage({ id: 'superAdmin.disableUser', defaultMessage: 'Disable User' })}
                          />
                          <Button
                            variant="danger"
                            size="xs"
                            loading={actionLoading[`delete-${user.org_id}-${user.id}`]}
                            onClick={() => handleDeleteUser(user.org_id, user.id, user.name)}
                            iconLeft={<TrashIcon className="w-3.5 h-3.5" />}
                            title={intl.formatMessage({ id: 'superAdmin.deleteUser', defaultMessage: 'Delete User' })}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-6 text-center text-slate-500 dark:text-slate-400">
              <FormattedMessage id="superAdmin.noInactiveUsers" defaultMessage="No inactive users found" />
            </p>
          )}
        </Card>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
