"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
const attendance_routes_1 = __importDefault(require("./routes/attendance.routes"));
const notice_routes_1 = __importDefault(require("./routes/notice.routes"));
const academics_routes_1 = __importDefault(require("./routes/academics.routes"));
const classroom_routes_1 = __importDefault(require("./routes/classroom.routes"));
const library_routes_1 = __importDefault(require("./routes/library.routes"));
const hostel_routes_1 = require("./routes/hostel.routes");
const event_routes_1 = __importDefault(require("./routes/event.routes"));
const lostFound_routes_1 = __importDefault(require("./routes/lostFound.routes"));
const mapPin_routes_1 = __importDefault(require("./routes/mapPin.routes"));
const community_routes_1 = __importDefault(require("./routes/community.routes"));
const management_routes_1 = __importDefault(require("./routes/management.routes"));
const assignment_routes_1 = __importDefault(require("./routes/assignment.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '5000');
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5174';
// ─── Security Middleware ─────────────────────────────────────────
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow static assets (PDFs) to be fetched cross-origin
}));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, Postman) or any localhost port (dev)
        if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
            callback(null, true);
        }
        else if (CLIENT_URL && origin === CLIENT_URL) {
            callback(null, true);
        }
        else {
            callback(new Error('CORS blocked'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// ─── Rate Limiting ───────────────────────────────────────────────
const isDev = process.env.NODE_ENV !== 'production';
// In development: pass-through (no limiting)
// In production: enforce sensible caps
const authLimiter = isDev
    ? ((_req, _res, next) => next())
    : (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000,
        max: 50,
        message: { success: false, message: 'Too many requests. Please try again later.' },
        standardHeaders: true,
        legacyHeaders: false,
    });
const generalLimiter = isDev
    ? ((_req, _res, next) => next())
    : (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000,
        max: 500,
        standardHeaders: true,
        legacyHeaders: false,
    });
// ─── Body Parsing ────────────────────────────────────────────────
app.use(express_1.default.json({ limit: '20mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// ─── Static Notice PDFs ─────────────────────────────────────────
// Serves files from server/notices/ at /api/notices/files/:filename
const noticesDir = path_1.default.join(__dirname, '../../notices');
app.use('/api/notices/files', generalLimiter, express_1.default.static(noticesDir, {
    setHeaders: (res, filePath) => {
        res.setHeader('Content-Disposition', `attachment; filename="${path_1.default.basename(filePath)}"`);
        res.setHeader('Content-Type', 'application/pdf');
    },
}));
// ─── Routes ──────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, auth_routes_1.default);
app.use('/api/profile', generalLimiter, profile_routes_1.default);
app.use('/api/attendance', generalLimiter, attendance_routes_1.default);
app.use('/api/notices', generalLimiter, notice_routes_1.default);
app.use('/api/academics', generalLimiter, academics_routes_1.default);
app.use('/api/classroom', generalLimiter, classroom_routes_1.default);
app.use('/api/library', generalLimiter, library_routes_1.default);
(0, hostel_routes_1.hostelRoutes)(app);
app.use('/api/events', generalLimiter, event_routes_1.default);
app.use('/api/lost-found', generalLimiter, lostFound_routes_1.default);
app.use('/api/map-pins', generalLimiter, mapPin_routes_1.default);
app.use('/api/communities', generalLimiter, community_routes_1.default);
app.use('/api/management', generalLimiter, management_routes_1.default);
app.use('/api/assignments', generalLimiter, assignment_routes_1.default);
app.use('/api/chat', generalLimiter, chat_routes_1.default);
// ─── Health Check ────────────────────────────────────────────────
app.get('/api/health', generalLimiter, (_req, res) => {
    res.json({
        success: true,
        message: 'Smart Campus API is running',
        timestamp: new Date().toISOString(),
        version: '5.0.0',
        modules: [
            'Authentication & User Management',
            'Digital ID & Profile',
            'QR-Based Attendance',
            'Notices & Bulletin',
            'Academics',
            'Classroom',
            'Library',
            'Hostel',
            'Events',
            'Lost & Found',
            'Email Notifications',
        ],
    });
});
// ─── 404 Handler ─────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});
// ─── Global Error Handler ────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
    });
});
// ─── Start Server ────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║                                                      ║
  ║   🎓  Smart Campus System — API Server               ║
  ║   📦  Module 1: Auth & User Management               ║
  ║   🪪  Module 2: Digital ID & Profile                 ║
  ║   📅  Module 3: QR-Based Attendance                  ║
  ║   📢  Module 4: Notices & Bulletin                   ║
  ║                                                      ║
  ║   🌐  http://localhost:${PORT}                        ║
  ║   📋  Health: http://localhost:${PORT}/api/health      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  `);
});
exports.default = app;
//# sourceMappingURL=index.js.map