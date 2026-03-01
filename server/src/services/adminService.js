/**
 * Admin Service
 * Provides system-wide dashboard data for LMS administrators
 * Aggregates metrics, transactions, and organization data
 */

import {
  admins,
  courses,
  instructors,
  learners,
  transactions,
  LMS_ORG,
} from '../data/store.js';
import { getAccountSnapshot } from './bankService.js';
import { HttpError } from '../utils/httpError.js';

const normalizeMaterialList = (value) => {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value];
};

/**
 * Enhances a course object with instructor metadata
 * @param {Object} course - Course object
 * @returns {Object} Course object with instructor metadata
 */
const withInstructorMeta = (course) => ({
  ...course,
  instructor: instructors.find((inst) => inst.id === course.instructorId),
});

const buildCourseEnrollments = (courseId) =>
  learners
    .filter(
      (learner) =>
        learner.enrolledCourses.includes(courseId) || learner.completedCourses.includes(courseId),
    )
    .map((learner) => ({
      id: learner.id,
      name: learner.name,
      email: learner.email,
      avatar: learner.avatar,
      status: learner.completedCourses.includes(courseId) ? 'Completed' : 'In Progress',
    }));

/**
 * Sorts a list of transactions in descending order by creation date
 * @param {Array} list - List of transactions
 * @returns {Array} Sorted list of transactions
 */
const sortTransactions = (list) =>
  [...list].sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0));

const withTransactionMeta = (tx) => ({
  ...tx,
  course: tx.courseId ? courses.find((c) => c.id === tx.courseId) : null,
  instructor: tx.instructorId ? instructors.find((i) => i.id === tx.instructorId) : null,
  learner: tx.learnerId ? learners.find((l) => l.id === tx.learnerId) : null,
});

/**
 * Retrieves comprehensive admin dashboard data
 * @param {Number} adminId - ID of the admin user
 * @returns {Object} Dashboard with metrics, organization data, courses, instructors, learners, and transactions
 */
export const getAdminDashboard = (adminId) => {
  const admin = admins.find((candidate) => candidate.id === adminId);
  if (!admin) {
    throw new HttpError(404, 'Admin not found');
  }

  const resolvedCourses = courses.map((course) => ({
    ...withInstructorMeta(course),
    enrolledStudents: buildCourseEnrollments(course.id),
  }));
  const orderedTransactions = sortTransactions(transactions).map(withTransactionMeta);

  return {
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
    organization: {
      ...LMS_ORG,
      bankAccount: getAccountSnapshot(LMS_ORG.accountNumber),
    },
    metrics: {
      courseCount: courses.length,
      instructorCount: instructors.length,
      learnerCount: learners.length,
      pendingTransactions: orderedTransactions.filter((tx) => ['pending_request', 'pending_payout', 'requested', 'approved'].includes(tx.status)).length,
    },
    courses: resolvedCourses,
    instructors,
    learners,
    transactions: orderedTransactions,
  };
};

export const approvePayoutRequests = (adminId, { transactionIds } = {}) => {
  const admin = admins.find((candidate) => candidate.id === adminId);
  if (!admin) {
    throw new HttpError(404, 'Admin not found');
  }

  if (!Array.isArray(transactionIds) || !transactionIds.length) {
    throw new HttpError(400, 'transactionIds is required');
  }

  const now = new Date().toISOString();
  const updated = [];

  for (const id of transactionIds) {
    const tx = transactions.find((candidate) => candidate.id === id);
    if (!tx) {
      throw new HttpError(404, `Transaction not found: ${id}`);
    }
    if (tx.status !== 'requested') {
      throw new HttpError(400, `Transaction not in requested state: ${id}`);
    }
    tx.status = 'approved';
    tx.approvedAt = now;
    tx.rejectedAt = null;
    updated.push(tx);
  }

  return {
    message: 'Payout requests approved.',
    approvedCount: updated.length,
    transactions: updated,
  };
};

export const rejectPayoutRequests = (adminId, { transactionIds } = {}) => {
  const admin = admins.find((candidate) => candidate.id === adminId);
  if (!admin) {
    throw new HttpError(404, 'Admin not found');
  }

  if (!Array.isArray(transactionIds) || !transactionIds.length) {
    throw new HttpError(400, 'transactionIds is required');
  }

  const now = new Date().toISOString();
  const updated = [];

  for (const id of transactionIds) {
    const tx = transactions.find((candidate) => candidate.id === id);
    if (!tx) {
      throw new HttpError(404, `Transaction not found: ${id}`);
    }
    if (!['requested', 'approved'].includes(tx.status)) {
      throw new HttpError(400, `Transaction not in requested/approved state: ${id}`);
    }
    tx.status = 'rejected';
    tx.rejectedAt = now;
    tx.approvedAt = null;
    updated.push(tx);
  }

  return {
    message: 'Payout requests rejected.',
    rejectedCount: updated.length,
    transactions: updated,
  };
};

export const updateCourseMaterialsAsAdmin = (adminId, courseId, { materials } = {}) => {
  const admin = admins.find((candidate) => candidate.id === adminId);
  if (!admin) {
    throw new HttpError(404, 'Admin not found');
  }

  const course = courses.find((candidate) => candidate.id === courseId);
  if (!course) {
    throw new HttpError(404, 'Course not found');
  }

  if (!materials || typeof materials !== 'object') {
    throw new HttpError(400, 'materials is required');
  }

  const allowedKeys = ['video', 'audio', 'text'];
  const patch = {};
  for (const key of allowedKeys) {
    if (materials[key] !== undefined) {
      patch[key] = materials[key];
    }
  }

  if (!Object.keys(patch).length) {
    throw new HttpError(400, 'No material changes provided');
  }

  const validateMaterial = (value, label) => {
    if (value === null) return;
    if (value === undefined) return;

    const list = normalizeMaterialList(value);
    for (const item of list) {
      if (item === null || item === undefined) continue;

      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (label === 'Notes') {
          if (!trimmed) {
            throw new HttpError(400, 'Notes cannot be empty');
          }
          continue;
        }

        const isProbablyUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:');
        if (!isProbablyUrl) {
          throw new HttpError(400, `${label} must be an uploaded file (or null to remove).`);
        }
        continue;
      }

      if (typeof item !== 'object' || !item.dataUrl) {
        throw new HttpError(400, `${label} upload is invalid.`);
      }
    }
  };

  validateMaterial(patch.video, 'Video');
  validateMaterial(patch.audio, 'Audio');
  validateMaterial(patch.text, 'Notes');

  const existing = course.materials && typeof course.materials === 'object' ? course.materials : {};
  course.materials = {
    ...existing,
    ...patch,
  };

  return {
    message: 'Course materials updated.',
    course,
  };
};
