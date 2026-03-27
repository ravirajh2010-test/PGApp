const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader?.split(' ')[1];
  
  console.log('[AUTH] Authorization header:', authHeader ? 'Present' : 'Missing');
  console.log('[AUTH] Token:', token ? 'Present' : 'Missing');
  
  if (!token) {
    console.log('[AUTH] ❌ No token provided');
    return res.status(401).json({ message: 'Access denied - no token' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('[AUTH] ❌ Token verification failed:', err.message);
      return res.status(403).json({ message: 'Invalid token: ' + err.message });
    }
    console.log('[AUTH] ✅ Token verified for user:', user.id);
    req.user = user;
    next();
  });
};

const authorizeRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  next();
};

module.exports = { authenticateToken, authorizeRole };