# Render Deployment - Complete Checklist

Follow this checklist step-by-step to deploy your app.

---

## Phase 1: Local Preparation (5 minutes)

- [ ] **Clone/Navigate to Project**
  ```bash
  cd "g:\Professional(G)\PG Stay"
  ```

- [ ] **Install Dependencies (if not done)**
  ```bash
  cd backend && npm install
  cd ../frontend && npm install
  cd ..
  ```

- [ ] **Test Locally**
  ```bash
  # Terminal 1: Backend
  cd backend && npm run dev
  
  # Terminal 2: Frontend
  cd frontend && npm run dev
  ```
  - Verify login works at http://localhost:5173
  - Admin: admin@roomipilot.com / admin123

- [ ] **Create .gitignore** (if not exists)
  ```bash
  # Copy from root directory - should already exist
  cat .gitignore
  ```

- [ ] **Check All Files Are Ready**
  ```bash
  # Verify key files exist:
  ls render.yaml                              # ✅ Should exist
  ls RENDER_DEPLOYMENT_GUIDE.md              # ✅ Should exist
  ls RENDER_QUICK_START.md                   # ✅ Should exist
  ls backend/package.json                     # ✅ Should exist
  ls frontend/package.json                    # ✅ Should exist
  ls database/schema.sql                      # ✅ Should exist
  ```

---

## Phase 2: GitHub Setup (5 minutes)

- [ ] **Initialize Git** (if not done)
  ```bash
  git status  # If error, then: git init
  ```

- [ ] **Add Remote** (if not done)
  ```bash
  # Replace with your GitHub username
  git remote add origin https://github.com/YOUR_USERNAME/pg-stay.git
  ```

- [ ] **Commit Everything**
  ```bash
  git add .
  git commit -m "Prepare for Render deployment"
  ```

- [ ] **Push to GitHub**
  ```bash
  # First time:
  git push -u origin main
  
  # Subsequent pushes:
  git push
  ```

- [ ] **Verify on GitHub**
  - Go to https://github.com/your_username/pg-stay
  - See all your files? ✅

---

## Phase 3: Render Account Setup (2 minutes)

- [ ] **Create Render Account**
  - Go to https://render.com
  - Sign up with GitHub
  - Authorize Render to access repositories

- [ ] **Verify GitHub Connection**
  - Should see "Repository authorized"
  - You're ready to deploy!

---

## Phase 4: Deployment (5-10 minutes)

### Option A: Blueprint Deployment (Recommended)

- [ ] **Create Blueprint**
  1. Go to https://render.com/dashboard
  2. Click **"New +"** → **"Blueprint"**
  3. Select your `pg-stay` repository
  4. Click **"Create Blueprint"**
  5. Render will detect `render.yaml` automatically
  6. Click **"Create from Blueprint"**

- [ ] **Wait for Deployment**
  - Should take 3-5 minutes
  - Watch the logs scroll by
  - Look for: "✅ deployed successfully"

### Option B: Manual Deployment (If Blueprint fails)

- [ ] **Deploy Backend**
  1. Click **"New +"** → **"Web Service"**
  2. Select repository
  3. Build Command: `cd backend && npm install`
  4. Start Command: `cd backend && npm start`
  5. Create Service

- [ ] **Deploy Frontend**
  1. Click **"New +"** → **"Static Site"**
  2. Select repository
  3. Build Command: `cd frontend && npm install && npm run build`
  4. Publish Directory: `frontend/dist`
  5. Create Service

- [ ] **Add PostgreSQL**
  1. Click **"New +"** → **"PostgreSQL"**
  2. Database Name: `pg_stay_production`
  3. User: `pg_stay_user`
  4. Create Database

---

## Phase 5: Environment Variables (10 minutes)

### For Backend Service

Go to `pg-stay-backend` → Settings → Environment Variables

- [ ] **Add Email Configuration**
  ```
  EMAIL_USER = your_gmail@gmail.com
  EMAIL_PASSWORD = your_app_password (16-char from Gmail)
  ```

