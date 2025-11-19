import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from '../../components/Layout/Sidebar';
import { useToast } from '../../components/Toast';

/**
 * Pending Payments Page
 * Track all pending and partial payments with due dates
 * Support for payment updates, date extensions, and old bill entries
 */

function PendingPayments() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExtendDateModal, setShowExtendDateModal] = useState(false);
  const [showAddOldBillModal, setShowAddOldBillModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, invoice: null, paymentAmount: 0, discount: 0, onConfirm: null });
  const [sortBy, setSortBy] = useState('dueDate'); // dueDate, amount, customer
  const [filterStatus, setFilterStatus] = useState('all'); // all, overdue, upcoming
  const [searchTerm, setSearchTerm] = useState('');
  const [openActionMenu, setOpenActionMenu] = useState(null); // Track which row's menu is open

  const [extendDateData, setExtendDateData] = useState({
    newDueDate: '',
    remarks: ''
  });

  const [paymentData, setPaymentData] = useState({
    paymentAmount: '',
    paymentMethod: 'CASH',
    nextDueDate: '',
    transactionId: '',
    notes: ''
  });

  const [oldBillData, setOldBillData] = useState({
    customerName: '',
    customerPhone: '',
    billAmount: '',
    paidAmount: '',
    remainingAmount: '',
    nextDueDate: '',
    billDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/invoices`, {
        params: {
          paymentStatus: 'PENDING,PARTIAL'
        }
      });
      
      let invoices = response.data.invoices || [];
      
      // Filter only invoices with pending/partial status
      invoices = invoices.filter(inv => 
        inv.payment.status === 'PENDING' || inv.payment.status === 'PARTIAL'
      );
      
      setPendingInvoices(invoices);
    } catch (err) {
      console.error('Error fetching pending payments:', err);
      showToast({ message: 'Failed to fetch pending payments', type: 'error' });
    } finally {
      setLoading(false);
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

    // If paying full amount, don't require next due date
    // If paying partial, require next due date
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
      fetchPendingPayments();
    } catch (err) {
      console.error('Error updating payment:', err);
      showToast({ message: err.response?.data?.message || 'Failed to update payment', type: 'error' });
    }
  };

  const handleExtendDueDate = async (e) => {
    e.preventDefault();
    
    if (!extendDateData.newDueDate) {
      showToast({ message: 'Please select a new due date', type: 'error' });
      return;
    }

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/invoices/${selectedInvoice._id}/payment`, {
        paymentAmount: 0, // No payment, just extending date
        nextDueDate: extendDateData.newDueDate,
        notes: extendDateData.remarks || 'Due date extended'
      });

      showToast({ message: 'Due date extended successfully', type: 'success' });
      setShowExtendDateModal(false);
      setSelectedInvoice(null);
      setExtendDateData({ newDueDate: '', remarks: '' });
      fetchPendingPayments();
    } catch (err) {
      console.error('Error extending due date:', err);
      showToast({ message: 'Failed to extend due date', type: 'error' });
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
          notes: 'Marked as paid from Pending Payments',
          discount: 0
        });

        showToast({ message: 'Invoice marked as paid successfully!', type: 'success' });
        fetchPendingPayments();
      } catch (err) {
        console.error('Error marking as paid:', err);
        showToast({ message: err.response?.data?.message || 'Failed to mark as paid', type: 'error' });
      }
    }).catch(() => {
      // User cancelled
    });
  };

  const handleAddOldBill = async (e) => {
    e.preventDefault();

    if (!oldBillData.customerName || !oldBillData.billAmount) {
      showToast({ message: 'Please fill in customer name and bill amount', type: 'error' });
      return;
    }

    const billAmount = parseFloat(oldBillData.billAmount);
    const paidAmount = parseFloat(oldBillData.paidAmount) || 0;
    const remainingAmount = billAmount - paidAmount;

    if (remainingAmount > 0 && !oldBillData.nextDueDate) {
      showToast({ message: 'Please set next due date for pending amount', type: 'error' });
      return;
    }

    try {
      // First, create or get customer
      let customer;
      try {
        const customerResponse = await axios.post(`${import.meta.env.VITE_API_URL}/api/customers`, {
          name: oldBillData.customerName,
          phone: oldBillData.customerPhone || '',
          address: '',
          gstNumber: ''
        });
        customer = customerResponse.data.customer;
      } catch (err) {
        // If customer already exists, search for them
        const searchResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/customers?search=${oldBillData.customerName}`);
        if (searchResponse.data.customers && searchResponse.data.customers.length > 0) {
          customer = searchResponse.data.customers[0];
        } else {
          throw new Error('Failed to create customer');
        }
      }

      // Create invoice for old bill
      const invoicePayload = {
        invoiceType: 'NON_GST',
        customerId: customer._id,
        customerDetails: {
          name: customer.name,
          phone: customer.phone || oldBillData.customerPhone,
          address: customer.address || '',
          gstNumber: customer.gstNumber || ''
        },
        items: [{
          productId: null,
          productName: 'Old Bill Entry',
          productType: 'Previous Purchase',
          productSize: '-',
          piecesPerBox: 1,
          quantity: { boxes: 0, pieces: 1 },
          pricePerBox: billAmount,
          pricePerPiece: billAmount,
          taxRate: 0,
          itemTotal: billAmount,
          taxAmount: 0,
          isCustom: true
        }],
        subtotal: billAmount,
        discount: 0,
        cgst: 0,
        sgst: 0,
        totalTax: 0,
        totalAmount: billAmount,
        roundOffAmount: 0,
        finalAmount: billAmount,
        payment: {
          status: paidAmount >= billAmount ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'PENDING',
          totalPaid: paidAmount,
          pendingAmount: remainingAmount,
          nextDueDate: oldBillData.nextDueDate || null
        },
        notes: `Old Bill Entry - ${oldBillData.notes || 'Imported from previous records'}`,
        invoiceDate: new Date(oldBillData.billDate)
      };

      await axios.post(`${import.meta.env.VITE_API_URL}/api/invoices`, invoicePayload);

      showToast({ message: 'Old bill added successfully!', type: 'success' });
      setShowAddOldBillModal(false);
      setOldBillData({
        customerName: '',
        customerPhone: '',
        billAmount: '',
        paidAmount: '',
        remainingAmount: '',
        nextDueDate: '',
        billDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      fetchPendingPayments();
    } catch (err) {
      console.error('Error adding old bill:', err);
      showToast({ message: err.response?.data?.message || 'Failed to add old bill', type: 'error' });
    }
  };

  const getFilteredAndSortedInvoices = () => {
    let filtered = [...pendingInvoices];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(inv => 
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customerDetails.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customerDetails.phone.includes(searchTerm)
      );
    }

    // Apply status filter
    if (filterStatus === 'overdue') {
      filtered = filtered.filter(inv => 
        inv.payment.nextDueDate && new Date(inv.payment.nextDueDate) < today
      );
    } else if (filterStatus === 'upcoming') {
      filtered = filtered.filter(inv => 
        inv.payment.nextDueDate && new Date(inv.payment.nextDueDate) >= today
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'dueDate') {
        const dateA = a.payment.nextDueDate ? new Date(a.payment.nextDueDate) : new Date('2099-12-31');
        const dateB = b.payment.nextDueDate ? new Date(b.payment.nextDueDate) : new Date('2099-12-31');
        return dateA - dateB;
      } else if (sortBy === 'amount') {
        return b.payment.pendingAmount - a.payment.pendingAmount;
      } else if (sortBy === 'customer') {
        return a.customerDetails.name.localeCompare(b.customerDetails.name);
      }
      return 0;
    });

    return filtered;
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

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDueDateBadge = (dueDate) => {
    const days = getDaysUntilDue(dueDate);
    if (days === null) return null;
    
    if (days < 0) {
      return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
        {Math.abs(days)} days overdue
      </span>;
    } else if (days === 0) {
      return <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
        Due Today
      </span>;
    } else if (days <= 7) {
      return <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
        Due in {days} days
      </span>;
    } else {
      return <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
        Due in {days} days
      </span>;
    }
  };

  const filteredInvoices = getFilteredAndSortedInvoices();
  const overdueCount = pendingInvoices.filter(inv => 
    inv.payment.nextDueDate && getDaysUntilDue(inv.payment.nextDueDate) < 0
  ).length;
  const totalPendingAmount = pendingInvoices.reduce((sum, inv) => sum + inv.payment.pendingAmount, 0);

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-5xl">⏰</span>
                Pending Payments
              </h1>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddOldBillModal(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition"
                >
                  📋 Add Old Bill
                </button>
                <button
                  onClick={() => navigate('/sales/payments')}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
                >
                  💰 All Payments
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Total Pending</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{pendingInvoices.length}</p>
                </div>
                <div className="text-4xl">📊</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Overdue Invoices</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{overdueCount}</p>
                </div>
                <div className="text-4xl">⚠️</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Total Amount Pending</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">₹{totalPendingAmount.toFixed(2)}</p>
                </div>
                <div className="text-4xl">💸</div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Invoice, Customer, Phone..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Filter Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Pending</option>
                  <option value="overdue">Overdue Only</option>
                  <option value="upcoming">Upcoming Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="dueDate">Due Date (Earliest First)</option>
                  <option value="amount">Amount (Highest First)</option>
                  <option value="customer">Customer Name</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                    setSortBy('dueDate');
                  }}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold transition"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Pending Invoices Table */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {loading ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-gray-600">Loading pending payments...</p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">✅</div>
                <p className="text-xl text-gray-600">No pending payments found</p>
                <p className="text-gray-500 mt-2">All invoices are paid or no invoices match your filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Invoice #</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Customer</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Total Amount</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Paid</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Pending</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Due Date</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice._id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => navigate(`/sales/invoice/${invoice._id}`)}
                            className="font-semibold text-blue-600 hover:text-blue-800"
                          >
                            {invoice.invoiceNumber}
                          </button>
                          <div className="text-xs text-gray-500">
                            {formatDate(invoice.invoiceDate)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-semibold text-gray-900">{invoice.customerDetails.name}</div>
                          {invoice.customerDetails.phone && (
                            <div className="text-xs text-gray-500">📱 {invoice.customerDetails.phone}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                          ₹{invoice.finalAmount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                          ₹{invoice.payment.totalPaid.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-red-600">
                          ₹{invoice.payment.pendingAmount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <div className="font-semibold text-gray-900">{formatDate(invoice.payment.nextDueDate)}</div>
                          <div className="mt-1">{getDueDateBadge(invoice.payment.nextDueDate)}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            invoice.payment.status === 'PENDING' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {invoice.payment.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <div className="relative">
                            <button
                              onClick={() => setOpenActionMenu(openActionMenu === invoice._id ? null : invoice._id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs font-semibold transition flex items-center gap-1 mx-auto"
                            >
                              ⚡ Actions
                              <span className={`transform transition-transform ${openActionMenu === invoice._id ? 'rotate-180' : ''}`}>▼</span>
                            </button>
                            
                            {openActionMenu === invoice._id && (
                              <div className="absolute right-0 top-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl z-10 min-w-[160px]">
                                <button
                                  onClick={() => {
                                    setSelectedInvoice(invoice);
                                    setPaymentData({
                                      ...paymentData,
                                      paymentAmount: invoice.payment.pendingAmount.toString()
                                    });
                                    setShowPaymentModal(true);
                                    setOpenActionMenu(null);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-green-50 text-green-700 font-semibold transition border-b border-gray-200 flex items-center gap-2 text-sm"
                                >
                                  💰 Pay Now
                                </button>
                                <button
                                  onClick={() => {
                                    handleMarkAsPaid(invoice);
                                    setOpenActionMenu(null);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-purple-50 text-purple-700 font-semibold transition border-b border-gray-200 flex items-center gap-2 text-sm"
                                >
                                  ✅ Mark Paid
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedInvoice(invoice);
                                    setExtendDateData({
                                      newDueDate: invoice.payment.nextDueDate ? new Date(invoice.payment.nextDueDate).toISOString().split('T')[0] : '',
                                      remarks: ''
                                    });
                                    setShowExtendDateModal(true);
                                    setOpenActionMenu(null);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-orange-50 text-orange-700 font-semibold transition border-b border-gray-200 flex items-center gap-2 text-sm"
                                >
                                  📅 Extend Date
                                </button>
                                <button
                                  onClick={() => {
                                    navigate(`/sales/invoice/${invoice._id}`);
                                    setOpenActionMenu(null);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-blue-50 text-blue-700 font-semibold transition flex items-center gap-2 text-sm"
                                >
                                  👁 View Details
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
                <div>
                  <p className="text-sm font-semibold text-gray-600">Remaining Amount</p>
                  <p className="text-lg font-bold text-red-600">₹{selectedInvoice.payment.pendingAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Current Due Date</p>
                  <p className="text-lg font-bold text-orange-600">{formatDate(selectedInvoice.payment.nextDueDate)}</p>
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
                  <p className="text-xs text-gray-500 mt-1">Required for partial payments</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Transaction ID / Cheque #</label>
                  <input
                    type="text"
                    value={paymentData.transactionId}
                    onChange={(e) => setPaymentData({...paymentData, transactionId: e.target.value})}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                    rows="2"
                    placeholder="Any additional notes..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Preview */}
              {paymentData.paymentAmount && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Payment Summary:</p>
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="font-semibold">Paying:</span> ₹{parseFloat(paymentData.paymentAmount).toFixed(2)}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Remaining after payment:</span> ₹{(selectedInvoice.payment.pendingAmount - parseFloat(paymentData.paymentAmount || 0)).toFixed(2)}
                    </p>
                    {parseFloat(paymentData.paymentAmount || 0) >= selectedInvoice.payment.pendingAmount ? (
                      <p className="text-sm font-bold text-green-700">✅ This will mark the invoice as PAID</p>
                    ) : (
                      <p className="text-sm font-bold text-yellow-700">⚠️ This is a partial payment</p>
                    )}
                  </div>
                </div>
              )}

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

      {/* Extend Due Date Modal */}
      {showExtendDateModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-xl w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">📅 Extend Due Date</h2>
              <button
                onClick={() => setShowExtendDateModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            
            {/* Invoice Info */}
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-600">Invoice Number</p>
                  <p className="text-sm font-bold text-gray-900">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">Customer</p>
                  <p className="text-sm font-bold text-gray-900">{selectedInvoice.customerDetails.name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">Pending Amount</p>
                  <p className="text-sm font-bold text-red-600">₹{selectedInvoice.payment.pendingAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">Current Due Date</p>
                  <p className="text-sm font-bold text-orange-600">{formatDate(selectedInvoice.payment.nextDueDate)}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleExtendDueDate}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">New Due Date *</label>
                  <input
                    type="date"
                    value={extendDateData.newDueDate}
                    onChange={(e) => setExtendDateData({...extendDateData, newDueDate: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Remarks *</label>
                  <textarea
                    value={extendDateData.remarks}
                    onChange={(e) => setExtendDateData({...extendDateData, remarks: e.target.value})}
                    rows="3"
                    required
                    placeholder="Reason for extending the due date..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowExtendDateModal(false);
                    setSelectedInvoice(null);
                    setExtendDateData({ newDueDate: '', remarks: '' });
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                >
                  Extend Due Date
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Old Bill Modal */}
      {showAddOldBillModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Add Old Bill Entry</h2>
              <button
                onClick={() => setShowAddOldBillModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAddOldBill}>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Name *</label>
                  <input
                    type="text"
                    value={oldBillData.customerName}
                    onChange={(e) => setOldBillData({...oldBillData, customerName: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="text"
                    value={oldBillData.customerPhone}
                    onChange={(e) => setOldBillData({...oldBillData, customerPhone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Bill Date</label>
                  <input
                    type="date"
                    value={oldBillData.billDate}
                    onChange={(e) => setOldBillData({...oldBillData, billDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Total Bill Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={oldBillData.billAmount}
                    onChange={(e) => {
                      const bill = parseFloat(e.target.value) || 0;
                      const paid = parseFloat(oldBillData.paidAmount) || 0;
                      setOldBillData({
                        ...oldBillData, 
                        billAmount: e.target.value,
                        remainingAmount: (bill - paid).toFixed(2)
                      });
                    }}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Amount Already Paid</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={oldBillData.paidAmount}
                    onChange={(e) => {
                      const bill = parseFloat(oldBillData.billAmount) || 0;
                      const paid = parseFloat(e.target.value) || 0;
                      setOldBillData({
                        ...oldBillData, 
                        paidAmount: e.target.value,
                        remainingAmount: (bill - paid).toFixed(2)
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Remaining Amount</label>
                  <input
                    type="number"
                    value={oldBillData.remainingAmount}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 font-bold"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Next Due Date {oldBillData.remainingAmount > 0 && '*'}
                  </label>
                  <input
                    type="date"
                    value={oldBillData.nextDueDate}
                    onChange={(e) => setOldBillData({...oldBillData, nextDueDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required if there's a remaining amount</p>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={oldBillData.notes}
                    onChange={(e) => setOldBillData({...oldBillData, notes: e.target.value})}
                    rows="2"
                    placeholder="Description of the old bill..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddOldBillModal(false);
                    setOldBillData({
                      customerName: '',
                      customerPhone: '',
                      billAmount: '',
                      paidAmount: '',
                      remainingAmount: '',
                      nextDueDate: '',
                      billDate: new Date().toISOString().split('T')[0],
                      notes: ''
                    });
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                >
                  Add Old Bill
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
              <div>
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

export default PendingPayments;
