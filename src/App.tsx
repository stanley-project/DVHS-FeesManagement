import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
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
import StudentFeeStatus from './pages/StudentFeeStatus';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  const { user, isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
      <Route path="/verify-otp" element={!isAuthenticated ? <OtpVerificationPage /> : <Navigate to="/" />} />
      
      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      
      }>
        {/* Default route - redirects based on role */}
        <Route index element={
          user?.role === 'administrator' ? <AdminDashboard /> :
          user?.role === 'accountant' ? <AccountantDashboard /> :
          user?.role === 'teacher' ? <TeacherDashboard /> :
          <Navigate to="/login" />
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