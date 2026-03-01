/**
 * INSTRUCTOR SERVICE
 * ------------------------------------------------------------
 * Powers instructor workflows:
 * - Dashboard aggregation (courses, enrollments, transactions, wallet)
 * - Course upload/update with material validation and bonuses
 * - Payout lifecycle (request, validate, settle) with bank secret checks
 * - Wallet credential updates and per-transaction validation
 */
import { v4 as uuid } from 'uuid';
import {
  instructors,
  courses,
  transactions,
  learners,
  findInstructorById,
  findCourseById,
} from '../data/store.js';
import { HttpError } from '../utils/httpError.js';
import { transferCredits, verifySecret, getAccountSnapshot, getOrgAccountNumber, setAccountSecret } from './bankService.js';

const ensureInstructor = (instructorId) => {
  const instructor = findInstructorById(instructorId);
  if (!instructor) {
    throw new HttpError(404, 'Instructor not found');
  }
  return instructor;
};

const cloneCourse = (course) => ({ ...course });

const getInstructorCourses = (instructorId) => courses.filter((course) => course.instructorId === instructorId);

const MATERIAL_UPDATE_BONUS = 5;

const normalizeMaterialList = (value) => {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value];
};

export const getInstructorDashboard = (instructorId) => {
  const instructor = ensureInstructor(instructorId);
  const instructorCourses = getInstructorCourses(instructorId);
  const enrollmentsByCourseId = new Map();

  for (const course of instructorCourses) {
    const enrolled = learners
      .filter((learner) => learner.enrolledCourses.includes(course.id) || learner.completedCourses.includes(course.id))
      .map((learner) => ({
        id: learner.id,
        name: learner.name,
        email: learner.email,
        avatar: learner.avatar,
        progress: learner.completedCourses.includes(course.id) ? 100 : 35,
      }));
    enrollmentsByCourseId.set(course.id, enrolled);
  }

  return {
    instructor,
    courses: instructorCourses.map((course) => ({
      ...cloneCourse(course),
      enrolledStudents: enrollmentsByCourseId.get(course.id) || [],
    })),
    transactions: transactions
      .filter((tx) => tx.instructorId === instructorId)
      .map((tx) => ({
        ...tx,
        course: tx.courseId ? courses.find((candidate) => candidate.id === tx.courseId) : null,
        learner: tx.learnerId ? learners.find((candidate) => candidate.id === tx.learnerId) : null,
      })),
    bankAccount: getAccountSnapshot(instructor.accountNumber),
  };
};

export const uploadCourse = (instructorId, payload) => {
  const requiredFields = ['title', 'description', 'category', 'price', 'duration'];
  const missing = requiredFields.filter((field) => !payload[field]);
  if (missing.length) {
    throw new HttpError(400, `Missing course fields: ${missing.join(', ')}`);
  }

  const ensureUploadedMaterial = (material, label) => {
    if (material === null || material === undefined) return;

    const list = normalizeMaterialList(material);
    for (const item of list) {
      if (item === null || item === undefined) continue;
      if (typeof item === 'string') {
        throw new HttpError(400, `${label} must be an uploaded file (not a URL).`);
      }
      if (typeof item !== 'object' || !item.dataUrl) {
        throw new HttpError(400, `${label} upload is invalid.`);
      }
    }
  };

  const rawMaterials = payload.materials && typeof payload.materials === 'object' ? payload.materials : {};
  const normalizedMaterials = {
    video: rawMaterials.video ? normalizeMaterialList(rawMaterials.video) : null,
    audio: rawMaterials.audio ? normalizeMaterialList(rawMaterials.audio) : null,
    text: rawMaterials.text ? normalizeMaterialList(rawMaterials.text) : null,
    mcq: Array.isArray(rawMaterials.mcq) ? rawMaterials.mcq : [],
  };

  const firstQuestion = normalizedMaterials.mcq.length ? normalizedMaterials.mcq[0] : null;
  const questionText = String(firstQuestion?.question || '').trim();
  const options = Array.isArray(firstQuestion?.options)
    ? firstQuestion.options.map((opt) => String(opt || '').trim()).filter(Boolean)
    : [];
  const answer = String(firstQuestion?.answer || '').trim();

  if (!questionText) {
    throw new HttpError(400, 'Completion MCQ is required.');
  }
  if (options.length < 2) {
    throw new HttpError(400, 'Completion MCQ requires at least 2 options.');
  }
  if (!answer || !options.includes(answer)) {
    throw new HttpError(400, 'Completion MCQ must have a valid answer.');
  }

  ensureUploadedMaterial(normalizedMaterials.video, 'Video');
  ensureUploadedMaterial(normalizedMaterials.audio, 'Audio');
  ensureUploadedMaterial(normalizedMaterials.text, 'Notes');

  const instructor = ensureInstructor(instructorId);
  const courseId = `course-${uuid()}`;

  // 1. Create Course
  const newCourse = {
    id: courseId,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    price: payload.price,
    duration: payload.duration,
    heroImage:
      payload.heroImage || `https://source.unsplash.com/random/1200x800?learning,${encodeURIComponent(payload.category)}`,
    instructorId: instructor.id,
    materials: normalizedMaterials,
    createdAt: new Date().toISOString(),
  };

  courses.push(newCourse);

  return {
    message: 'Course uploaded.',
    course: newCourse,
    bankAccount: getAccountSnapshot(instructor.accountNumber),
  };
};

