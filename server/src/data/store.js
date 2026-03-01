/**
 * ============================================================================
 * AURORA LMS DATA STORE
 * ============================================================================
 * 
 * In-memory data store for the LMS simulation.
 * Contains all entities: instructors, learners, admins, courses, transactions.
 * Data resets when server restarts (intentional for simulation purposes).
 * 
 * Entities:
 * - LMS_ORG: The organization that hosts the platform
 * - instructors: Course creators who earn from content
 * - learners: Students who purchase and complete courses
 * - admins: System administrators with full oversight
 * - courses: Learning content with materials
 * - transactions: Credit transfer records
 * - bankAccounts: Credit balances for all entities
 * 
 * @author Aurora LMS Team
 * @version 2.0.0
 */

import { v4 as uuid } from 'uuid';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Lump sum credit reward given to instructors when they upload a course
 * @constant {number}
 */
export const LUMP_SUM_ON_UPLOAD = 250;

/**
 * Maximum number of courses the system can host
 * @constant {number}
 */
export const MAX_COURSES = 5;

// ============================================================================
// LMS ORGANIZATION
// ============================================================================

/**
 * The LMS organization entity
 * Acts as intermediary for all credit transactions
 */
export const LMS_ORG = {
  id: 'lms-org',
  name: 'Aurora Learning Circle',
  accountNumber: 'ACC-LMS-001',
};

export const instructors = [
  {
    id: 'inst-1',
    name: 'Ratul',
    email: 'ratul@aurora.ui',
    avatar: 'https://i.pravatar.cc/150?img=47',
    expertise: 'Machine Learning & Responsible AI',
    accountNumber: 'ACC01',
    bankSecret: 'ratul',
    portalSecret: 'ratul-portal',
  },
  {
    id: 'inst-2',
    name: 'Nazmul',
    email: 'nazmul@aurora.ui',
    avatar: 'https://i.pravatar.cc/150?img=22',
    expertise: 'Design Systems & UI Motion',
    accountNumber: 'ACC02',
    bankSecret: 'nazmul',
    portalSecret: 'nazmul-portal',
  },
  {
    id: 'inst-3',
    name: 'Deen',
    email: 'deen@aurora.ui',
    avatar: 'https://i.pravatar.cc/150?img=12',
    expertise: 'Cloud Infrastructure & DevOps',
    accountNumber: 'ACC03',
    bankSecret: 'deen',
    portalSecret: 'deen-portal',
  },
];

export const learners = [
  {
    id: 'learner-1',
    name: 'Manik',
    email: 'manik@aurora.ui',
    avatar: 'https://i.pravatar.cc/150?img=5',
    username: 'manik',
    portalSecret: 'manik',
    enrolledCourses: [],
    pendingCourses: [],
    completedCourses: [],
    certificates: [],
    bankAccount: null,
  },
  {
    id: 'learner-2',
    name: 'Nazrul',
    email: 'nazrul@aurora.ui',
    avatar: 'https://i.pravatar.cc/150?img=14',
    username: 'nazrul',
    portalSecret: 'nazrul',
    enrolledCourses: [],
    pendingCourses: [],
    completedCourses: [],
    certificates: [],
    bankAccount: null,
  },
];

export const admins = [
  {
    id: 'admin-1',
    name: 'Karypto',
    email: 'karypto@aurora.ui',
    role: 'admin',
    portalSecret: 'karypto',
  },
];

