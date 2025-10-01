// // utils/validation.js
// class ValidationError extends Error {
//   constructor(message, field = null) {
//     super(message);
//     this.name = "ValidationError";
//     this.field = field;
//   }
// }

// class Validator {
//   static validateRequired(fields, data) {
//     for (const [field, friendlyName] of Object.entries(fields)) {
//       if (
//         !data[field] ||
//         (typeof data[field] === "string" && !data[field].trim())
//       ) {
//         throw new ValidationError(
//           `${friendlyName || field} is required`,
//           field
//         );
//       }
//     }
//   }

//   static validateEscalationEmail(data) {
//     const requiredFields = {
//       cid: "CID/CPROD",
//       callerName: "Caller Name",
//       phoneNumber: "Phone Number",
//       domain: "Domain",
//       iCase: "I-Case",
//       issueSummary: "Issue Summary",
//       nextSteps: "Next Steps",
//     };

//     this.validateRequired(requiredFields, data);

//     // Additional validation
//     if (data.phoneNumber && !this.isValidPhoneNumber(data.phoneNumber)) {
//       throw new ValidationError("Invalid phone number format", "phoneNumber");
//     }

//     if (data.domain && !this.isValidURL(data.domain)) {
//       throw new ValidationError("Invalid domain/URL format", "domain");
//     }

//     if (
//       data.nextSteps &&
//       !["Email", "Call Out", "Expedite"].includes(data.nextSteps)
//     ) {
//       throw new ValidationError("Invalid next steps option", "nextSteps");
//     }
//   }

//   static validateLBLEmail(data) {
//     const requiredFields = {
//       cid: "CID/CPROD",
//       businessName: "Business Name",
//     };

//     this.validateRequired(requiredFields, data);

//     if (
//       !data.changes ||
//       !Array.isArray(data.changes) ||
//       data.changes.length === 0
//     ) {
//       throw new ValidationError(
//         "At least one change request is required",
//         "changes"
//       );
//     }

//     // Check for empty changes
//     const hasEmptyChanges = data.changes.some(
//       (change) => !change || !change.trim()
//     );
//     if (hasEmptyChanges) {
//       throw new ValidationError(
//         "All change requests must have content",
//         "changes"
//       );
//     }
//   }

//   static validateOBCXCallbackEmail(data) {
//     const requiredFields = {
//       personnelName: "OBCX Personnel Name",
//       customerName: "Customer Full Name",
//       customerContact: "Customer Contact Number",
//       caseId: "Case ID",
//       callbackStart: "Callback Start Time",
//       callbackEnd: "Callback End Time",
//       briefNotes: "Brief Notes",
//     };

//     this.validateRequired(requiredFields, data);

//     // Validate phone number
//     if (
//       data.customerContact &&
//       !this.isValidPhoneNumber(data.customerContact)
//     ) {
//       throw new ValidationError(
//         "Invalid phone number format",
//         "customerContact"
//       );
//     }

//     // Validate timeframe
//     if (data.callbackStart && data.callbackEnd) {
//       const startTime = new Date(data.callbackStart);
//       const endTime = new Date(data.callbackEnd);
//       const now = new Date();

//       if (startTime < now) {
//         throw new ValidationError(
//           "Callback start time cannot be in the past",
//           "callbackStart"
//         );
//       }

//       const timeDiff = (endTime - startTime) / (1000 * 60 * 60);
//       if (timeDiff > 2) {
//         throw new ValidationError(
//           "Callback window cannot exceed 2 hours",
//           "callbackEnd"
//         );
//       }

//       if (timeDiff <= 0) {
//         throw new ValidationError(
//           "End time must be after start time",
//           "callbackEnd"
//         );
//       }
//     }

//     // Validate case ID format (basic validation)
//     if (data.caseId && !/^(OBCX|OC|OEML|I)[-]?\d+/i.test(data.caseId)) {
//       throw new ValidationError(
//         "Invalid case ID format. Expected format: OBCX-123456, OC-123456, I-123456 or OEML-123456",
//         "caseId"
//       );
//     }
//   }


// static validateOfflineModifications(data) {
//   // Validate pages array exists
//   if (!data.pages || !Array.isArray(data.pages) || data.pages.length === 0) {
//     throw new ValidationError('At least one page is required', 'pages');
//   }

//   // Validate each page
//   data.pages.forEach((page, index) => {
//     if (!page.url || !page.url.trim()) {
//       throw new ValidationError(`Page ${index + 1}: URL is required`, 'pages');
//     }

//     // if (!this.isValidURL(page.url)) {
//     //   throw new ValidationError(`Page ${index + 1}: Invalid URL format`, 'pages');
//     // }

//     if (!page.changes || !Array.isArray(page.changes) || page.changes.length === 0) {
//       throw new ValidationError(`Page ${index + 1}: At least one change is required`, 'pages');
//     }

//     // Check for empty changes
//     const hasEmptyChanges = page.changes.some(change => !change || !change.trim());
//     if (hasEmptyChanges) {
//       throw new ValidationError(`Page ${index + 1}: All changes must have content`, 'pages');
//     }
//   });
// }

//   static isValidPhoneNumber(phone) {
//     // Basic phone number validation (can be enhanced)
//     const phoneRegex = /^[\+]?[\s\-\(\)]?[\d\s\-\(\)]{10,}$/;
//     return phoneRegex.test(phone);
//   }

//   static isValidURL(url) {
//     try {
//       new URL(url);
//       return true;
//     } catch {
//       return false;
//     }
//   }

