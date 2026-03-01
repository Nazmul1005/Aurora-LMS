import express from 'express';
import { withErrorHandling } from '../utils/httpError.js';
import {
  getInstructorDashboard,
  uploadCourse,
  updateCourse,
  requestPayouts,
  validateApprovedPayouts,
  updateInstructorWallet,
  validateTransaction,
} from '../services/instructorService.js';

const router = express.Router();

router.get(
  '/:instructorId',
  // Load instructor dashboard (courses, transactions, wallet) for the given ID
  withErrorHandling(async (req, res) => {
    const result = getInstructorDashboard(req.params.instructorId);
    res.json(result);
  }),
);

router.post(
  '/:instructorId/courses',
  // Create a brand-new course and trigger the lump-sum reward
  withErrorHandling(async (req, res) => {
    const result = uploadCourse(req.params.instructorId, req.body);
    res.status(201).json(result);
  }),
);

router.patch(
  '/:instructorId/courses/:courseId',
  // Edit an existing course’s metadata or materials
  withErrorHandling(async (req, res) => {
    const result = updateCourse(req.params.instructorId, req.params.courseId, req.body);
    res.json(result);
  }),
);

router.post(
  '/:instructorId/payouts/request',
  // Move all eligible settled transactions into a payout request batch
  withErrorHandling(async (req, res) => {
    const result = requestPayouts(req.params.instructorId);
    res.json(result);
  }),
);

router.post(
  '/:instructorId/payouts/validate',
  // Validate admin-approved payouts by providing instructor’s bank secret
  withErrorHandling(async (req, res) => {
    const result = validateApprovedPayouts(req.params.instructorId, req.body);
    res.json(result);
  }),
);

router.patch(
  '/:instructorId/wallet',
  // Update instructor wallet preferences (e.g., auto-withdraw toggles)
  withErrorHandling(async (req, res) => {
    const result = updateInstructorWallet(req.params.instructorId, req.body);
    res.json(result);
  }),
);

router.post(
  '/:instructorId/transactions/:transactionId/validate',
  // Validate a specific learner purchase to unlock materials and release funds
  withErrorHandling(async (req, res) => {
    const result = validateTransaction(req.params.instructorId, req.params.transactionId, req.body);
    res.json(result);
  }),
);

export default router;
