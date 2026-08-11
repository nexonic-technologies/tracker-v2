/**
 * Production-Grade Error Sanitizer & Response Normalizer
 *
 * Controls error response verbosity based on process.env.EXPOSE_DETAILED_ERRORS and process.env.NODE_ENV.
 * In production mode, sensitive internal architecture details (role names, model names, stack traces)
 * are sanitized into clean, standardized HTTP status responses.
 */

export function sanitizeErrorResponse(err, req) {
  const isDevMode =
    process.env.EXPOSE_DETAILED_ERRORS === 'true' ||
    (process.env.NODE_ENV !== 'production' && process.env.EXPOSE_DETAILED_ERRORS !== 'false');

  const message = err.message || 'Internal Server Error';
  const isSecurityError =
    err.status === 403 ||
    err.code === 'FORBIDDEN' ||
    err.code === 'PERMISSION_DENIED' ||
    err.code === 'TENANT_MISMATCH' ||
    err.code === 'POLICY_NOT_FOUND' ||
    message.includes('ACCESS DENIED') ||
    message.includes('CRITICAL SECURITY') ||
    message.includes('permission') ||
    message.includes('Role mismatch') ||
    message.includes('No policy defined');

  let statusCode = err.status;
  if (!statusCode) {
    statusCode = isSecurityError ? 403 : 500;
  }

  const requestId = req?.id || req?.headers?.['x-request-id'];

  if (isSecurityError) {
    return {
      statusCode: 403,
      payload: {
        success: false,
        error: isDevMode ? message : 'Access Denied',
        code: err.code || 'FORBIDDEN',
        ...(isDevMode && { details: message, stack: err.stack }),
        ...(requestId && { requestId }),
      },
    };
  }

  if (statusCode === 400 || err.code === 'BAD_REQUEST' || err.code === 'TENANT_IDENTIFIER_MISSING') {
    return {
      statusCode: 400,
      payload: {
        success: false,
        error: isDevMode ? message : 'Bad Request',
        code: err.code || 'BAD_REQUEST',
        ...(isDevMode && { details: message, stack: err.stack }),
        ...(requestId && { requestId }),
      },
    };
  }

  if (statusCode === 401 || err.code === 'UNAUTHORIZED') {
    return {
      statusCode: 401,
      payload: {
        success: false,
        error: isDevMode ? message : 'Unauthorized',
        code: err.code || 'UNAUTHORIZED',
        ...(requestId && { requestId }),
      },
    };
  }

  if (statusCode === 402 || err.code === 'TENANT_SUSPENDED') {
    return {
      statusCode: 402,
      payload: {
        success: false,
        error: isDevMode ? message : 'Account Suspended',
        code: err.code || 'TENANT_SUSPENDED',
        ...(requestId && { requestId }),
      },
    };
  }

  // Generic Internal Server Error (500)
  return {
    statusCode,
    payload: {
      success: false,
      error: isDevMode ? message : 'Internal Server Error',
      code: err.code || 'INTERNAL_ERROR',
      ...(isDevMode && { details: message, stack: err.stack }),
      ...(requestId && { requestId }),
    },
  };
}
