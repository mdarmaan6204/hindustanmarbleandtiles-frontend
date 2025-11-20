import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { Sidebar } from '../../components/Layout/Sidebar';
import { useToast } from '../../components/Toast';

/**
 * Return Detail Page
 * View detailed information about a specific return
 */

function ReturnDetail() {
  const { returnId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [returnData, setReturnData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    fetchReturnDetail();
  }, [returnId]);

  const fetchReturnDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/returns/${returnId}`);
      setReturnData(response.data.return);
    } catch (err) {
      console.error('Error fetching return details:', err);
      showToast({ message: 'Failed to fetch return details', type: 'error' });
    } finally {
      setLoading(false);
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
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-300';
      case 'APPROVED': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getReturnTypeColor = (type) => {
    switch (type) {
      case 'CREDIT': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'REFUND': return 'bg-green-100 text-green-800 border-green-300';
      case 'EXCHANGE': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'GOOD': return 'text-green-600';
      case 'DAMAGED': return 'text-red-600';
      case 'DEFECTIVE': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-64 min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 px-4 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-xl text-gray-600">Loading return details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!returnData) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-64 min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 px-4 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <p className="text-xl text-gray-600 mb-4">Return not found</p>
            <button
              onClick={() => navigate('/sales/returns')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg"
            >
              Back to Returns
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="mb-6 print:mb-4">
            <div className="flex items-center justify-between mb-4 print:mb-2">
              <div>
                <button
                  onClick={() => navigate('/sales/returns')}
                  className="text-purple-600 hover:text-purple-800 font-semibold mb-2 print:hidden"
                >
                  ← Back to Returns
                </button>
                <h1 className="text-4xl font-bold text-gray-900 print:text-2xl">
                  Return Details
                </h1>
                <p className="text-gray-600 mt-1 print:text-sm">
                  {returnData.returnNumber}
                </p>
              </div>
              <div className="flex gap-2 print:hidden">
                <button
                  onClick={handlePrint}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  🖨️ Print
                </button>
              </div>
            </div>
          </div>

          {/* Return Information Card */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6 print:shadow-none print:mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:gap-4">
              
              {/* Return Number & Date */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Return Information</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-gray-500">Return Number</span>
                    <div className="font-bold text-purple-600">{returnData.returnNumber}</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Created Date</span>
                    <div className="font-medium">{formatDate(returnData.createdAt)}</div>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Customer Details</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-gray-500">Name</span>
                    <div className="font-bold">{returnData.customerDetails?.name || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Phone</span>
                    <div className="font-medium">{returnData.customerDetails?.phone || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Invoice Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Invoice Details</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-gray-500">Invoice Number</span>
                    <button
                      onClick={() => navigate(`/sales/invoice/${returnData.invoiceId}`)}
                      className="block font-bold text-blue-600 hover:text-blue-800 print:text-black"
                    >
                      {returnData.invoiceNumber}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Status & Type Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 print:mb-4">
            
            <div className="bg-white rounded-lg shadow-lg p-6 print:shadow-none">
              <h3 className="text-sm font-semibold text-gray-600 mb-3">Status</h3>
              <span className={`px-4 py-2 rounded-lg text-sm font-bold border-2 ${getStatusColor(returnData.status)}`}>
                {returnData.status}
              </span>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 print:shadow-none">
              <h3 className="text-sm font-semibold text-gray-600 mb-3">Return Type</h3>
              <span className={`px-4 py-2 rounded-lg text-sm font-bold border-2 ${getReturnTypeColor(returnData.returnType)}`}>
                {returnData.returnType}
              </span>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 print:shadow-none">
              <h3 className="text-sm font-semibold text-gray-600 mb-3">Total Return Value</h3>
              <div className="text-3xl font-bold text-red-600 print:text-2xl">
                ₹{returnData.totalReturnValue.toFixed(2)}
              </div>
            </div>

          </div>

          {/* Return Items Table */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6 print:shadow-none print:mb-4">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4">
              <h2 className="text-xl font-bold">Return Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">#</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Product Name</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Quantity</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Return Value</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Condition</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {returnData.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900">{item.productName}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-700">
                        {formatQty(item.quantity)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">
                        ₹{item.returnValue.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`font-semibold ${getConditionColor(item.condition)}`}>
                          {item.condition}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.returnReason || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="3" className="px-4 py-3 text-right font-bold text-gray-900">
                      Total Return Value:
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xl font-bold text-red-600">
                        ₹{returnData.totalReturnValue.toFixed(2)}
                      </span>
                    </td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Credit/Refund Information */}
          {returnData.returnType === 'CREDIT' && (
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 mb-6 print:mb-4">
              <h3 className="text-lg font-bold text-purple-900 mb-4">💳 Credit Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-purple-700">Credit Generated</span>
                  <div className="text-2xl font-bold text-purple-900">
                    ₹{returnData.creditGenerated.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-purple-700">Credit Used</span>
                  <div className="text-2xl font-bold text-purple-600">
                    ₹{returnData.creditUsed.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-purple-700">Credit Balance</span>
                  <div className="text-2xl font-bold text-green-600">
                    ₹{returnData.creditBalance.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {returnData.returnType === 'REFUND' && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6 print:mb-4">
              <h3 className="text-lg font-bold text-green-900 mb-4">💰 Refund Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-green-700">Refund Amount</span>
                  <div className="text-2xl font-bold text-green-900">
                    ₹{returnData.refundAmount.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-green-700">Refund Method</span>
                  <div className="text-lg font-bold text-green-900">
                    {returnData.refundMethod}
                  </div>
                </div>
                {returnData.refundDate && (
                  <div>
                    <span className="text-sm text-green-700">Refund Date</span>
                    <div className="text-lg font-bold text-green-900">
                      {formatDate(returnData.refundDate)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {returnData.notes && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6 print:shadow-none print:mb-4">
              <h3 className="text-lg font-bold text-gray-900 mb-3">📝 Notes</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{returnData.notes}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default ReturnDetail;
