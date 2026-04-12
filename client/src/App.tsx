import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute, PublicRoute } from './components/RouteGuards';
import ChatBot from './components/ChatBot';
import ThemeToggle from './components/ThemeToggle';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import DigitalIDPage from './pages/DigitalIDPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AttendancePage from './pages/AttendancePage';
import NoticesPage from './pages/NoticesPage';
import AcademicsPage from './pages/AcademicsPage';
import AntiRaggingPage from './pages/AntiRaggingPage';
import ComplaintsPage from './pages/ComplaintsPage';
import ClassroomPage from './pages/ClassroomPage';
import LibraryPage from './pages/LibraryPage';
import HostelPage from './pages/HostelPage';
import EventsPage from './pages/EventsPage';
import LostFoundPage from './pages/LostFoundPage';
import NavigationPage from './pages/NavigationPage';
import CommunitiesPage from './pages/CommunitiesPage';
import ManagementPage from './pages/ManagementPage';
import ChatPage from './pages/ChatPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1e293b',
                color: '#f1f5f9',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '12px',
                fontSize: '14px',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
              },
              success: {
                iconTheme: { primary: '#22c55e', secondary: '#f1f5f9' },
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' },
              },
            }}
          />

          <Routes>
            {/* Public Routes (redirect to dashboard if logged in) */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>

            {/* Semi-public (accessible always) */}
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/digital-id" element={<DigitalIDPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/notices" element={<NoticesPage />} />
              <Route path="/academics" element={<AcademicsPage />} />
              <Route path="/anti-ragging" element={<AntiRaggingPage />} />
              <Route path="/complaints" element={<ComplaintsPage />} />
              <Route path="/classroom" element={<ClassroomPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/hostel" element={<HostelPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/lost-found" element={<LostFoundPage />} />
              <Route path="/navigation" element={<NavigationPage />} />
              <Route path="/communities" element={<CommunitiesPage />} />
              <Route path="/management" element={<ManagementPage />} />
              <Route path="/chat" element={<ChatPage />} />
            </Route>

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>

          {/* Global floating widgets */}
          <ThemeToggle />
          <ChatBot />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;

