import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from '../../components/Layout/Sidebar';
import { useToast } from '../../components/Toast';

/**
 * Returns Page
 * Handle customer returns, exchanges, and credit management
 * Track: Invoice-linked returns, stock adjustments, customer credits
 */

function Returns() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // States
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnType, setReturnType] = useState('CREDIT');
  const [refundMethod, setRefundMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [exchangeItems, setExchangeItems] = useState([]);
  const [exchangeProducts, setExchangeProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchReturns();
  }, [filters]);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await axios.get(`http://localhost:5000/api/returns?${params}`);
      setReturns(response.data.returns || []);
    } catch (err) {
      console.error('Error fetching returns:', err);
      showToast({ message: 'Failed to fetch returns', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const searchCustomers = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await axios.get(`http://localhost:5000/api/customers?search=${query}`);
      setSearchResults(response.data.customers || []);
    } catch (err) {
      console.error('Error searching customers:', err);
    }
  };

  const handleCustomerSelect = async (customer) => {
    setSelectedCustomer(customer);
    setSearchResults([]);
    setSearchCustomer('');

    // Fetch customer's invoices
    try {
      const response = await axios.get(`http://localhost:5000/api/invoices?customerId=${customer._id}`);
      setCustomerInvoices(response.data.invoices || []);
    } catch (err) {
      console.error('Error fetching customer invoices:', err);
      showToast({ message: 'Failed to fetch customer invoices', type: 'error' });
    }
  };

  const handleInvoiceSelect = (invoice) => {
    setSelectedInvoice(invoice);
    // Initialize return items from invoice items
    const items = (invoice.items || []).map(item => ({
      productId: item.productId,
      productName: item.productName,
      productType: item.productType,
      productSize: item.productSize,
      piecesPerBox: item.piecesPerBox,
      invoiceQuantity: item.quantity,
      returnQuantity: { boxes: 0, pieces: 0 },
      pricePerBox: item.pricePerBox,
      returnReason: '',
      condition: 'GOOD',
      selected: false
    }));
    setReturnItems(items);
  };

  const updateReturnItem = (index, field, value) => {
    const updated = [...returnItems];
    if (field === 'returnQuantity.boxes' || field === 'returnQuantity.pieces') {
      const [parent, child] = field.split('.');
      updated[index][parent][child] = parseFloat(value) || 0;
    } else {
      updated[index][field] = value;
    }
    setReturnItems(updated);
  };

  const toggleItemSelection = (index) => {
    const updated = [...returnItems];
    updated[index].selected = !updated[index].selected;
    setReturnItems(updated);
  };

  const calculateReturnValue = (item) => {
    const boxes = item.returnQuantity.boxes || 0;
    const pieces = item.returnQuantity.pieces || 0;
    const pricePerPiece = item.pricePerBox / item.piecesPerBox;
    return (boxes * item.pricePerBox) + (pieces * pricePerPiece);
  };

  const getTotalReturnValue = () => {
    return returnItems
      .filter(item => item.selected)
      .reduce((sum, item) => sum + calculateReturnValue(item), 0);
  };

  const handleSubmitReturn = async () => {
    const selectedItems = returnItems.filter(item => item.selected);

    if (selectedItems.length === 0) {
      showToast({ message: 'Please select at least one item to return', type: 'error' });
      return;
    }

    // Validate quantities
    for (const item of selectedItems) {
      const returnBoxes = item.returnQuantity.boxes || 0;
      const returnPieces = item.returnQuantity.pieces || 0;
      const invoiceBoxes = item.invoiceQuantity.boxes || 0;
      const invoicePieces = item.invoiceQuantity.pieces || 0;

      const returnTotal = returnBoxes * item.piecesPerBox + returnPieces;
      const invoiceTotal = invoiceBoxes * item.piecesPerBox + invoicePieces;

      if (returnTotal > invoiceTotal) {
        showToast({ 
          message: `Return quantity for ${item.productName} exceeds invoice quantity`, 
          type: 'error' 
        });
        return;
      }

      if (returnTotal === 0) {
        showToast({ 
          message: `Please enter return quantity for ${item.productName}`, 
          type: 'error' 
        });
        return;
      }
    }

    // Validate exchange items if exchange type
    if (returnType === 'EXCHANGE') {
      if (exchangeItems.length === 0) {
        showToast({ message: 'Please add at least one exchange item', type: 'error' });
        return;
      }

      for (const item of exchangeItems) {
        const totalQty = (item.quantity.boxes || 0) * item.piecesPerBox + (item.quantity.pieces || 0);
        if (totalQty === 0) {
          showToast({ message: `Please enter quantity for ${item.productName}`, type: 'error' });
          return;
        }
      }
    }

    try {
      const payload = {
        invoiceId: selectedInvoice._id,
        items: selectedItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.returnQuantity,
          returnReason: item.returnReason,
          condition: item.condition,
          returnValue: calculateReturnValue(item)
        })),
        returnType,
        refundMethod,
        notes,
        exchangeItems: returnType === 'EXCHANGE' ? exchangeItems : undefined
      };

      await axios.post('http://localhost:5000/api/returns', payload);
      
      showToast({ message: 'Return processed successfully!', type: 'success' });
      setShowReturnModal(false);
      resetReturnForm();
      fetchReturns();
    } catch (err) {
      console.error('Error creating return:', err);
      showToast({ message: err.response?.data?.message || 'Failed to process return', type: 'error' });
    }
  };

  const resetReturnForm = () => {
    setSelectedCustomer(null);
    setCustomerInvoices([]);
    setSelectedInvoice(null);
    setReturnItems([]);
    setReturnType('CREDIT');
    setRefundMethod('CASH');
    setNotes('');
    setExchangeItems([]);
    setExchangeProducts([]);
    setProductSearch('');
  };

  const searchProducts = async (query) => {
    if (!query || query.length < 2) {
      setExchangeProducts([]);
      return;
    }

    try {
      const response = await axios.get(`http://localhost:5000/api/products/search?q=${query}`);
      setExchangeProducts(response.data.products || []);
    } catch (err) {
      console.error('Error searching products:', err);
    }
  };

  const addExchangeItem = (product) => {
    const exists = exchangeItems.find(item => item.productId === product._id);
    if (exists) {
      showToast({ message: 'Product already added', type: 'warning' });
      return;
    }

    setExchangeItems([...exchangeItems, {
      productId: product._id,
      productName: product.name,
      productType: product.type,
      productSize: product.size,
      piecesPerBox: product.piecesPerBox,
      pricePerBox: product.sellingPrice,
      quantity: { boxes: 0, pieces: 0 }
    }]);
    setProductSearch('');
    setExchangeProducts([]);
  };

  const updateExchangeItem = (index, field, value) => {
    const updated = [...exchangeItems];
    if (field === 'quantity.boxes' || field === 'quantity.pieces') {
      const [parent, child] = field.split('.');
      updated[index][parent][child] = parseFloat(value) || 0;
    }
    setExchangeItems(updated);
  };

  const removeExchangeItem = (index) => {
    setExchangeItems(exchangeItems.filter((_, i) => i !== index));
  };

  const calculateExchangeValue = () => {
    return exchangeItems.reduce((sum, item) => {
      const boxes = item.quantity.boxes || 0;
      const pieces = item.quantity.pieces || 0;
      const pricePerPiece = item.pricePerBox / item.piecesPerBox;
      return sum + (boxes * item.pricePerBox) + (pieces * pricePerPiece);
    }, 0);
  };

  const getExchangeDifference = () => {
    return calculateExchangeValue() - getTotalReturnValue();
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

  const formatQty = (qty) => {
    if (!qty) return '0';
    const parts = [];
    if (qty.boxes > 0) parts.push(`${qty.boxes} Box`);
    if (qty.pieces > 0) parts.push(`${qty.pieces} Pcs`);
    return parts.length > 0 ? parts.join(' + ') : '0';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'APPROVED': return 'bg-blue-100 text-blue-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getReturnTypeColor = (type) => {
    switch (type) {
      case 'CREDIT': return 'bg-purple-100 text-purple-800';
      case 'REFUND': return 'bg-green-100 text-green-800';
      case 'EXCHANGE': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-5xl">↩️</span>
                Returns Management
              </h1>
              <button
                onClick={() => setShowReturnModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg"
              >
                + New Return
              </button>
            </div>
            <p className="text-gray-600">Manage customer returns, exchanges, and credit notes</p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">🔍 Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  placeholder="Return #, Invoice #, Customer..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Returns Table */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {loading ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-gray-600">Loading returns...</p>
              </div>
            ) : returns.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <p className="text-xl text-gray-600">No returns found</p>
                <button
                  onClick={() => setShowReturnModal(true)}
                  className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg"
                >
                  Create First Return
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Return #</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Invoice #</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Customer</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Return Value</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Type</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Items</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {returns.map((returnRecord) => (
                      <tr key={returnRecord._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-purple-600">
                          {returnRecord.returnNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(returnRecord.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => navigate(`/sales/invoice/${returnRecord.invoiceId}`)}
                            className="font-medium text-blue-600 hover:text-blue-800"
                          >
                            {returnRecord.invoiceNumber}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-gray-900">{returnRecord.customerDetails?.name || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{returnRecord.customerDetails?.phone || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">
                          ₹{returnRecord.totalReturnValue?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getReturnTypeColor(returnRecord.returnType)}`}>
                            {returnRecord.returnType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(returnRecord.status)}`}>
                            {returnRecord.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-600">
                          {returnRecord.items?.length || 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <button
                            onClick={() => navigate(`/sales/returns/${returnRecord._id}`)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-semibold transition"
                          >
                            👁 View
                          </button>
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

      {/* New Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-2xl font-bold">↩️ Process Return</h2>
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  resetReturnForm();
                }}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              
              {/* Step 1: Customer Selection */}
              {!selectedCustomer && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">👤 Step 1: Select Customer</h3>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchCustomer}
                      onChange={(e) => {
                        setSearchCustomer(e.target.value);
                        searchCustomers(e.target.value);
                      }}
                      placeholder="Search customer by name or mobile number..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                      autoFocus
                    />
                    
                    {searchResults.length > 0 && (
                      <div className="absolute w-full bg-white border border-gray-300 rounded-lg mt-2 shadow-lg max-h-60 overflow-y-auto z-20">
                        {searchResults.map((customer) => (
                          <button
                            key={customer._id}
                            onClick={() => handleCustomerSelect(customer)}
                            className="w-full px-4 py-3 text-left hover:bg-purple-50 border-b last:border-b-0 transition"
                          >
                            <div className="font-semibold text-gray-900">{customer.name}</div>
                            <div className="text-sm text-gray-600">{customer.phone}</div>
                            {customer.outstandingBalance > 0 && (
                              <div className="text-xs text-red-600 mt-1">
                                Outstanding: ₹{customer.outstandingBalance.toFixed(2)}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Invoice Selection */}
              {selectedCustomer && !selectedInvoice && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                      📄 Step 2: Select Invoice for {selectedCustomer.name}
                    </h3>
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustomerInvoices([]);
                      }}
                      className="text-sm text-purple-600 hover:text-purple-800 font-semibold"
                    >
                      ← Change Customer
                    </button>
                  </div>

                  {customerInvoices.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-600">No invoices found for this customer</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                      {customerInvoices.map((invoice) => (
                        <button
                          key={invoice._id}
                          onClick={() => handleInvoiceSelect(invoice)}
                          className="bg-white border-2 border-gray-200 hover:border-purple-500 rounded-lg p-4 text-left transition"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-gray-900">{invoice.invoiceNumber}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                Date: {formatDate(invoice.createdAt)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Items: {invoice.items?.length || 0}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600">
                                ₹{invoice.finalAmount?.toFixed(2) || '0.00'}
                              </div>
                              {invoice.payment?.pendingAmount > 0 && (
                                <div className="text-sm text-red-600 mt-1">
                                  Pending: ₹{invoice.payment?.pendingAmount?.toFixed(2) || '0.00'}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Return Items Selection */}
              {selectedInvoice && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                      📦 Step 3: Select Items to Return
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedInvoice(null);
                          setReturnItems([]);
                        }}
                        className="text-sm text-purple-600 hover:text-purple-800 font-semibold"
                      >
                        ← Change Invoice
                      </button>
                      <button
                        onClick={() => navigate(`/sales/invoice/${selectedInvoice._id}`)}
                        className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                      >
                        👁 View Invoice
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="text-sm text-gray-700">
                      <strong>Invoice:</strong> {selectedInvoice.invoiceNumber} | 
                      <strong className="ml-2">Date:</strong> {formatDate(selectedInvoice.createdAt)} | 
                      <strong className="ml-2">Total:</strong> ₹{selectedInvoice.finalAmount?.toFixed(2) || '0.00'}
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full border border-gray-300 rounded-lg">
                      <thead className="bg-gray-200">
                        <tr>
                          <th className="px-3 py-2 text-left text-sm font-semibold">Select</th>
                          <th className="px-3 py-2 text-left text-sm font-semibold">Product</th>
                          <th className="px-3 py-2 text-center text-sm font-semibold">Invoice Qty</th>
                          <th className="px-3 py-2 text-center text-sm font-semibold">Return Boxes</th>
                          <th className="px-3 py-2 text-center text-sm font-semibold">Return Pieces</th>
                          <th className="px-3 py-2 text-left text-sm font-semibold">Reason</th>
                          <th className="px-3 py-2 text-center text-sm font-semibold">Condition</th>
                          <th className="px-3 py-2 text-right text-sm font-semibold">Return Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {returnItems.map((item, index) => (
                          <tr key={index} className={item.selected ? 'bg-purple-50' : 'bg-white'}>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => toggleItemSelection(index)}
                                className="w-5 h-5 cursor-pointer"
                              />
                            </td>
                            <td className="px-3 py-2 text-sm">
                              <div className="font-medium text-gray-900">{item.productName}</div>
                              <div className="text-xs text-gray-500">
                                {item.productType} | {item.productSize}
                              </div>
                              <div className="text-xs text-gray-500">
                                ₹{item.pricePerBox}/box ({item.piecesPerBox} pcs)
                              </div>
                            </td>
                            <td className="px-3 py-2 text-sm text-center text-gray-700">
                              {formatQty(item.invoiceQuantity)}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={item.returnQuantity.boxes}
                                onChange={(e) => updateReturnItem(index, 'returnQuantity.boxes', e.target.value)}
                                disabled={!item.selected}
                                min="0"
                                max={item.invoiceQuantity.boxes}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-center disabled:bg-gray-100"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={item.returnQuantity.pieces}
                                onChange={(e) => updateReturnItem(index, 'returnQuantity.pieces', e.target.value)}
                                disabled={!item.selected}
                                min="0"
                                max={item.piecesPerBox - 1}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-center disabled:bg-gray-100"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={item.returnReason}
                                onChange={(e) => updateReturnItem(index, 'returnReason', e.target.value)}
                                disabled={!item.selected}
                                placeholder="Optional"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={item.condition}
                                onChange={(e) => updateReturnItem(index, 'condition', e.target.value)}
                                disabled={!item.selected}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                              >
                                <option value="GOOD">Good</option>
                                <option value="DAMAGED">Damaged</option>
                                <option value="DEFECTIVE">Defective</option>
                              </select>
                            </td>
                            <td className="px-3 py-2 text-sm text-right font-semibold text-red-600">
                              {item.selected ? `₹${calculateReturnValue(item).toFixed(2)}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Return Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Return Type *</label>
                      <select
                        value={returnType}
                        onChange={(e) => setReturnType(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="CREDIT">Credit Note (Future Purchase)</option>
                        <option value="REFUND">Refund (Cash/Online)</option>
                        <option value="EXCHANGE">Exchange (Replace Items)</option>
                      </select>
                    </div>

                    {returnType === 'REFUND' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Refund Method *</label>
                        <select
                          value={refundMethod}
                          onChange={(e) => setRefundMethod(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="CASH">Cash</option>
                          <option value="ONLINE">Online Transfer</option>
                          <option value="CHEQUE">Cheque</option>
                        </select>
                      </div>
                    )}

                    <div className={returnType === 'REFUND' ? '' : 'md:col-span-2'}>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Notes *</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Enter reason for return, additional details..."
                        rows="3"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Exchange Items Section */}
                  {returnType === 'EXCHANGE' && (
                    <div className="mb-6">
                      <h4 className="text-lg font-bold text-gray-900 mb-4">🔄 Exchange Items</h4>
                      
                      {/* Product Search */}
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Search Products to Exchange</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={productSearch}
                            onChange={(e) => {
                              setProductSearch(e.target.value);
                              searchProducts(e.target.value);
                            }}
                            placeholder="Search by name, type, or HSN code..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          />
                          
                          {exchangeProducts.length > 0 && (
                            <div className="absolute w-full bg-white border border-gray-300 rounded-lg mt-2 shadow-lg max-h-60 overflow-y-auto z-20">
                              {exchangeProducts.map((product) => (
                                <button
                                  key={product._id}
                                  onClick={() => addExchangeItem(product)}
                                  className="w-full px-4 py-3 text-left hover:bg-purple-50 border-b last:border-b-0"
                                >
                                  <div className="font-semibold text-gray-900">{product.name}</div>
                                  <div className="text-sm text-gray-600">{product.type} | {product.size}</div>
                                  <div className="text-xs text-gray-500">₹{product.sellingPrice}/box ({product.piecesPerBox} pcs)</div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Exchange Items Table */}
                      {exchangeItems.length > 0 && (
                        <div className="overflow-x-auto mb-4">
                          <table className="w-full border border-gray-300 rounded-lg">
                            <thead className="bg-orange-100">
                              <tr>
                                <th className="px-3 py-2 text-left text-sm font-semibold">Product</th>
                                <th className="px-3 py-2 text-center text-sm font-semibold">Boxes</th>
                                <th className="px-3 py-2 text-center text-sm font-semibold">Pieces</th>
                                <th className="px-3 py-2 text-right text-sm font-semibold">Value</th>
                                <th className="px-3 py-2 text-center text-sm font-semibold">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {exchangeItems.map((item, index) => (
                                <tr key={index} className="bg-white">
                                  <td className="px-3 py-2 text-sm">
                                    <div className="font-medium text-gray-900">{item.productName}</div>
                                    <div className="text-xs text-gray-500">
                                      {item.productType} | {item.productSize} | ₹{item.pricePerBox}/box
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="number"
                                      value={item.quantity.boxes}
                                      onChange={(e) => updateExchangeItem(index, 'quantity.boxes', e.target.value)}
                                      min="0"
                                      className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="number"
                                      value={item.quantity.pieces}
                                      onChange={(e) => updateExchangeItem(index, 'quantity.pieces', e.target.value)}
                                      min="0"
                                      max={item.piecesPerBox - 1}
                                      className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-sm text-right font-semibold text-green-600">
                                    ₹{((item.quantity.boxes || 0) * item.pricePerBox + (item.quantity.pieces || 0) * (item.pricePerBox / item.piecesPerBox)).toFixed(2)}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <button
                                      onClick={() => removeExchangeItem(index)}
                                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Exchange Summary */}
                      <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-xs text-gray-600">Return Value</div>
                            <div className="text-lg font-bold text-red-600">₹{getTotalReturnValue().toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600">Exchange Value</div>
                            <div className="text-lg font-bold text-green-600">₹{calculateExchangeValue().toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600">Difference</div>
                            <div className={`text-lg font-bold ${getExchangeDifference() > 0 ? 'text-orange-600' : getExchangeDifference() < 0 ? 'text-purple-600' : 'text-gray-600'}`}>
                              {getExchangeDifference() > 0 ? '+' : ''}₹{getExchangeDifference().toFixed(2)}
                            </div>
                          </div>
                        </div>
                        {getExchangeDifference() > 0 && (
                          <div className="mt-3 pt-3 border-t border-orange-300 text-sm text-orange-800">
                            💰 Customer needs to pay additional ₹{getExchangeDifference().toFixed(2)}
                          </div>
                        )}
                        {getExchangeDifference() < 0 && (
                          <div className="mt-3 pt-3 border-t border-orange-300 text-sm text-purple-800">
                            💳 Customer will receive credit of ₹{Math.abs(getExchangeDifference()).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-6 mb-6">
                    <h4 className="font-bold text-gray-900 mb-3">Return Summary</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Selected Items</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {returnItems.filter(i => i.selected).length}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Total Return Value</div>
                        <div className="text-3xl font-bold text-red-600">
                          ₹{getTotalReturnValue().toFixed(2)}
                        </div>
                      </div>
                    </div>
                    {returnType === 'CREDIT' && (
                      <div className="mt-3 pt-3 border-t border-purple-300">
                        <div className="text-sm text-purple-800">
                          ✨ Credit of ₹{getTotalReturnValue().toFixed(2)} will be added to customer's account
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowReturnModal(false);
                        resetReturnForm();
                      }}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitReturn}
                      className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 font-bold shadow-lg transition"
                    >
                      ✅ Process Return
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Returns;