//   static sanitizeInput(input) {
//     if (typeof input !== "string") return input;
//     return input.trim().replace(/\s+/g, " "); // Normalize whitespace
//   }

//   static sanitizeData(data) {
//     const sanitized = {};
//     for (const [key, value] of Object.entries(data)) {
//       if (Array.isArray(value)) {
//         sanitized[key] = value.map((item) => this.sanitizeInput(item));
//       } else {
//         sanitized[key] = this.sanitizeInput(value);
//       }
//     }
//     return sanitized;
//   }
// }

// module.exports = { Validator, ValidationError };



const validator = require('validator');

class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

class Validator {
  // Sanitize input to prevent XSS
  static sanitizeInput(input) {
    if (typeof input !== "string") return input;
    
    let cleaned = input.trim();
    
    // Escape HTML entities
    cleaned = validator.escape(cleaned);
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, " ");
    
    return cleaned;
  }

  // Deep sanitize objects and arrays
  static sanitizeData(data) {
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }
    
    if (data && typeof data === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        // Prevent prototype pollution
        const safeKey = String(key);
        if (safeKey !== '__proto__' && safeKey !== 'constructor' && safeKey !== 'prototype') {
          sanitized[safeKey] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }
    
    return this.sanitizeInput(data);
  }

  static validateRequired(fields, data) {
    for (const [field, friendlyName] of Object.entries(fields)) {
      if (!data[field] || (typeof data[field] === "string" && !data[field].trim())) {
        throw new ValidationError(`${friendlyName || field} is required`, field);
      }
    }
  }

  static validateEscalationEmail(data) {
    const requiredFields = {
      cid: "CID/CPROD",
      callerName: "Caller Name",
      phoneNumber: "Phone Number",
      domain: "Domain",
      iCase: "I-Case",
      issueSummary: "Issue Summary",
      nextSteps: "Next Steps",
    };

    this.validateRequired(requiredFields, data);

    if (data.phoneNumber && !this.isValidPhoneNumber(data.phoneNumber)) {
      throw new ValidationError("Invalid phone number format", "phoneNumber");
    }

    if (data.domain && !this.isValidURL(data.domain)) {
      throw new ValidationError("Invalid domain/URL format", "domain");
    }

    if (data.nextSteps && !["Email", "Call Out", "Expedite"].includes(data.nextSteps)) {
      throw new ValidationError("Invalid next steps option", "nextSteps");
    }
  }

  static validateLBLEmail(data) {
    const requiredFields = {
      cid: "CID/CPROD",
      businessName: "Business Name",
    };

    this.validateRequired(requiredFields, data);

    if (!data.changes || !Array.isArray(data.changes) || data.changes.length === 0) {
      throw new ValidationError("At least one change request is required", "changes");
    }

    const hasEmptyChanges = data.changes.some((change) => !change || !change.trim());
    if (hasEmptyChanges) {
      throw new ValidationError("All change requests must have content", "changes");
    }
  }

  static validateOBCXCallbackEmail(data) {
    const requiredFields = {
      personnelName: "OBCX Personnel Name",
      customerName: "Customer Full Name",
      customerContact: "Customer Contact Number",
      caseId: "Case ID",
      callbackStart: "Callback Start Time",
      callbackEnd: "Callback End Time",
      briefNotes: "Brief Notes",
    };

    this.validateRequired(requiredFields, data);

    if (data.customerContact && !this.isValidPhoneNumber(data.customerContact)) {
      throw new ValidationError("Invalid phone number format", "customerContact");
    }

    if (data.callbackStart && data.callbackEnd) {
      const startTime = new Date(data.callbackStart);
      const endTime = new Date(data.callbackEnd);
      const now = new Date();

      if (startTime < now) {
        throw new ValidationError("Callback start time cannot be in the past", "callbackStart");
      }

      const timeDiff = (endTime - startTime) / (1000 * 60 * 60);
      if (timeDiff > 2) {
        throw new ValidationError("Callback window cannot exceed 2 hours", "callbackEnd");
      }

      if (timeDiff <= 0) {
        throw new ValidationError("End time must be after start time", "callbackEnd");
      }
    }

    if (data.caseId && !/^(OBCX|OC|OEML|I)[-]?\d+/i.test(data.caseId)) {
      throw new ValidationError(
        "Invalid case ID format. Expected format: OBCX-123456, OC-123456, I-123456 or OEML-123456",
        "caseId"
      );
    }
  }

  static validateOfflineModifications(data) {
    if (!data.pages || !Array.isArray(data.pages) || data.pages.length === 0) {
      throw new ValidationError('At least one page is required', 'pages');
    }

    data.pages.forEach((page, index) => {
      if (!page.url || !page.url.trim()) {
        throw new ValidationError(`Page ${index + 1}: URL is required`, 'pages');
      }

      if (!page.changes || !Array.isArray(page.changes) || page.changes.length === 0) {
        throw new ValidationError(`Page ${index + 1}: At least one change is required`, 'pages');
      }

      const hasEmptyChanges = page.changes.some(change => !change || !change.trim());
      if (hasEmptyChanges) {
        throw new ValidationError(`Page ${index + 1}: All changes must have content`, 'pages');
      }
    });
  }

  static isValidPhoneNumber(phone) {
    const phoneRegex = /^[\+]?[\s\-\(\)]?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  static isValidURL(url) {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
}

module.exports = { Validator, ValidationError };
