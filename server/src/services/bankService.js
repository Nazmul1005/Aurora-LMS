/**
 * BANK SERVICE
 * ------------------------------------------------------------
 * Encapsulates the in-memory credit ledger used by all roles.
 * Responsibilities:
 * - Provisioning and updating virtual bank accounts with secrets
 * - Enforcing debit/credit rules and credit limit math
 * - Moving credits between accounts for purchases and payouts
 * - Exposing account snapshots for dashboards
 */
import { bankAccounts, LMS_ORG } from '../data/store.js';
import { HttpError } from '../utils/httpError.js';

const clone = (value) => (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

const DEFAULT_ACCOUNT_TEMPLATE = {
  credits: 800,
  creditLimit: 400,
  creditUsed: 0,
};

const resolveAccount = (accountNumber) => {
  const account = bankAccounts.get(accountNumber);
  if (!account) {
    throw new HttpError(404, `Bank account ${accountNumber} not found`);
  }
  return account;
};

export const upsertAccount = ({
  accountNumber,
  ownerId,
  ownerType,
  secret,
  initialCredits,
  creditLimit,
}) => {
  if (!accountNumber || !secret) {
    throw new HttpError(400, 'Account number and secret are required');
  }

  const existing = bankAccounts.get(accountNumber);
  if (existing && existing.ownerId !== ownerId) {
    throw new HttpError(409, 'Account already linked to another owner');
  }

  const nextAccount = existing || {
    accountNumber,
    ownerId,
    ownerType,
    ...DEFAULT_ACCOUNT_TEMPLATE,
  };

  nextAccount.secret = secret;
  if (typeof initialCredits === 'number') {
    nextAccount.credits = initialCredits;
  }
  if (typeof creditLimit === 'number') {
    nextAccount.creditLimit = creditLimit;
  }
  bankAccounts.set(accountNumber, nextAccount);
  return clone(nextAccount);
};

export const verifySecret = (accountNumber, secret) => {
  const account = resolveAccount(accountNumber);
  if (account.secret !== secret) {
    throw new HttpError(401, 'Invalid bank secret');
  }
  return true;
};

const availableCredits = (account) => account.credits + Math.max(0, account.creditLimit - account.creditUsed);

const applyDebit = (account, amount) => {
  if (amount <= 0) {
    throw new HttpError(400, 'Debit amount must be positive');
  }

  const available = availableCredits(account);
  if (available < amount) {
    throw new HttpError(400, 'Insufficient credits');
  }

  if (account.credits >= amount) {
    account.credits -= amount;
    return;
  }

  const remaining = amount - account.credits;
  account.credits = 0;
  account.creditUsed += remaining;
};

const applyCredit = (account, amount) => {
  if (amount <= 0) {
    throw new HttpError(400, 'Credit amount must be positive');
  }

  if (account.creditUsed > 0) {
    const usedReduction = Math.min(account.creditUsed, amount);
    account.creditUsed -= usedReduction;
    amount -= usedReduction;
  }

  account.credits += amount;
};

export const transferCredits = ({ fromAccount, toAccount, amount }) => {
  if (!fromAccount || !toAccount) {
    throw new HttpError(400, 'Both source and destination accounts are required');
  }
  if (fromAccount === toAccount) {
    throw new HttpError(400, 'Cannot transfer to the same account');
  }

  const source = resolveAccount(fromAccount);
  const destination = resolveAccount(toAccount);

  applyDebit(source, amount);
  applyCredit(destination, amount);

  return {
    from: { accountNumber: source.accountNumber, credits: source.credits, creditUsed: source.creditUsed },
    to: { accountNumber: destination.accountNumber, credits: destination.credits, creditUsed: destination.creditUsed },
    amount,
  };
};

export const debitAccount = (accountNumber, amount) => {
  const account = resolveAccount(accountNumber);
  applyDebit(account, amount);
  return clone(account);
};

export const creditAccount = (accountNumber, amount) => {
  const account = resolveAccount(accountNumber);
  applyCredit(account, amount);
  return clone(account);
};

export const setAccountSecret = (accountNumber, secret) => {
  if (!secret) {
    throw new HttpError(400, 'Secret is required');
  }
  const account = resolveAccount(accountNumber);
  account.secret = secret;
  return clone(account);
};

export const getAccountSnapshot = (accountNumber) => {
  const account = resolveAccount(accountNumber);
  return {
    accountNumber: account.accountNumber,
    ownerId: account.ownerId,
    ownerType: account.ownerType,
    credits: account.credits,
    creditLimit: account.creditLimit,
    creditUsed: account.creditUsed,
    available: availableCredits(account),
  };
};

export const getOrgAccountNumber = () => LMS_ORG.accountNumber;
