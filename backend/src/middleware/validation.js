import { body, validationResult } from 'express-validator';
import logger from '../lib/logger.js';

/**
 * Middleware to check validation results and return errors
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    logger.warn('Validation failed', {
      requestId: req.id,
      path: req.path,
      errors: formattedErrors,
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }
  
  next();
};

/**
 * Validation rules for user signup
 */
export const signupValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Full name can only contain letters, spaces, hyphens, and apostrophes'),
  
  validate,
];

/**
 * Validation rules for user login
 */
export const loginValidation = [
  body('emailOrUsername')
    .trim()
    .notEmpty()
    .withMessage('Email or username is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Email or username must be between 3 and 255 characters'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  validate,
];

/**
 * Validation rules for email verification
 */
export const emailVerificationValidation = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Verification token is required')
    .isLength({ min: 32, max: 64 })
    .withMessage('Invalid token format'),
  
  validate,
];

/**
 * Validation rules for forgot password
 */
export const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  validate,
];

/**
 * Validation rules for password reset
 */
export const resetPasswordValidation = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required')
    .isLength({ min: 32, max: 64 })
    .withMessage('Invalid token format'),
  
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  validate,
];

/**
 * Validation rules for profile update
 */
export const updateProfileValidation = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Full name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters'),
  
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location must not exceed 100 characters'),
  
  body('nativeLanguage')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Native language must not exceed 50 characters'),
  
  validate,
];

/**
 * Validation rules for email change request
 */
export const changeEmailValidation = [
  body('newEmail')
    .trim()
    .notEmpty()
    .withMessage('New email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required for email change'),
  
  validate,
];

/**
 * Validation rules for sending a message
 */
export const sendMessageValidation = [
  body('channelId')
    .trim()
    .notEmpty()
    .withMessage('Channel ID is required')
    .isLength({ min: 10, max: 50 })
    .withMessage('Invalid channel ID format'),
  
  body('text')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Message must not exceed 5000 characters'),
  
  body('image')
    .optional()
    .trim()
    .isURL()
    .withMessage('Image must be a valid URL'),
  
  validate,
];

/**
 * Validation rules for FCM token registration
 */
export const registerFCMTokenValidation = [
  body('fcmToken')
    .trim()
    .notEmpty()
    .withMessage('FCM token is required')
    .isLength({ min: 100, max: 300 })
    .withMessage('Invalid FCM token format'),
  
  validate,
];

/**
 * Sanitize user input to prevent XSS
 * This is an additional layer on top of validation
 */
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj
        .replace(/[<>]/g, '') // Remove angle brackets
        .trim();
    }
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        obj[key] = sanitize(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  next();
};