export const requestPayouts = (instructorId) => {
  const instructor = ensureInstructor(instructorId);
  const now = new Date().toISOString();
  const targets = transactions.filter(
    (tx) =>
      tx.instructorId === instructor.id && ['pending_request', 'pending_payout', 'rejected'].includes(tx.status),
  );

  for (const tx of targets) {
    tx.status = 'requested';
    tx.requestedAt = now;
    if (tx.approvedAt === undefined) tx.approvedAt = null;
    if (tx.rejectedAt === undefined) tx.rejectedAt = null;
    if (tx.payoutAmount === undefined) {
      tx.payoutAmount = Math.round((Number(tx.amount) || 0) * 0.3);
    }
    if (tx.grossAmount === undefined) {
      tx.grossAmount = tx.amount;
    }
  }

  return {
    message: targets.length ? 'Payout request submitted to LMS org.' : 'No pending payouts to request.',
    requestedCount: targets.length,
    transactions: targets,
  };
};

export const validateApprovedPayouts = (instructorId, { secret }) => {
  if (!secret) {
    throw new HttpError(400, 'Bank secret is required');
  }

  const instructor = ensureInstructor(instructorId);
  verifySecret(instructor.accountNumber, secret);

  const approved = transactions.filter((tx) => tx.instructorId === instructor.id && tx.status === 'approved');
  if (!approved.length) {
    throw new HttpError(400, 'No approved payouts available to validate');
  }

  const totalAmount = approved.reduce((sum, tx) => sum + (Number(tx.payoutAmount) || 0), 0);
  if (totalAmount <= 0) {
    throw new HttpError(400, 'Approved payout total is invalid');
  }

  transferCredits({
    fromAccount: getOrgAccountNumber(),
    toAccount: instructor.accountNumber,
    amount: totalAmount,
  });

  const now = new Date().toISOString();
  for (const tx of approved) {
    tx.status = 'settled';
    tx.settledAt = now;

    if (tx.type === 'course-sale') {
      const learner = learners.find((lrn) => lrn.id === tx.learnerId);
      if (learner) {
        const pendingIdx = learner.pendingCourses.findIndex((pending) => pending.transactionId === tx.id);
        if (pendingIdx !== -1) {
          learner.pendingCourses.splice(pendingIdx, 1);
        }
        if (!learner.enrolledCourses.includes(tx.courseId)) {
          learner.enrolledCourses.push(tx.courseId);
        }
      }
    }
  }

  return {
    message: 'Payouts validated. Credits transferred and courses unlocked.',
    totalAmount,
    transactions: approved,
    bankAccount: getAccountSnapshot(instructor.accountNumber),
  };
};

