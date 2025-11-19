import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from '../../components/Layout/Sidebar';
import { useToast } from '../../components/Toast';

/**
 * Payments Page
 * Display all payment transactions with filtering and search
 */

function Payments() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    paymentMethod: '',
    startDate: '',
    endDate: ''
  });
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalAmount: 0,
    todayAmount: 0,
    thisMonthAmount: 0
  });
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [revertingPaymentId, setRevertingPaymentId] = useState(null);
  const [reverting, setReverting] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, [searchTerm, filters]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await axios.get(`http://localhost:5000/api/payments?${params}`);
      setPayments(response.data.payments || []);
      
      // Calculate stats
      calculateStats(response.data.payments || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
      showToast({ message: 'Failed to fetch payments', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (paymentsData) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const totalAmount = paymentsData.reduce((sum, p) => sum + p.amount, 0);
    const todayAmount = paymentsData
      .filter(p => new Date(p.paymentDate) >= today)
      .reduce((sum, p) => sum + p.amount, 0);
    const thisMonthAmount = paymentsData
      .filter(p => new Date(p.paymentDate) >= thisMonth)
      .reduce((sum, p) => sum + p.amount, 0);

    setStats({
      totalPayments: paymentsData.length,
      totalAmount,
      todayAmount,
      thisMonthAmount
    });
  };

  const handleDelete = (paymentId) => {
    setRevertingPaymentId(paymentId);
    setShowRevertModal(true);
  };

  const handleConfirmRevert = async () => {
    if (!revertingPaymentId) return;

    setReverting(true);
    try {
      await axios.delete(`http://localhost:5000/api/payments/${revertingPaymentId}`);
      showToast({ message: 'Payment reverted successfully', type: 'success' });
      setShowRevertModal(false);
      setRevertingPaymentId(null);
      fetchPayments();
    } catch (err) {
      console.error('Error reverting payment:', err);
      showToast({ message: err.response?.data?.message || 'Failed to revert payment', type: 'error' });
    } finally {
      setReverting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return '-';
    }
  };

  const getPaymentMethodBadge = (method) => {
    const badges = {
      CASH: 'bg-green-100 text-green-800',
      CARD: 'bg-blue-100 text-blue-800',
      UPI: 'bg-purple-100 text-purple-800',
      BANK_TRANSFER: 'bg-indigo-100 text-indigo-800',
      CHEQUE: 'bg-yellow-100 text-yellow-800',
      OTHER: 'bg-gray-100 text-gray-800'
    };
    return badges[method] || badges.OTHER;
  };

  const getStatusBadge = (status) => {
    const badges = {
      SUCCESS: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      FAILED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800'
    };
    return badges[status] || badges.SUCCESS;
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilters({
      paymentMethod: '',
      startDate: '',
      endDate: ''
    });
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-5xl">💰</span>
                Payment History
              </h1>
              <button
                onClick={() => navigate('/sales/pending-payments')}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                📅 Pending Payments
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Total Payments</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalPayments}</p>
                </div>
                <div className="text-4xl">📊</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">₹{stats.totalAmount.toFixed(2)}</p>
                </div>
                <div className="text-4xl">💵</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Today's Collection</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">₹{stats.todayAmount.toFixed(2)}</p>
                </div>
                <div className="text-4xl">📅</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600">This Month</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">₹{stats.thisMonthAmount.toFixed(2)}</p>
                </div>
                <div className="text-4xl">📆</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Payment number..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
                <select
                  value={filters.paymentMethod}
                  onChange={(e) => setFilters({...filters, paymentMethod: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Methods</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={resetFilters}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold transition"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {loading ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-gray-600">Loading payments...</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💸</div>
                <p className="text-xl text-gray-600">No payments found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Payment #</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Invoice #</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Customer</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Amount</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Method</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Transaction ID</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment._id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                          {payment.paymentNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(payment.paymentDate)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => navigate(`/sales/invoice/${payment.invoiceId?._id}`)}
                            className="text-blue-600 hover:text-blue-800 font-semibold"
                          >
                            {payment.invoiceNumber}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-semibold text-gray-900">{payment.customerName}</div>
                          {payment.customerId?.phone && (
                            <div className="text-xs text-gray-500">📱 {payment.customerId.phone}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-green-700">
                          ₹{payment.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPaymentMethodBadge(payment.paymentMethod)}`}>
                            {payment.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(payment.status)}`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {payment.transactionId || payment.chequeNumber || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => navigate(`/sales/invoice/${payment.invoiceId?._id || payment.invoiceId}`)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-semibold transition"
                            >
                              📄 View Invoice
                            </button>
                            <button
                              onClick={() => handleDelete(payment._id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-semibold transition"
                            >
                              ↩️ Revert
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary Section */}
          {payments.length > 0 && (
            <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Method Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'].map(method => {
                  const methodPayments = payments.filter(p => p.paymentMethod === method);
                  const total = methodPayments.reduce((sum, p) => sum + p.amount, 0);
                  return (
                    <div key={method} className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs font-semibold text-gray-600 mb-1">{method.replace('_', ' ')}</p>
                      <p className="text-lg font-bold text-gray-900">{methodPayments.length}</p>
                      <p className="text-sm text-green-600 font-semibold">₹{total.toFixed(2)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Revert Payment Confirmation Modal */}
      {showRevertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">⚠️</span>
              <h2 className="text-xl font-bold text-gray-900">Revert Payment?</h2>
            </div>
            
            <p className="text-gray-600 mb-4">
              Are you sure you want to revert this payment? This action will:
            </p>
            
            <ul className="space-y-2 mb-6 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">•</span>
                <span>Restore the pending amount on the invoice</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">•</span>
                <span>Update customer balance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">•</span>
                <span>Revert payment status</span>
              </li>
            </ul>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRevertModal(false);
                  setRevertingPaymentId(null);
                }}
                disabled={reverting}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRevert}
                disabled={reverting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
              >
                {reverting ? 'Reverting...' : '↩️ Revert Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Payments;
