/**
 * Auth Routes
 * Handles role-aware login and learner registration endpoints.
 * Delegates to authService for session issuance and validation.
 */
import express from 'express';
import { withErrorHandling } from '../utils/httpError.js';
import { login, register } from '../services/authService.js';

const router = express.Router();

router.post(
  '/login',
  withErrorHandling(async (req, res) => {
    const session = login(req.body);
    res.json(session);
  }),
);

router.post(
  '/register',
  withErrorHandling(async (req, res) => {
    const session = register(req.body);
    res.status(201).json(session);
  }),
);

export default router;
