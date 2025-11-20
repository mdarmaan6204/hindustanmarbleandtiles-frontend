import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EnhancedSidebar } from './EnhancedSidebar';
import { Header } from './Header';
import { useAuth } from '../../hooks/useAuth';

/**
 * Main Layout Wrapper
 * Used for all authenticated pages
 * Manages user session and permissions
 */
export const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  React.useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-lg">
        ⏳ Loading...
      </div>
    );
  }

  if (!user) return null;

  const handleLogout = () => {
    // Clear all storage and state
    logout();
    
    // Optional: Clear any cached API data
    try {
      // Clear any IndexedDB if used
      if (window.indexedDB) {
        const dbs = await window.indexedDB.databases?.();
        dbs?.forEach((db) => window.indexedDB.deleteDatabase(db.name));
      }
    } catch (err) {
      console.warn('Could not clear IndexedDB:', err);
    }
    
    // Redirect to login
    navigate('/login');
  };

  return (
    <div className="flex">
      <EnhancedSidebar />
      <div className="flex-1 ml-64">
        <Header user={user} onLogout={handleLogout} />
        <main className="p-6 bg-gray-100 min-h-[calc(100vh-80px)]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
