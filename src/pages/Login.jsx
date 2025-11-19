import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // TODO: Enable backend authentication on deployment
      // For now, mock login for demo purposes
      localStorage.setItem('token', 'demo-token-' + Date.now());
      localStorage.setItem('user', JSON.stringify({
        _id: '123',
        name: 'Admin User',
        email: identifier,
        phone: '9876543210',
        role: 'admin'
      }));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block bg-blue-600 text-white px-4 py-3 rounded-lg font-bold text-2xl mb-4">
            HT
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Hindustan Tiles</h1>
          <p className="text-gray-600 mt-2">Inventory Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email or Phone</label>
            <input
              type="text"
              placeholder="admin@hindmarble.com or 9876543210"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center text-xs text-gray-600">
          <p>Demo Credentials:</p>
          <p>Email: admin@hindmarble.com</p>
          <p>Password: admin123</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