export const courses = [
  {
    id: 'course-1',
    title: 'Designing Narrative Learning Journeys',
    description:
      'Blend storytelling, micro-interactions, and neural design cues to keep learners engaged across long-form cohorts.',
    category: 'Learning Experience',
    price: 180,
    duration: '6 weeks',
    instructorId: 'inst-2',
    heroImage: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085',
    materials: {
      video: 'https://videos.pexels.com/video-files/4481258/4481258-uhd_2560_1440_25fps.mp4',
      text: 'Narrative frameworks, immersion arcs, and assessment loops.',
      audio: 'https://www2.cs.uic.edu/~i101/SoundFiles/PinkPanther30.wav',
      mcq: [
        {
          id: 'q1',
          question: 'Which element sparks emotional continuity in a learning story?',
          options: ['Module length', 'Anchor motif', 'Assessment difficulty', 'CTA color'],
          answer: 'Anchor motif',
        },
      ],
    },
  },
  {
    id: 'course-2',
    title: 'Ethical AI Lab Sprints',
    description:
      'Prototype AI features with fairness metrics, synthetic data audits, and compliance dashboards.',
    category: 'AI Engineering',
    price: 220,
    duration: '4 weeks',
    instructorId: 'inst-1',
    heroImage: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
    materials: {
      video: 'https://videos.pexels.com/video-files/856188/856188-hd_1920_1080_25fps.mp4',
      text: 'Bias sensing, guardrails, and interpretability sandboxes.',
      audio: 'https://www2.cs.uic.edu/~i101/SoundFiles/StarWars3.wav',
      mcq: [
        {
          id: 'q2',
          question: 'What metric helps quantify disparate impact?',
          options: ['Precision', 'Recall', 'Selection rate ratio', 'Latency'],
          answer: 'Selection rate ratio',
        },
      ],
    },
  },
  {
    id: 'course-3',
    title: 'Generative Motion for Interfaces',
    description:
      'Craft adaptive motion patterns, UI tactility, and sonic cues for premium products.',
    category: 'Interface Design',
    price: 160,
    duration: '5 weeks',
    instructorId: 'inst-2',
    heroImage: 'https://images.unsplash.com/photo-1484417894907-623942c8ee29',
    materials: {
      video: 'https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_25fps.mp4',
      text: 'Timing curves, depth states, and haptic heuristics.',
      audio: 'https://www2.cs.uic.edu/~i101/SoundFiles/CantinaBand60.wav',
      mcq: [
        {
          id: 'q3',
          question: 'What curve type keeps focus on microcopy transitions?',
          options: ['Ease-in', 'Ease-out', 'Ease-in-out', 'Linear'],
          answer: 'Ease-in-out',
        },
      ],
    },
  },
  {
    id: 'course-4',
    title: 'Cloud-native Reliability Studios',
    description:
      'Chaos drills, automated runbooks, and carbon-aware scaling strategies.',
    category: 'DevOps',
    price: 210,
    duration: '7 weeks',
    instructorId: 'inst-3',
    heroImage: 'https://images.unsplash.com/photo-1472289065668-ce650ac443d2',
    materials: {
      video: 'https://videos.pexels.com/video-files/4496263/4496263-uhd_2560_1440_25fps.mp4',
      text: 'SLO economics, failure pattern mapping, service choreography.',
      audio: 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav',
      mcq: [
        {
          id: 'q4',
          question: 'Which practice validates SLO assumptions under stress?',
          options: ['Blue/green deploys', 'Chaos experiments', 'Feature flags', 'Static analysis'],
          answer: 'Chaos experiments',
        },
      ],
    },
  },
  {
    id: 'course-5',
    title: 'Product Rituals & Learning Cultures',
    description:
      'Establish weekly fieldnotes, ritualized demos, and foresight salons.',
    category: 'Leadership',
    price: 150,
    duration: '3 weeks',
    instructorId: 'inst-3',
    heroImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40',
    materials: {
      video: 'https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_25fps.mp4',
      text: 'Community cadences, learning pods, and artefact libraries.',
      audio: 'https://www2.cs.uic.edu/~i101/SoundFiles/Front_Center.wav',
      mcq: [
        {
          id: 'q5',
          question: 'Which ritual builds longitudinal learning memory?',
          options: ['Standups', 'Foresight salons', 'Retros', '1:1s'],
          answer: 'Foresight salons',
        },
      ],
    },
  },
];

export const transactions = [];

export const bankAccounts = new Map([
  [
    LMS_ORG.accountNumber,
    {
      accountNumber: LMS_ORG.accountNumber,
      ownerType: 'organization',
      ownerId: LMS_ORG.id,
      credits: 3500,
      creditLimit: 0,
      creditUsed: 0,
      secret: 'lms-vault',
    },
  ],
  ...instructors.map((inst, index) => [
    inst.accountNumber,
    {
      accountNumber: inst.accountNumber,
      ownerType: 'instructor',
      ownerId: inst.id,
      credits: 150 + index * 40,
      creditLimit: 0,
      creditUsed: 0,
      secret: inst.bankSecret,
    },
  ]),
]);

export const findLearnerById = (id) => learners.find((learner) => learner.id === id);
export const findInstructorById = (id) => instructors.find((instructor) => instructor.id === id);
export const findCourseById = (id) => courses.find((course) => course.id === id);
export const findTransactionById = (id) => transactions.find((tx) => tx.id === id);

export const createCertificate = (learnerId, courseId) => ({
  id: uuid(),
  learnerId,
  courseId,
  issuedAt: new Date().toISOString(),
});
