import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import FailedJobs from './pages/FailedJobs';
import { Analytics } from './pages/Analytics';
import { QueueMonitor } from './pages/QueueMonitor';
import { Settings } from './pages/Settings';

function App() {
  return (
    <QueryProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/queue" element={<QueueMonitor />} />
            <Route path="/failed-jobs" element={<FailedJobs />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </Router>
    </QueryProvider>
  );
}

export default App;
