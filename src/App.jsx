import React, { useState } from 'react';
import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  const [user, setUser] = useState(() => {
    // Clear any legacy persistent login from localStorage so browser close logs out
    try {
      localStorage.removeItem('nsg_portal_user');
    } catch (e) {}

    try {
      const savedUser = sessionStorage.getItem('nsg_portal_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  // Current Unauthenticated View: 'welcome' | 'login'
  const [currentView, setCurrentView] = useState('welcome');

  const handleLoginSuccess = (account) => {
    setUser(account);
    try {
      sessionStorage.setItem('nsg_portal_user', JSON.stringify(account));
    } catch (e) {}
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('welcome');
    try {
      sessionStorage.removeItem('nsg_portal_user');
      localStorage.removeItem('nsg_portal_user');
    } catch (e) {}
  };

  // If user is already logged in, show Dashboard directly
  if (user) {
    return (
      <DashboardPage
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  // If not logged in, route between WelcomePage and LoginPage
  if (currentView === 'login') {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onBackToWelcome={() => setCurrentView('welcome')}
      />
    );
  }

  return (
    <WelcomePage
      onGoToLogin={() => setCurrentView('login')}
    />
  );
}
