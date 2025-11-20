import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const Sidebar = () => {
  const [expandedMenu, setExpandedMenu] = useState('stock');
  const location = useLocation();
  const { user, hasPermission } = useAuth();

  useEffect(() => {
    if (location.pathname.startsWith('/stock')) {
      setExpandedMenu('stock');
    } else if (location.pathname.startsWith('/sales')) {
      setExpandedMenu('sales');
    }
  }, [location.pathname]);

  const toggleMenu = (menu) => {
    setExpandedMenu(expandedMenu === menu ? null : menu);
  };

  const isActive = (path) => location.pathname === path;
  const isMenuActive = (path) => location.pathname.startsWith(path);

  return (
    <aside className="bg-gray-800 text-white w-64 h-screen fixed left-0 top-0 pt-20 overflow-y-auto">
      <nav className="px-4 py-6">
        <Link
          to="/"
          className={`block px-4 py-3 rounded hover:bg-gray-700 mb-2 transition font-medium ${
            isActive('/') ? 'bg-blue-600' : ''
          }`}
        >
          📊 Dashboard
        </Link>

        {/* Stock Management - Always Visible for stock viewers */}
        {hasPermission('canViewStock') && (
          <div className="mb-2">
            <button
              onClick={() => toggleMenu('stock')}
              className={`w-full text-left px-4 py-3 rounded hover:bg-gray-700 transition font-medium flex justify-between items-center ${
                isMenuActive('/stock') ? 'bg-blue-600' : ''
              }`}
            >
              📦 Stock Management
              <span
                className={`transform transition-transform ${
                  expandedMenu === 'stock' ? 'rotate-180' : ''
                }`}
              >
                ▼
              </span>
            </button>
            {expandedMenu === 'stock' && (
              <div className="ml-4 mt-1 space-y-1">
                <Link
                  to="/stock/add-product"
                  className={`block px-4 py-2 rounded text-sm transition ${
                    isActive('/stock/add-product')
                      ? 'bg-green-600 text-white font-bold'
                      : 'hover:bg-gray-600'
                  }`}
                >
                  ➕ Add Product
                </Link>
                <Link
                  to="/stock/view-product"
                  className={`block px-4 py-2 rounded text-sm transition ${
                    isActive('/stock/view-product')
                      ? 'bg-green-600 text-white font-bold'
                      : 'hover:bg-gray-600'
                  }`}
                >
                  👁️ View Product
                </Link>
                <Link
                  to="/stock/product-list"
                  className={`block px-4 py-2 rounded text-sm transition ${
                    isActive('/stock/product-list')
                      ? 'bg-green-600 text-white font-bold'
                      : 'hover:bg-gray-600'
                  }`}
                >
                  📋 Product List
                </Link>
                <Link
                  to="/stock/damage-product"
                  className={`block px-4 py-2 rounded text-sm transition ${
                    isActive('/stock/damage-product')
                      ? 'bg-green-600 text-white font-bold'
                      : 'hover:bg-gray-600'
                  }`}
                >
                  🚨 Damage Product
                </Link>
                <Link
                  to="/stock/low-stock"
                  className={`block px-4 py-2 rounded text-sm transition ${
                    isActive('/stock/low-stock')
                      ? 'bg-green-600 text-white font-bold'
                      : 'hover:bg-gray-600'
                  }`}
                >
                  ⚠️ Low Stock Alert
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Sales Management - Only visible if user has sales permission */}
        {hasPermission('canViewSales') && (
          <div className="mb-2">
            <button
              onClick={() => toggleMenu('sales')}
              className={`w-full text-left px-4 py-3 rounded hover:bg-gray-700 transition font-medium flex justify-between items-center ${
                isMenuActive('/sales') ? 'bg-blue-600' : ''
              }`}
            >
              💰 Sales Management
              <span
                className={`transform transition-transform ${
                  expandedMenu === 'sales' ? 'rotate-180' : ''
                }`}
              >
                ▼
              </span>
            </button>
            {expandedMenu === 'sales' && (
              <div className="ml-4 mt-1 space-y-1">
                {hasPermission('canViewSales') && (
                  <>
                    <Link
                      to="/sales/create-invoice"
                      className={`block px-4 py-2 rounded text-sm transition ${
                        isActive('/sales/create-invoice')
                          ? 'bg-green-600 text-white font-bold'
                          : 'hover:bg-gray-600'
                      }`}
                    >
                      📝 Create Invoice
                    </Link>
                    <Link
                      to="/sales/invoice-list"
                      className={`block px-4 py-2 rounded text-sm transition ${
                        isActive('/sales/invoice-list')
                          ? 'bg-green-600 text-white font-bold'
                          : 'hover:bg-gray-600'
                      }`}
                    >
                      📋 Invoice List
                    </Link>
                  </>
                )}
                {hasPermission('canViewCustomers') && (
                  <Link
                    to="/sales/customers"
                    className={`block px-4 py-2 rounded text-sm transition ${
                      isActive('/sales/customers')
                        ? 'bg-green-600 text-white font-bold'
                        : 'hover:bg-gray-600'
                    }`}
                  >
                    👥 Customers
                  </Link>
                )}
                {hasPermission('canViewPayments') && (
                  <>
                    <Link
                      to="/sales/payments"
                      className={`block px-4 py-2 rounded text-sm transition ${
                        isActive('/sales/payments')
                          ? 'bg-green-600 text-white font-bold'
                          : 'hover:bg-gray-600'
                      }`}
                    >
                      💳 Payments
                    </Link>
                    <Link
                      to="/sales/pending-payments"
                      className={`block px-4 py-2 rounded text-sm transition ${
                        isActive('/sales/pending-payments')
                          ? 'bg-green-600 text-white font-bold'
                          : 'hover:bg-gray-600'
                      }`}
                    >
                      ⏰ Pending Payments
                    </Link>
                  </>
                )}
                <Link
                  to="/sales/returns"
                  className={`block px-4 py-2 rounded text-sm transition ${
                    isActive('/sales/returns')
                      ? 'bg-green-600 text-white font-bold'
                      : 'hover:bg-gray-600'
                  }`}
                >
                  🔄 Returns & Refunds
                </Link>
                {hasPermission('canViewReports') && (
                  <Link
                    to="/sales/reports"
                    className={`block px-4 py-2 rounded text-sm transition ${
                      isActive('/sales/reports')
                        ? 'bg-green-600 text-white font-bold'
                        : 'hover:bg-gray-600'
                    }`}
                  >
                    📊 Sales Reports
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Settings - Only visible if user has settings permission */}
        {hasPermission('canViewSettings') && (
          <div className="mb-2">
            <button
              onClick={() => toggleMenu('settings')}
              className="w-full text-left px-4 py-3 rounded hover:bg-gray-700 transition font-medium flex justify-between items-center"
            >
              ⚙️ Settings
              <span
                className={`transform transition-transform ${
                  expandedMenu === 'settings' ? 'rotate-180' : ''
                }`}
              >
                ▼
              </span>
            </button>
            {expandedMenu === 'settings' && (
              <div className="ml-4 mt-1 space-y-1">
                <Link
                  to="/settings/company"
                  className="block px-4 py-2 rounded hover:bg-gray-600 text-sm"
                >
                  🏢 Company Info
                </Link>
                <Link
                  to="/settings/categories"
                  className="block px-4 py-2 rounded hover:bg-gray-600 text-sm"
                >
                  🏷️ Categories
                </Link>
                <Link
                  to="/settings/users"
                  className="block px-4 py-2 rounded hover:bg-gray-600 text-sm"
                >
                  👥 Users
                </Link>
              </div>
            )}
          </div>
        )}

        {/* User Role Info */}
        <div className="mt-8 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-400 px-4 mb-2">LOGGED IN AS</p>
          <div className="px-4 py-2 bg-gray-700 rounded text-sm">
            <p className="font-semibold">{user?.name}</p>
          </div>
        </div>
      </nav>
    </aside>
  );
};