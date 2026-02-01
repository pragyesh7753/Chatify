import logger from '../lib/logger.js';

/**
 * Validate required environment variables on server startup
 * Prevents server from starting if critical configuration is missing
 */
export function validateEnv() {
  const required = [
    // JWT & Security
    'JWT_SECRET_KEY',
    'SESSION_SECRET',
    
    // Appwrite Database
    'APPWRITE_ENDPOINT',
    'APPWRITE_PROJECT_ID',
    'APPWRITE_API_KEY',
    'APPWRITE_DATABASE_ID',
    'APPWRITE_USERS_COLLECTION_ID',
    'APPWRITE_FRIEND_REQUESTS_COLLECTION_ID',
    'APPWRITE_MESSAGES_COLLECTION_ID',
    'APPWRITE_CHANNELS_COLLECTION_ID',
    'APPWRITE_REFRESH_TOKENS_COLLECTION_ID',
    'APPWRITE_FCM_TOKENS_COLLECTION_ID',
    
    // Stream Video (for calling)
    'STREAM_API_KEY',
    'STREAM_API_SECRET',
    
    // Cloudinary (for image uploads)
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    
    // Email Service
    'RESEND_API_KEY',
    
    // Frontend URL (for CORS and OAuth callbacks)
    'FRONTEND_URL',
  ];

  // Optional but recommended
  const recommended = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL',
    'FIREBASE_SERVICE_ACCOUNT',
    'CRON_SECRET',
  ];

  // Check for missing required variables
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logger.error('FATAL: Missing required environment variables', { missing });
    throw new Error(
      `Missing required environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}\n\n` +
      'Please check your .env file and ensure all required variables are set.\n' +
      'See .env.example for reference.'
    );
  }

  // Warn about missing recommended variables
  const missingRecommended = recommended.filter(key => !process.env[key]);
  if (missingRecommended.length > 0) {
    logger.warn('Missing recommended environment variables (some features may not work)', { 
      missingRecommended 
    });
  }

  // Validate format of critical variables
  validateJWTSecret();
  validateURLs();
  validateAppwriteConfig();
  
  logger.info('Environment validation passed', { 
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
  });
}

/**
 * Validate JWT secret is strong enough
 */
function validateJWTSecret() {
  const jwtSecret = process.env.JWT_SECRET_KEY;
  
  if (jwtSecret.length < 32) {
    logger.warn('JWT_SECRET_KEY is less than 32 characters. Consider using a stronger secret.');
  }
  
  if (jwtSecret === 'your_jwt_secret_key_here' || jwtSecret === 'secret') {
    logger.error('FATAL: Using default/weak JWT secret in production');
    throw new Error('JWT_SECRET_KEY must be changed from default value for security!');
  }
}

/**
 * Validate URL formats
 */
function validateURLs() {
  const urls = [
    { key: 'FRONTEND_URL', value: process.env.FRONTEND_URL },
    { key: 'APPWRITE_ENDPOINT', value: process.env.APPWRITE_ENDPOINT },
  ];

  if (process.env.GOOGLE_CALLBACK_URL) {
    urls.push({ key: 'GOOGLE_CALLBACK_URL', value: process.env.GOOGLE_CALLBACK_URL });
  }

  for (const { key, value } of urls) {
    try {
      new URL(value);
    } catch (error) {
      logger.error(`Invalid URL format for ${key}`, { value });
      throw new Error(`${key} must be a valid URL. Got: ${value}`);
    }
  }
}

/**
 * Validate Appwrite configuration
 */
function validateAppwriteConfig() {
  const projectId = process.env.APPWRITE_PROJECT_ID;
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  
  // Basic sanity checks
  if (projectId.length < 10) {
    logger.warn('APPWRITE_PROJECT_ID seems too short. Please verify your Appwrite configuration.');
  }
  
  if (databaseId.length < 10) {
    logger.warn('APPWRITE_DATABASE_ID seems too short. Please verify your Appwrite configuration.');
  }
}

/**
 * Get sanitized environment info for logging (without secrets)
 */
export function getEnvInfo() {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    appwriteEndpoint: process.env.APPWRITE_ENDPOINT,
    frontendUrl: process.env.FRONTEND_URL,
    hasGoogleOAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    hasFCM: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    logLevel: process.env.LOG_LEVEL || 'info',
  };
}
