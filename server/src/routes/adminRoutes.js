/**
 * Admin Routes
 * Exposes the administrative dashboard endpoints plus payout and material
 * management actions. Each handler proxies to adminService while sharing
 * consistent error serialization via withErrorHandling.
 */

import express from 'express';
import { withErrorHandling } from '../utils/httpError.js';
import {
  getAdminDashboard,
  approvePayoutRequests,
  rejectPayoutRequests,
  updateCourseMaterialsAsAdmin,
} from '../services/adminService.js';

const router = express.Router();

router.get(
  '/:adminId/dashboard',
  // Return organization-wide metrics, rosters, and ledger data for the admin UI
  withErrorHandling(async (req, res) => {
    const dashboard = getAdminDashboard(req.params.adminId);
    res.json(dashboard);
  }),
);

router.post(
  '/:adminId/payouts/approve',
  // Transition requested payouts to the approved state
  withErrorHandling(async (req, res) => {
    const result = approvePayoutRequests(req.params.adminId, req.body);
    res.json(result);
  }),
);

router.post(
  '/:adminId/payouts/reject',
  // Reject one or more payout requests and attach audit metadata
  withErrorHandling(async (req, res) => {
    const result = rejectPayoutRequests(req.params.adminId, req.body);
    res.json(result);
  }),
);

router.patch(
  '/:adminId/courses/:courseId/materials',
  // Allow admins to patch video/audio/notes blobs for any course
  withErrorHandling(async (req, res) => {
    const result = updateCourseMaterialsAsAdmin(req.params.adminId, req.params.courseId, req.body);
    res.json(result);
  }),
);

export default router;
