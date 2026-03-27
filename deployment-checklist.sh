#!/bin/bash
# Deployment checklist for PG Stay on Render

echo "======================================"
echo "PG Stay - Render Deployment Checklist"
echo "======================================"
echo ""

# Check 1: Git repository
echo "✓ Checking Git repository..."
if git rev-parse --git-dir > /dev/null 2>&1; then
  echo "  ✅ Git repository found"
else
  echo "  ❌ Git repository not found. Run: git init"
  exit 1
fi

# Check 2: Node.js
echo ""
echo "✓ Checking Node.js..."
if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v)
  echo "  ✅ Node.js $NODE_VERSION installed"
else
  echo "  ❌ Node.js not found"
  exit 1
fi

# Check 3: Backend dependencies
echo ""
echo "✓ Checking backend dependencies..."
if [ -d "backend/node_modules" ]; then
  echo "  ✅ Backend dependencies installed"
else
  echo "  ⚠️  Backend dependencies not installed"
  echo "  Run: cd backend && npm install"
fi

# Check 4: Frontend dependencies
echo ""
echo "✓ Checking frontend dependencies..."
if [ -d "frontend/node_modules" ]; then
  echo "  ✅ Frontend dependencies installed"
else
  echo "  ⚠️  Frontend dependencies not installed"
  echo "  Run: cd frontend && npm install"
fi

# Check 5: render.yaml
echo ""
echo "✓ Checking render.yaml..."
if [ -f "render.yaml" ]; then
  echo "  ✅ render.yaml found"
else
  echo "  ❌ render.yaml not found"
  exit 1
fi

# Check 6: Backend .env
echo ""
echo "✓ Checking backend configuration..."
if [ -f "backend/.env" ]; then
  echo "  ✅ Backend .env file found"
else
  echo "  ⚠️  Backend .env not found (will use Render env vars)"
fi

# Check 7: Frontend .env
echo ""
echo "✓ Checking frontend configuration..."
if [ -f "frontend/.env" ]; then
  echo "  ✅ Frontend .env file found"
else
  echo "  ⚠️  Frontend .env not found (will use Render env vars)"
fi

# Check 8: Database schema
echo ""
echo "✓ Checking database schema..."
if [ -f "database/schema.sql" ]; then
  echo "  ✅ Database schema found"
else
  echo "  ❌ Database schema not found"
  exit 1
fi

# Check 9: Git remote
echo ""
echo "✓ Checking Git remote..."
if git remote -v | grep -q "origin"; then
  GIT_REMOTE=$(git remote get-url origin)
  echo "  ✅ Git remote configured: $GIT_REMOTE"
else
  echo "  ⚠️  Git remote not configured"
  echo "  Run: git remote add origin https://github.com/yourusername/pg-stay.git"
fi

# Check 10: Email configuration
echo ""
echo "✓ Checking email configuration..."
if grep -q "EMAIL_USER" backend/.env 2>/dev/null; then
  echo "  ✅ Email configured"
else
  echo "  ⚠️  Email not configured locally (required for Render)"
  echo "  You'll need to set EMAIL_USER and EMAIL_PASSWORD in Render dashboard"
fi

echo ""
echo "======================================"
echo "Deployment Checklist Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Commit your changes: git add . && git commit -m 'Prepare for Render deployment'"
echo "2. Push to GitHub: git push origin main"
echo "3. Go to https://render.com/dashboard"
echo "4. Create new Blueprint and select your repository"
echo "5. Configure environment variables in Render dashboard"
echo "6. Deploy!"
echo ""
