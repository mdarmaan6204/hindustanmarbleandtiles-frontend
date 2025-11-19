import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from '../../components/Layout/Sidebar';
import { useToast } from '../../components/Toast';

/**
 * Customer Detail Page
 * Display complete customer information with invoice history
 */

function CustomerDetail() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [returns, setReturns] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // all, paid, pending, partial
  const [activeTab, setActiveTab] = useState('history'); // history, ledger
  const [ledgerStartDate, setLedgerStartDate] = useState(null);
  const [ledgerEndDate, setLedgerEndDate] = useState(null);
  const [showCollectPaymentModal, setShowCollectPaymentModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  useEffect(() => {
    fetchCustomerDetail();
    fetchCustomerInvoices();
    fetchCustomerReturns();
    fetchCustomerPayments();
  }, [customerId]);

  const fetchCustomerDetail = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5000/api/customers/${customerId}`);
      setCustomer(response.data.customer);
    } catch (err) {
      console.error('Error fetching customer:', err);
      showToast({ message: 'Failed to fetch customer details', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerInvoices = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/invoices`, {
        params: {
          customerId: customerId,
          limit: 100
        }
      });
      setInvoices(response.data.invoices || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    }
  };

  const fetchCustomerReturns = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/returns`, {
        params: {
          customerId: customerId,
          limit: 100
        }
      });
      setReturns(response.data.returns || []);
    } catch (err) {
      console.error('Error fetching returns:', err);
    }
  };

  const fetchCustomerPayments = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/payments`, {
        params: {
          customerId: customerId,
          limit: 100
        }
      });
      setPayments(response.data.payments || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
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

  const getFilteredInvoices = () => {
    if (filterStatus === 'all') return invoices;
    return invoices.filter(inv => inv.payment.status === filterStatus.toUpperCase());
  };

  // Generate complete ledger with all transactions
  const generateLedger = () => {
    const ledgerItems = [];

    // Add invoices with proper date handling
    invoices.forEach(inv => {
      // Sales should be final amount (before any discount/payment)
      ledgerItems.push({
        date: new Date(inv.invoiceDate || inv.createdAt || inv.date),
        type: 'INVOICE',
        description: `Invoice ${inv.invoiceNumber}`,
        invoiceNumber: inv.invoiceNumber,
        invoiceId: inv._id,
        sales: inv.finalAmount, // Original invoice amount
        discount: inv.discount || 0, // Separate discount tracking
        payment: 0,
        returns: 0,
        particulars: `Sale - Inv #${inv.invoiceNumber}`
      });

      // Add initial payment collected at invoice creation if exists
      // Payment amount as-is (actual cash collected)
      if (inv.payment?.totalPaid > 0) {
        ledgerItems.push({
          date: new Date(inv.invoiceDate || inv.createdAt || inv.date),
          type: 'PAYMENT',
          description: `Payment collected at invoice creation`,
          invoiceNumber: inv.invoiceNumber,
          invoiceId: inv._id,
          sales: 0,
          discount: 0,
          payment: inv.payment.totalPaid, // Actual payment collected
          returns: 0,
          particulars: `Payment at creation - Inv #${inv.invoiceNumber}`
        });
      }
    });

    // Add additional payments (excluding initial payment)
    payments.forEach(pmt => {
      ledgerItems.push({
        date: new Date(pmt.paymentDate || pmt.date),
        type: 'PAYMENT',
        description: `Payment received via ${pmt.paymentMethod || pmt.method}`,
        invoiceNumber: pmt.invoiceNumber,
        invoiceId: pmt.invoiceId,
        sales: 0,
        discount: 0,
        payment: pmt.amount, // Actual payment collected
        returns: 0,
        particulars: `${pmt.paymentMethod || pmt.method} - Ref: ${pmt.transactionId || pmt.reference || 'N/A'}`
      });
    });

    // Add returns
    returns.forEach(ret => {
      ledgerItems.push({
        date: new Date(ret.returnDate || ret.date),
        type: 'RETURN',
        description: `Product return`,
        invoiceNumber: ret.invoiceNumber,
        invoiceId: ret.invoiceId,
        sales: 0,
        discount: 0,
        payment: 0,
        returns: ret.totalAmount || ret.returnValue,
        particulars: `Return for Inv #${ret.invoiceNumber}`
      });
    });

    // Sort by date ascending (oldest first)
    ledgerItems.sort((a, b) => a.date - b.date);

    // Filter by date range if set
    let filtered = ledgerItems;
    if (ledgerStartDate) {
      filtered = filtered.filter(item => item.date >= new Date(ledgerStartDate));
    }
    if (ledgerEndDate) {
      const endDate = new Date(ledgerEndDate);
      endDate.setHours(23, 59, 59);
      filtered = filtered.filter(item => item.date <= endDate);
    }

    // Calculate running balance
    let balance = 0;
    const ledgerWithBalance = filtered.map(item => {
      // Balance = Sales - Discount - Payment - Returns (what customer owes)
      balance += (item.sales - item.discount - item.payment - item.returns);
      return {
        ...item,
        balance: balance
      };
    });

    return ledgerWithBalance;
  };

  const ledgerData = generateLedger();
  const filteredInvoices = getFilteredInvoices();

  if (loading) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-64 min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Loading customer details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-64 min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">❌</div>
            <p className="text-gray-600">Customer not found</p>
            <button
              onClick={() => navigate('/sales/customers')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Back to Customers
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header with Name and Contact Info Side by Side */}
          <div className="mb-4">
            <div className="flex items-start justify-between bg-white rounded-lg shadow p-4 mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-3xl">👤</span>
                  {customer.name}
                </h1>
              </div>
              
              {/* Contact Info on Right */}
              <div className="ml-6 flex-1 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <h3 className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">📞 Contact</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Phone</p>
                    <p className="text-sm font-semibold text-gray-900">{customer.phone || 'Not provided'}</p>
                  </div>
                  {customer.address && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Address</p>
                      <p className="text-xs font-semibold text-gray-900 line-clamp-1">{customer.address}</p>
                    </div>
                  )}
                  {customer.gstNumber && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">GST</p>
                      <p className="text-xs font-semibold text-gray-900">{customer.gstNumber}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="ml-4 flex flex-col gap-1">
                <button
                  onClick={() => navigate('/sales/customers')}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-xs font-semibold transition"
                >
                  ← Back
                </button>
                <button
                  onClick={() => navigate('/sales/create-invoice')}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-semibold transition"
                >
                  + Invoice
                </button>
              </div>

              {/* Quick Action Buttons */}
              <div className="ml-2 flex gap-2">
                <button
                  onClick={() => setShowCollectPaymentModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
                >
                  💰 Collect Payment
                </button>
                <button
                  onClick={() => setShowReturnModal(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
                >
                  ↩️ Process Return
                </button>
              </div>
            </div>

          {/* Summary Cards - Compact Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {/* Total Purchase */}
            <div className="bg-blue-50 rounded-lg shadow p-4 border border-blue-200">
              <p className="text-xs text-gray-600 font-semibold">Total Purchase</p>
              <p className="text-xl font-bold text-blue-600 mt-1">₹{customer.totalPurchaseAmount?.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-gray-500 mt-1">{customer.totalInvoices || 0} invoices</p>
            </div>

            {/* Paid Amount */}
            <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
              <p className="text-xs text-gray-600 font-semibold">Paid Amount</p>
              <p className="text-xl font-bold text-green-600 mt-1">₹{(customer.totalPaidAmount || 0).toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Collected</p>
            </div>

            {/* Remaining Amount */}
            <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
              <p className="text-xs text-gray-600 font-semibold">Remaining</p>
              <p className="text-xl font-bold text-red-600 mt-1">₹{(
                (customer.totalPurchaseAmount || 0) - 
                (customer.totalPaidAmount || 0) - 
                (invoices.reduce((sum, inv) => sum + (inv.discount || 0), 0))
              ).toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">To collect</p>
            </div>

            {/* Available Credits */}
            <div className="bg-purple-50 rounded-lg shadow p-4 border border-purple-200">
              <p className="text-xs text-gray-600 font-semibold">Credits</p>
              <p className="text-xl font-bold text-purple-600 mt-1">₹{customer.availableCredit?.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-gray-500 mt-1">From returns</p>
            </div>

            {/* Discount Amount */}
            <div className="bg-orange-50 rounded-lg shadow p-4 border border-orange-200">
              <p className="text-xs text-gray-600 font-semibold">Discount</p>
              <p className="text-xl font-bold text-orange-600 mt-1">₹{invoices.reduce((sum, inv) => sum + (inv.discount || 0), 0).toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Applied</p>
            </div>
          </div>
          </div>

          {/* Invoice History & Ledger Tabs */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Tab Headers - Compact */}
            <div className="border-b-2 border-gray-200">
              <div className="flex gap-1 px-4 py-0 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-3 font-semibold transition border-b-4 text-sm whitespace-nowrap ${
                    activeTab === 'history'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📄 History
                </button>
                <button
                  onClick={() => setActiveTab('ledger')}
                  className={`px-4 py-3 font-semibold transition border-b-4 text-sm whitespace-nowrap ${
                    activeTab === 'ledger'
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📊 Ledger
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`px-4 py-3 font-semibold transition border-b-4 text-sm whitespace-nowrap ${
                    activeTab === 'payments'
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  � Collect
                </button>
              </div>
            </div>

            {/* History Tab */}
            {activeTab === 'history' && (
            <div>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4"></div>

            {/* Filter Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex gap-2 px-6 py-3">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    filterStatus === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All ({invoices.length})
                </button>
                <button
                  onClick={() => setFilterStatus('paid')}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    filterStatus === 'paid'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Paid ({invoices.filter(inv => inv.payment.status === 'PAID').length})
                </button>
                <button
                  onClick={() => setFilterStatus('partial')}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    filterStatus === 'partial'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Partial ({invoices.filter(inv => inv.payment.status === 'PARTIAL').length})
                </button>
                <button
                  onClick={() => setFilterStatus('pending')}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    filterStatus === 'pending'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Pending ({invoices.filter(inv => inv.payment.status === 'PENDING').length})
                </button>
              </div>
            </div>

            {/* Invoice Table */}
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-xl text-gray-600">No invoices found</p>
                <p className="text-gray-500 mt-2">
                  {filterStatus !== 'all' 
                    ? `No ${filterStatus} invoices for this customer` 
                    : 'This customer has no invoices yet'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Invoice #</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Date</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Type</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Total Amount</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Discount</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Paid</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Remaining</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredInvoices.map((invoice) => (
                      <tr 
                        key={invoice._id} 
                        className="hover:bg-blue-50 transition cursor-pointer"
                        onClick={() => navigate(`/sales/invoice/${invoice._id}`)}
                      >
                        <td className="px-4 py-3 text-sm">
                          <span className="font-semibold text-blue-600 hover:text-blue-800">
                            {invoice.invoiceNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(invoice.invoiceDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            invoice.invoiceType === 'GST' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {invoice.invoiceType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                          ₹{invoice.finalAmount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-orange-600">
                          {invoice.discount > 0 ? `₹${invoice.discount.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                          ₹{(invoice.payment.totalPaid - (invoice.discount || 0)).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">
                          ₹{((invoice.finalAmount - (invoice.discount || 0)) - invoice.payment.totalPaid).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            invoice.payment.status === 'PAID' 
                              ? 'bg-green-100 text-green-800'
                              : invoice.payment.status === 'PARTIAL'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {invoice.payment.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/sales/invoice/${invoice._id}`);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-lg text-xs font-semibold transition"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </div>
            )}

            {/* Ledger Tab */}
            {activeTab === 'ledger' && (
            <div>
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  📊 Account Ledger
                </h2>
              </div>

              {/* Date Filter */}
              <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={ledgerStartDate || ''}
                      onChange={(e) => setLedgerStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={ledgerEndDate || ''}
                      onChange={(e) => setLedgerEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setLedgerStartDate(null);
                        setLedgerEndDate(null);
                      }}
                      className="w-full bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold transition"
                    >
                      Clear Filter
                    </button>
                  </div>
                </div>
              </div>

              {/* Ledger Summary */}
              {ledgerData.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <p className="text-xs text-gray-600 font-semibold">Total Sales</p>
                    <p className="text-lg font-bold text-red-600">₹{ledgerData.reduce((sum, item) => sum + item.sales, 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                    <p className="text-xs text-gray-600 font-semibold">Total Discount</p>
                    <p className="text-lg font-bold text-orange-600">₹{ledgerData.reduce((sum, item) => sum + (item.discount || 0), 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <p className="text-xs text-gray-600 font-semibold">Total Payment</p>
                    <p className="text-lg font-bold text-green-600">₹{ledgerData.reduce((sum, item) => sum + item.payment, 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-xs text-gray-600 font-semibold">Total Returns</p>
                    <p className="text-lg font-bold text-blue-600">₹{ledgerData.reduce((sum, item) => sum + item.returns, 0).toFixed(2)}</p>
                  </div>
                  <div className={`p-3 rounded-lg border ${ledgerData[ledgerData.length - 1]?.balance > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                    <p className="text-xs text-gray-600 font-semibold">Remaining Amount</p>
                    <p className={`text-lg font-bold ${ledgerData[ledgerData.length - 1]?.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{(ledgerData[ledgerData.length - 1]?.balance || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Ledger Table */}
              {ledgerData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-xl text-gray-600">No transactions found</p>
                  <p className="text-gray-500 mt-2">No invoices, payments, or returns in the selected date range</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Particulars</th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Sales</th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Discount</th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Payment</th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Returns</th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Balance</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerData.map((item, index) => (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-800 font-semibold">{formatDate(item.date)}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              item.type === 'INVOICE' ? 'bg-red-100 text-red-800' :
                              item.type === 'PAYMENT' ? 'bg-green-100 text-green-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {item.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{item.particulars}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">
                            {item.sales > 0 ? `₹${item.sales.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-orange-600">
                            {item.discount > 0 ? `₹${item.discount.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                            {item.payment > 0 ? `₹${item.payment.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-blue-600">
                            {item.returns > 0 ? `₹${item.returns.toFixed(2)}` : '-'}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right font-bold ${
                            item.balance > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            ₹{Math.abs(item.balance).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.invoiceId && (
                              <button
                                onClick={() => navigate(`/sales/invoice/${item.invoiceId}`)}
                                className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
                              >
                                🔗 View
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
            <div>
              <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4">
                <h2 className="text-2xl font-bold text-white">💰 Collect Payment</h2>
              </div>

              {/* Pending Invoices for Payment */}
              <div className="p-6">
                {invoices.filter(inv => inv.payment.status !== 'PAID').length === 0 ? (
                  <div className="text-center py-12 bg-green-50 rounded-lg border-2 border-green-200">
                    <div className="text-6xl mb-4">✅</div>
                    <p className="text-xl text-green-600 font-bold">All Paid!</p>
                    <p className="text-gray-600 mt-2">This customer has no pending payments</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                      <p className="text-sm font-semibold text-orange-800">
                        📋 Pending Bills: {invoices.filter(inv => inv.payment.status !== 'PAID').length}
                      </p>
                      <p className="text-lg font-bold text-orange-600 mt-2">
                        Total Pending: ₹{invoices.filter(inv => inv.payment.status !== 'PAID').reduce((sum, inv) => {
                          const discountAmount = inv.discount || 0;
                          const payableAmount = inv.finalAmount - discountAmount;
                          const paidAmount = inv.payment.totalPaid - discountAmount;
                          return sum + (payableAmount - paidAmount);
                        }, 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 border-b-2 border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Invoice #</th>
                            <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Date</th>
                            <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Total</th>
                            <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Discount</th>
                            <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Payable</th>
                            <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Paid</th>
                            <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Pending</th>
                            <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Status</th>
                            <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.filter(inv => inv.payment.status !== 'PAID').map((invoice) => {
                            const discountAmount = invoice.discount || 0;
                            const payableAmount = invoice.finalAmount - discountAmount;
                            const paidAmount = invoice.payment.totalPaid - discountAmount;
                            const pendingAmount = payableAmount - paidAmount;
                            
                            return (
                              <tr key={invoice._id} className="border-b border-gray-200 hover:bg-orange-50">
                                <td className="px-4 py-3 text-sm font-semibold text-gray-900">{invoice.invoiceNumber}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{formatDate(invoice.invoiceDate)}</td>
                                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">₹{invoice.finalAmount.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right font-semibold text-orange-600">{discountAmount > 0 ? `₹${discountAmount.toFixed(2)}` : '-'}</td>
                                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">₹{payableAmount.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">₹{paidAmount.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">₹{pendingAmount.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-center">
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    invoice.payment.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {invoice.payment.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-center">
                                  <button
                                    onClick={() => navigate(`/sales/invoice/${invoice._id}`)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded text-xs font-semibold transition"
                                  >
                                    Collect Payment
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default CustomerDetail;
