import React from 'react';

export const Header = ({ user, onLogout }) => {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-white text-blue-600 px-3 py-2 rounded font-bold text-lg">HT</div>
          <h1 className="text-2xl font-bold">Hindustan Tiles ERP</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm">{user?.name}</span>
          <button
            onClick={onLogout}
            className="bg-red-500 hover:bg-red-600 px-3 py-2 rounded text-sm font-medium transition"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};
