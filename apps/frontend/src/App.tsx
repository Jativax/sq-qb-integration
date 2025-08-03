import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import FailedJobs from './pages/FailedJobs';
import Analytics from './pages/Analytics';
import QueueMonitor from './pages/QueueMonitor';
import Settings from './pages/Settings';
import AuditTrail from './pages/AuditTrail';
import Login from './pages/Login';

function App() {
  return (
    <QueryProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/queue" element={<QueueMonitor />} />
                    <Route path="/failed-jobs" element={<FailedJobs />} />
                    <Route path="/audit-trail" element={<AuditTrail />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </QueryProvider>
  );
}

export default App;
