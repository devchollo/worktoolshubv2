// utils/validation.js
class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

class Validator {
  static validateRequired(fields, data) {
    for (const [field, friendlyName] of Object.entries(fields)) {
      if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
        throw new ValidationError(`${friendlyName || field} is required`, field);
      }
    }
  }

  static validateEscalationEmail(data) {
    const requiredFields = {
      cid: 'CID/CPROD',
      callerName: 'Caller Name',
      phoneNumber: 'Phone Number',
      domain: 'Domain',
      iCase: 'I-Case',
      issueSummary: 'Issue Summary',
      nextSteps: 'Next Steps'
    };

    this.validateRequired(requiredFields, data);

    // Additional validation
    if (data.phoneNumber && !this.isValidPhoneNumber(data.phoneNumber)) {
      throw new ValidationError('Invalid phone number format', 'phoneNumber');
    }

    if (data.domain && !this.isValidURL(data.domain)) {
      throw new ValidationError('Invalid domain/URL format', 'domain');
    }

    if (data.nextSteps && !['Email', 'Call Out', 'Expedite'].includes(data.nextSteps)) {
      throw new ValidationError('Invalid next steps option', 'nextSteps');
    }
  }

  static validateLBLEmail(data) {
    const requiredFields = {
      cid: 'CID/CPROD',
      businessName: 'Business Name'
    };

    this.validateRequired(requiredFields, data);

    if (!data.changes || !Array.isArray(data.changes) || data.changes.length === 0) {
      throw new ValidationError('At least one change request is required', 'changes');
    }

    // Check for empty changes
    const hasEmptyChanges = data.changes.some(change => !change || !change.trim());
    if (hasEmptyChanges) {
      throw new ValidationError('All change requests must have content', 'changes');
    }
  }

  static validateOSADNote(data) {
    // Future implementation for OSAD note validation
    const requiredFields = {
      // Add required fields for OSAD notes
    };
    this.validateRequired(requiredFields, data);
  }

  static isValidPhoneNumber(phone) {
    // Basic phone number validation (can be enhanced)
    const phoneRegex = /^[\+]?[\s\-\(\)]?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  static isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/\s+/g, ' '); // Normalize whitespace
  }

  static sanitizeData(data) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        sanitized[key] = value.map(item => this.sanitizeInput(item));
      } else {
        sanitized[key] = this.sanitizeInput(value);
      }
    }
    return sanitized;
  }
}

module.exports = { Validator, ValidationError };