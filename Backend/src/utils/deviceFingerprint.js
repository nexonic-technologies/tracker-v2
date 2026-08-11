import crypto from 'node:crypto';
import { UAParser } from 'ua-parser-js';

/**
 * Generate a unique device fingerprint combining multiple factors
 * Similar to AWS API Gateway device identification
 */
export const generateDeviceFingerprint = (req) => {
  const parser = new UAParser(req.headers['user-agent']);
  const ua = parser.getResult();

  // Collect fingerprint components
  const components = {
    // Client-provided device UUID (most reliable)
    deviceUuid: req.headers['x-device-uuid'] || null,

    // User Agent parsing
    browser: ua.browser.name || 'unknown',
    browserVersion: ua.browser.version || '0',
    os: ua.os.name || 'unknown',
    osVersion: ua.os.version || '0',
    deviceModel: ua.device.model || ua.device.name || 'unknown',

    // Network information
    ipAddress: req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown',

    // Additional entropy
    userAgent: req.headers['user-agent'] || 'unknown',
    source: req.headers['x-source'] || req.query.source || 'web'
  };

  // If device-uuid is provided, use it as primary identifier
  if (components.deviceUuid) {
    return {
      fingerprint: `device_${components.deviceUuid}`,
      components,
      type: 'device-uuid', // Most reliable
      confidence: 'high'
    };
  }

  // Build composite fingerprint from available data
  const fingerprintString = `${components.browser}|${components.browserVersion}|${components.os}|${components.osVersion}|${components.deviceModel}|${components.ipAddress}|${components.source}`;

  const hash = crypto
    .createHash('sha256')
    .update(fingerprintString)
    .digest('hex')
    .slice(0, 16); // Use first 16 chars

  return {
    fingerprint: `composite_${hash}`,
    components,
    type: 'composite',
    confidence: 'medium'
  };
};

/**
 * Extract or validate fingerprint from request
 */
export const getFingerprint = (req) => {
  // Check if fingerprint was already computed (cached in request)
  if (req.fingerprint) {
    return req.fingerprint;
  }

  // Generate new fingerprint
  const fpData = generateDeviceFingerprint(req);

  // Cache in request for reuse
  req.fingerprint = fpData;

  return fpData;
};

/**
 * Create a consistent fingerprint key for storage/lookup
 */
export const getFingerprintKey = (req) => {
  const fp = getFingerprint(req);
  return fp.fingerprint;
};

/**
 * Get device information for logging/analytics
 */
export const getDeviceInfo = (req) => {
  const fp = getFingerprint(req);
  const parser = new UAParser(req.headers['user-agent']);
  const ua = parser.getResult();

  return {
    fingerprint: fp.fingerprint,
    type: fp.type,
    confidence: fp.confidence,
    name: `${ua.browser.name || 'Browser'} ${ua.browser.version || ''}`,
    os: `${ua.os.name || 'Unknown'} ${ua.os.version || ''}`,
    model: ua.device.model || 'Unknown',
    ipAddress: fp.components.ipAddress,
    userAgent: fp.components.userAgent,
    source: fp.components.source
  };
};

/**
 * Validate fingerprint consistency (detect spoofing)
 */
export const validateFingerprintConsistency = (currentFp, previousFp) => {
  // If types don't match, might be device change
  if (currentFp.type !== previousFp.type) {
    return {
      valid: false,
      reason: 'fingerprint_type_mismatch',
      severity: 'medium'
    };
  }

  // For device-uuid, must match exactly
  if (currentFp.type === 'device-uuid') {
    if (currentFp.components.deviceUuid !== previousFp.components.deviceUuid) {
      return {
        valid: false,
        reason: 'device_uuid_mismatch',
        severity: 'high'
      };
    }
    return { valid: true };
  }

  // For composite, allow some variation (network might change)
  const components = currentFp.components;
  const prevComponents = previousFp.components;

  // These should match (harder to spoof)
  const criticalMatches = [
    components.browser === prevComponents.browser,
    components.os === prevComponents.os,
    components.deviceModel === prevComponents.deviceModel
  ];

  const matchCount = criticalMatches.filter(Boolean).length;

  if (matchCount < 2) {
    return {
      valid: false,
      reason: 'device_signature_mismatch',
      severity: 'medium'
    };
  }

  return { valid: true };
};

export default {
  generateDeviceFingerprint,
  getFingerprint,
  getFingerprintKey,
  getDeviceInfo,
  validateFingerprintConsistency
};
