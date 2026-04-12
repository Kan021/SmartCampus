import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import attendanceRoutes from './routes/attendance.routes';
import noticeRoutes from './routes/notice.routes';
import academicsRoutes from './routes/academics.routes';
import classroomRoutes from './routes/classroom.routes';
import libraryRoutes from './routes/library.routes';
import { hostelRoutes } from './routes/hostel.routes';
import eventRoutes from './routes/event.routes';
import lostFoundRoutes from './routes/lostFound.routes';
import mapPinRoutes from './routes/mapPin.routes';
import communityRoutes from './routes/community.routes';
import managementRoutes from './routes/management.routes';
import assignmentRoutes from './routes/assignment.routes';
import chatRoutes from './routes/chat.routes';

const app = express();
const PORT = parseInt(process.env.PORT || '5000');
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5174';

// ─── Security Middleware ─────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow static assets (PDFs) to be fetched cross-origin
}));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman) or any localhost port (dev)
    if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else if (CLIENT_URL && origin === CLIENT_URL) {
      callback(null, true);
    } else {
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
  ? ((_req: express.Request, _res: express.Response, next: express.NextFunction) => next())
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 50,
      message: { success: false, message: 'Too many requests. Please try again later.' },
      standardHeaders: true,
      legacyHeaders: false,
    });

const generalLimiter = isDev
  ? ((_req: express.Request, _res: express.Response, next: express.NextFunction) => next())
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
    });

// ─── Body Parsing ────────────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Static Notice PDFs ─────────────────────────────────────────
// Serves files from server/notices/ at /api/notices/files/:filename
const noticesDir = path.join(__dirname, '../../notices');
app.use('/api/notices/files', generalLimiter, express.static(noticesDir, {
  setHeaders: (res, filePath) => {
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    res.setHeader('Content-Type', 'application/pdf');
  },
}));

// ─── Routes ──────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/profile', generalLimiter, profileRoutes);
app.use('/api/attendance', generalLimiter, attendanceRoutes);
app.use('/api/notices', generalLimiter, noticeRoutes);
app.use('/api/academics', generalLimiter, academicsRoutes);
app.use('/api/classroom', generalLimiter, classroomRoutes);
app.use('/api/library', generalLimiter, libraryRoutes);
hostelRoutes(app);
app.use('/api/events', generalLimiter, eventRoutes);
app.use('/api/lost-found', generalLimiter, lostFoundRoutes);
app.use('/api/map-pins', generalLimiter, mapPinRoutes);
app.use('/api/communities', generalLimiter, communityRoutes);
app.use('/api/management', generalLimiter, managementRoutes);
app.use('/api/assignments', generalLimiter, assignmentRoutes);
app.use('/api/chat', generalLimiter, chatRoutes);

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
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
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

export default app;
