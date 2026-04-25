import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import api, { getUser, getOrganization } from '../services/api';
import Toast from '../components/Toast';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { useCurrency } from '../context/LanguageContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';

const OrgSettings = () => {
  const navigate = useNavigate();
  const user = getUser();
  const { currencySymbol } = useCurrency();
  const [org, setOrg] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState(null);
  const [deactivating, setDeactivating] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' });
  const [removingAdmin, setRemovingAdmin] = useState(null);

  const adminCount = users.filter((u) => u.role === 'admin').length;

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
      const [orgRes, subRes, usersRes, auditRes] = await Promise.all([
        api.get('/organization/me'),
        api.get('/organization/subscription'),
        api.get('/organization/users'),
        api.get('/organization/audit-logs'),
      ]);
      setOrg(orgRes.data);
      setSubscription(subRes.data);
      setUsers(usersRes.data);
      setAuditLogs(auditRes.data || []);
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

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setAdminError('');
    if (!adminForm.name || !adminForm.email || !adminForm.password) {
      setAdminError('Name, email, and password are required.');
      return;
    }
    if (adminForm.password.length < 6) {
      setAdminError('Password must be at least 6 characters long.');
      return;
    }
    setAddingAdmin(true);
    try {
      await api.post('/organization/admins', adminForm);
      setToast({ message: `Admin ${adminForm.name} added successfully.`, type: 'success', key: Date.now() });
      setAdminForm({ name: '', email: '', password: '' });
      setShowAddAdmin(false);
      fetchOrgData();
    } catch (error) {
      setAdminError(error.response?.data?.message || 'Failed to add admin.');
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (targetUser) => {
    if (!window.confirm(`Remove "${targetUser.name}" as an admin? They will lose access immediately.`)) return;
    setRemovingAdmin(targetUser.id);
    try {
      await api.delete(`/organization/admins/${targetUser.id}`);
      setToast({ message: `${targetUser.name} removed as admin.`, type: 'success', key: Date.now() });
      fetchOrgData();
    } catch (error) {
      setToast({ message: error.response?.data?.message || 'Failed to remove admin.', type: 'error', key: Date.now() });
    } finally {
      setRemovingAdmin(null);
    }
  };

  const handleDeactivateUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to deactivate "${userName}"? This will remove their bed allocation and send a farewell email.`)) return;
    setDeactivating(userId);
    try {
      await api.post(`/admin/deactivate-user/${userId}`);
      setToast({ message: `${userName} has been deactivated successfully. A farewell email has been sent.`, type: 'success', key: Date.now() });
      fetchOrgData();
    } catch (error) {
      setToast({ message: error.response?.data?.message || 'Error deactivating user', type: 'error', key: Date.now() });
    } finally {
      setDeactivating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size="xl" className="text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold text-slate-800 dark:text-slate-100"><FormattedMessage id="orgSettings.title" defaultMessage="Organization Settings" /></h1>
        <p className="text-slate-600 dark:text-slate-400"><FormattedMessage id="orgSettings.subtitle" defaultMessage="Manage your organization details and subscription" /></p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {[
          { id: 'general', labelId: 'orgSettings.general', fallback: 'General' },
          { id: 'subscription', labelId: 'orgSettings.subscription', fallback: 'Subscription' },
          { id: 'users', labelId: 'orgSettings.usersTab', fallback: 'Users' },
          { id: 'audit', labelId: 'orgSettings.auditTab', fallback: 'Audit' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FormattedMessage id={tab.labelId} defaultMessage={tab.fallback} />
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && org && (
        <Card>
          <h2 className="mb-5 text-xl font-bold text-slate-800 dark:text-slate-100"><FormattedMessage id="orgSettings.general" defaultMessage="Organization Details" /></h2>
          
          {message && (
            <div className={`p-3 rounded-xl mb-4 ${
              message.includes('Error') ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700'
              : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={<FormattedMessage id="orgSettings.orgName" defaultMessage="Organization Name" />}
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
              <Input
                label={<FormattedMessage id="orgSettings.slug" defaultMessage="Slug (URL)" />}
                type="text"
                value={org.slug}
                disabled
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Organization ID"
                type="text"
                value={org.organization_code || ''}
                disabled
                helper="Share this ID with admins and tenants for login."
              />
              <Input
                label="Organization Status"
                type="text"
                value={org.status || 'active'}
                disabled
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={<FormattedMessage id="orgSettings.email" defaultMessage="Email" />}
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
              <Input
                label={<FormattedMessage id="orgSettings.phone" defaultMessage="Phone" />}
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <Input
              label={<FormattedMessage id="orgSettings.address" defaultMessage="Address" />}
              as="textarea"
              rows={2}
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
            />
            <Button type="submit" variant="primary" loading={saving}>
              <FormattedMessage id="orgSettings.saveChanges" defaultMessage="Save Changes" />
            </Button>
          </form>

          {org.stats && (
            <div className="mt-6 border-t pt-5 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                <FormattedMessage id="orgSettings.usageStats" defaultMessage="Usage Statistics" />
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  [<FormattedMessage id="orgSettings.statBuildings" defaultMessage="Buildings" />, org.stats.buildings],
                  [<FormattedMessage id="orgSettings.statBeds" defaultMessage="Beds" />, org.stats.totalBeds],
                  [<FormattedMessage id="orgSettings.statUsers" defaultMessage="Users" />, org.stats.users],
                  [<FormattedMessage id="orgSettings.statTenants" defaultMessage="Tenants" />, org.stats.tenants],
                ].map(([label, val], idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-center border dark:border-slate-700">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{val || 0}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Subscription */}
      {activeTab === 'subscription' && (
        <Card>
          <h2 className="mb-5 text-xl font-bold text-slate-800 dark:text-slate-100"><FormattedMessage id="orgSettings.subscription" defaultMessage="Subscription & Billing" /></h2>
          
          {subscription && (
            <div className="space-y-5">
              <div className="rounded-xl border-2 border-brand-200 bg-brand-50 p-5 dark:border-brand-700 dark:bg-brand-900/20">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 capitalize">{subscription.current?.plan || org?.plan} Plan</h3>
                    <p className="text-slate-500 dark:text-slate-400">
                      {subscription.current?.status === 'active' ? 'Active' : subscription.current?.status || 'Active'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-brand-500">{currencySymbol}{subscription.current?.amount || 0}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">/{subscription.current?.billing_cycle || 'month'}</p>
                  </div>
                </div>
              </div>

              {/* Plan Limits */}
              {org?.plan_limits && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3"><FormattedMessage id="orgSettings.planLimits" defaultMessage="Plan Limits" /></h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border dark:border-slate-700">
                      <p className="text-sm text-slate-500 dark:text-slate-400"><FormattedMessage id="orgSettings.maxProperties" defaultMessage="Max Properties" /></p>
                      <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{org.plan_limits.max_properties === -1 ? 'Unlimited' : org.plan_limits.max_properties}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border dark:border-slate-700">
                      <p className="text-sm text-slate-500 dark:text-slate-400"><FormattedMessage id="orgSettings.maxBeds" defaultMessage="Max Beds" /></p>
                      <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{org.plan_limits.max_beds === -1 ? 'Unlimited' : org.plan_limits.max_beds}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border dark:border-slate-700">
                      <p className="text-sm text-slate-500 dark:text-slate-400"><FormattedMessage id="orgSettings.maxUsers" defaultMessage="Max Users" /></p>
                      <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{org.plan_limits.max_users === -1 ? 'Unlimited' : org.plan_limits.max_users}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Available Plans */}
              {subscription.available_plans && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3"><FormattedMessage id="orgSettings.availablePlans" defaultMessage="Available Plans" /></h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {subscription.available_plans.map((plan) => (
                      <div key={plan.plan} className={`border rounded-xl p-4 ${
                        plan.plan === (org?.plan || subscription.current?.plan)
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-600'
                          : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-dark-700'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 capitalize">{plan.plan}</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {plan.max_properties === -1 ? 'Unlimited' : plan.max_properties} properties,{' '}
                              {plan.max_beds === -1 ? 'Unlimited' : plan.max_beds} beds
                            </p>
                          </div>
                          <p className="font-bold text-brand-500">{currencySymbol}{plan.price_monthly}/mo</p>
                        </div>
                        {plan.plan === (org?.plan || subscription.current?.plan) && (
                          <Badge variant="brand" size="sm" className="mt-2">
                            <FormattedMessage id="orgSettings.currentPlan" defaultMessage="Current Plan" />
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
      {resetPasswordUser && (
        <ChangePasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          onSuccess={() => {
            setResetPasswordUser(null);
            setToast({ message: 'Password changed successfully!', type: 'success', key: Date.now() });
          }}
        />
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <div className="space-y-5">
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  <FormattedMessage id="orgSettings.adminTeam" defaultMessage="Admin team" />
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  <FormattedMessage
                    id="orgSettings.adminTeamHelp"
                    defaultMessage="Each organization can have up to two admins. The secondary admin is optional and can be added or removed anytime."
                  />
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <FormattedMessage id="orgSettings.adminCountLabel" defaultMessage="Active admins" />: {adminCount}/2
                </p>
              </div>
              {adminCount < 2 && !showAddAdmin && (
                <Button variant="primary" size="sm" onClick={() => { setAdminError(''); setShowAddAdmin(true); }}>
                  <FormattedMessage id="orgSettings.addSecondaryAdmin" defaultMessage="Add secondary admin" />
                </Button>
              )}
            </div>

            {showAddAdmin && (
              <form onSubmit={handleAddAdmin} className="mt-4 space-y-3 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-500/30 dark:bg-violet-500/10">
                {adminError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
                    {adminError}
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-3">
                  <Input
                    label={<FormattedMessage id="orgSettings.adminName" defaultMessage="Name" />}
                    value={adminForm.name}
                    onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                    placeholder="Jane Smith"
                    required
                  />
                  <Input
                    label={<FormattedMessage id="orgSettings.adminEmail" defaultMessage="Email" />}
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    placeholder="ops@example.com"
                    required
                  />
                  <Input
                    label={<FormattedMessage id="orgSettings.adminPassword" defaultMessage="Temporary password" />}
                    type="text"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => { setShowAddAdmin(false); setAdminError(''); setAdminForm({ name: '', email: '', password: '' }); }}
                  >
                    <FormattedMessage id="common.cancel" defaultMessage="Cancel" />
                  </Button>
                  <Button type="submit" variant="primary" size="sm" loading={addingAdmin}>
                    <FormattedMessage id="orgSettings.createAdmin" defaultMessage="Create admin" />
                  </Button>
                </div>
              </form>
            )}
          </Card>

          <Card padding={false}>
            <div className="px-6 py-4 bg-brand-50 dark:bg-brand-900/20 border-b-2 border-brand-500 rounded-t-xl">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100"><FormattedMessage id="orgSettings.usersTab" defaultMessage="Organization Users" /></h2>
            </div>
            <div className="overflow-x-auto">
              {users.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="orgSettings.userName" defaultMessage="Name" /></th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="orgSettings.userEmail" defaultMessage="Email" /></th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="orgSettings.userRole" defaultMessage="Role" /></th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="orgSettings.created" defaultMessage="Created" /></th>
                      <th className="px-6 py-3 text-center font-semibold text-slate-700 dark:text-slate-300"><FormattedMessage id="orgSettings.actions" defaultMessage="Actions" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-100">{u.name}</td>
                        <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{u.email}</td>
                        <td className="px-6 py-3">
                          <Badge variant={u.role === 'admin' ? 'purple' : 'info'}>{u.role}</Badge>
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <div className="flex flex-wrap gap-2 justify-center">
                            {u.role === 'admin' && u.id === user.id && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setResetPasswordUser({ id: u.id, email: u.email, name: u.name, is_first_login: false })}
                              >
                                <FormattedMessage id="orgSettings.resetPassword" defaultMessage="Reset Password" />
                              </Button>
                            )}
                            {u.role === 'admin' && u.id !== user.id && adminCount > 1 && (
                              <Button
                                size="sm"
                                variant="danger"
                                loading={removingAdmin === u.id}
                                onClick={() => handleRemoveAdmin(u)}
                              >
                                <FormattedMessage id="orgSettings.removeAdmin" defaultMessage="Remove admin" />
                              </Button>
                            )}
                            {u.role !== 'admin' && u.id !== user.id && (
                              <Button
                                size="sm"
                                variant="danger"
                                loading={deactivating === u.id}
                                onClick={() => handleDeactivateUser(u.id, u.name)}
                              >
                                {deactivating === u.id
                                  ? <FormattedMessage id="orgSettings.deactivating" defaultMessage="Deactivating..." />
                                  : <FormattedMessage id="orgSettings.deactivate" defaultMessage="Deactivate" />}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="p-6 text-center text-slate-500 dark:text-slate-400">
                  <FormattedMessage id="orgSettings.noUsers" defaultMessage="No users found" />
                </p>
              )}
            </div>
          </Card>
        </div>
      )}
      {activeTab === 'audit' && (
        <Card padding={false}>
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/70 border-b dark:border-slate-700 rounded-t-xl">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              <FormattedMessage id="orgSettings.auditTitle" defaultMessage="Audit Trail" />
            </h2>
          </div>
          <div className="overflow-x-auto">
            {auditLogs.length > 0 ? (
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      <FormattedMessage id="orgSettings.auditWhen" defaultMessage="When" />
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      <FormattedMessage id="orgSettings.auditUser" defaultMessage="User" />
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      <FormattedMessage id="orgSettings.auditAction" defaultMessage="Action" />
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      <FormattedMessage id="orgSettings.auditEntity" defaultMessage="Entity" />
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      <FormattedMessage id="orgSettings.auditDetails" defaultMessage="Details" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-100">{log.user_name || 'System'}</td>
                      <td className="px-6 py-3"><Badge variant="info">{log.action}</Badge></td>
                      <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{log.entity_type || '-'}</td>
                      <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{log.details ? JSON.stringify(log.details) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="p-6 text-center text-slate-500 dark:text-slate-400">
                <FormattedMessage id="orgSettings.auditEmpty" defaultMessage="No audit activity found yet." />
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default OrgSettings;
