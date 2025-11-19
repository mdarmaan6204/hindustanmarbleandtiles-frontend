import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Modular Sidebar Navigation
 * Main modules with expandable sub-menus
 */
export const EnhancedSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedModule, setExpandedModule] = useState(null);

  const modules = [
    {
      id: 'dashboard',
      name: '📊 Dashboard',
      icon: '📊',
      path: '/',
      subItems: null,
    },
    {
      id: 'inventory',
      name: '📦 Inventory Management',
      icon: '📦',
      subItems: [
        { id: 'inventory-view', name: 'View Products', path: '/inventory/products', icon: '👁️' },
        { id: 'inventory-add', name: 'Add Product', path: '/inventory/add', icon: '➕' },
        { id: 'inventory-list', name: 'Product List', path: '/inventory/list', icon: '📋' },
        { id: 'inventory-categories', name: 'Categories', path: '/inventory/categories', icon: '🏷️' },
        { id: 'inventory-lowstock', name: 'Low Stock Alerts', path: '/inventory/low-stock', icon: '⚠️' },
      ],
    },
    {
      id: 'stock',
      name: '📤 Stock Management',
      icon: '📤',
      subItems: [
        { id: 'stock-add', name: 'Add Stock', path: '/stock/add', icon: '➕' },
        { id: 'stock-view', name: 'View Stock', path: '/stock/view', icon: '👁️' },
        { id: 'stock-adjust', name: 'Adjust Stock', path: '/stock/adjust', icon: '🔧' },
        { id: 'stock-transfer', name: 'Transfer Stock', path: '/stock/transfer', icon: '🚚' },
        { id: 'stock-reports', name: 'Stock Reports', path: '/stock/reports', icon: '📊' },
        { id: 'stock-analysis', name: 'Stock Analysis', path: '/stock/analysis', icon: '📈' },
        { id: 'stock-history', name: 'Stock History', path: '/stock/history', icon: '⏰' },
        { id: 'stock-damage', name: 'Damage Inventory', path: '/stock/damage', icon: '🚨' },
      ],
    },
    {
      id: 'sales',
      name: '💰 Sales & Orders',
      icon: '💰',
      subItems: [
        { id: 'sales-new', name: 'New Sale', path: '/sales/new', icon: '📝' },
        { id: 'sales-view', name: 'View Orders', path: '/sales/orders', icon: '📋' },
        { id: 'sales-invoice', name: 'Invoices', path: '/sales/invoices', icon: '🧾' },
        { id: 'sales-reports', name: 'Sales Reports', path: '/sales/reports', icon: '📊' },
        { id: 'sales-analysis', name: 'Sales Analytics', path: '/sales/analytics', icon: '📈' },
      ],
    },
    {
      id: 'collections',
      name: '💳 Collections',
      icon: '💳',
      subItems: [
        { id: 'collections-collect', name: 'Collect Payment', path: '/collections/collect', icon: '💰' },
        { id: 'collections-view', name: 'View Collections', path: '/collections/view', icon: '📋' },
        { id: 'collections-pending', name: 'Pending Payments', path: '/collections/pending', icon: '⏳' },
        { id: 'collections-reports', name: 'Payment Reports', path: '/collections/reports', icon: '📊' },
        { id: 'collections-analysis', name: 'Collection Analysis', path: '/collections/analysis', icon: '📈' },
      ],
    },
    {
      id: 'purchases',
      name: '🛒 Purchases',
      icon: '🛒',
      subItems: [
        { id: 'purchases-new', name: 'New Purchase', path: '/purchases/new', icon: '📝' },
        { id: 'purchases-orders', name: 'Purchase Orders', path: '/purchases/orders', icon: '📋' },
        { id: 'purchases-suppliers', name: 'Suppliers', path: '/purchases/suppliers', icon: '🏢' },
        { id: 'purchases-reports', name: 'Purchase Reports', path: '/purchases/reports', icon: '📊' },
      ],
    },
    {
      id: 'reports',
      name: '📊 Reports & Analytics',
      icon: '📊',
      subItems: [
        { id: 'reports-dashboard', name: 'Dashboard', path: '/reports/dashboard', icon: '📈' },
        { id: 'reports-inventory', name: 'Inventory Report', path: '/reports/inventory', icon: '📦' },
        { id: 'reports-sales', name: 'Sales Report', path: '/reports/sales', icon: '💰' },
        { id: 'reports-stock', name: 'Stock Report', path: '/reports/stock', icon: '📤' },
        { id: 'reports-customer', name: 'Customer Report', path: '/reports/customer', icon: '👥' },
        { id: 'reports-export', name: 'Export Data', path: '/reports/export', icon: '📥' },
      ],
    },
    {
      id: 'settings',
      name: '⚙️ Settings',
      icon: '⚙️',
      subItems: [
        { id: 'settings-company', name: 'Company Info', path: '/settings/company', icon: '🏢' },
        { id: 'settings-categories', name: 'Product Categories', path: '/settings/categories', icon: '🏷️' },
        { id: 'settings-units', name: 'Units & Measures', path: '/settings/units', icon: '📏' },
        { id: 'settings-users', name: 'Users', path: '/settings/users', icon: '👥' },
        { id: 'settings-backup', name: 'Backup & Restore', path: '/settings/backup', icon: '💾' },
      ],
    },
  ];

  const toggleModule = (moduleId) => {
    setExpandedModule(expandedModule === moduleId ? null : moduleId);
  };

  const isModuleActive = (modulePath) => {
    return location.pathname.startsWith(modulePath.split('/').slice(0, -1).join('/'));
  };

  return (
    <div className="w-64 h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 text-white overflow-y-auto fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-blue-700">
        <h1 className="text-2xl font-bold text-center">🏢 HT</h1>
        <p className="text-xs text-blue-200 text-center mt-1">Hindustan Tiles</p>
      </div>

      {/* Navigation Modules */}
      <nav className="mt-4">
        {modules.map((module) => (
          <div key={module.id}>
            {/* Module Button */}
            <button
              onClick={() => {
                if (module.subItems) {
                  toggleModule(module.id);
                } else {
                  navigate(module.path);
                }
              }}
              className={`w-full px-6 py-3 text-left flex items-center justify-between hover:bg-blue-700 transition-all duration-200 ${
                isModuleActive(module.path) ? 'bg-blue-700 border-r-4 border-white' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{module.icon}</span>
                <span className="font-medium text-sm">{module.name}</span>
              </div>
              {module.subItems && (
                <span
                  className={`text-xs transform transition-transform ${
                    expandedModule === module.id ? 'rotate-180' : ''
                  }`}
                >
                  ▼
                </span>
              )}
            </button>

            {/* Sub Items */}
            {module.subItems && expandedModule === module.id && (
              <div className="bg-blue-800 animate-slideDown">
                {module.subItems.map((subItem) => (
                  <button
                    key={subItem.id}
                    onClick={() => navigate(subItem.path)}
                    className={`w-full px-12 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-blue-600 transition-all duration-150 ${
                      location.pathname === subItem.path ? 'bg-blue-600 border-r-4 border-white' : ''
                    }`}
                  >
                    <span className="text-lg">{subItem.icon}</span>
                    <span>{subItem.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 w-full p-4 border-t border-blue-700 bg-blue-900">
        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }}
          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-all duration-200"
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
};

export default EnhancedSidebar;
