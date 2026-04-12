<<<<<<< HEAD
# 🎓 Smart Campus — BBD University

> **Your entire campus, one tap away.**  
> Smart Campus is a full-stack digital platform that puts everything a BBD University student, faculty, or admin needs — from attendance to hostel gate passes to live chat — right in their pocket. Built with React, Node.js, Prisma, and a whole lot of love for good design.

---

## ✨ What Can It Do?

Here's the short version — Smart Campus covers **16 modules** and counting:

| Module | What It Does |
|--------|-------------|
| 🔐 **Auth & Login** | Register, login, forgot password — the whole flow. JWT tokens, OTPs, account lockout. |
| 🪪 **Digital ID** | A scannable campus ID card with QR code. Download it as an image. |
| 📅 **Attendance** | Faculty creates a QR session → students scan it → attendance marked. Live % tracking. |
| 📢 **Notices** | Campus-wide announcements with PDF attachments and a live scrolling ticker on the dashboard. |
| 📊 **Academics** | Check your results (links to BBDU Exam Cell), semester fees with live countdown, and academic calendar with all holidays. |
| 💰 **Fee Receipts** | Upload your payment receipt → Admin reviews & approves → fee auto-marked as paid. Includes an FAQ section. |
| 📖 **Classroom** | Section-wise notes, file sharing, class chat, member directory, and assignments. |
| 📝 **Assignments** | Faculty uploads a PDF assignment → students submit solutions → only the assigning teacher can see submissions. |
| 📚 **Library** | Browse the book catalogue, track your issues, returns, and fines. Librarians manage everything from one panel. |
| 🏠 **Hostel** | Room allocation, gate passes (with student year displayed), mess menu, complaints, and hostel fees. |
| 🏛️ **Communities** | Campus clubs & forums — IEEE Branch, AAINA Cultural Forum, Innosphere Technical Forum. Recruitment badges + Google Form links. |
| 👔 **Management** | Directory of Deans & HODs with photos, office locations, and contact info. |
| 💬 **Chat** | Real-time 1:1 messaging. Search users by name/year/section. Block anyone you need to. |
| 🎉 **Events** | Post campus events, workshops, and fests. Filter by category, search by keyword. |
| 🔍 **Lost & Found** | Report lost items or post found ones. Photo uploads, status tracking. |
| 🗺️ **Navigation** | Interactive campus map with building pins, custom markers, and walking directions. |
| 🛡️ **Anti-Ragging** | Report incidents anonymously. Emergency helpline contacts right on the page. |
| 🧾 **Complaints** | General grievances — hostel, transport, academic. Submit and track resolution. |
| 🤖 **Smart Chatbot** | An AI assistant on every page that understands natural language and navigates you to the right module. |

---

## 🚀 Getting Started

You need **Node.js 18+** and **npm 9+**. That's it.

### 1. Fire Up the Backend
```bash
cd server
npm install        # first time only
npm run dev        # → http://localhost:5000
```

### 2. Fire Up the Frontend
```bash
cd client
npm install        # first time only  
npm run dev        # → http://localhost:5173
```

### 3. Open Your Browser
Go to **http://localhost:5173** and register an account.

> 💡 **Dev Mode Perk:** OTP email verification is skipped automatically in development. Register and log in instantly — no email setup needed.

### 4. Seed Some Data (Optional but Recommended)
```bash
cd server

# Core data
node seed.js                  # Default users (admin, faculty, students)
node seed-academics.js        # Subjects, marks, fee structures
node seed-hostel.js           # Hostel blocks & rooms
node seed-library.js          # Book catalogue
node seed-notices.js          # Sample notices
node seedClassrooms.js        # Classrooms

# New modules
npx ts-node prisma/seed.ts    # Communities (IEEE, AAINA, Innosphere) + Management (Dr. Praveen Shukla)
```

---

## 🏗️ Project Layout

```
SmartCampus/
├── client/                        # React + Vite + TypeScript
│   └── src/
│       ├── assets/                # Logos, posters, campus images
│       ├── components/            # ChatBot, ThemeToggle, RouteGuards
│       ├── contexts/              # AuthContext, ThemeContext
│       ├── pages/                 # One page per module (16+ pages)
│       ├── services/api.ts        # Every API call lives here
│       ├── App.tsx                # All routes
│       └── index.css              # Full design system
│
├── server/                        # Express + Prisma + SQLite
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema (25+ models)
│   │   └── seed.ts                # Seed communities & management
│   └── src/
│       ├── controllers/           # academicsController, chatController, etc.
│       ├── routes/                # academics.routes, chat.routes, etc.
│       ├── middleware/            # JWT auth, input validation
│       ├── services/              # Auth logic, email service
│       └── index.ts               # Express app entry point
│
├── notices/                       # Static PDF attachments
└── README.md                      # You are here 👋
```

