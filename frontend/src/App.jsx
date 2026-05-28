import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/useAuth';
import api from './utils/api';

import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import DataEntry from './pages/DataEntry';
import Reports from './pages/Reports';
import Registers from './pages/Registers';
import Records from './pages/Records';
import Masters from './pages/Masters';

const PrivateRoute = ({ children, roles }) => {
  const { user, token } = useAuth();

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (!user) {
    return <div>Loading...</div>; // Waiting for user details
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" />; // Or a generic unauthorized page
  }

  return children;
};

function App() {
  const { token, setUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
        } catch (error) {
          console.error("Failed to fetch user", error);
          logout();
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [token, setUser, logout]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading MillX...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={
            <PrivateRoute roles={['admin']}>
              <UserManagement />
            </PrivateRoute>
          } />
          
          <Route path="data-entry" element={
            <PrivateRoute roles={['admin', 'data_entry']}>
              <DataEntry />
            </PrivateRoute>
          } />

          <Route path="reports" element={
            <PrivateRoute roles={['admin', 'report_viewer']}>
              <Reports />
            </PrivateRoute>
          } />

          <Route path="registers" element={
            <PrivateRoute roles={['admin', 'report_viewer']}>
              <Registers />
            </PrivateRoute>
          } />

          <Route path="records" element={
            <PrivateRoute roles={['admin']}>
              <Records />
            </PrivateRoute>
          } />

          <Route path="masters" element={
            <PrivateRoute roles={['admin']}>
              <Masters />
            </PrivateRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
