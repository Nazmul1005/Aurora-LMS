/**
 * Bank Routes
 * Exposes the low-level credit ledger APIs used by every role.
 * Supports:
 * - Account provisioning
 * - Balance lookup
 * - Direct debit/credit operations
 * - Organization-facilitated transfers
 */

import express from 'express';
import { withErrorHandling } from '../utils/httpError.js';
import {
  getAccountSnapshot,
  debitAccount,
  creditAccount,
  transferCredits,
  upsertAccount,
} from '../services/bankService.js';

const router = express.Router();

router.post(
  '/accounts',
  withErrorHandling(async (req, res) => {
    const result = upsertAccount(req.body);
    res.status(201).json({ account: result });
  }),
);

router.get(
  '/accounts/:accountNumber',
  withErrorHandling(async (req, res) => {
    const snapshot = getAccountSnapshot(req.params.accountNumber);
    res.json({ account: snapshot });
  }),
);

router.post(
  '/accounts/:accountNumber/debit',
  withErrorHandling(async (req, res) => {
    const updated = debitAccount(req.params.accountNumber, req.body.amount);
    res.json({ account: updated });
  }),
);

router.post(
  '/accounts/:accountNumber/credit',
  withErrorHandling(async (req, res) => {
    const updated = creditAccount(req.params.accountNumber, req.body.amount);
    res.json({ account: updated });
  }),
);

router.post(
  '/transfer',
  withErrorHandling(async (req, res) => {
    const result = transferCredits(req.body);
    res.json(result);
  }),
);

export default router;
