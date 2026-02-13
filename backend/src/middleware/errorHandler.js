export const notFoundHandler = (_req, res) => {
  res.status(404).json({
    error: 'NotFound',
    message: 'Route not found.'
  });
};

export const errorHandler = (error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const payload = {
    error: error.error || 'InternalServerError',
    message: error.message || 'Something went wrong.'
  };

  if (error.details) payload.details = error.details;
  if (statusCode >= 500) console.error('Unhandled server error:', error);

  res.status(statusCode).json(payload);
};
