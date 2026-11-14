import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import EmployeeChatPage from './pages/EmployeeChatPage';
import SplitComparePage from './pages/SplitComparePage';
import AdminIngestPage from './pages/AdminIngestPage';
import AdminSecurityPage from './pages/AdminSecurityPage';
import ErrorBoundary from './components/common/ErrorBoundary';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Authentication Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Authenticated Application Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Employee Chat Workspace */}
              <Route path="/chat" element={<EmployeeChatPage />} />

              {/* Split-Screen Dual-Role Comparison Workspace */}
              <Route path="/compare" element={<SplitComparePage />} />

              {/* Admin-Only Ingestion Workspace */}
              <Route
                path="/admin/ingest"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminIngestPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin-Only Security & Audit Command Center */}
              <Route
                path="/admin/security"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminSecurityPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback & Default Redirect */}
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
