import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Layout/Header';
import { Sidebar } from '../components/Layout/Sidebar';
import { Button } from '../components/UI/index.jsx';
import { useAuth } from '../hooks/useAuth';

// Dummy stats for demo
const DUMMY_STATS = {
  totalProducts: 6,
  lowStockItems: 1,
  totalStock: 778,
};

function Dashboard() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [stats, setStats] = useState(DUMMY_STATS);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-lg">Loading...</div>;
  }

  if (!user) return null;

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header user={user} onLogout={handleLogout} />

        <main className="p-6 bg-gray-100 min-h-[calc(100vh-80px)]">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h2>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Products</p>
                    <p className="text-3xl font-bold text-gray-800">{stats.totalProducts}</p>
                  </div>
                  <div className="text-4xl text-blue-600">📦</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-600">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Low Stock Items</p>
                    <p className="text-3xl font-bold text-gray-800">{stats.lowStockItems}</p>
                  </div>
                  <div className="text-4xl text-orange-600">⚠️</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-600">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Stock Units</p>
                    <p className="text-3xl font-bold text-gray-800">{stats.totalStock}</p>
                  </div>
                  <div className="text-4xl text-green-600">📊</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="primary" onClick={() => navigate('/products/add')}>
                  ➕ Add New Product
                </Button>
                <Button variant="secondary" onClick={() => navigate('/products')}>
                  📋 View Products
                </Button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Activity</h3>
              <div className="text-center py-8 text-gray-500">
                <p>No recent activities yet</p>
                <p className="text-sm">Start adding products to see activity here</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
