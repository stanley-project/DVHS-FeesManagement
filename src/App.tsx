import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
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
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { isNetworkOrResourceError, isDatabaseError, isAuthError } from './lib/supabase';

function App() {
  const { user, isAuthenticated, authLoading } = useAuth();

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Authenticating application...</div>;
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
          },
          success: {
            style: {
              background: '#059669',
            },
          },
          error: {
            style: {
              background: '#DC2626',
            },
            duration: 4000,
          },
        }}
      />

      <ErrorBoundary onError={(error) => {
        console.error('App-level error caught:', error);
        
        // Only handle auth errors at the app level
        if (isAuthError(error)) {
          return true; // Let the ErrorBoundary know we've handled it
        }
        
        // For network or database errors, we'll let the component-level error boundaries handle them
        return false;
      }}>
        <Routes>
          {/* Public Routes: Accessible to all, but redirect if authenticated */}
          <Route 
            path="/login" 
            element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />} 
          />

          {/* Protected Routes: Only accessible if isAuthenticated is true */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Default route for authenticated users, redirects based on user role */}
            <Route
              index
              element={
                user?.role === 'administrator' ? (
                  <AdminDashboard />
                ) : user?.role === 'accountant' ? (
                  <AccountantDashboard />
                ) : user?.role === 'teacher' ? (
                  <TeacherDashboard />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* Admin Routes */}
            <Route
              path="student-registration"
              element={
                <ProtectedRoute allowedRoles={['administrator', 'accountant']}>
                  <StudentRegistration />
                </ProtectedRoute>
              }
            />
            <Route
              path="fee-structure"
              element={
                <ProtectedRoute allowedRoles={['administrator']}>
                  <FeeStructure />
                </ProtectedRoute>
              }
            />
            <Route
              path="fee-collection"
              element={
                <ProtectedRoute allowedRoles={['administrator', 'accountant']}>
                  <FeeCollection />
                </ProtectedRoute>
              }
            />
            <Route
              path="reports"
              element={
                <ProtectedRoute allowedRoles={['administrator', 'accountant']}>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="user-management"
              element={
                <ProtectedRoute allowedRoles={['administrator']}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="village-management"
              element={
                <ProtectedRoute allowedRoles={['administrator']}>
                  <VillageManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="academic-year-management"
              element={
                <ProtectedRoute allowedRoles={['administrator']}>
                  <AcademicYearManagement />
                </ProtectedRoute>
              }
            />

            {/* Teacher Routes */}
            <Route
              path="student-fee-status"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <StudentFeeStatus />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* 404 Page: Catch-all for undefined routes */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ErrorBoundary>
    </>
  );
}

export default App;