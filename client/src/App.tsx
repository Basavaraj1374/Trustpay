// ─────────────────────────────────────────────────────────────────────────────
// App.tsx — Main Router Configuration
// ─────────────────────────────────────────────────────────────────────────────

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import NewProject from './pages/NewProject';
import ProjectDetail from './pages/ProjectDetail';
import Invoices from './pages/Invoices';
import Wallet from './pages/Wallet';
import Layout from './components/Layout';

/**
 * A wrapper for routes that require the user to be logged in.
 */
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">
        Loading TrustPay...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Layout>
                <Projects />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects/new"
          element={
            <ProtectedRoute>
              <Layout>
                <NewProject />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <ProjectDetail />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoices"
          element={
            <ProtectedRoute>
              <Layout>
                <Invoices />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/wallet"
          element={
            <ProtectedRoute>
              <Layout>
                <Wallet />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
