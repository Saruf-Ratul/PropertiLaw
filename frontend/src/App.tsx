import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import CaseDetail from './pages/CaseDetail';
import CaseIntake from './pages/CaseIntake';
import Properties from './pages/Properties';
import Clients from './pages/Clients';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Calendar from './pages/Calendar';
import BulkOperations from './pages/BulkOperations';
import Analytics from './pages/Analytics';
import DocumentApprovals from './pages/DocumentApprovals';
import Layout from './components/Layout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuthStore();
  
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="cases" element={<Cases />} />
          <Route path="cases/new" element={<CaseIntake />} />
          <Route path="cases/:id" element={<CaseDetail />} />
          <Route path="properties" element={<Properties />} />
          <Route path="clients" element={<Clients />} />
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<Users />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="bulk" element={<BulkOperations />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="approvals" element={<DocumentApprovals />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

