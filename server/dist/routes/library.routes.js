"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const libraryController_1 = require("../controllers/libraryController");
const router = (0, express_1.Router)();
// All library routes require authentication
router.use(auth_middleware_1.authenticate);
// ─── Book Catalogue (visible to all roles) ──────────────────────
router.get('/books', libraryController_1.getBooks);
// ─── Library Staff / Admin ──────────────────────────────────────
router.post('/books', libraryController_1.createBook);
router.put('/books/:id', libraryController_1.updateBook);
router.delete('/books/:id', (0, auth_middleware_1.authorize)('admin'), libraryController_1.deleteBook);
// ─── Student: own issues ────────────────────────────────────────
router.get('/my-issues', libraryController_1.getMyIssues);
// ─── All issues (librarian/admin) ───────────────────────────────
router.get('/issues', libraryController_1.getAllIssues);
router.post('/issue', libraryController_1.issueBook);
router.put('/issues/:id/return', libraryController_1.returnBook);
router.patch('/issues/:id/penalty', libraryController_1.updatePenalty);
// ─── Stats ──────────────────────────────────────────────────────
router.get('/stats', libraryController_1.getLibraryStats);
// ─── Student search for issue form ─────────────────────────────
router.get('/students', libraryController_1.searchStudents);
// ─── Admin: toggle librarian flag ──────────────────────────────
router.patch('/staff/:userId', (0, auth_middleware_1.authorize)('admin'), libraryController_1.toggleLibrarian);
exports.default = router;
//# sourceMappingURL=library.routes.js.map