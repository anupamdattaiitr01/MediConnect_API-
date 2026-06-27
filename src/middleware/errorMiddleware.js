export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource Not Found: The requested path '${req.originalUrl}' does not exist on this server.`
  });
};


export const globalErrorHandler = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Payload: The request body contains broken or malformed JSON syntax.'
    });
  }

  console.error('🔴 Critical Server Exception Intercepted:', err.stack || err.message);

  res.status(err.status || 500).json({
    success: false,
    message: 'Internal Server Error: An unexpected issue occurred within the application layer.'
  });
};