import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
    winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, metadata, stack }) => {
        let log = `${timestamp} [${level}]: ${message}`;

        // Add metadata if present
        if (metadata && Object.keys(metadata).length > 0) {
            log += ` ${JSON.stringify(metadata)}`;
        }

        // Add stack trace if present
        if (stack) {
            log += `\n${stack}`;
        }

        return log;
    })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');

// Configure transports
const transports = [];

// Console transport (always enabled)
transports.push(
    new winston.transports.Console({
        format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    })
);

// File transports (only in production or if explicitly enabled)
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_FILE_LOGS === 'true') {
    // Error log file
    transports.push(
        new DailyRotateFile({
            filename: path.join(logsDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxFiles: '14d',
            maxSize: '20m',
            format: logFormat,
        })
    );

    // Combined log file
    transports.push(
        new DailyRotateFile({
            filename: path.join(logsDir, 'combined-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d',
            maxSize: '20m',
            format: logFormat,
        })
    );
}

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: logFormat,
    transports,
    // Don't exit on handled exceptions
    exitOnError: false,
});

// Handle uncaught exceptions and unhandled rejections
if (process.env.NODE_ENV === 'production') {
    logger.exceptions.handle(
        new DailyRotateFile({
            filename: path.join(logsDir, 'exceptions-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d',
            maxSize: '20m',
        })
    );

    logger.rejections.handle(
        new DailyRotateFile({
            filename: path.join(logsDir, 'rejections-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d',
            maxSize: '20m',
        })
    );
}

// Add helper methods for structured logging
logger.logRequest = (req, message, metadata = {}) => {
    logger.info(message, {
        requestId: req.id,
        method: req.method,
        path: req.path,
        userId: req.user?._id,
        ip: req.ip,
        ...metadata,
    });
};

logger.logError = (req, error, message = 'Error occurred', metadata = {}) => {
    logger.error(message, {
        requestId: req.id,
        method: req.method,
        path: req.path,
        userId: req.user?._id,
        ip: req.ip,
        error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
        },
        ...metadata,
    });
};

// Stream for Morgan HTTP request logger (if needed in future)
logger.stream = {
    write: (message) => logger.info(message.trim()),
};

export default logger;
