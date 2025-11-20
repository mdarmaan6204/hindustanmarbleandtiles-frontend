# Frontend-Only Authentication System

## Overview
This application now uses **frontend-only authentication** with hardcoded user credentials. Only 2 users exist with different permission levels:
- **Wasim** - Full Access (All sections visible)
- **Nawab** - Stock Only (Only stock section visible)

---

## User Credentials

### 👤 User 1: WASIM (Full Access)
```
Username: wasim
Phone: 8581808501
Password: htm-wasim
Email: wasim@hindmarble.com
Role: admin
```
**Permissions:**
- ✅ Stock Management - Full access
- ✅ Sales Management - Full access
- ✅ Customers - Full access
- ✅ Payments - Full access
- ✅ Reports - Full access
- ✅ Settings - Full access

**Access All Sections:** Dashboard, Stock, Sales, Customers, Payments, Returns, Reports, Settings

---

### 👤 User 2: NAWAB (Stock Only)
```
Username: nawab
Phone: 9931399991
Password: htm-nawab
Email: nawab@hindmarble.com
Role: stock-viewer
```
**Permissions:**
- ✅ Stock Management - View only
- ❌ Sales Management - Not accessible
- ❌ Customers - Not accessible
- ❌ Payments - Not accessible
- ❌ Reports - Not accessible
- ❌ Settings - Not accessible

**Access Only:** Dashboard, Stock Section

---

## Login Page
The login page accepts either username or phone number:
- Username: `wasim` or `nawab`
- Phone: `8581808501` or `9931399991`
- Password: As specified above

---

## Technical Implementation

### Frontend Storage
When a user logs in, the following data is stored in localStorage:

**`user`** - User basic information:
```json
{
  "username": "wasim",
  "name": "Wasim",
  "phone": "8581808501",
  "email": "wasim@hindmarble.com",
  "role": "admin"
}
```

**`permissions`** - User permissions for access control:
```json
{
  "canViewStock": true,
  "canViewSales": true,
  "canViewCustomers": true,
  "canViewReports": true,
  "canViewPayments": true,
  "canViewSettings": true
}
```

### useAuth Hook
Enhanced hook with permission checking methods:

```javascript
const { 
  user,              // Current logged-in user
  loading,           // Loading state
  login,             // Login function
  logout,            // Logout function
  hasPermission,     // Check single permission
  hasAllPermissions, // Check multiple (AND logic)
  hasAnyPermission   // Check multiple (OR logic)
} = useAuth();
```

### Usage in Components

**Check single permission:**
```javascript
if (hasPermission('canViewSales')) {
  // Show sales section
}
```

**Check multiple permissions (AND):**
```javascript
if (hasAllPermissions(['canViewReports', 'canViewPayments'])) {
  // Show reports and payments
}
```

**Check multiple permissions (OR):**
```javascript
if (hasAnyPermission(['canViewSales', 'canViewCustomers'])) {
  // Show sales or customers section
}
```

### Sidebar Conditional Rendering
Menu items are conditionally rendered based on user permissions:
- Stock Management: Always visible if `canViewStock` is true
- Sales Management: Visible only if `canViewSales` is true
- Settings: Visible only if `canViewSettings` is true
- Each submenu item also checked for permission

### Authentication Flow
1. User enters username/phone and password on login page
2. Frontend validates against hardcoded `USERS_DB` in `constants/users.js`
3. If credentials valid:
   - User data stored in localStorage
   - Permissions stored in localStorage
   - User redirected to dashboard
4. On each page load, `useAuth` hook restores user from localStorage
5. Sidebar and other components check permissions via `hasPermission()`

---

## Logout Process
When user clicks logout:
1. Confirmation dialog appears
2. On confirmation:
   - localStorage cleared (`user`, `permissions`, `token`)
   - sessionStorage cleared
   - User state reset to null
   - Redirected to login page
3. All cached data removed - fresh login required

---

## Files Modified

### Frontend
- `src/constants/users.js` - New file with hardcoded user credentials
- `src/hooks/useAuth.js` - Enhanced with permission checking
- `src/pages/Login.jsx` - Updated for frontend-only authentication
- `src/components/Layout/Sidebar.jsx` - Conditional rendering based on permissions
- `src/components/Layout/Header.jsx` - Improved logout UX
- `src/components/Layout/MainLayout.jsx` - Enhanced logout handling

### Backend
- `src/index.js` - Removed authentication routes (auth now frontend-only)
- Authentication middleware no longer enforced

---

## Security Notes

⚠️ **Important:** This is a frontend-only authentication system suitable for:
- Internal tools with limited users
- Demo/proof-of-concept applications
- Scenarios where backend data isn't sensitive

⚠️ **Not suitable for:**
- Public-facing applications
- Systems with sensitive financial data requiring backend auth
- Applications needing server-side session management

### To add backend authentication later:
1. Restore authRoutes and authMiddleware in backend
2. Update frontend Login to call backend API
3. Store JWT token instead of just user data
4. Add authorization middleware to protected routes

---

## Testing Users

### Test Full Access:
- Login as: `wasim` / `htm-wasim`
- Verify: All sections visible in sidebar (Stock, Sales, Customers, etc.)

### Test Limited Access:
- Login as: `nawab` / `htm-nawab`
- Verify: Only Stock section visible in sidebar
- Verify: Cannot access other pages (redirects to stock or dashboard)

---

## Customization

### Add New User:
Edit `src/constants/users.js`:
```javascript
export const USERS_DB = {
  // ... existing users
  newuser: {
    username: 'newuser',
    phone: '1234567890',
    password: 'password123',
    name: 'New User',
    role: 'staff',
    permissions: {
      canViewStock: true,
      canViewSales: true,
      // ... other permissions
    },
    email: 'newuser@hindmarble.com',
  }
};
```

### Change User Password:
Edit the password in `src/constants/users.js` and redeploy frontend.

### Modify Permissions:
Update the permissions object in `USERS_DB` for the user.

---

## Troubleshooting

### User can't login
- Check spelling of username/phone
- Verify password is correct
- Clear localStorage and try again

### Sidebar items not appearing
- Verify user has permission enabled
- Check useAuth hook is returning correct permissions
- Clear localStorage and login again

### localStorage not persisting
- Check browser privacy settings
- Try incognito/private window
- Ensure cookies enabled in browser

---

**System**: Hindustan Marble & Tiles ERP
**Auth Type**: Frontend-Only
**Users**: 2 (Wasim, Nawab)
**Last Updated**: November 20, 2025
