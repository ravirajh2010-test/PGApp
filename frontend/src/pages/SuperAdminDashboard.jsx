import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import api, { getUser } from '../services/api';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const user = getUser();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading platform data...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2"><FormattedMessage id="superAdmin.title" defaultMessage="Platform Administration" /></h1>
        <p className="text-gray-600"><FormattedMessage id="superAdmin.platformOverview" defaultMessage="Manage all organizations and platform settings" /></p>
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
            <p className="text-3xl font-bold text-purple-500">₹{stats.monthly_revenue || 0}</p>
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
        {['overview', 'organizations'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-semibold capitalize transition ${
              activeTab === tab
                ? 'border-b-2 border-brand-500 text-brand-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
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
    </div>
  );
};

export default SuperAdminDashboard;
