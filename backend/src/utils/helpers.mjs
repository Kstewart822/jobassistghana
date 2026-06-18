/**
 * Common utility helper functions
 */

export function generateId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

export function formatResponse(data, message = 'Success', status = 200) {
  return {
    status,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

export function formatError(message, status = 400, errors = null) {
  return {
    status,
    message,
    errors,
    timestamp: new Date().toISOString(),
  };
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function trimObject(obj) {
  const trimmed = {};
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      trimmed[key] = obj[key].trim();
    } else {
      trimmed[key] = obj[key];
    }
  }
  return trimmed;
}

export function pickProperties(obj, ...properties) {
  const result = {};
  properties.forEach(prop => {
    if (prop in obj) {
      result[prop] = obj[prop];
    }
  });
  return result;
}

export function omitProperties(obj, ...properties) {
  const result = { ...obj };
  properties.forEach(prop => {
    delete result[prop];
  });
  return result;
}

export default {
  generateId,
  formatResponse,
  formatError,
  sleep,
  trimObject,
  pickProperties,
  omitProperties,
};
