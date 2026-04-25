const formatOrganizationCode = (id) => `ORG-${String(id).padStart(6, '0')}`;

module.exports = {
  formatOrganizationCode,
};
