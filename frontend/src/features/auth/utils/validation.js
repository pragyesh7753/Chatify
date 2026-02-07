/**
 * Validates full name according to backend rules
 */
export const validateFullName = (fullName) => {
  const trimmed = fullName.trim();
  
  if (!trimmed) {
    return "Full name is required";
  }
  
  if (trimmed.length < 2 || trimmed.length > 50) {
    return "Full name must be between 2 and 50 characters";
  }
  
  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
    return "Full name can only contain letters, spaces, hyphens, and apostrophes";
  }
  
  return null;
};

/**
 * Validates email according to backend rules
 */
export const validateEmail = (email) => {
  const trimmed = email.trim();
  
  if (!trimmed) {
    return "Email is required";
  }
  
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
    return "Invalid email format";
  }
  
  if (trimmed.length > 255) {
    return "Email must not exceed 255 characters";
  }
  
  return null;
};

/**
 * Validates password according to backend rules
 */
export const validatePassword = (password) => {
  if (password.length < 8 || password.length > 128) {
    return "Password must be between 8 and 128 characters";
  }
  
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return "Password must contain at least one uppercase letter, one lowercase letter, and one number";
  }
  
  return null;
};

/**
 * Validates password confirmation
 */
export const validatePasswordMatch = (password, confirmPassword) => {
  if (password !== confirmPassword) {
    return "Passwords do not match";
  }
  
  return null;
};