- [ ] **Add Razorpay** (optional for now)
  ```
  RAZORPAY_KEY_ID = your_razorpay_key
  RAZORPAY_KEY_SECRET = your_razorpay_secret
  ```

- [ ] **Verify Auto-Generated Variables**
  - `DATABASE_URL` - Should be auto-generated
  - `JWT_SECRET` - Should be auto-generated
  - `NODE_ENV` - Should be "production"

### For Frontend Service

Go to `pg-stay-frontend` → Settings → Environment Variables

- [ ] **Add Backend URL**
  ```
  VITE_API_URL = https://pg-stay-backend.onrender.com/api
  ```
  (Use the actual backend URL from your deployment)

---

## Phase 6: Verification (5 minutes)

- [ ] **Check Backend Status**
  1. Go to `pg-stay-backend` service
  2. Look for message: `Server running on port 5000`
  3. Check Logs for errors (should be none)

- [ ] **Check Frontend Status**
  1. Go to `pg-stay-frontend` service
  2. Look for: `Build completed successfully`
  3. Get the frontend URL

- [ ] **Check Database Status**
  1. Go to `pg-stay-db` service
  2. Status should be "Available" (green)

- [ ] **Test Frontend**
  1. Visit frontend URL from Render
  2. Should see login page
  3. Try admin login:
     - Email: `admin@roomipilot.com`
     - Password: `admin123`
  4. Should see Admin Dashboard

- [ ] **Test Functionality**
  1. Try adding a new room in Property Management
  2. Try adding a bed
  3. Try adding a tenant
  4. Check backend logs for errors

---

## Phase 7: Gmail Setup (Only if email not working)

- [ ] **Generate Gmail App Password**
  1. Go to https://myaccount.google.com/apppasswords
  2. Select "Mail" → "Windows Computer"
  3. Generate password
  4. Copy 16-character password

- [ ] **Update in Render**
  1. Go to backend service → Settings
  2. Update `EMAIL_PASSWORD` with the 16-char password
  3. Save and restart service

- [ ] **Test Email**
  1. Create a new tenant
  2. Check your email for welcome message
  3. Should arrive within 1 minute

---

## Phase 8: Post-Deployment Checklist

- [ ] **Database Initialized**
  - Admin user exists? ✅
  - Can login? ✅

- [ ] **Email Working**
  - Received welcome email? ✅
  - Thank you email on checkout? (test later)

- [ ] **Checkout Job Running**
  - Check backend logs
  - Look for: `[SCHEDULER] ✅ Tenant checkout job scheduled`

- [ ] **Logs Monitored**
  - Set up Render alerts (optional)
  - Check logs daily for errors

- [ ] **Custom Domain** (optional)
  - Go to service settings
  - Add custom domain
  - Point DNS records

---

## 📊 Final Status

| Component | Status | URL |
|-----------|--------|-----|
| Frontend | ✅ | https://pg-stay-frontend.onrender.com |
| Backend | ✅ | https://pg-stay-backend.onrender.com |
| Database | ✅ | Auto-managed by Render |
| Email | ✅ | Sending successfully |

---

## 🎉 Deployment Complete!

Your app is now LIVE on Render! 

### What's Next?

1. ✅ Share the frontend URL with users
2. ✅ Monitor logs for errors
3. ✅ Set up backups (Render auto-does this)
4. ✅ Add custom domain (if desired)
5. ✅ Upgrade plan if needed after 90 days

---

## 📞 Support & Troubleshooting

See [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md) for:
- ✅ Common issues and solutions
- ✅ Detailed troubleshooting
- ✅ FAQ
- ✅ Performance optimization

---

## 🆘 Emergency Issues

| Issue | Quick Fix |
|-------|-----------|
| App not loading | Check backend status in Render logs |
| Cannot login | Verify DATABASE_URL and admin user |
| Email not sending | Update EMAIL_USER/PASSWORD in env vars |
| Slow performance | Upgrade to paid plan or optimize queries |

---

## ✅ Deployment Checklist Version: 1.0
**Last Updated:** March 27, 2026
**Status:** Ready for Deployment

**You're all set! Start deploying now!** 🚀
