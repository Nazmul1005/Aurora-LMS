/**
 * ============================================================================
 * AURORA LMS BACKEND SERVER
 * ============================================================================
 * 
 * Main entry point for the Aurora Learning Management System API.
 * This server provides RESTful endpoints for a complete LMS simulation
 * with multi-entity support (Learners, Instructors, Admins).
 * 
 * Architecture:
 * - Express.js REST API
 * - In-memory data store (resets on restart)
 * - Credit-based banking system
 * - Role-based authentication
 * 
 * API Endpoints:
 * - POST /api/auth/login     - Multi-entity authentication
 * - POST /api/auth/register  - New learner registration
 * - GET  /api/courses        - List all courses
 * - GET  /api/courses/:id    - Get course details
 * - GET  /api/learners/:id   - Get learner profile
 * - POST /api/learners/:id/bank    - Configure bank account
 * - POST /api/learners/:id/enroll  - Purchase course
 * - POST /api/learners/:id/complete - Complete course
 * - GET  /api/instructors/:id - Get instructor dashboard
 * - POST /api/instructors/:id/courses - Upload new course
 * - POST /api/instructors/:id/transactions/:txId/validate - Validate payout
 * - GET  /api/admin/:id/dashboard - System overview
 * - GET  /api/bank/accounts/:accountNumber - Get account balance
 * 
 * @author Aurora LMS Team
 * @version 2.0.0
 */

import express from 'express';
import cors from 'cors';
import coursesRouter from './routes/coursesRoutes.js';
import learnersRouter from './routes/learnersRoutes.js';
import instructorsRouter from './routes/instructorsRoutes.js';
import bankRouter from './routes/bankRoutes.js';
import authRouter from './routes/authRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandlers.js';
import { initStorePersistence, storePersistenceMiddleware, persistStoreSync } from './data/storePersistence.js';

// ============================================================================
// EXPRESS APPLICATION INITIALIZATION
// ============================================================================

const app = express();

initStorePersistence();

// ============================================================================
// MIDDLEWARE CONFIGURATION
// ============================================================================

/**
 * CORS Configuration
 * Enables cross-origin requests from frontend applications
 */
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true
}));

/**
 * JSON Body Parser
 * Parses incoming JSON request bodies with size limit
 */
app.use(express.json({ limit: '15mb' }));

app.use(storePersistenceMiddleware());

/**
 * Request Logger (Development)
 * Logs incoming requests for debugging
 */
app.use((req, _res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

/**
 * GET /health
 * Returns server status and timestamp for monitoring
 */
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Aurora LMS API',
    version: '2.0.0',
    timestamp: new Date().toISOString() 
  });
});

// ============================================================================
// API ROUTE CONFIGURATION
// ============================================================================

// Authentication routes - login, register
app.use('/api/auth', authRouter);

// Course catalog routes - list, get details
app.use('/api/courses', coursesRouter);

// Learner routes - profile, bank setup, enroll, complete
app.use('/api/learners', learnersRouter);

// Instructor routes - dashboard, upload course, validate transactions
app.use('/api/instructors', instructorsRouter);

// Banking routes - account management, transfers
app.use('/api/bank', bankRouter);

// Admin routes - system dashboard, metrics
app.use('/api/admin', adminRouter);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 Handler - catches unmatched routes
app.use(notFoundHandler);

// Global Error Handler - formats and returns error responses
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    AURORA LMS API SERVER                     ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Status:    ✓ Running                                        ║`);
  console.log(`║  Port:      ${PORT}                                             ║`);
  console.log(`║  Mode:      ${process.env.NODE_ENV || 'development'}                                    ║`);
  console.log('║  Endpoints: /api/auth, /api/courses, /api/learners, etc.     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
});

// Flush persisted store on shutdown signals
const shutdown = (signal) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] Received ${signal} - persisting store...`);
    }
    persistStoreSync();
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
