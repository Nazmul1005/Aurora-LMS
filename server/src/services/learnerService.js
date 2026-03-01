/**
 * LEARNER SERVICE
 * ------------------------------------------------------------
 * Contains all learner-facing domain logic:
 * - Dashboard/profile shaping with enrollments and wallet snapshot
 * - Bank setup and purchase flow (debits learner, credits LMS org)
 * - Course completion validation and certificate issuance (PDF)
 * - Utility helpers for enriching learner views
 */
import { v4 as uuid } from 'uuid';
import PDFDocument from 'pdfkit';
import {
  learners,
  courses,
  transactions,
  findLearnerById,
  findCourseById,
  findInstructorById,
  createCertificate,
} from '../data/store.js';
import { HttpError } from '../utils/httpError.js';
import {
  upsertAccount,
  verifySecret,
  transferCredits,
  getAccountSnapshot,
  getOrgAccountNumber,
} from './bankService.js';

const computeInstructorPayout = (grossAmount) => {
  const amount = Number(grossAmount) || 0;
  return Math.round(amount * 0.3);
};

// Prepares a learner object for the frontend, enriching IDs with full objects
const buildLearnerView = (learner) => {
  const enrich = (courseId) => courses.find((c) => c.id === courseId);
  return {
    ...learner,
    enrolledCourses: learner.enrolledCourses.map(enrich).filter(Boolean),
    pendingCourses: learner.pendingCourses.map((pending) => ({
      ...pending,
      course: enrich(pending.courseId),
      transaction: transactions.find((tx) => tx.id === pending.transactionId),
    })),
    completedCourses: learner.completedCourses.map(enrich).filter(Boolean),
  };
};

const ensureLearner = (learnerId) => {
  const learner = findLearnerById(learnerId);
  if (!learner) {
    throw new HttpError(404, 'Learner not found');
  }
  return learner;
};

const ensureCourse = (courseId) => {
  const course = findCourseById(courseId);
  if (!course) {
    throw new HttpError(404, 'Course not found');
  }
  return course;
};

const ensureInstructorForCourse = (course) => {
  const instructor = findInstructorById(course.instructorId);
  if (!instructor) {
    throw new HttpError(500, 'Instructor missing for course');
  }
  return instructor;
};

const reconcileLearnerCourseUnlocks = (learner) => {
  if (!learner || !Array.isArray(learner.pendingCourses)) return;

  const settledCourseIds = new Set();
  for (const pending of learner.pendingCourses) {
    if (!pending?.transactionId || !pending?.courseId) continue;
    const tx = transactions.find((candidate) => candidate.id === pending.transactionId);
    if (tx?.status === 'settled') {
      settledCourseIds.add(pending.courseId);
    }
  }

  if (!settledCourseIds.size) return;

  learner.pendingCourses = learner.pendingCourses.filter((pending) => !settledCourseIds.has(pending?.courseId));
  for (const courseId of settledCourseIds) {
    if (!learner.enrolledCourses.includes(courseId)) {
      learner.enrolledCourses.push(courseId);
    }
  }
};

export const getLearnerProfile = (learnerId) => {
  const learner = ensureLearner(learnerId);
  reconcileLearnerCourseUnlocks(learner);
  const profile = buildLearnerView(learner);
  return {
    learner: profile,
    bankAccount:
      learner.bankAccount?.accountNumber && getAccountSnapshot(learner.bankAccount.accountNumber),
  };
};

export const configureLearnerBank = (learnerId, payload) => {
  const { accountNumber, secret, initialCredits, creditLimit } = payload;
  if (!accountNumber || !secret) {
    throw new HttpError(400, 'Account number and secret are required');
  }

  const learner = ensureLearner(learnerId);
  upsertAccount({
    accountNumber,
    secret,
    ownerId: learner.id,
    ownerType: 'learner',
    initialCredits,
    creditLimit,
  });

  learner.bankAccount = { accountNumber };
  return {
    learner: buildLearnerView(learner),
    bankAccount: getAccountSnapshot(accountNumber),
  };
};

