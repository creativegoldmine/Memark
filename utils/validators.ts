export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateEmail = (email: string): ValidationResult => {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true };
};

export const validatePassword = (password: string): ValidationResult => {
  if (!password || password.length === 0) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters' };
  }

  if (password.length > 72) {
    return { isValid: false, error: 'Password must be less than 72 characters' };
  }

  return { isValid: true };
};

export const validatePhoneNumber = (phoneNumber: string): ValidationResult => {
  if (!phoneNumber || phoneNumber.trim().length === 0) {
    return { isValid: false, error: 'Phone number is required' };
  }

  const cleanedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

  const phoneRegex = /^\+?[1-9]\d{1,14}$/;

  if (!phoneRegex.test(cleanedPhone)) {
    return {
      isValid: false,
      error: 'Please enter a valid phone number (e.g., +1234567890)'
    };
  }

  if (cleanedPhone.length < 10) {
    return {
      isValid: false,
      error: 'Phone number must be at least 10 digits'
    };
  }

  return { isValid: true };
};

export const validateName = (name: string): ValidationResult => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Name is required' };
  }

  if (name.trim().length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }

  if (name.trim().length > 100) {
    return { isValid: false, error: 'Name must be less than 100 characters' };
  }

  return { isValid: true };
};

export const normalizePhoneNumber = (phoneNumber: string): string => {
  let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');

  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) {
      cleaned = `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      cleaned = `+${cleaned}`;
    }
  }

  return cleaned;
};
