/**
 * Gradescope AI Grader - Backend Server
 * Handles OpenAI API calls and user authentication
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const gradingRoutes = require('./routes/grading');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' })); // Support large base64 images
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['chrome-extension://*'],
  credentials: true
}));

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/grading', gradingRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Gradescope AI Grader Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});
