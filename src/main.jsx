import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Auto-login for demo
const token = localStorage.getItem('token');
if (!token) {
  localStorage.setItem('token', 'demo-token-' + Date.now());
  localStorage.setItem('user', JSON.stringify({
    _id: '123',
    name: 'Admin User',
    email: 'admin@hindmarble.com',
    phone: '9876543210',
    role: 'admin'
  }));
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
