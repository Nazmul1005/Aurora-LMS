/**
 * Course Routes
 * Read-only catalog endpoints exposing course metadata enriched with instructors.
 */
import express from 'express';
import { courses, instructors, findCourseById } from '../data/store.js';
import { HttpError } from '../utils/httpError.js';
import { withErrorHandling } from '../utils/httpError.js';

const router = express.Router();

const enrichCourse = (course) => {
  const instructor = instructors.find((inst) => inst.id === course.instructorId);
  return {
    ...course,
    instructor,
  };
};

router.get(
  '/',
  withErrorHandling(async (_req, res) => {
    res.json({ courses: courses.map(enrichCourse) });
  }),
);

router.get(
  '/:id',
  withErrorHandling(async (req, res) => {
    const course = findCourseById(req.params.id);
    if (!course) {
      throw new HttpError(404, 'Course not found');
    }
    res.json({ course: enrichCourse(course) });
  }),
);

export default router;
