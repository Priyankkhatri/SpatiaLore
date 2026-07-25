export function errorHandler(err, req, res, _next) {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'An unexpected error occurred.',
  });
}
