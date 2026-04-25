const Stripe = require('stripe');
const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const dbManager = require('../services/DatabaseManager');
const { sendOrgWelcomeEmail } = require('../services/emailService');
const {
  normalizeOnboardingAdmins,
  validateOnboardingAdmins,
  createOrganizationAdmins,
} = require('../services/onboardingService');

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Plan price mapping in pence (GBP smallest unit)
const PLAN_PRICES = {
  starter: 500,    // £5
  pro: 1500,       // £15
  enterprise: 5000 // £50
};

const PLAN_NAMES = {
  starter: 'Starter Plan – £5/mo',
  pro: 'Pro Plan – £15/mo',
  enterprise: 'Enterprise Plan – £50/mo'
};

/**
 * POST /api/stripe/create-checkout-session
 * Creates a Stripe Checkout session for paid plans during org registration.
 * Stores pending org data in session metadata so we can create the org on success.
 */
const createCheckoutSession = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ message: 'Payment gateway not configured' });
    }

    const { orgName, orgSlug, orgEmail, orgPhone, orgAddress, plan } = req.body;
    const admins = normalizeOnboardingAdmins(req.body);
    const primaryAdmin = admins[0];

    if (!orgName || !orgSlug || !plan) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!PLAN_PRICES[plan]) {
      return res.status(400).json({ message: 'Invalid paid plan selected' });
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(orgSlug)) {
      return res.status(400).json({ message: 'Slug must contain only lowercase letters, numbers, and hyphens' });
    }

    // Check if slug already taken
    const existingOrg = await Organization.findBySlug(orgSlug);
    if (existingOrg) {
      return res.status(400).json({ message: 'Organization slug is already taken' });
    }

    // Check if business email is already registered
    if (orgEmail) {
      const existingByBizEmail = await Organization.findByEmail(orgEmail);
      if (existingByBizEmail) {
        return res.status(400).json({ message: 'An organization with this business email already exists' });
      }
    }

    const adminValidationError = await validateOnboardingAdmins(admins);
    if (adminValidationError) {
      return res.status(400).json({ message: adminValidationError });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name: PLAN_NAMES[plan],
            description: `RoomiPilot ${plan} subscription for ${orgName}`,
          },
          unit_amount: PLAN_PRICES[plan],
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      customer_email: primaryAdmin.email,
      metadata: {
        orgName,
        orgSlug,
        orgEmail: orgEmail || '',
        orgPhone: orgPhone || '',
        orgAddress: orgAddress || '',
        adminName: primaryAdmin.name,
        adminEmail: primaryAdmin.email,
        adminPassword: primaryAdmin.password,
        secondaryAdminName: admins[1].name,
        secondaryAdminEmail: admins[1].email,
        secondaryAdminPassword: admins[1].password,
        plan,
      },
      success_url: `${frontendUrl}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/onboarding?cancelled=true`,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to create checkout session' });
  }
};

/**
 * GET /api/stripe/checkout-success?session_id=xxx
 * Called after successful Stripe payment. Verifies the session and creates the org.
 */
const checkoutSuccess = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ message: 'Payment gateway not configured' });
    }

    const { session_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ message: 'Session ID is required' });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ message: 'Payment not completed' });
    }

    const meta = session.metadata;
    if (!meta.orgSlug || !meta.adminEmail) {
      return res.status(400).json({ message: 'Invalid session data' });
    }

    const admins = normalizeOnboardingAdmins(meta);
    const primaryAdmin = admins[0];

    // Check if org was already created (idempotency - user might refresh)
    const existingOrg = await Organization.findBySlug(meta.orgSlug);
    if (existingOrg) {
      // Already created, just return auth data
      const orgPool = await dbManager.getOrgPool(existingOrg.id);
      const users = await orgPool.query('SELECT * FROM users WHERE email = $1', [primaryAdmin.email]);
      if (users.rows.length > 0) {
        const user = users.rows[0];
        const token = jwt.sign(
          { id: user.id, role: user.role, orgId: existingOrg.id },
          process.env.JWT_SECRET,
          { expiresIn: '8h' }
        );
        return res.json({
          message: 'Organization already created',
          token,
          user: { id: user.id, name: user.name, email: user.email, role: user.role, orgId: existingOrg.id },
          organization: {
            id: existingOrg.id,
            name: existingOrg.name,
            slug: existingOrg.slug,
            organizationCode: existingOrg.organization_code,
            plan: existingOrg.plan,
            status: existingOrg.status
          }
        });
      }
    }

    // Create organization
    const org = await Organization.create(meta.orgName, meta.orgSlug, meta.orgEmail, meta.orgPhone, meta.orgAddress, meta.plan);

    // Create subscription with Stripe subscription ID
    const sub = await Subscription.create(org.id, meta.plan, PLAN_PRICES[meta.plan] / 100, 'monthly');
    
    // Update subscription with Stripe IDs
    if (session.subscription) {
      await dbManager.pool.query(
        'UPDATE subscriptions SET stripe_subscription_id = $1, stripe_customer_id = $2 WHERE id = $3',
        [session.subscription, session.customer, sub.id]
      );
    }

    // Provision org database
    const orgPool = await dbManager.createOrgDatabase(org.id, meta.orgName);

    // Create default admins
    const [user] = await createOrganizationAdmins(orgPool, org.id, admins);

    const token = jwt.sign(
      { id: user.id, role: user.role, orgId: org.id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Send welcome email
    const welcomeEmail = meta.orgEmail || primaryAdmin.email;
    sendOrgWelcomeEmail(welcomeEmail, meta.orgName, primaryAdmin.name, primaryAdmin.email, meta.plan)
      .catch(err => console.error('Failed to send welcome email:', err.message));

    res.json({
      message: 'Organization created successfully',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, orgId: org.id, is_first_login: false },
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        organizationCode: org.organization_code,
        plan: org.plan,
        status: org.status
      }
    });
  } catch (error) {
    console.error('Checkout success error:', error.message);
    res.status(500).json({ message: 'Failed to complete registration', error: error.message });
  }
};

module.exports = { createCheckoutSession, checkoutSuccess };
