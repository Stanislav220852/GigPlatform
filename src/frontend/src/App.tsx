import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Map } from './pages/Map';
import { CreateTask } from './pages/CreateTask';
import { TaskDetail } from './pages/TaskDetail';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/map" element={
        <RequireAuth><Map /></RequireAuth>
      } />
      <Route path="/tasks/create" element={
        <RequireAuth><CreateTask /></RequireAuth>
      } />
      <Route path="/tasks/:id" element={
        <RequireAuth><TaskDetail /></RequireAuth>
      } />
      <Route path="/profile" element={
        <RequireAuth><Profile /></RequireAuth>
      } />
      <Route path="*" element={<Navigate to="/map" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}