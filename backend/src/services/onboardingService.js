const User = require('../models/User');

const isAdminProvided = (admin) => Boolean(admin && (admin.name || admin.email || admin.password));

const normalizeOnboardingAdmins = (source) => {
  const admins = [
    {
      name: source.adminName || source.name || '',
      email: source.adminEmail || '',
      password: source.adminPassword || source.password || '',
    },
    {
      name: source.secondaryAdminName || '',
      email: source.secondaryAdminEmail || '',
      password: source.secondaryAdminPassword || '',
    },
  ].map((admin) => ({
    ...admin,
    name: (admin.name || '').trim(),
    email: (admin.email || '').trim().toLowerCase(),
    password: admin.password,
  }));

  return admins.filter((admin, idx) => idx === 0 || isAdminProvided(admin));
};

const validateOnboardingAdmins = async (admins) => {
  if (!admins.length) {
    return 'Primary admin is required to onboard an organization.';
  }

  const [primary, secondary] = admins;

  if (!primary.name || !primary.email || !primary.password) {
    return 'Primary admin name, email, and password are required.';
  }

  if (primary.password.length < 6) {
    return 'Primary admin password must be at least 6 characters long.';
  }

  if (secondary) {
    if (!secondary.name || !secondary.email || !secondary.password) {
      return 'Secondary admin must include name, email, and password.';
    }
    if (secondary.password.length < 6) {
      return 'Secondary admin password must be at least 6 characters long.';
    }
    if (secondary.email === primary.email) {
      return 'Primary and secondary admin emails must be different.';
    }
  }

  for (const admin of admins) {
    const [mappedOrgs, legacyUser, superAdmin] = await Promise.all([
      User.findOrgsByEmail(admin.email),
      User.findLegacyOrgUserByEmail(admin.email),
      User.findSuperAdminByEmail(admin.email),
    ]);

    if ((mappedOrgs && mappedOrgs.length > 0) || legacyUser || superAdmin) {
      return `The admin email ${admin.email} is already registered. Please use a different email.`;
    }
  }

  return null;
};

const createOrganizationAdmins = async (orgPool, orgId, admins) => {
  const createdAdmins = [];

  for (const admin of admins) {
    const user = await User.create(orgPool, admin.name, admin.email, admin.password, 'admin');
    await User.addOrgMapping(admin.email, orgId, user.id, 'admin');
    createdAdmins.push(user);
  }

  return createdAdmins;
};

module.exports = {
  normalizeOnboardingAdmins,
  validateOnboardingAdmins,
  createOrganizationAdmins,
};
