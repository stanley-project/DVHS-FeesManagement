// src/App.tsx (Revised)
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext'; // <--- THIS IS NOW OKAY TO USE HERE
import LoginPage from './pages/auth/LoginPage';
import OtpVerificationPage from './pages/auth/OtpVerificationPage';
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
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  // Now, useAuth() is correctly within the AuthProvider's scope
  const { user, isAuthenticated, authLoading } = useAuth(); // Include authLoading here

  // You need a global loading indicator or a pre-authentication splash screen
  // if authLoading is true initially, as the routes depend on user/isAuthenticated
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Authenticating application...</div>;
  }

  return (
    <Routes>
      {/* Public Routes */}
      {/* Ensure these don't redirect away prematurely if authLoading is true */}
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />} />
      <Route path="/verify-otp" element={!isAuthenticated ? <OtpVerificationPage /> : <Navigate to="/" replace />} />
      
      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute> {/* ProtectedRoute itself handles isAuthenticated check */}
          <DashboardLayout />
        </ProtectedRoute>
      }>
        {/* Default route - redirects based on role */}
        <Route index element={
          user?.role === 'administrator' ? <AdminDashboard /> :
          user?.role === 'accountant' ? <AccountantDashboard /> :
          user?.role === 'teacher' ? <TeacherDashboard /> :
          <Navigate to="/login" replace /> // Fallback if role is null or unrecognized
        } />
        
        {/* Admin Routes */}
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
        
        {/* Teacher Routes */}
        <Route path="student-fee-status" element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <StudentFeeStatus />
          </ProtectedRoute>
        } />
      </Route>
      
      {/* 404 Page */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;