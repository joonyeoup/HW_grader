/**
 * Authentication Routes
 * Handle user registration, login, and API keys
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Simple in-memory user store (replace with MongoDB/PostgreSQL in production)
const users = new Map();

// Generate API key for a user
function generateApiKey() {
  return 'gs_' + require('crypto').randomBytes(32).toString('hex');
}

/**
 * POST /api/auth/register
 * Register a new user and get an API key
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user exists
    if (users.has(email)) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate API key for this user
    const apiKey = generateApiKey();

    // Create user
    const user = {
      email,
      password: hashedPassword,
      apiKey,
      createdAt: new Date(),
      usage: {
        totalRequests: 0,
        totalTokens: 0,
        lastRequest: null
      },
      plan: 'free', // 'free' or 'premium'
      limits: {
        requestsPerDay: 100 // Free tier limit
      }
    };

    users.set(email, user);

    console.log(`New user registered: ${email}`);

    res.json({
      message: 'Registration successful',
      apiKey,
      email,
      plan: user.plan
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * Login and get API key
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = users.get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log(`User logged in: ${email}`);

    res.json({
      message: 'Login successful',
      apiKey: user.apiKey,
      email: user.email,
      plan: user.plan,
      usage: user.usage
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/auth/verify
 * Verify API key is valid
 */
router.get('/verify', (req, res) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required' });
  }

  // Find user by API key
  let foundUser = null;
  for (const [email, user] of users.entries()) {
    if (user.apiKey === apiKey) {
      foundUser = { email, ...user };
      break;
    }
  }

  if (!foundUser) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  res.json({
    valid: true,
    email: foundUser.email,
    plan: foundUser.plan,
    usage: foundUser.usage
  });
});

/**
 * GET /api/auth/usage
 * Get current usage stats
 */
router.get('/usage', (req, res) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required' });
  }

  // Find user by API key
  let foundUser = null;
  for (const [email, user] of users.entries()) {
    if (user.apiKey === apiKey) {
      foundUser = { email, ...user };
      break;
    }
  }

  if (!foundUser) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  res.json({
    email: foundUser.email,
    plan: foundUser.plan,
    usage: foundUser.usage,
    limits: foundUser.limits
  });
});

module.exports = router;
