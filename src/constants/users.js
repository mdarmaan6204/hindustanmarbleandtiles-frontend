/**
 * Hardcoded Users for Hindustan Tiles ERP
 * Only 2 users: Wasim (Full Access) & Nawab (Stock Only)
 */

export const USERS_DB = {
  wasim: {
    username: 'wasim',
    phone: '8581808501',
    password: 'htm-wasim',
    name: 'Wasim',
    role: 'admin',
    permissions: {
      canViewStock: true,
      canViewSales: true,
      canViewCustomers: true,
      canViewReports: true,
      canViewPayments: true,
      canViewSettings: true,
    },
    email: 'wasim@hindmarble.com',
  },
  nawab: {
    username: 'nawab',
    phone: '9931399991',
    password: 'htm-nawab',
    name: 'Nawab',
    role: 'stock-viewer',
    permissions: {
      canViewStock: true,
      canViewSales: false,
      canViewCustomers: false,
      canViewReports: false,
      canViewPayments: false,
      canViewSettings: false,
    },
    email: 'nawab@hindmarble.com',
  },
};

/**
 * Get user by username or phone
 * @param {string} identifier - username or phone number
 * @returns {Object|null} - user object or null if not found
 */
export const findUser = (identifier) => {
  if (!identifier) return null;
  
  // Check if identifier matches any user
  for (const [key, user] of Object.entries(USERS_DB)) {
    if (user.username === identifier || user.phone === identifier) {
      return user;
    }
  }
  
  return null;
};

/**
 * Verify user credentials
 * @param {string} identifier - username or phone
 * @param {string} password - password to verify
 * @returns {Object|null} - user object without password if verified, null otherwise
 */
export const verifyCredentials = (identifier, password) => {
  const user = findUser(identifier);
  
  if (!user) {
    return null;
  }
  
  if (user.password !== password) {
    return null;
  }
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
