const User = require('../models/User');
const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dbManager = require('../services/DatabaseManager');
const { sendOrgWelcomeEmail } = require('../services/emailService');
const {
  normalizeOnboardingAdmins,
  validateOnboardingAdmins,
  createOrganizationAdmins,
} = require('../services/onboardingService');
const { getRequestIp, logAuditByOrgId } = require('../services/auditService');

const register = async (req, res) => {
  try {
    const { name, email, password, orgSlug, orgCode } = req.body;
    
    // Find org by public code first, then fall back to slug for compatibility.
    const org = orgCode
      ? await Organization.findByOrganizationCode(orgCode.trim().toUpperCase())
      : await Organization.findBySlug(orgSlug);
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    
    const orgPool = await dbManager.getOrgPool(org.id);
    const existingUser = await User.findByEmail(orgPool, email);
    if (existingUser) return res.status(400).json({ message: 'User already exists in this organization' });

    const user = await User.create(orgPool, name, email, password, 'tenant');
    
    // Add org mapping for cross-org login
    await User.addOrgMapping(email, org.id, user.id, 'tenant');
    await logAuditByOrgId(org.id, {
      userId: user.id,
      action: 'TENANT_REGISTERED',
      entityType: 'user',
      entityId: user.id,
      details: { email: user.email, role: user.role },
      ipAddress: getRequestIp(req),
    });
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, orgSlug, orgCode } = req.body;
    
    let user;
    let orgId = null;
    
    if (orgSlug || orgCode) {
      // Login within a specific org
      const org = orgCode
        ? await Organization.findByOrganizationCode(orgCode.trim().toUpperCase())
        : await Organization.findBySlug(orgSlug);
      if (!org) return res.status(404).json({ message: 'Organization not found' });
      
      const orgPool = await dbManager.getOrgPool(org.id);
      user = await User.findByEmail(orgPool, email);
      orgId = org.id;
    } else {
      // Try super_admin login first
      const superAdmin = await User.findSuperAdminByEmail(email);
      if (superAdmin) {
        user = superAdmin;
      } else {
        // Check user_org_map for which orgs this email belongs to
        const orgMappings = await User.findOrgsByEmail(email);
        
        if (orgMappings.length === 0) {
          // Backward compatibility: allow legacy users linked by org_id in master users table.
          const legacyUser = await User.findLegacyOrgUserByEmail(email);
          if (!legacyUser) {
            return res.status(400).json({ message: 'Invalid credentials' });
          }

          orgId = legacyUser.org_id;
          try {
            const orgPool = await dbManager.getOrgPool(orgId);
            user = await User.findByEmail(orgPool, email);
          } catch (e) {
            user = null;
          }

          // If user is not yet present in org DB, validate against legacy master user record.
          if (!user) {
            user = legacyUser;
          }
        } else if (orgMappings.length === 1) {
          // Single org - auto-resolve
          const mapping = orgMappings[0];
          orgId = mapping.org_id;
          const orgPool = await dbManager.getOrgPool(orgId);
          user = await User.findByEmail(orgPool, email);
        } else {
          // Multiple orgs - verify password against first available, then return org list
          let passwordValid = false;
          for (const mapping of orgMappings) {
            try {
              const orgPool = await dbManager.getOrgPool(mapping.org_id);
              const userInOrg = await User.findByEmail(orgPool, email);
              if (userInOrg) {
                const isMatch = await bcrypt.compare(password, userInOrg.password);
                if (isMatch) {
                  passwordValid = true;
                  break;
                }
              }
            } catch (e) {
              continue;
            }
          }
          
          if (!passwordValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
          }
          
          return res.status(300).json({
            message: 'Multiple organizations found. Please select one.',
            organizations: orgMappings.map(m => ({
              id: m.org_id,
              name: m.org_name,
              slug: m.org_slug,
              organizationCode: m.organization_code,
            }))
          });
        }
      }
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const tokenPayload = { id: user.id, role: user.role };
    if (orgId) tokenPayload.orgId = orgId;
    
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '8h' });

    // Update last_active timestamp
    if (orgId) {
      try {
        const orgPool = await dbManager.getOrgPool(orgId);
        await orgPool.query('UPDATE users SET last_active = NOW() WHERE id = $1', [user.id]);
        await logAuditByOrgId(orgId, {
          userId: user.id,
          action: 'USER_LOGIN',
          entityType: 'user',
          entityId: user.id,
          details: { email: user.email, role: user.role },
          ipAddress: getRequestIp(req),
        });
      } catch (e) { /* ignore if column doesn't exist yet */ }
    }
    
    // Get org info if applicable
    let orgInfo = null;
    if (orgId) {
      orgInfo = await Organization.findById(orgId);
    }

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        orgId: orgId,
        is_first_login: user.is_first_login
      },
      organization: orgInfo ? {
        id: orgInfo.id,
        name: orgInfo.name,
        slug: orgInfo.slug,
        organizationCode: orgInfo.organization_code,
        plan: orgInfo.plan,
        status: orgInfo.status
      } : null
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Register a new organization (SaaS onboarding)
const registerOrganization = async (req, res) => {
  try {
    // Accept both API formats: org* and regular field names
    const orgName = req.body.orgName;
    const orgSlug = req.body.orgSlug;
    const orgEmail = req.body.orgEmail || req.body.email;
    const orgPhone = req.body.orgPhone || req.body.phone;
    const orgAddress = req.body.orgAddress || req.body.address;
    const plan = req.body.plan || 'free';
    const admins = normalizeOnboardingAdmins(req.body);
    const primaryAdmin = admins[0];
    
    if (!orgName || !orgSlug) {
      return res.status(400).json({ message: 'Organization name and slug are required' });
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

    // Create organization in master DB
    const org = await Organization.create(orgName, orgSlug, orgEmail, orgPhone, orgAddress, plan);
    
    // Create subscription in master DB
    await Subscription.create(org.id, plan, 0, 'monthly');

    // Provision org database (named after business name: pg_stay_<orgname>)
    const orgPool = await dbManager.createOrgDatabase(org.id, orgName);

    // Create the default two admins in the org database.
    const [user] = await createOrganizationAdmins(orgPool, org.id, admins);
    await logAuditByOrgId(org.id, {
      userId: user.id,
      action: 'ORGANIZATION_ONBOARDED',
      entityType: 'organization',
      entityId: org.id,
      details: {
        organizationName: org.name,
        organizationCode: org.organization_code,
        plan: org.plan,
        admins: admins.map((admin) => admin.email),
      },
      ipAddress: getRequestIp(req),
    });
    
    const token = jwt.sign({ id: user.id, role: user.role, orgId: org.id }, process.env.JWT_SECRET, { expiresIn: '8h' });
    
    // Send welcome email to the business email
    const welcomeEmail = orgEmail || primaryAdmin.email;
    sendOrgWelcomeEmail(welcomeEmail, orgName, primaryAdmin.name, primaryAdmin.email, plan)
      .catch(err => console.error('Failed to send welcome email:', err.message));
    
    res.status(201).json({
      message: 'Organization created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        orgId: org.id,
        is_first_login: false
      },
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
    console.error('Organization registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { email, newPassword, otp } = req.body;
    const userId = req.user?.id;

    if (!email || !newPassword || !otp) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    // Verify OTP
    const storedOtp = otpStore.get(email);
    if (!storedOtp) {
      return res.status(400).json({ message: 'OTP expired or not requested. Please request a new OTP.' });
    }
    if (storedOtp.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }
    if (Date.now() > storedOtp.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: 'OTP has expired. Please request a new OTP.' });
    }
    // OTP valid — remove it
    otpStore.delete(email);

    // Determine which pool to use based on user role
    let userPool;
    if (req.user.role === 'super_admin') {
      userPool = require('../config/database'); // master pool
    } else {
      userPool = req.pool; // org pool (set by tenantIsolation middleware)
    }

    const user = await User.findById(userPool, userId);
    if (!user || user.email !== email) {
      return res.status(400).json({ message: 'Email does not match your account' });
    }

    const updatedUser = await User.changePassword(userPool, userId, newPassword);
    if (req.user.orgId) {
      await logAuditByOrgId(req.user.orgId, {
        userId,
        action: 'PASSWORD_CHANGED',
        entityType: 'user',
        entityId: userId,
        details: { email },
        ipAddress: getRequestIp(req),
      });
    }
    res.json({ 
      message: 'Password changed successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        orgId: req.user.orgId || null,
        is_first_login: updatedUser.is_first_login
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// In-memory OTP store (email -> { otp, expiresAt })
const otpStore = new Map();

const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user?.id;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Determine which pool to use
    let userPool;
    if (req.user.role === 'super_admin') {
      userPool = require('../config/database');
    } else {
      userPool = req.pool;
    }

    const user = await User.findById(userPool, userId);
    if (!user || user.email !== email) {
      return res.status(400).json({ message: 'Email does not match your account' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(email, { otp, expiresAt });

    // Send OTP email
    const { sendEmail } = require('../services/emailService');
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🔒 Password Reset OTP</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #eee; border-radius: 0 0 8px 8px;">
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>Your OTP for password reset is:</p>
          <div style="text-align: center; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #ff6b35; background: #fff3e0; padding: 12px 24px; border-radius: 8px; display: inline-block;">${otp}</span>
          </div>
          <p style="color: #666; font-size: 14px;">This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>
        </div>
      </div>
    `;
    sendEmail(email, '🔒 Your Password Reset OTP - RoomiPilot', htmlContent)
      .then(sent => console.log(sent ? `✅ OTP email sent to ${email}` : `⚠️ OTP email failed for ${email}`))
      .catch(err => console.error('❌ OTP email error:', err.message));

    res.json({ message: 'OTP sent to your email address' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, registerOrganization, changePassword, sendOtp };