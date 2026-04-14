import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import api, { getUser } from '../services/api';
import { useCurrency } from '../context/LanguageContext';

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
      const [statsRes, orgsRes] = await Promise.all([
        api.get('/super-admin/stats'),
        api.get('/super-admin/organizations'),
      ]);
      setStats(statsRes.data);
      setOrganizations(orgsRes.data);
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

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading platform data...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-2"><FormattedMessage id="superAdmin.title" defaultMessage="Platform Administration" /></h1>
        <p className="text-gray-600 text-sm sm:text-base"><FormattedMessage id="superAdmin.platformOverview" defaultMessage="Manage all organizations and platform settings" /></p>
      </div>

      {/* Platform Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-brand-500">
            <h3 className="text-sm font-semibold text-gray-600 uppercase"><FormattedMessage id="superAdmin.organizations" defaultMessage="Organizations" /></h3>
            <p className="text-3xl font-bold text-brand-500">{stats.total_organizations || 0}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.active_organizations || 0} active</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <h3 className="text-sm font-semibold text-gray-600 uppercase"><FormattedMessage id="superAdmin.totalUsers" defaultMessage="Total Users" /></h3>
            <p className="text-3xl font-bold text-blue-500">{stats.total_users || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <h3 className="text-sm font-semibold text-gray-600 uppercase"><FormattedMessage id="superAdmin.totalBeds" defaultMessage="Total Beds" /></h3>
            <p className="text-3xl font-bold text-green-500">{stats.total_beds || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <h3 className="text-sm font-semibold text-gray-600 uppercase"><FormattedMessage id="superAdmin.monthlyRevenue" defaultMessage="Monthly Revenue" /></h3>
            <p className="text-3xl font-bold text-purple-500">{currencySymbol}{stats.monthly_revenue || 0}</p>
          </div>
        </div>
      )}

      {/* Plan Distribution */}
      {stats?.plan_distribution && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4"><FormattedMessage id="superAdmin.planDistribution" defaultMessage="Plan Distribution" /></h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.plan_distribution.map((p) => (
              <div key={p.plan} className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-gray-600 capitalize">{p.plan}</p>
                <p className="text-2xl font-bold text-gray-800">{p.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {['overview', 'organizations', 'inactive-users'].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              if (tab === 'inactive-users' && inactiveUsers.length === 0) {
                fetchInactiveUsers(inactiveDays);
              }
            }}
            className={`px-6 py-3 font-semibold capitalize transition ${
              activeTab === tab
                ? 'border-b-2 border-brand-500 text-brand-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'inactive-users'
              ? intl.formatMessage({ id: 'superAdmin.inactiveUsers', defaultMessage: 'Inactive Users' })
              : tab}
          </button>
        ))}
      </div>

      {/* Organizations Table */}
      {activeTab === 'organizations' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-brand-50 border-b-2 border-brand-500">
            <h2 className="text-2xl font-bold text-gray-800"><FormattedMessage id="superAdmin.organizations" defaultMessage="All Organizations" /></h2>
          </div>
          <div className="overflow-x-auto">
            {organizations.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.name" defaultMessage="Name" /></th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="superAdmin.slug" defaultMessage="Slug" /></th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="superAdmin.plan" defaultMessage="Plan" /></th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="superAdmin.status" defaultMessage="Status" /></th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="property.buildings" defaultMessage="Buildings" /></th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="property.beds" defaultMessage="Beds" /></th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="onboarding.users" defaultMessage="Users" /></th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700"><FormattedMessage id="superAdmin.actions" defaultMessage="Actions" /></th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <tr key={org.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium">{org.name}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">{org.slug}</td>
                      <td className="px-6 py-3">
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium capitalize">
                          {org.plan}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          org.status === 'active' ? 'bg-green-100 text-green-700' :
                          org.status === 'suspended' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {org.status}
                        </span>
                      </td>
                      <td className="px-6 py-3">{org.building_count || 0}</td>
                      <td className="px-6 py-3">{org.bed_count || 0}</td>
                      <td className="px-6 py-3">{org.user_count || 0}</td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          {org.status === 'active' ? (
                            <button
                              onClick={() => handleSuspendOrg(org.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition"
                            >
                              <FormattedMessage id="superAdmin.suspend" defaultMessage="Suspend" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateOrg(org.id)}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition"
                            >
                              <FormattedMessage id="superAdmin.activate" defaultMessage="Activate" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteOrg(org.id, org.name)}
                            className="bg-gray-700 hover:bg-gray-900 text-white px-3 py-1 rounded text-sm transition"
                          >
                            <FormattedMessage id="superAdmin.delete" defaultMessage="Delete" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="p-6 text-center text-gray-500"><FormattedMessage id="superAdmin.noOrganizations" defaultMessage="No organizations found" /></p>
            )}
          </div>
        </div>
      )}

      {/* Overview - recent activity placeholder */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Organizations</h2>
          {organizations.slice(0, 5).map((org) => (
            <div key={org.id} className="flex items-center justify-between py-3 border-b last:border-0">
              <div>
                <p className="font-medium text-gray-800">{org.name}</p>
                <p className="text-sm text-gray-500">{org.email} | Plan: {org.plan}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                org.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {org.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Inactive Users Tab */}
      {activeTab === 'inactive-users' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-orange-50 border-b-2 border-orange-500 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">
              <FormattedMessage id="superAdmin.inactiveUsers" defaultMessage="Inactive Users" />
            </h2>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-600">
                <FormattedMessage id="superAdmin.inactiveDays" defaultMessage="Inactive for" />:
              </label>
              <select
                value={inactiveDays}
                onChange={(e) => {
                  const d = parseInt(e.target.value);
                  setInactiveDays(d);
                  fetchInactiveUsers(d);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white font-semibold text-gray-700 text-sm"
              >
                <option value={30}>30+ {intl.formatMessage({ id: 'superAdmin.days', defaultMessage: 'days' })}</option>
                <option value={60}>60+ {intl.formatMessage({ id: 'superAdmin.days', defaultMessage: 'days' })}</option>
                <option value={90}>90+ {intl.formatMessage({ id: 'superAdmin.days', defaultMessage: 'days' })}</option>
                <option value={180}>180+ {intl.formatMessage({ id: 'superAdmin.days', defaultMessage: 'days' })}</option>
              </select>
              <button
                onClick={() => fetchInactiveUsers(inactiveDays)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition"
              >
                🔄 <FormattedMessage id="dashboard.refresh" defaultMessage="Refresh" />
              </button>
            </div>
          </div>
          {loadingInactive ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
            </div>
          ) : inactiveUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.name" defaultMessage="Name" /></th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.email" defaultMessage="Email" /></th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="superAdmin.organization" defaultMessage="Organization" /></th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="dashboard.status" defaultMessage="Role" /></th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700"><FormattedMessage id="superAdmin.daysInactive" defaultMessage="Days Inactive" /></th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700"><FormattedMessage id="superAdmin.lastActive" defaultMessage="Last Active" /></th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700"><FormattedMessage id="superAdmin.actions" defaultMessage="Actions" /></th>
                  </tr>
                </thead>
                <tbody>
                  {inactiveUsers.map((user, idx) => (
                    <tr key={`${user.org_id}-${user.id}`} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium">{user.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                          {user.org_name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          user.days_inactive > 90 ? 'bg-red-100 text-red-700' :
                          user.days_inactive > 60 ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {user.days_inactive}d
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {user.last_active
                          ? new Date(user.last_active).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : intl.formatMessage({ id: 'superAdmin.neverLoggedIn', defaultMessage: 'Never logged in' })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => handleSendReminder(user.org_id, user.id)}
                            disabled={actionLoading[`remind-${user.org_id}-${user.id}`]}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold transition disabled:opacity-50"
                            title={intl.formatMessage({ id: 'superAdmin.sendReminder', defaultMessage: 'Send Reminder' })}
                          >
                            {actionLoading[`remind-${user.org_id}-${user.id}`] ? '⏳' : '📧'}
                          </button>
                          <button
                            onClick={() => handleDisableUser(user.org_id, user.id, user.name)}
                            disabled={actionLoading[`disable-${user.org_id}-${user.id}`]}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs font-semibold transition disabled:opacity-50"
                            title={intl.formatMessage({ id: 'superAdmin.disableUser', defaultMessage: 'Disable User' })}
                          >
                            {actionLoading[`disable-${user.org_id}-${user.id}`] ? '⏳' : '🚫'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.org_id, user.id, user.name)}
                            disabled={actionLoading[`delete-${user.org_id}-${user.id}`]}
                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold transition disabled:opacity-50"
                            title={intl.formatMessage({ id: 'superAdmin.deleteUser', defaultMessage: 'Delete User' })}
                          >
                            {actionLoading[`delete-${user.org_id}-${user.id}`] ? '⏳' : '🗑️'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-6 text-center text-gray-500">
              <FormattedMessage id="superAdmin.noInactiveUsers" defaultMessage="No inactive users found" />
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