export const updateCourse = (instructorId, courseId, payload) => {
  const instructor = ensureInstructor(instructorId);
  const course = findCourseById(courseId);
  if (!course) {
    throw new HttpError(404, 'Course not found');
  }
  if (course.instructorId !== instructor.id) {
    throw new HttpError(403, 'Course does not belong to this instructor');
  }

  const ensureNoUrlMaterial = (material, label) => {
    if (material === undefined) return;
    if (material === null) return;

    const list = normalizeMaterialList(material);
    for (const item of list) {
      if (item === undefined) continue;
      if (item === null) continue;

      if (typeof item === 'string') {
        const value = item.trim();
        const isProbablyUrl =
          value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:');
        if (label === 'Notes' && !isProbablyUrl) {
          continue;
        }
        throw new HttpError(400, `${label} must be an uploaded file (not a URL).`);
      }

      if (typeof item !== 'object' || !item.dataUrl) {
        throw new HttpError(400, `${label} upload is invalid.`);
      }
    }
  };

  if (payload?.materials) {
    if (payload.materials.video === null || payload.materials.audio === null || payload.materials.text === null) {
      throw new HttpError(403, 'Only admins can remove course materials.');
    }
    ensureNoUrlMaterial(payload.materials.video, 'Video');
    ensureNoUrlMaterial(payload.materials.audio, 'Audio');
    ensureNoUrlMaterial(payload.materials.text, 'Notes');
  }

  const allowed = ['title', 'description', 'category', 'price', 'duration', 'heroImage'];
  for (const key of allowed) {
    if (payload[key] !== undefined) {
      course[key] = payload[key];
    }
  }

  if (payload.materials !== undefined) {
    const existingMaterials = course.materials && typeof course.materials === 'object' ? course.materials : {};
    const nextMaterialsPatch = payload.materials && typeof payload.materials === 'object' ? payload.materials : {};

    const isMaterialPresent = (material) => {
      if (material === null || material === undefined) return false;
      if (Array.isArray(material)) return material.some((item) => isMaterialPresent(item));
      if (typeof material === 'string') return String(material).trim().length > 0;
      if (typeof material === 'object') return !!material.dataUrl;
      return false;
    };

    const countAddedItems = (key) => {
      if (nextMaterialsPatch[key] === undefined) return 0;
      if (nextMaterialsPatch[key] === null) return 0;
      const list = normalizeMaterialList(nextMaterialsPatch[key]);
      return list.filter((item) => isMaterialPresent(item)).length;
    };

    const newlyAddedCount = countAddedItems('video') + countAddedItems('audio') + countAddedItems('text');

    const mergeMaterialField = (key) => {
      if (nextMaterialsPatch[key] === undefined) return existingMaterials[key];
      if (nextMaterialsPatch[key] === null) return null;
      if (typeof nextMaterialsPatch[key] === 'string') return nextMaterialsPatch[key];
      const existingList = normalizeMaterialList(existingMaterials[key]);
      const addList = normalizeMaterialList(nextMaterialsPatch[key]);
      const nextList = [...existingList, ...addList].filter(Boolean);
      return nextList.length ? nextList : null;
    };

    const mergedMaterials = {
      ...existingMaterials,
      ...nextMaterialsPatch,
    };

    mergedMaterials.video = mergeMaterialField('video');
    mergedMaterials.audio = mergeMaterialField('audio');
    mergedMaterials.text = mergeMaterialField('text');

    course.materials = mergedMaterials;

    let bonusTx = null;
    if (newlyAddedCount > 0) {
      const bonusAmount = newlyAddedCount * MATERIAL_UPDATE_BONUS;
      bonusTx = {
        id: uuid(),
        type: 'material-bonus',
        courseId: course.id,
        learnerId: null,
        instructorId: instructor.id,
        amount: bonusAmount,
        grossAmount: bonusAmount,
        payoutAmount: bonusAmount,
        status: 'pending_request',
        fromAccount: getOrgAccountNumber(),
        toAccount: instructor.accountNumber,
        createdAt: new Date().toISOString(),
        requestedAt: null,
        approvedAt: null,
        rejectedAt: null,
        settledAt: null,
      };
      transactions.push(bonusTx);
    }

    return {
      message: bonusTx ? 'Course updated. Content bonus pending request.' : 'Course updated.',
      course: cloneCourse(course),
      bonusTransaction: bonusTx,
    };
  }

  return {
    message: 'Course updated.',
    course: cloneCourse(course),
    bonusTransaction: null,
  };
};

export const updateInstructorWallet = (instructorId, { bankSecret } = {}) => {
  const instructor = ensureInstructor(instructorId);
  if (!bankSecret) {
    throw new HttpError(400, 'bankSecret is required');
  }

  setAccountSecret(instructor.accountNumber, bankSecret);
  return {
    message: 'Wallet updated.',
    bankAccount: getAccountSnapshot(instructor.accountNumber),
  };
};

export const validateTransaction = (instructorId, transactionId, { secret }) => {
  const instructor = ensureInstructor(instructorId);
  const tx = transactions.find((candidate) => candidate.id === transactionId);
  if (!tx) {
    throw new HttpError(404, 'Transaction not found');
  }
  if (tx.instructorId !== instructor.id) {
    throw new HttpError(403, 'Transaction does not belong to this instructor');
  }
  if (tx.status !== 'approved') {
    throw new HttpError(400, 'Transaction is not approved by LMS org');
  }
  return validateApprovedPayouts(instructorId, { secret });
};
