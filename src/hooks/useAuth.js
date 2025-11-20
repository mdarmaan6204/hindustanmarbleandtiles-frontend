import { useState, useEffect } from 'react';

/**
 * useAuth Hook - Frontend Only Authentication
 * Manages user authentication state with localStorage persistence
 * Stores user data and permissions for access control
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize user from localStorage on mount
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const permissionsStr = localStorage.getItem('permissions');
    
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        const permissions = permissionsStr ? JSON.parse(permissionsStr) : {};
        
        setUser({
          ...userData,
          permissions,
        });
      } catch (err) {
        console.error('Error parsing user:', err);
        // Clear corrupted data
        localStorage.removeItem('user');
        localStorage.removeItem('permissions');
      }
    }
    setLoading(false);
  }, []);

  /**
   * Login user - stores user data and permissions
   * @param {Object} userData - user object with permissions
   */
  const login = (userData) => {
    const { permissions, ...userWithoutPermissions } = userData;
    
    // Store user data
    localStorage.setItem('user', JSON.stringify(userWithoutPermissions));
    
    // Store permissions separately for easy access control
    localStorage.setItem('permissions', JSON.stringify(permissions));
    
    // Update state
    setUser(userData);
  };

  /**
   * Logout user - clears all authentication data
   */
  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
    localStorage.removeItem('token');
    
    // Clear sessionStorage (if any)
    sessionStorage.clear();
    
    // Clear state
    setUser(null);
  };

  /**
   * Check if user has permission to access a feature
   * @param {string} permission - permission key to check
   * @returns {boolean}
   */
  const hasPermission = (permission) => {
    if (!user) return false;
    return user.permissions?.[permission] === true;
  };

  /**
   * Check if user can access multiple permissions (AND logic)
   * @param {Array<string>} permissions - array of permission keys
   * @returns {boolean}
   */
  const hasAllPermissions = (permissions) => {
    return permissions.every((perm) => hasPermission(perm));
  };

  /**
   * Check if user can access any of the permissions (OR logic)
   * @param {Array<string>} permissions - array of permission keys
   * @returns {boolean}
   */
  const hasAnyPermission = (permissions) => {
    return permissions.some((perm) => hasPermission(perm));
  };

  return {
    user,
    loading,
    login,
    logout,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
  };
};
