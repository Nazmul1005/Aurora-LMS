/**
 * Learner Routes
 * Maps REST endpoints to learner service actions and wraps them with
 * shared error handling. Each route mirrors a learner workflow:
 * - Profile retrieval
 * - Wallet configuration
 * - Course enrollment and completion
 * - Certificate download
 */

import express from 'express';
import {
  getLearnerProfile,
  configureLearnerBank,
  enrollInCourse,
  completeCourse,
  getCertificatePdf,
} from '../services/learnerService.js';
import { withErrorHandling } from '../utils/httpError.js';

const router = express.Router();

router.get(
  '/:learnerId',
  // Fetch the full learner dashboard payload (profile + enrollments + wallet)
  withErrorHandling(async (req, res) => {
    const result = getLearnerProfile(req.params.learnerId);
    res.json(result);
  }),
);

router.post(
  '/:learnerId/bank',
  // Create/update the learner's wallet credentials and return the new snapshot
  withErrorHandling(async (req, res) => {
    const result = configureLearnerBank(req.params.learnerId, req.body);
    res.status(201).json(result);
  }),
);

router.post(
  '/:learnerId/enroll',
  // Attempt a course purchase; debits learner, credits LMS org, logs transaction
  withErrorHandling(async (req, res) => {
    const result = enrollInCourse(req.params.learnerId, req.body);
    res.status(201).json(result);
  }),
);

router.post(
  '/:learnerId/complete',
  // Validate MCQ answer, issue certificate, and mark course as completed
  withErrorHandling(async (req, res) => {
    const result = completeCourse(req.params.learnerId, req.body);
    res.json(result);
  }),
);

router.get(
  '/:learnerId/certificates/:certificateId/pdf',
  // Stream the generated course completion certificate as a PDF download
  withErrorHandling(async (req, res) => {
    const { filename, buffer } = await getCertificatePdf(req.params.learnerId, req.params.certificateId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }),
);

export default router;
