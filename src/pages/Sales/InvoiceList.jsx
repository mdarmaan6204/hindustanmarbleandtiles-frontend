import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from '../../components/Layout/Sidebar';
import { useToast } from '../../components/Toast';

/**
 * Invoice List Page
 * Display all invoices with filtering and search
 */

function InvoiceList() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, invoice: null, paymentAmount: 0, discount: 0, onConfirm: null });
  const [filters, setFilters] = useState({
    search: '',
    invoiceType: '',
    paymentStatus: '',
    startDate: '',
    endDate: ''
  });
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, highestAmount, lowestAmount, highestPending, lowestPending
  const [paymentData, setPaymentData] = useState({
    paymentAmount: '',
    paymentMethod: 'CASH',
    nextDueDate: '',
    transactionId: '',
    notes: ''
  });

  useEffect(() => {
    fetchInvoices();
  }, [filters]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/invoices?${params}`);
      setInvoices(response.data.invoices || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      showToast({ message: 'Failed to fetch invoices', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'PARTIAL': return 'bg-orange-100 text-orange-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const getSortedInvoices = () => {
    const sorted = [...invoices];
    
    switch(sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'highestAmount':
        return sorted.sort((a, b) => b.finalAmount - a.finalAmount);
      case 'lowestAmount':
        return sorted.sort((a, b) => a.finalAmount - b.finalAmount);
      case 'highestPending':
        return sorted.sort((a, b) => b.payment.pendingAmount - a.payment.pendingAmount);
      case 'lowestPending':
        return sorted.sort((a, b) => a.payment.pendingAmount - b.payment.pendingAmount);
      default:
        return sorted;
    }
  };

  const handleDelete = async (invoiceId) => {
    if (!confirm('Are you sure you want to delete this invoice? This will restore the stock and update customer balance.')) {
      return;
    }

    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/invoices/${invoiceId}`);
      showToast({ message: 'Invoice deleted successfully', type: 'success' });
      fetchInvoices();
    } catch (err) {
      console.error('Error deleting invoice:', err);
      showToast({ message: err.response?.data?.message || 'Failed to delete invoice', type: 'error' });
    }
  };

  const handlePaymentUpdate = async (e) => {
    e.preventDefault();
    
    if (!paymentData.paymentAmount || parseFloat(paymentData.paymentAmount) <= 0) {
      showToast({ message: 'Please enter a valid payment amount', type: 'error' });
      return;
    }

    const paymentAmount = parseFloat(paymentData.paymentAmount);
    const remainingAmount = selectedInvoice.payment.pendingAmount;

    if (paymentAmount < remainingAmount && !paymentData.nextDueDate) {
      showToast({ message: 'Please set next due date for partial payment', type: 'error' });
      return;
    }

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/invoices/${selectedInvoice._id}/payment`, {
        paymentAmount,
        paymentMethod: paymentData.paymentMethod,
        nextDueDate: paymentData.nextDueDate || null,
        transactionId: paymentData.transactionId,
        notes: paymentData.notes
      });

      showToast({ 
        message: paymentAmount >= remainingAmount 
          ? 'Payment completed successfully!' 
          : 'Partial payment recorded successfully!', 
        type: 'success' 
      });

      setShowPaymentModal(false);
      setSelectedInvoice(null);
      setPaymentData({
        paymentAmount: '',
        paymentMethod: 'CASH',
        nextDueDate: '',
        transactionId: '',
        notes: ''
      });
      fetchInvoices();
    } catch (err) {
      console.error('Error updating payment:', err);
      showToast({ message: err.response?.data?.message || 'Failed to update payment', type: 'error' });
    }
  };

  const handleMarkAsPaid = async (invoice) => {
    const pendingAmount = invoice.payment.pendingAmount;
    
    // Show confirmation modal
    await new Promise((resolve, reject) => {
      setConfirmModal({
        show: true,
        invoice: invoice,
        paymentAmount: pendingAmount,
        discount: 0,
        onConfirm: () => {
          setConfirmModal({ show: false, invoice: null, paymentAmount: 0, discount: 0, onConfirm: null });
          resolve(true);
        },
        onCancel: () => {
          setConfirmModal({ show: false, invoice: null, paymentAmount: 0, discount: 0, onConfirm: null });
          reject(new Error('User cancelled'));
        }
      });
    }).then(async () => {
      try {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/invoices/${invoice._id}/payment`, {
          paymentAmount: pendingAmount,
          paymentMethod: 'CASH',
          nextDueDate: null,
          transactionId: '',
          notes: 'Marked as paid from Invoice List',
          discount: 0
        });

        showToast({ message: 'Invoice marked as paid successfully!', type: 'success' });
        fetchInvoices();
      } catch (err) {
        console.error('Error marking as paid:', err);
        showToast({ message: err.response?.data?.message || 'Failed to mark as paid', type: 'error' });
      }
    }).catch(() => {
      // User cancelled
    });
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-5xl">📄</span>
                Invoice List
              </h1>
              <button
                onClick={() => navigate('/sales/create-invoice')}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2"
              >
                <span className="text-xl">+</span> Create Invoice
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="newest">Most Recent</option>
                  <option value="oldest">Oldest First</option>
                  <option value="highestAmount">Highest Amount</option>
                  <option value="lowestAmount">Lowest Amount</option>
                  <option value="highestPending">Highest Pending</option>
                  <option value="lowestPending">Lowest Pending</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Invoice Type</label>
                <select
                  value={filters.invoiceType}
                  onChange={(e) => setFilters({...filters, invoiceType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Types</option>
                  <option value="GST">GST</option>
                  <option value="NON_GST">Non-GST</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Status</label>
                <select
                  value={filters.paymentStatus}
                  onChange={(e) => setFilters({...filters, paymentStatus: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Status</option>
                  <option value="PAID">Paid</option>
                  <option value="PENDING">Pending</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Invoice Date From</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Invoice Date To</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Invoice Table */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {loading ? (
              <div className="text-center py-12">
                <div className="text-gray-600">Loading invoices...</div>
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-600 mb-4">No invoices found</div>
                <button
                  onClick={() => navigate('/sales/create-invoice')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                >
                  Create First Invoice
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Invoice #</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Customer</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Invoice Amount</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Discount</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Paid Amount</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Remaining</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getSortedInvoices().map((invoice) => (
                      <tr key={invoice._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(invoice.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-gray-900">{invoice.customerDetails.name}</div>
                          <div className="text-xs text-gray-500">{invoice.customerDetails.phone}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                          ₹{invoice.finalAmount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-orange-600">
                          {invoice.discount > 0 ? `₹${invoice.discount.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                          ₹{invoice.payment.totalPaid.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-red-600">
                          ₹{invoice.payment.pendingAmount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(invoice.payment.status)}`}>
                            {invoice.payment.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <div className="relative inline-block">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdown(openDropdown === invoice._id ? null : invoice._id);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
                            >
                              ⚙️ Actions
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            
                            {openDropdown === invoice._id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                                <button
                                  onClick={() => {
                                    navigate(`/sales/invoice/${invoice._id}`);
                                    setOpenDropdown(null);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm font-medium text-gray-700 hover:text-blue-600 transition border-b border-gray-100 rounded-t-lg"
                                >
                                  👁️ View Details
                                </button>
                                {invoice.payment.status !== 'PAID' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setSelectedInvoice(invoice);
                                        setPaymentData({
                                          ...paymentData,
                                          paymentAmount: invoice.payment.pendingAmount.toString()
                                        });
                                        setShowPaymentModal(true);
                                        setOpenDropdown(null);
                                      }}
                                      className="w-full text-left px-4 py-2 hover:bg-green-50 text-sm font-medium text-gray-700 hover:text-green-600 transition border-b border-gray-100"
                                    >
                                      💰 Collect Payment
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleMarkAsPaid(invoice);
                                        setOpenDropdown(null);
                                      }}
                                      className="w-full text-left px-4 py-2 hover:bg-purple-50 text-sm font-medium text-gray-700 hover:text-purple-600 transition border-b border-gray-100"
                                    >
                                      ✅ Mark as Paid
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => {
                                    navigate(`/sales/edit-invoice/${invoice._id}`);
                                    setOpenDropdown(null);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-yellow-50 text-sm font-medium text-gray-700 hover:text-yellow-600 transition border-b border-gray-100"
                                >
                                  ✏️ Edit Invoice
                                </button>
                                <button
                                  onClick={() => {
                                    handleDelete(invoice._id);
                                    setOpenDropdown(null);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm font-medium text-gray-700 hover:text-red-600 transition rounded-b-lg"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Collect Payment</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            
            {/* Invoice Summary */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Invoice Number</p>
                  <p className="text-lg font-bold text-gray-900">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Customer</p>
                  <p className="text-lg font-bold text-gray-900">{selectedInvoice.customerDetails.name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Total Amount</p>
                  <p className="text-lg font-bold text-gray-900">₹{selectedInvoice.finalAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Already Paid</p>
                  <p className="text-lg font-bold text-green-600">₹{selectedInvoice.payment.totalPaid.toFixed(2)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-semibold text-gray-600">Remaining Amount</p>
                  <p className="text-2xl font-bold text-red-600">₹{selectedInvoice.payment.pendingAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handlePaymentUpdate}>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedInvoice.payment.pendingAmount}
                    value={paymentData.paymentAmount}
                    onChange={(e) => setPaymentData({...paymentData, paymentAmount: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentData({...paymentData, paymentAmount: selectedInvoice.payment.pendingAmount.toString()})}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold hover:bg-blue-200"
                    >
                      Full Amount
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentData({...paymentData, paymentAmount: (selectedInvoice.payment.pendingAmount / 2).toFixed(2)})}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold hover:bg-green-200"
                    >
                      Half Amount
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method *</label>
                  <select
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({...paymentData, paymentMethod: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Next Due Date {parseFloat(paymentData.paymentAmount || 0) < selectedInvoice.payment.pendingAmount && '*'}
                  </label>
                  <input
                    type="date"
                    value={paymentData.nextDueDate}
                    onChange={(e) => setPaymentData({...paymentData, nextDueDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Transaction ID</label>
                  <input
                    type="text"
                    value={paymentData.transactionId}
                    onChange={(e) => setPaymentData({...paymentData, transactionId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedInvoice(null);
                    setPaymentData({
                      paymentAmount: '',
                      paymentMethod: 'CASH',
                      nextDueDate: '',
                      transactionId: '',
                      notes: ''
                    });
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                >
                  Collect Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Mark as Paid */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <div className="flex-1">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Mark Invoice as Paid</h3>
                <p className="text-gray-600">Invoice: {confirmModal.invoice?.invoiceNumber}</p>
              </div>
              <button
                onClick={() => setConfirmModal({ show: false, invoice: null, paymentAmount: 0, discount: 0, onConfirm: null })}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Pending Amount:</span>
                <span className="font-semibold text-gray-900">₹{confirmModal.invoice?.payment.pendingAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Customer:</span>
                <span className="font-semibold text-gray-900">{confirmModal.invoice?.customerDetails.name}</span>
              </div>
            </div>

            <p className="text-center text-gray-700 mb-6">
              Are you sure you want to mark this invoice as <strong>PAID</strong>? 
              The pending amount of <strong>₹{confirmModal.invoice?.payment.pendingAmount.toFixed(2)}</strong> will be recorded as collected.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (confirmModal.onCancel) confirmModal.onCancel();
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default InvoiceList;
