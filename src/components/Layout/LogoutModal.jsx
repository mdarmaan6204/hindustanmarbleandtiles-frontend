import React from 'react';

/**
 * LogoutModal Component
 * Custom modal dialog for logout confirmation
 * Replaces window.confirm() with a styled UI component
 */
export const LogoutModal = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-6 max-w-sm mx-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl">🚪</div>
          <h2 className="text-xl font-bold text-gray-800">Logout</h2>
        </div>

        {/* Message */}
        <p className="text-gray-600 mb-6">
          Are you sure you want to logout? You'll need to login again to access the system.
        </p>

        {/* Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};
