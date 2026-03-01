/**
 * ============================================================================
 * AURORA LMS API CLIENT
 * ============================================================================
 * 
 * HTTP client for communicating with the Aurora LMS backend.
 * Handles all API requests with proper error handling and fallbacks.
 * 
 * @author Aurora LMS Team
 * @version 2.0.0
 */

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000/api';

const defaultHeaders = { 'Content-Type': 'application/json' };

/**
 * Generic request handler with error handling
 * @param {string} path - API endpoint path
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Response data
 * @throws {Error} On network or API errors
 */
const request = async (path, options = {}) => {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...defaultHeaders, ...(options.headers || {}) },
    });

    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }
    
    return data;
  } catch (error) {
    // Handle network errors (server not running, CORS, etc.)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Cannot connect to server. Please ensure the backend is running.');
    }
    throw error;
  }
};

export const login = (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
export const register = (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
export const fetchCourses = () => request('/courses');
export const fetchLearner = (learnerId) => request(`/learners/${learnerId}`);
export const configureLearnerBank = (learnerId, payload) =>
  request(`/learners/${learnerId}/bank`, { method: 'POST', body: JSON.stringify(payload) });
export const enrollLearnerCourse = (learnerId, payload) =>
  request(`/learners/${learnerId}/enroll`, { method: 'POST', body: JSON.stringify(payload) });
export const completeLearnerCourse = (learnerId, payload) =>
  request(`/learners/${learnerId}/complete`, { method: 'POST', body: JSON.stringify(payload) });

export const getCertificatePdfUrl = (learnerId, certificateId) =>
  `${API_BASE}/learners/${learnerId}/certificates/${certificateId}/pdf`;

export const fetchInstructor = (instructorId) => request(`/instructors/${instructorId}`);
export const uploadInstructorCourse = (instructorId, payload) =>
  request(`/instructors/${instructorId}/courses`, { method: 'POST', body: JSON.stringify(payload) });
export const updateInstructorCourse = (instructorId, courseId, payload) =>
  request(`/instructors/${instructorId}/courses/${courseId}`, { method: 'PATCH', body: JSON.stringify(payload) });

export const requestInstructorPayouts = (instructorId) =>
  request(`/instructors/${instructorId}/payouts/request`, { method: 'POST' });
export const validateInstructorPayouts = (instructorId, payload) =>
  request(`/instructors/${instructorId}/payouts/validate`, { method: 'POST', body: JSON.stringify(payload) });

export const updateInstructorWallet = (instructorId, payload) =>
  request(`/instructors/${instructorId}/wallet`, { method: 'PATCH', body: JSON.stringify(payload) });

export const fetchAdminDashboard = (adminId) => request(`/admin/${adminId}/dashboard`);
export const approveAdminPayouts = (adminId, payload) =>
  request(`/admin/${adminId}/payouts/approve`, { method: 'POST', body: JSON.stringify(payload) });
export const rejectAdminPayouts = (adminId, payload) =>
  request(`/admin/${adminId}/payouts/reject`, { method: 'POST', body: JSON.stringify(payload) });

export const updateAdminCourseMaterials = (adminId, courseId, payload) =>
  request(`/admin/${adminId}/courses/${courseId}/materials`, { method: 'PATCH', body: JSON.stringify(payload) });
export const fetchOrgAccount = (accountNumber) => request(`/bank/accounts/${accountNumber}`);

export const DEFAULT_IDS = {
  learner: 'learner-1',
  instructor: 'inst-1',
  admin: 'admin-1',
  orgAccount: 'ACC-LMS-001',
};
