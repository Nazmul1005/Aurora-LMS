export const notFoundHandler = (req, res, next) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
};

export const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Unexpected server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