---

## 👥 Who Can Do What?

| Role | What They Get |
|------|--------------|
| **Student** | Dashboard, Digital ID, attendance scanning, marks, fees + receipt upload, library issues, hostel management, communities, chat, assignments (submit solutions) |
| **Faculty** | Everything above + create attendance sessions, upload classroom notes, post events, grade assignments, review fee receipts |
| **Admin** | Full control — user management, notice publishing, fee structures, room allocation, community management, management directory |

**Special Flags:**
- 📚 `isLibrarian` — unlocks book issue/return/penalty management
- 🏠 `isWarden` — unlocks gate pass approvals, complaint resolution, mess menu management

---

## 🖥️ The Dashboard Experience

When you log in, here's what greets you:

1. **🕐 Live Clock** — Real-time IST, always visible
2. **🎠 Poster Carousel** — Auto-advancing event posters (UTKARSH 2026, Founder's Day, Convocation)
3. **📰 Notice Ticker** — Scrolling live notices from the API, polled every 30 seconds. New notices trigger browser notifications.
4. **🏛️ Founders Section** — Clickable cards for Late Babu Banarasi Das Ji and Dr. Akhilesh Das Gupta with full biographies
5. **📦 Module Grid** — 16 modules, each with a gradient card, emoji icon, and status badge. Click and go.
6. **🤖 AI Chatbot** — Floating assistant that understands queries like "show my attendance", "open hostel", "who is the dean"
7. **🌙 Dark/Light Mode** — Toggle anytime. Persists across sessions.

---

## 💰 Fee Receipt Workflow

This is one of the most important features. Here's how it works:

```
Student pays fee (online/offline)
        ↓
Student goes to Academics → Fees tab
        ↓
Clicks "📎 Choose Receipt File" → selects PDF or image (max 5MB)
        ↓
Clicks "📤 Submit Receipt" → receipt goes to admin queue
        ↓
Admin opens Academics → sees "📋 Pending Receipt Reviews"
        ↓
Admin clicks ✅ Approve or ❌ Reject
        ↓
If approved → fee status auto-changes to "Paid" ✅
If rejected → student can re-upload a clearer receipt
```

The Fees tab also includes a **❓ FAQ section** with 6 common questions about payments, deadlines, scholarships, and troubleshooting.

---

## 🏛️ Communities

Pre-seeded with BBD University's real campus forums:

| Community | Type | Recruitment |
|-----------|------|-------------|
| **IEEE Branch** | ⚡ Technical | 🟢 Open — Workshops, hackathons, research papers |
| **AAINA Cultural Forum** | 🎭 Cultural | 🟢 Open — Dance, music, drama, literary arts |
| **Innosphere Technical Forum** | ⚡ Technical | 🟢 Open — Coding competitions, tech talks, startup mentoring |

Each community card shows:
- Type-specific gradient header (blue for technical, red for cultural)
- Recruitment status badge (Open/Closed)
- Member count, founding year, tags
- "Apply Now" button linking to a Google Form (configurable by admin)

Admins can add, edit, and delete communities from the UI.

---

## 👔 Management Directory

Shows university leadership with professional cards:

| Name | Designation | Office |
|------|-------------|--------|
| **Dr. Praveen Shukla** | Dean, School of Engineering | 5th Floor, Room 507, BBDU |

Each card has: photo, designation, school/department, office location, phone, and email. Admin can add more entries.

---

## 💬 Chat System

Real-time-ish messaging (polls every 3 seconds — no WebSocket complexity):

- **Find anyone** — Search by name, year, or section
- **1:1 conversations** — Left panel shows all chats, right panel shows messages
- **Block users** — One click. Blocked users can't send you messages.
- **Message bubbles** — Your messages are red (right), theirs are grey (left). Timestamps, date separators, auto-scroll.

---

## 📡 Full API Reference

All routes prefixed with `/api`. JWT authentication required unless noted.

<details>
<summary><strong>🔐 Authentication — <code>/api/auth</code></strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register a new user |
| POST | `/auth/verify-otp` | No | Verify email OTP |
| POST | `/auth/login` | No | Login → access token + cookie |
| POST | `/auth/logout` | No | Revoke tokens, clear cookie |
| POST | `/auth/refresh` | Cookie | Get new access token |
| POST | `/auth/forgot-password` | No | Request password reset OTP |
| POST | `/auth/reset-password` | No | Reset password with OTP |
| POST | `/auth/resend-otp` | No | Resend OTP |
| GET | `/auth/me` | JWT | Get current user |
</details>

<details>
<summary><strong>👤 Profile — <code>/api/profile</code></strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/profile/me` | JWT | Get own profile |
| PUT | `/profile/me` | JWT | Update profile (avatar, bio, etc.) |
| GET | `/profile/users` | Admin | List all users (paginated) |
| GET | `/profile/:id` | JWT | Get any user's profile |
| PATCH | `/profile/users/:id/role` | Admin | Change a user's role |
| PUT | `/profile/users/:id` | Admin | Edit any profile |
| POST | `/profile/bulk-update` | Admin | Bulk update profiles |
</details>

<details>
<summary><strong>📅 Attendance — <code>/api/attendance</code></strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/attendance/sessions` | Faculty | Create QR session |
| GET | `/attendance/sessions` | Faculty | List my sessions |
| GET | `/attendance/sessions/:code` | JWT | Get session by QR code |
| POST | `/attendance/mark` | Student | Mark attendance |
| GET | `/attendance/my-records` | Student | My records |
| GET | `/attendance/my-percentage` | Student | Attendance % |
| GET/POST/DELETE | `/attendance/timetable` | Admin | Manage timetables |
</details>

<details>
<summary><strong>📊 Academics & Fees — <code>/api/academics</code></strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET/POST | `/academics/subjects` | JWT/Admin | List/create subjects |
| GET | `/academics/marks/my` | Student | My marks & grades |
| POST | `/academics/marks` | Admin | Upload marks |
| GET/POST | `/academics/fees/structures` | JWT/Admin | Fee structures |
| GET | `/academics/fees/my` | Student | My fees |
| POST | `/academics/fees/receipt` | Student | Upload payment receipt |
| PUT | `/academics/fees/receipt/:id/review` | Admin | Approve/reject receipt |
| GET | `/academics/fees/receipts/pending` | Admin | All pending receipts |
</details>

<details>
<summary><strong>🏛️ Communities — <code>/api/communities</code></strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/communities` | JWT | List all communities |
| POST | `/communities` | Admin | Create community |
| PUT | `/communities/:id` | Admin | Update community |
| DELETE | `/communities/:id` | Admin | Delete community |
</details>

<details>
<summary><strong>👔 Management — <code>/api/management</code></strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/management` | JWT | List all entries |
| POST | `/management` | Admin | Add entry |
| PUT | `/management/:id` | Admin | Update entry |
| DELETE | `/management/:id` | Admin | Delete entry |
</details>

<details>
<summary><strong>💬 Chat — <code>/api/chat</code></strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/chat/users/search` | JWT | Search users (name, year, section) |
| GET | `/chat/conversations` | JWT | My conversations |
| POST | `/chat/conversations` | JWT | Start a new conversation |
| GET | `/chat/conversations/:id/messages` | JWT | Get messages |
| POST | `/chat/conversations/:id/messages` | JWT | Send a message |
| POST | `/chat/users/:id/block` | JWT | Block a user |
| DELETE | `/chat/users/:id/block` | JWT | Unblock a user |
| GET | `/chat/blocked` | JWT | My blocked list |
</details>

<details>
<summary><strong>📝 Assignments — <code>/api/assignments</code></strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/assignments/classroom/:id` | JWT | Assignments for a classroom |
| POST | `/assignments/classroom/:id` | Faculty | Create assignment (PDF) |
| POST | `/assignments/:id/submit` | Student | Submit solution |
| GET | `/assignments/submission/:id` | Faculty | View a submission |
| PUT | `/assignments/submission/:id/grade` | Faculty | Grade a submission |
</details>

<details>
<summary><strong>📚 Library, 🏠 Hostel, 🎉 Events, 🔍 Lost & Found, 🗺️ Navigation</strong></summary>

See the route files in `server/src/routes/` for the full endpoint list. Each module follows the same RESTful pattern.
</details>

---

## 🛡️ Security

We don't mess around with security:

- **JWT Tokens** — 15-min access tokens + 7-day HTTP-only cookie refresh tokens
- **Account Lockout** — 5 bad logins → 30-minute lockout
- **Rate Limiting** — Auth: 20 req/15min · General: 100 req/15min
- **Helmet** — Standard security headers on every response
- **CORS** — Locked to `CLIENT_URL` only
- **Zod Validation** — Every input is validated before it touches the database
- **bcrypt** — Passwords hashed with 12 salt rounds
- **Privacy** — Assignment solutions visible only to the assigning teacher. Chat blocks prevent all communication.

---

## ⚙️ Environment Variables

All in `server/.env`:

| Variable | Default | What It Does |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./dev.db` | SQLite path (swap to PostgreSQL for prod) |
| `JWT_ACCESS_SECRET` | *(change in prod!)* | Signs access tokens |
| `JWT_REFRESH_SECRET` | *(change in prod!)* | Signs refresh tokens |
| `PORT` | `5000` | API port |
| `NODE_ENV` | `development` | `development` = skip OTP emails |
| `CLIENT_URL` | `http://localhost:5173` | CORS origin |
| `SMTP_HOST/PORT/USER/PASS` | Gmail defaults | For production email (OTP, reset) |

---

## 📦 Tech Stack

| | Technology | Why |
|--|-----------|-----|
| ⚛️ | **React 19** + Vite 6 | Fast, modern frontend |
| 🎨 | **Vanilla CSS** | Full design system with CSS variables, dark mode, animations |
| 🖥️ | **Express 4** | Battle-tested Node.js server |
| 🗄️ | **Prisma 6** + SQLite | Type-safe ORM, zero-config database |
| 🔐 | **JWT** + bcrypt | Industry-standard auth |
| ✉️ | **Nodemailer** | Email OTPs |
| 🛡️ | **Zod** | Runtime input validation |
| 🎯 | **TypeScript** | End-to-end type safety |

---

## 📋 Module Status

| Module | Backend | Frontend | Status |
|--------|---------|----------|--------|
| Authentication & User Management | ✅ | ✅ | Complete |
| Digital ID & Profile | ✅ | ✅ | Complete |
| QR-Based Attendance | ✅ | ✅ | Complete |
| Notices & Bulletin | ✅ | ✅ | Complete |
| Academics (Results, Fees, Calendar) | ✅ | ✅ | Complete |
| Fee Receipt Upload & Approval | ✅ | ✅ | **New** ✨ |
| Classroom (Notes, Chat) | ✅ | ✅ | Complete |
| Assignments (Submit & Grade) | ✅ | 🔄 | Backend ready, UI in progress |
| Library | ✅ | ✅ | Complete |
| Hostel Management | ✅ | ✅ | Complete |
| Communities | ✅ | ✅ | **New** ✨ |
| Management Directory | ✅ | ✅ | **New** ✨ |
| Chat (1:1 Messaging) | ✅ | ✅ | **New** ✨ |
| Events | ✅ | ✅ | Complete |
| Lost & Found | ✅ | ✅ | Complete |
| Campus Navigation | ✅ | ✅ | Complete |
| Anti-Ragging | — | ✅ | Static info + reporting |
| Complaints | — | ✅ | Grievance form |
| Smart Chatbot | — | ✅ | NLU-based navigation assistant |

---

## 🤝 Tips for Development

1. **Prisma Studio** — visual database browser:
   ```bash
   cd server && npm run db:studio   # → http://localhost:5555
   ```

2. **Hot Reload** — both client and server auto-reload on file changes.

3. **Port conflicts** — If 5173 is busy, Vite picks the next available port. Check your terminal.

4. **CORS issues** — Make sure `CLIENT_URL` in `.env` matches the port Vite is actually using.

5. **Reset everything:**
   ```bash
   cd server
   del prisma\dev.db         # Windows
   npm run db:push
   node seed.js
   npx ts-node prisma/seed.ts
   ```

---

<div align="center">

**Smart Campus System**  
*Built with ❤️ for BBD University, Lucknow*

</div>
=======
# SmartCampus
>>>>>>> 2aaff41f050265447b8d9d368dfa19c2fa2a32f1
