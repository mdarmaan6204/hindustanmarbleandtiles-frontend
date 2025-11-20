import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { customerAPI, invoiceAPI } from '../../services/api.js';
import { Sidebar } from '../../components/Layout/Sidebar';
import { useToast } from '../../components/Toast';

/**
 * Customers Page
 * Manage customer database
 */

function Customers() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, alphabetical, highestDue, lowestDue
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCollectPaymentModal, setShowCollectPaymentModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ show: false, invoice: null, paymentAmount: 0, discount: 0, onConfirm: null });
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    gstNumber: ''
  });
  const [paymentData, setPaymentData] = useState({
    invoices: [], // Array of {invoiceId, amount}
    paymentMethod: 'CASH',
    nextDueDate: '',
    transactionId: '',
    notes: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm]);

  // Refetch customers when page comes back into focus
  useEffect(() => {
    const handleFocus = () => {
      fetchCustomers();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [searchTerm]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = searchTerm
        ? await customerAPI.getAll({ search: searchTerm })
        : await customerAPI.getAll();
      setCustomers(response.data.customers || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      showToast({ message: 'Failed to fetch customers', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getFilteredCustomers = () => {
    if (paymentStatusFilter.length === 0) return customers;
    
    return customers.filter(customer => {
      if (customer.outstandingBalance === 0) return false;
      
      // Check if customer has pending or partial invoices
      if (paymentStatusFilter.includes('pending') && customer.outstandingBalance > 0) {
        return true;
      }
      if (paymentStatusFilter.includes('partial') && customer.totalPaidAmount > 0 && customer.outstandingBalance > 0) {
        return true;
      }
      return false;
    });
  };

  const getSortedCustomers = () => {
    const filtered = getFilteredCustomers();
    const sorted = [...filtered];
    
    switch(sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'alphabetical':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'highestDue':
        return sorted.sort((a, b) => b.outstandingBalance - a.outstandingBalance);
      case 'lowestDue':
        return sorted.sort((a, b) => a.outstandingBalance - b.outstandingBalance);
      default:
        return sorted;
    }
  };

  const handleCollectPayment = async (customer) => {
    // Fetch pending invoices for this customer
    try {
      const response = await invoiceAPI.getAll({ customerId: customer._id, paymentStatus: 'PENDING,PARTIAL' });
      const pendingInvoices = response.data.invoices || [];
      
      setSelectedCustomer(customer);
      setCustomerInvoices(pendingInvoices);
      
      // Initialize payment data with invoices
      const invoicePayments = pendingInvoices.map(inv => ({
        invoiceId: inv._id,
        invoiceNumber: inv.invoiceNumber,
        totalAmount: inv.finalAmount,
        paidAmount: inv.payment.totalPaid,
        pendingAmount: inv.payment.pendingAmount,
        paymentAmount: 0
      }));
      
      setPaymentData({
        invoices: invoicePayments,
        paymentMethod: 'CASH',
        nextDueDate: '',
        transactionId: '',
        notes: ''
      });
      
      setShowCollectPaymentModal(true);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      showToast({ message: 'Failed to fetch pending invoices', type: 'error' });
    }
  };

  const handleCollectPaymentSubmit = async (e, markAsPaid = false) => {
    e.preventDefault();
    
    // Process each invoice payment
    const invoicesToPay = paymentData.invoices.filter(inv => 
      parseFloat(inv.paymentAmount) > 0
    );
    
    if (invoicesToPay.length === 0) {
      showToast({ message: 'Please enter payment amount for at least one invoice', type: 'error' });
      return;
    }
    
    try {
      // First, check if we need confirmation for any invoice
      let invoicesRequiringConfirmation = [];
      if (markAsPaid) {
        invoicesRequiringConfirmation = invoicesToPay.filter(inv => {
          const paymentAmount = parseFloat(inv.paymentAmount);
          const discount = inv.pendingAmount - paymentAmount;
          return discount > 0;
        });
      }
      
      // If we have invoices requiring confirmation, collect them first
      if (invoicesRequiringConfirmation.length > 0) {
        // Set the first one and wait for user confirmation
        const firstInvoice = invoicesRequiringConfirmation[0];
        const paymentAmount = parseFloat(firstInvoice.paymentAmount);
        const discount = firstInvoice.pendingAmount - paymentAmount;
        
        // Show confirmation modal and wait
        await new Promise((resolve, reject) => {
          setConfirmModal({
            show: true,
            invoice: firstInvoice,
            paymentAmount: paymentAmount,
            discount: discount,
            onConfirm: () => {
              setConfirmModal({ show: false, invoice: null, paymentAmount: 0, discount: 0, onConfirm: null });
              resolve(true);
            },
            onCancel: () => {
              setConfirmModal({ show: false, invoice: null, paymentAmount: 0, discount: 0, onConfirm: null });
              reject(new Error('User cancelled'));
            }
          });
        });
      }
      
      // Now process all invoice payments
      for (const invoice of invoicesToPay) {
        const paymentAmount = parseFloat(invoice.paymentAmount);
        const discount = invoice.pendingAmount - paymentAmount;
        
        await api.post(`/invoices/${invoice.invoiceId}/payment`, {
          paymentAmount,
          paymentMethod: paymentData.paymentMethod,
          paymentDate: new Date().toISOString(),
          nextDueDate: markAsPaid ? null : (paymentData.nextDueDate || null),
          transactionId: paymentData.transactionId || '',
          notes: markAsPaid && discount > 0
            ? `Collected ₹${paymentAmount.toFixed(2)}. Discount given: ₹${discount.toFixed(2)}. ${paymentData.notes || ''}`
            : paymentData.notes,
          discount: markAsPaid && discount > 0 ? discount : 0
        });
      }
      
      showToast({ message: 'Payments collected successfully!', type: 'success' });
      setShowCollectPaymentModal(false);
      setSelectedCustomer(null);
      setCustomerInvoices([]);
      fetchCustomers();
    } catch (err) {
      console.error('Error collecting payment:', err);
      showToast({ message: err.response?.data?.message || 'Failed to collect payment', type: 'error' });
    }
  };

  const updateInvoicePayment = (index, field, value) => {
    const updated = [...paymentData.invoices];
    updated[index][field] = value;
    setPaymentData({...paymentData, invoices: updated});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await customerAPI.update(editingCustomer._id, formData);
        showToast({ message: 'Customer updated successfully', type: 'success' });
      } else {
        await customerAPI.create(formData);
        showToast({ message: 'Customer created successfully', type: 'success' });
      }
      setShowAddModal(false);
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', address: '', gstNumber: '' });
      fetchCustomers();
    } catch (err) {
      showToast({ message: err.response?.data?.message || 'Failed to save customer', type: 'error' });
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address || '',
      gstNumber: customer.gstNumber || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (customerId) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    
    try {
      await customerAPI.delete(customerId);
      showToast({ message: 'Customer deleted successfully', type: 'success' });
      fetchCustomers();
    } catch (err) {
      showToast({ message: err.response?.data?.message || 'Failed to delete customer', type: 'error' });
    }
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
                <span className="text-5xl">👥</span>
                Customers
              </h1>
              <button
                onClick={() => {
                  setEditingCustomer(null);
                  setFormData({ name: '', phone: '', address: '', gstNumber: '' });
                  setShowAddModal(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                + Add Customer
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Search customers by name, phone, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Most Recent</option>
                  <option value="oldest">Oldest First</option>
                  <option value="alphabetical">Alphabetical (A-Z)</option>
                  <option value="highestDue">Highest Outstanding</option>
                  <option value="lowestDue">Lowest Outstanding</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Status Filter</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (paymentStatusFilter.includes('pending')) {
                        setPaymentStatusFilter(paymentStatusFilter.filter(s => s !== 'pending'));
                      } else {
                        setPaymentStatusFilter([...paymentStatusFilter, 'pending']);
                      }
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
                      paymentStatusFilter.includes('pending')
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => {
                      if (paymentStatusFilter.includes('partial')) {
                        setPaymentStatusFilter(paymentStatusFilter.filter(s => s !== 'partial'));
                      } else {
                        setPaymentStatusFilter([...paymentStatusFilter, 'partial']);
                      }
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
                      paymentStatusFilter.includes('partial')
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Partial
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Customer List */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {loading ? (
              <div className="text-center py-12">Loading customers...</div>
            ) : getFilteredCustomers().length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-600 mb-4">
                  {paymentStatusFilter.length > 0 
                    ? 'No customers found with selected payment status' 
                    : 'No customers found'}
                </div>
                {paymentStatusFilter.length === 0 && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                  >
                    Add First Customer
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Phone</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Address</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Total Purchase</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Paid Amount</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Discount Given</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Remaining</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Invoices</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getSortedCustomers().map((customer) => (
                      <tr key={customer._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{customer.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{customer.phone || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{customer.address || '-'}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                          ₹{customer.totalPurchaseAmount?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                          ₹{customer.totalPaidAmount?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-orange-600">
                          {customer.totalDiscountGiven > 0 ? `₹${customer.totalDiscountGiven.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className={`font-semibold ${customer.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ₹{customer.outstandingBalance?.toFixed(2) || '0.00'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-600">
                          {customer.totalInvoices || 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <div className="relative inline-block">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdown(openDropdown === customer._id ? null : customer._id);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
                            >
                              ⚙️ Actions
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            
                            {openDropdown === customer._id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                                <button
                                  onClick={() => {
                                    navigate(`/sales/customer/${customer._id}`);
                                    setOpenDropdown(null);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm font-medium text-gray-700 hover:text-blue-600 transition border-b border-gray-100 rounded-t-lg"
                                >
                                  👁️ View
                                </button>
                                {customer.outstandingBalance > 0 && (
                                  <button
                                    onClick={() => {
                                      handleCollectPayment(customer);
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-green-50 text-sm font-medium text-gray-700 hover:text-green-600 transition border-b border-gray-100"
                                  >
                                    💰 Collect Payment
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    handleEdit(customer);
                                    setOpenDropdown(null);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-yellow-50 text-sm font-medium text-gray-700 hover:text-yellow-600 transition border-b border-gray-100"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => {
                                    handleDelete(customer._id);
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

      {/* Add/Edit Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">GST Number</label>
                  <input
                    type="text"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({...formData, gstNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCustomer(null);
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
                >
                  {editingCustomer ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collect Payment Modal */}
      {showCollectPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              💰 Collect Payment - {selectedCustomer.name}
            </h2>
            
            {/* Customer Summary */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-600">Total Outstanding</p>
                  <p className="text-lg font-bold text-red-600">₹{selectedCustomer.outstandingBalance?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">Pending Invoices</p>
                  <p className="text-lg font-bold text-gray-900">{paymentData.invoices.length}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">Total to Collect</p>
                  <p className="text-lg font-bold text-green-600">
                    ₹{paymentData.invoices.reduce((sum, inv) => sum + parseFloat(inv.paymentAmount || 0), 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleCollectPaymentSubmit}>
              {/* Invoice-wise Payment */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Invoice-wise Payment Collection</h3>
                <div className="space-y-4">
                  {paymentData.invoices.map((invoice, index) => (
                    <div key={invoice.invoiceId} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-5 gap-4 items-center">
                        <div>
                          <p className="text-xs text-gray-500">Invoice #</p>
                          <p className="font-semibold text-gray-900">{invoice.invoiceNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Total Amount</p>
                          <p className="font-semibold text-gray-900">₹{invoice.totalAmount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Already Paid</p>
                          <p className="font-semibold text-green-600">₹{invoice.paidAmount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Pending</p>
                          <p className="font-semibold text-red-600">₹{invoice.pendingAmount.toFixed(2)}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Collect Now</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={invoice.pendingAmount}
                            value={invoice.paymentAmount}
                            onChange={(e) => updateInvoicePayment(index, 'paymentAmount', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Common Payment Details */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method *</label>
                  <select
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({...paymentData, paymentMethod: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Next Due Date (if partial)</label>
                  <input
                    type="date"
                    value={paymentData.nextDueDate}
                    onChange={(e) => setPaymentData({...paymentData, nextDueDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Transaction ID</label>
                  <input
                    type="text"
                    value={paymentData.transactionId}
                    onChange={(e) => setPaymentData({...paymentData, transactionId: e.target.value})}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <input
                    type="text"
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCollectPaymentModal(false);
                    setSelectedCustomer(null);
                    setCustomerInvoices([]);
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={(e) => handleCollectPaymentSubmit(e, false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                >
                  Collect Payment
                </button>
                <button
                  type="button"
                  onClick={(e) => handleCollectPaymentSubmit(e, true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                >
                  Collect & Mark as Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Mark as Paid with Discount */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Confirm Discount</h3>
              <p className="text-gray-600">Invoice: {confirmModal.invoice?.invoiceNumber}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Pending Amount:</span>
                <span className="font-semibold text-gray-900">₹{confirmModal.invoice?.pendingAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Collecting:</span>
                <span className="font-semibold text-green-600">₹{confirmModal.paymentAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-gray-600">Discount:</span>
                <span className="font-semibold text-red-600">₹{confirmModal.discount.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-center text-gray-700 mb-6">
              Are you sure you want to collect <strong>₹{confirmModal.paymentAmount.toFixed(2)}</strong>, 
              give a discount of <strong>₹{confirmModal.discount.toFixed(2)}</strong>, 
              and mark this invoice as <strong>PAID</strong>?
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

export default Customers;
