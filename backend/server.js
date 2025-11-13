const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./database.js'); // Initializes DB connection

const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const authMiddleware = require('./middleware/auth');

const app = express();

// Simple structured logger helper
const log = (level, message, meta = {}) => {
    const logEntry = {
        ts: new Date().toISOString(),
        level,
        message,
        ...meta,
    };
    console.log(JSON.stringify(logEntry));
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging middleware (logs on response finish)
app.use((req, res, next) => {
    const start = Date.now();
    const { method, url } = req;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Attach a small logger to req for route-level logs
    req.log = (level, message, meta) => log(level, message, { method, url, ip, ...meta });

    res.on('finish', () => {
        const duration = Date.now() - start;
        const meta = {
            method,
            url,
            ip,
            status: res.statusCode,
            duration_ms: duration,
        };
        // If auth middleware added req.user, include its id when available
        if (req.user && req.user.id) meta.userId = req.user.id;
        log('info', 'HTTP request completed', meta);
    });

    next();
});

// Public routes
app.use('/auth', authRoutes);

// Protected routes
app.use('/ai', authMiddleware, aiRoutes);

app.get('/', (req, res) => {
    res.send('Health Care AI Backend is running!');
});

const PORT = process.env.PORT || 3001;
// Startup logs: show configured API keys (presence only, not values)
const apiKeysInfo = {
    ANALYZE_API_KEY: !!process.env.ANALYZE_API_KEY,
    SYMPTOMS_API_KEY: !!process.env.SYMPTOMS_API_KEY,
    CHAT_API_KEY: !!process.env.CHAT_API_KEY,
    TTS_API_KEY: !!process.env.TTS_API_KEY,
    MAPS_API_KEY: !!process.env.MAPS_API_KEY,
    FALLBACK_API_KEY: !!process.env.API_KEY,
};

// Global error handlers
process.on('uncaughtException', (err) => {
    log('fatal', 'Uncaught exception', { message: err.message, stack: err.stack });
    // allow graceful shutdown if desired
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    log('error', 'Unhandled promise rejection', { reason });
});

app.listen(PORT, () => {
    log('info', `Server is running on port ${PORT}`, { apiKeysInfo });
});