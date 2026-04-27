// Lightweight WhatsApp message builder.
//
// We don't actually send WhatsApp messages from the server (no paid API in
// this stack); instead we generate a `https://wa.me/<phone>?text=...` URL
// that the admin opens in a new tab. The admin's WhatsApp Web/App takes
// over from there.
//
// Each builder returns { whatsappUrl, message } so the API can choose to
// expose either one to the frontend.

const APP_URL = 'https://www.roomipilot.com';

const normalizePhone = (rawPhone) => {
  if (!rawPhone) return null;
  let phone = String(rawPhone).replace(/[^0-9]/g, '');
  if (!phone) return null;
  // Default to India country code if it looks like a 10-digit local number.
  if (phone.length === 10) phone = '91' + phone;
  return phone;
};

const buildUrl = (phone, message) => {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
};

const buildWelcomeMessage = ({ tenantName, tenantEmail, password, bedInfo, orgName }) => {
  const org = orgName || 'RoomiPilot';
  return [
    `Hi ${tenantName}, welcome to ${org}! 🏠`,
    '',
    'Your portal login details:',
    `• Email: ${tenantEmail}`,
    `• Temporary password: ${password}`,
    bedInfo ? `• Bed: ${bedInfo}` : null,
    '',
    `Login here: ${APP_URL}`,
    'Please change your password on first login.',
  ]
    .filter(Boolean)
    .join('\n');
};

const buildRentReceiptMessage = ({ tenantName, rent, bedInfo, monthName, paymentDate, orgName }) => {
  const org = orgName || 'RoomiPilot';
  const formattedDate = paymentDate
    ? new Date(paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  return [
    `Hi ${tenantName}, your rent payment for ${monthName} has been recorded ✅`,
    '',
    `• Amount: ₹${rent}`,
    bedInfo ? `• Accommodation: ${bedInfo}` : null,
    `• Date: ${formattedDate}`,
    '',
    `Thank you for the timely payment! — ${org}`,
  ]
    .filter(Boolean)
    .join('\n');
};

const buildPaymentReminderMessage = ({ tenantName, rent, bedInfo, monthName, orgName }) => {
  const org = orgName || 'RoomiPilot';
  return [
    `Hi ${tenantName}, friendly reminder that your rent for ${monthName} is pending.`,
    '',
    `• Amount due: ₹${rent}`,
    bedInfo ? `• Accommodation: ${bedInfo}` : null,
    '',
    `Please make the payment at your earliest convenience. Thanks! — ${org}`,
  ]
    .filter(Boolean)
    .join('\n');
};

const buildStayExtensionMessage = ({ tenantName, bedInfo, endDate, orgName }) => {
  const org = orgName || 'RoomiPilot';
  const formattedEnd = endDate
    ? new Date(endDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  return [
    `Hi ${tenantName}, your stay at ${org} is ending on ${formattedEnd}. ⏰`,
    '',
    bedInfo ? `• Bed: ${bedInfo}` : null,
    `• End date: ${formattedEnd}`,
    '',
    'If you would like to extend your stay, please reach out to us before the end date so we can hold your bed.',
    'If you have already spoken with the admin, you can ignore this message.',
    '',
    `— ${org}`,
  ]
    .filter(Boolean)
    .join('\n');
};

const buildElectricityBillMessage = ({ tenantName, monthName, units, perPersonAmount, sharingCount, bedInfo, orgName }) => {
  const org = orgName || 'RoomiPilot';
  return [
    `Hi ${tenantName}, your electricity bill for ${monthName} is ready ⚡`,
    '',
    bedInfo ? `• Room: ${bedInfo}` : null,
    `• Units consumed: ${units}`,
    `• Sharing among: ${sharingCount} person(s)`,
    `• Your share: ₹${perPersonAmount}`,
    '',
    `Please settle this with the admin at your earliest. — ${org}`,
  ]
    .filter(Boolean)
    .join('\n');
};

const buildWelcome = ({ phone, ...rest }) => {
  const message = buildWelcomeMessage(rest);
  return { message, whatsappUrl: buildUrl(phone, message) };
};

const buildRentReceipt = ({ phone, ...rest }) => {
  const message = buildRentReceiptMessage(rest);
  return { message, whatsappUrl: buildUrl(phone, message) };
};

const buildPaymentReminder = ({ phone, ...rest }) => {
  const message = buildPaymentReminderMessage(rest);
  return { message, whatsappUrl: buildUrl(phone, message) };
};

const buildStayExtension = ({ phone, ...rest }) => {
  const message = buildStayExtensionMessage(rest);
  return { message, whatsappUrl: buildUrl(phone, message) };
};

const buildElectricityBill = ({ phone, ...rest }) => {
  const message = buildElectricityBillMessage(rest);
  return { message, whatsappUrl: buildUrl(phone, message) };
};

module.exports = {
  buildUrl,
  normalizePhone,
  buildWelcome,
  buildRentReceipt,
  buildPaymentReminder,
  buildStayExtension,
  buildElectricityBill,
};
