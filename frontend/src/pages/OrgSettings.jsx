import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import api, { getUser, getOrganization } from '../services/api';

const OrgSettings = () => {
  const navigate = useNavigate();
  const user = getUser();
  const [org, setOrg] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchOrgData();
  }, []);

  const fetchOrgData = async () => {
    setLoading(true);
    try {
      const [orgRes, subRes, usersRes] = await Promise.all([
        api.get('/organization/me'),
        api.get('/organization/subscription'),
        api.get('/organization/users'),
      ]);
      setOrg(orgRes.data);
      setSubscription(subRes.data);
      setUsers(usersRes.data);
      setEditForm({
        name: orgRes.data.name || '',
        email: orgRes.data.email || '',
        phone: orgRes.data.phone || '',
        address: orgRes.data.address || '',
      });
    } catch (error) {
      console.error('Error fetching org data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.put('/organization/me', editForm);
      setMessage('Organization updated successfully!');
      // Update localStorage
      const storedOrg = getOrganization();
      if (storedOrg) {
        localStorage.setItem('organization', JSON.stringify({ ...storedOrg, name: editForm.name }));
      }
      fetchOrgData();
    } catch (error) {
      setMessage('Error updating organization.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading organization settings...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2"><FormattedMessage id="orgSettings.title" defaultMessage="Organization Settings" /></h1>
        <p className="text-gray-600"><FormattedMessage id="orgSettings.general" defaultMessage="Manage your organization details and subscription" /></p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {['general', 'subscription', 'users'].map((tab) => (
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

      {/* General Settings */}
      {activeTab === 'general' && org && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6"><FormattedMessage id="orgSettings.general" defaultMessage="Organization Details" /></h2>
          
          {message && (
            <div className={`p-3 rounded mb-4 ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1"><FormattedMessage id="orgSettings.orgName" defaultMessage="Organization Name" /></label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1"><FormattedMessage id="orgSettings.slug" defaultMessage="Slug (URL)" /></label>
                <input
                  type="text"
                  value={org.slug}
                  disabled
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1"><FormattedMessage id="orgSettings.email" defaultMessage="Email" /></label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1"><FormattedMessage id="orgSettings.phone" defaultMessage="Phone" /></label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1"><FormattedMessage id="orgSettings.address" defaultMessage="Address" /></label>
              <textarea
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold py-2 px-6 rounded-lg transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : <FormattedMessage id="orgSettings.saveChanges" defaultMessage="Save Changes" />}
            </button>
          </form>

          {/* Stats */}
          {org.stats && (
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Usage Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600">Buildings</p>
                  <p className="text-2xl font-bold text-gray-800">{org.stats.building_count || 0}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600">Beds</p>
                  <p className="text-2xl font-bold text-gray-800">{org.stats.bed_count || 0}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600">Users</p>
                  <p className="text-2xl font-bold text-gray-800">{org.stats.user_count || 0}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600">Tenants</p>
                  <p className="text-2xl font-bold text-gray-800">{org.stats.tenant_count || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subscription */}
      {activeTab === 'subscription' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6"><FormattedMessage id="orgSettings.subscription" defaultMessage="Subscription & Billing" /></h2>
          
          {subscription && (
            <div className="space-y-6">
              <div className="bg-brand-50 rounded-lg p-6 border-2 border-brand-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 capitalize">{subscription.current?.plan || org?.plan} Plan</h3>
                    <p className="text-gray-600">
                      {subscription.current?.status === 'active' ? 'Active' : subscription.current?.status || 'Active'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-brand-500">₹{subscription.current?.amount || 0}</p>
                    <p className="text-sm text-gray-500">/{subscription.current?.billing_cycle || 'month'}</p>
                  </div>
                </div>
              </div>

              {/* Plan Limits */}
              {org?.plan_limits && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3"><FormattedMessage id="orgSettings.planLimits" defaultMessage="Plan Limits" /></h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600"><FormattedMessage id="orgSettings.maxProperties" defaultMessage="Max Properties" /></p>
                      <p className="text-xl font-bold">{org.plan_limits.max_properties === -1 ? 'Unlimited' : org.plan_limits.max_properties}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600"><FormattedMessage id="orgSettings.maxBeds" defaultMessage="Max Beds" /></p>
                      <p className="text-xl font-bold">{org.plan_limits.max_beds === -1 ? 'Unlimited' : org.plan_limits.max_beds}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600"><FormattedMessage id="orgSettings.maxUsers" defaultMessage="Max Users" /></p>
                      <p className="text-xl font-bold">{org.plan_limits.max_users === -1 ? 'Unlimited' : org.plan_limits.max_users}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Available Plans */}
              {subscription.available_plans && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3"><FormattedMessage id="orgSettings.availablePlans" defaultMessage="Available Plans" /></h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {subscription.available_plans.map((plan) => (
                      <div key={plan.plan} className={`border rounded-lg p-4 ${
                        plan.plan === (org?.plan || subscription.current?.plan) ? 'border-brand-500 bg-brand-50' : 'border-gray-200'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-gray-800 capitalize">{plan.plan}</h4>
                            <p className="text-sm text-gray-500">
                              {plan.max_properties === -1 ? 'Unlimited' : plan.max_properties} properties,{' '}
                              {plan.max_beds === -1 ? 'Unlimited' : plan.max_beds} beds
                            </p>
                          </div>
                          <p className="font-bold text-brand-500">₹{plan.price_monthly}/mo</p>
                        </div>
                        {plan.plan === (org?.plan || subscription.current?.plan) && (
                          <span className="text-xs bg-brand-500 text-white px-2 py-1 rounded mt-2 inline-block">Current Plan</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-brand-50 border-b-2 border-brand-500">
            <h2 className="text-xl font-bold text-gray-800"><FormattedMessage id="orgSettings.usersTab" defaultMessage="Organization Users" /></h2>
          </div>
          <div className="overflow-x-auto">
            {users.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Role</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium">{u.name}</td>
                      <td className="px-6 py-3">{u.email}</td>
                      <td className="px-6 py-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="p-6 text-center text-gray-500">No users found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgSettings;
