/**
 * AUTH SERVICE
 * ------------------------------------------------------------
 * Issues mock session tokens for learners, instructors, and admins.
 * Supports learner registration and role-aware login using in-memory users.
 */
import { v4 as uuid } from 'uuid';
import { HttpError } from '../utils/httpError.js';
import { learners, instructors, admins } from '../data/store.js';

/**
 * Default avatar URL generator
 */
const getAvatar = (name) => 
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

const normalizeIdentifier = (value) => value?.trim().toLowerCase();

const buildSession = (role, entity) => ({
  token: uuid(),
  issuedAt: new Date().toISOString(),
  role,
  profile: {
    id: entity.id,
    name: entity.name,
    avatar: entity.avatar || getAvatar(entity.name),
  },
});

// --- FINDERS ---
const findLearner = (identifier) =>
  learners.find(
    (l) =>
      normalizeIdentifier(l.id) === identifier ||
      normalizeIdentifier(l.username) === identifier
  );

const findInstructor = (identifier) =>
  instructors.find(
    (i) =>
      normalizeIdentifier(i.id) === identifier ||
      normalizeIdentifier(i.username) === identifier
  );

const findAdmin = (identifier) =>
  admins.find(
    (a) =>
      normalizeIdentifier(a.id) === identifier ||
      normalizeIdentifier(a.username) === identifier
  );

// --- ACTIONS ---

export const register = ({ name, secret, role }) => {
  // 1. Validation
  if (!name || !secret) {
    throw new HttpError(400, 'Name and Password are required.');
  }
  if (role !== 'learner') {
    throw new HttpError(400, 'Registration is currently open for Learners only.');
  }


  // 3. Create Learner
  const newLearner = {
    id: `learner-${uuid().substr(0, 8)}`,
    name,
    username: name,
    portalSecret: secret, // Storing plain text for simulation only
    role: 'learner',
    avatar: getAvatar(name),
    enrolledCourses: [],
    pendingCourses: [],
    completedCourses: [],
    certificates: [],
    bankAccount: null,
  };

  // 4. Save to Store
  learners.push(newLearner);

  // 5. Return Session
  return buildSession('learner', newLearner);
};

export const login = ({ role, identifier, secret }) => {
  if (!role || !identifier || !secret) {
    throw new HttpError(400, 'Role, identifier, and secret are required');
  }

  const normalizedIdentifier = normalizeIdentifier(identifier);

  switch (role) {
    case 'learner': {
      const learner = findLearner(normalizedIdentifier);
      if (!learner || learner.portalSecret !== secret) {
        throw new HttpError(401, 'Invalid learner credentials');
      }
      return buildSession('learner', learner);
    }
    case 'instructor': {
      const instructor = findInstructor(normalizedIdentifier);
      if (!instructor || instructor.portalSecret !== secret) {
        throw new HttpError(401, 'Invalid instructor credentials');
      }
      return buildSession('instructor', instructor);
    }
    case 'admin': {
      const admin = findAdmin(normalizedIdentifier);
      if (!admin || admin.portalSecret !== secret) {
        throw new HttpError(401, 'Invalid admin credentials');
      }
      return buildSession('admin', admin);
    }
    default:
      throw new HttpError(400, `Unsupported role ${role}`);
  }
};