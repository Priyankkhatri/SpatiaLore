export function errorHandler(err, req, res, _next) {
  // Handle Express body-parser size limit error (express.json limit: '50kb')
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      error: 'payload_too_large',
      message: 'Request payload exceeds maximum allowed size limit of 50kb.',
    });
  }

  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: 'internal_server_error',
    message: err.message || 'An unexpected error occurred.',
  });
}
