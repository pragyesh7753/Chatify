import { randomUUID } from 'crypto';

/**
 * Middleware to add unique request ID to each request
 * Useful for tracking requests through logs
 */
export const requestId = (req, res, next) => {
  // Use existing request ID from header if present, otherwise generate new one
  req.id = req.get('X-Request-ID') || randomUUID();
  
  // Add request ID to response headers for client tracking
  res.setHeader('X-Request-ID', req.id);
  
  next();
};