// Handles the purchase logic: verifies funds, transfers credits to LMS org, and creates a pending transaction
export const enrollInCourse = (learnerId, { courseId, secret }) => {
  if (!courseId || !secret) {
    throw new HttpError(400, 'Course ID and bank secret are required');
  }

  // 1. Validate prerequisites
  const learner = ensureLearner(learnerId);
  if (!learner.bankAccount?.accountNumber) {
    throw new HttpError(400, 'Learner bank information not configured');
  }

  const course = ensureCourse(courseId);
  // Check if already enrolled or pending
  if (learner.enrolledCourses.includes(course.id)) {
    throw new HttpError(400, 'Course already unlocked');
  }
  if (learner.pendingCourses.some((pending) => pending.courseId === course.id)) {
    throw new HttpError(400, 'Course purchase awaiting instructor validation');
  }

  const instructor = ensureInstructorForCourse(course);

  // 2. Verify Bank Secret
  verifySecret(learner.bankAccount.accountNumber, secret);

  // 3. Transfer credits from Learner -> LMS Organization (Holding)
  transferCredits({
    fromAccount: learner.bankAccount.accountNumber,
    toAccount: getOrgAccountNumber(),
    amount: course.price,
  });

  // 4. Create Transaction Record (Pending Payout)
  const transactionId = uuid();
  const grossAmount = course.price;
  const transactionRecord = {
    id: transactionId,
    type: 'course-sale',
    courseId: course.id,
    learnerId: learner.id,
    instructorId: instructor.id,
    amount: grossAmount,
    grossAmount,
    payoutAmount: computeInstructorPayout(grossAmount),
    status: 'pending_request',
    fromAccount: getOrgAccountNumber(),
    toAccount: instructor.accountNumber,
    createdAt: new Date().toISOString(),
    requestedAt: null,
    approvedAt: null,
    rejectedAt: null,
    settledAt: null,
  };

  transactions.push(transactionRecord);
  learner.pendingCourses.push({ courseId: course.id, transactionId });

  return {
    message: 'Purchase successful. Awaiting instructor payout request, LMS approval, and instructor validation.',
    transaction: transactionRecord,
    learner: buildLearnerView(learner),
  };
};

export const completeCourse = (learnerId, { courseId, answer }) => {
  if (!courseId) {
    throw new HttpError(400, 'Course ID is required');
  }

  const learner = ensureLearner(learnerId);
  if (!learner.enrolledCourses.includes(courseId)) {
    throw new HttpError(400, 'Course not unlocked for learner');
  }

  const course = ensureCourse(courseId);
  const question = Array.isArray(course.materials?.mcq) ? course.materials.mcq[0] : null;
  if (!question?.answer) {
    throw new HttpError(400, 'Completion quiz missing for this course');
  }

  const normalize = (value) => String(value ?? '').trim().toLowerCase();
  const provided = normalize(answer);
  if (!provided) {
    throw new HttpError(400, 'Answer is required to complete the course');
  }
  if (provided !== normalize(question.answer)) {
    throw new HttpError(400, 'Incorrect answer. Please review the course and try again.');
  }

  if (learner.completedCourses.includes(courseId)) {
    throw new HttpError(400, 'Course already marked complete');
  }

  learner.completedCourses.push(courseId);
  const certificate = createCertificate(learnerId, courseId);
  learner.certificates.push(certificate);

  return {
    message: 'Course completed and certificate issued.',
    certificate,
    learner: buildLearnerView(learner),
  };
};

const buildCertificatePdf = async ({ certificateId, learnerName, courseTitle, issuedAt }) => {
  const doc = new PDFDocument({ size: 'A4', margin: 54 });
  const chunks = [];

  return await new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(24).text('Certificate of Completion', { align: 'center' });
    doc.moveDown(1.2);
    doc.fontSize(12).text('This certifies that', { align: 'center' });
    doc.moveDown(0.6);
    doc.fontSize(18).text(learnerName, { align: 'center' });
    doc.moveDown(0.6);
    doc.fontSize(12).text('has successfully completed the course', { align: 'center' });
    doc.moveDown(0.6);
    doc.fontSize(16).text(courseTitle, { align: 'center' });
    doc.moveDown(1.2);
    doc.fontSize(10).text(`Issued: ${new Date(issuedAt).toLocaleString()}`, { align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(10).text(`Certificate ID: ${certificateId}`, { align: 'center' });
    doc.end();
  });
};

export const getCertificatePdf = async (learnerId, certificateId) => {
  const learner = ensureLearner(learnerId);
  const certificate = (learner.certificates || []).find((c) => c.id === certificateId);
  if (!certificate) {
    throw new HttpError(404, 'Certificate not found');
  }

  const course = findCourseById(certificate.courseId);
  if (!course) {
    throw new HttpError(404, 'Course not found');
  }

  const buffer = await buildCertificatePdf({
    certificateId: certificate.id,
    learnerName: learner.name,
    courseTitle: course.title,
    issuedAt: certificate.issuedAt,
  });

  return {
    filename: `certificate-${certificate.id}.pdf`,
    buffer,
  };
};
