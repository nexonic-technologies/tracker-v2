import { v4 as uuidv4 } from 'uuid';

export const requestTracer = (req, res, next) => {
  req.id = uuidv4();

  // Log request start with ID
  // console.log(`[${req.id}] ${req.method} ${req.url}`);

  // Optional: override console.log to always include req.id if desired
  // For now, we just attach the ID to the request object

  next();
};
