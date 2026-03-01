export class HttpError extends Error {
  constructor(statusCode = 500, message = 'Unexpected server error') {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

export const withErrorHandling = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    next(error);
  }
};
