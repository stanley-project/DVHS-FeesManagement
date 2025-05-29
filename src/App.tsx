// src/App.tsx (Revised)
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext'; // Ensure this path is correct
import { Toaster } from 'react-hot-toast';
import LoginPage from './pages/auth/LoginPage';
import DashboardLayout from './components/layout/DashboardLayout';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import AccountantDashboard from './pages/dashboard/AccountantDashboard';
import TeacherDashboard from './pages/dashboard/TeacherDashboard';
import NotFoundPage from './pages/NotFoundPage';
import StudentRegistration from './pages/StudentRegistration';
import FeeStructure from './pages/FeeStructure';
import FeeCollection from './pages/FeeCollection';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import VillageManagement from './pages/VillageManagement';
import AcademicYearManagement from './pages/AcademicYearManagement';
import StudentFeeStatus from './pages/StudentFeeStatus';
import ProtectedRoute from './components/auth/ProtectedRoute'; // Ensure this path is correct

function App() {
  // Use useAuth() to get authentication state and user details
  const { user, isAuthenticated, authLoading } = useAuth();

  // Display a global loading indicator while authentication state is being determined.
  // This prevents rendering routes that depend on auth state before it's known.
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Authenticating application...</div>;
  }

  return (
    <Routes>
      {/* Public Routes: Accessible to all, but redirect if authenticated */}
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />} />

      {/* Protected Routes: Only accessible if isAuthenticated is true */}
      <Route path="/" element={
        // ProtectedRoute component handles the redirection if not authenticated
        <ProtectedRoute>
          <DashboardLayout /> {/* Layout for authenticated users */}
        </ProtectedRoute>
      }>
        {/* Default route for authenticated users, redirects based on user role */}
        <Route index element={
          user?.role === 'administrator' ? <AdminDashboard /> :
          user?.role === 'accountant' ? <AccountantDashboard /> :
          user?.role === 'teacher' ? <TeacherDashboard /> :
          // Fallback: If role is null or unrecognized, redirect to login
          <Navigate to="/login" replace />
        } />

        {/* Admin Routes: Accessible only to 'administrator' role */}
        <Route path="student-registration" element={
          <ProtectedRoute allowedRoles={['administrator', 'accountant']}>
            <StudentRegistration />
          </ProtectedRoute>
        } />
        <Route path="fee-structure" element={
          <ProtectedRoute allowedRoles={['administrator']}>
            <FeeStructure />
          </ProtectedRoute>
        } />
        <Route path="fee-collection" element={
          <ProtectedRoute allowedRoles={['administrator', 'accountant']}>
            <FeeCollection />
          </ProtectedRoute>
        } />
        <Route path="reports" element={
          <ProtectedRoute allowedRoles={['administrator', 'accountant']}>
            <Reports />
          </ProtectedRoute>
        } />
        <Route path="user-management" element={
          <ProtectedRoute allowedRoles={['administrator']}>
            <UserManagement />
          </ProtectedRoute>
        } />
        <Route path="village-management" element={
          <ProtectedRoute allowedRoles={['administrator']}>
            <VillageManagement />
          </ProtectedRoute>
        } />
        <Route path="academic-year-management" element={
          <ProtectedRoute allowedRoles={['administrator']}>
            <AcademicYearManagement />
          </ProtectedRoute>
        } />

        {/* Teacher Routes: Accessible only to 'teacher' role */}
        <Route path="student-fee-status" element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <StudentFeeStatus />
          </ProtectedRoute>
        } />
      </Route>

      {/* 404 Page: Catch-all for undefined routes */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;