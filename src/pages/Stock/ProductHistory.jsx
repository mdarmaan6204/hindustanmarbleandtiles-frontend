import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from '../../components/Layout/Sidebar';
import { useToast } from '../../components/Toast';

/**
 * ProductHistory Page - View All Transaction History
 * Display complete timeline of stock additions, sales, damage, and returns
 */

function ProductHistory() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, stock_added, sale, damage, return

  useEffect(() => {
    fetchProductAndHistory();
  }, [productId]);

  const fetchProductAndHistory = async () => {
    try {
      // Fetch product details
      const productRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/products/${productId}`);
      const productData = productRes.data.product || productRes.data;
      setProduct(productData);

      // Fetch stock history
      const historyRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/stock-history/product/${productId}`);
      const historyData = historyRes.data.history || historyRes.data || [];
      
      // Log all unique action types for debugging
      const uniqueActions = [...new Set(historyData.map(h => h.action))];
      console.log('All action types in history:', uniqueActions);
      historyData.forEach(h => {
        console.log('History entry:', { action: h.action, notes: h.notes });
      });
      
      setHistory(historyData);
    } catch (err) {
      console.error('Error fetching history:', err);
      showToast({ message: 'Failed to load product history', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatQty = (change) => {
    if (!change) return '-';
    const boxes = change.boxes || 0;
    const pieces = change.pieces || 0;
    
    if (boxes === 0 && pieces === 0) return '0';
    if (boxes === 0) return `${pieces} pc`;
    if (pieces === 0) return `${boxes} bx`;
    return `${boxes} bx, ${pieces} pc`;
  };

  // Calculate available stock
  const calculateAvailable = () => {
    if (!product) return { boxes: 0, pieces: 0 };
    
    const piecesPerBox = product.piecesPerBox || 1;
    
    const stockPieces = (product.stock?.boxes || 0) * piecesPerBox + (product.stock?.pieces || 0);
    const salesPieces = (product.sales?.boxes || 0) * piecesPerBox + (product.sales?.pieces || 0);
    const damagePieces = (product.damage?.boxes || 0) * piecesPerBox + (product.damage?.pieces || 0);
    const returnsPieces = (product.returns?.boxes || 0) * piecesPerBox + (product.returns?.pieces || 0);
    
    const availablePieces = Math.max(0, stockPieces - salesPieces - damagePieces + returnsPieces);
    
    return {
      boxes: Math.floor(availablePieces / piecesPerBox),
      pieces: availablePieces % piecesPerBox
    };
  };

  const getActionIcon = (action) => {
    const actionLower = (action || '').toLowerCase();
    
    if (actionLower.includes('edit') || actionLower.includes('update')) return '✏️';
    if (actionLower.includes('add') || actionLower.includes('stock')) return '📦';
    if (actionLower.includes('sell') || actionLower.includes('sale')) return '💰';
    if (actionLower.includes('damage') || actionLower.includes('exchange')) return '⚠️';
    if (actionLower.includes('return')) return '🔄';
    
    switch (action) {
      case 'add':
      case 'add_stock': return '📦';
      case 'sell':
      case 'sale': return '💰';
      case 'damage':
      case 'damage_shop':
      case 'damage_customer':
      case 'exchange': return '⚠️';
      case 'return': return '🔄';
      case 'Product Update':
      case 'edit': return '✏️';
      default: 
        console.log('Unknown action type:', action); // Debug log
        return '📝';
    }
  };

  const getActionLabel = (action) => {
    const actionLower = (action || '').toLowerCase();
    
    if (actionLower.includes('edit') || actionLower.includes('update')) return 'Edit';
    if (actionLower.includes('add') || actionLower.includes('stock')) return 'Stock Added';
    if (actionLower.includes('sell') || actionLower.includes('sale')) return 'Sale';
    if (actionLower.includes('damage') || actionLower.includes('exchange')) return 'Damage';
    if (actionLower.includes('return')) return 'Return';
    
    switch (action) {
      case 'add':
      case 'add_stock': return 'Stock Added';
      case 'sell':
      case 'sale': return 'Sale';
      case 'damage':
      case 'damage_shop':
      case 'damage_customer':
      case 'exchange': return 'Damage';
      case 'return': return 'Return';
      case 'Product Update':
      case 'edit': return 'Edit';
      default: return action || 'Unknown';
    }
  };

  const getActionColor = (action) => {
    const actionLower = (action || '').toLowerCase();
    
    if (actionLower.includes('edit') || actionLower.includes('update')) return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    if (actionLower.includes('add') || actionLower.includes('stock')) return 'bg-green-100 text-green-800 border-green-300';
    if (actionLower.includes('sell') || actionLower.includes('sale')) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (actionLower.includes('damage') || actionLower.includes('exchange')) return 'bg-red-100 text-red-800 border-red-300';
    if (actionLower.includes('return')) return 'bg-purple-100 text-purple-800 border-purple-300';
    
    switch (action) {
      case 'add':
      case 'add_stock': return 'bg-green-100 text-green-800 border-green-300';
      case 'sell':
      case 'sale': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'damage':
      case 'damage_shop':
      case 'damage_customer':
      case 'exchange': return 'bg-red-100 text-red-800 border-red-300';
      case 'RETURN':
      case 'return': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Product Update':
      case 'edit': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const filteredHistory = filter === 'all' 
    ? history 
    : filter === 'add_stock'
      ? history.filter(h => {
          const action = (h.action || '').toLowerCase();
          return h.action === 'add' || h.action === 'add_stock' || action.includes('add') || action.includes('stock');
        })
      : filter === 'sale'
        ? history.filter(h => {
            const action = (h.action || '').toLowerCase();
            return h.action === 'sell' || h.action === 'sale' || action.includes('sell') || action.includes('sale');
          })
        : filter === 'damage'
          ? history.filter(h => {
              const action = (h.action || '').toLowerCase();
              return h.action === 'damage' || h.action === 'damage_shop' || h.action === 'damage_customer' || h.action === 'exchange' 
                || action.includes('damage') || action.includes('exchange');
            })
          : filter === 'return'
            ? history.filter(h => {
                const action = (h.action || '').toLowerCase();
                return h.action === 'return' || h.action === 'RETURN' || action.includes('return');
              })
            : history.filter(h => h.action === filter);

  if (loading) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-64 min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Loading history...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-64 min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-gray-600 mb-4">Product not found</p>
            <button
              onClick={() => navigate('/stock/product-list')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Back to List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-64 bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📜 Transaction History</h1>
              <p className="text-gray-600 mt-1">
                {product.productName} - {product.type} {product.size}
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="bg-green-100 border-2 border-green-300 rounded-lg px-4 py-2">
                <p className="text-xs text-green-700 font-semibold mb-1">Available Stock</p>
                <p className="text-xl font-bold text-green-800">
                  {formatQty(calculateAvailable())}
                </p>
              </div>
              <button
                onClick={() => navigate(`/stock/product/${productId}`)}
                className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 font-semibold transition whitespace-nowrap"
              >
                ← Back to Product
              </button>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase">Filter by Action Type</h3>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'all', label: 'All', icon: '📋' },
                { value: 'add_stock', label: 'Stock Added', icon: '📦' },
                { value: 'sale', label: 'Sales', icon: '💰' },
                { value: 'damage', label: 'Damage', icon: '⚠️' },
                { value: 'return', label: 'Returns', icon: '🔄' },
                { value: 'edit', label: 'Edits', icon: '✏️' },
              ].map(({ value, label, icon }) => {
                let count = 0;
                if (value === 'all') {
                  count = history.length;
                } else if (value === 'add_stock') {
                  count = history.filter(h => {
                    const action = (h.action || '').toLowerCase();
                    return h.action === 'add' || h.action === 'add_stock' || action.includes('add') || action.includes('stock');
                  }).length;
                } else if (value === 'sale') {
                  count = history.filter(h => {
                    const action = (h.action || '').toLowerCase();
                    return h.action === 'sell' || h.action === 'sale' || action.includes('sell') || action.includes('sale');
                  }).length;
                } else if (value === 'damage') {
                  count = history.filter(h => {
                    const action = (h.action || '').toLowerCase();
                    return h.action === 'damage' || h.action === 'damage_shop' || h.action === 'damage_customer' || h.action === 'exchange'
                      || action.includes('damage') || action.includes('exchange');
                  }).length;
                } else if (value === 'return') {
                  count = history.filter(h => {
                    const action = (h.action || '').toLowerCase();
                    return h.action === 'return' || h.action === 'RETURN' || action.includes('return');
                  }).length;
                } else if (value === 'edit') {
                  count = history.filter(h => {
                    const action = (h.action || '').toLowerCase();
                    return h.action === 'Product Update' || h.action === 'edit' || action.includes('update') || action.includes('edit');
                  }).length;
                }
                
                return (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    className={`px-3 py-2 rounded-lg font-semibold transition text-sm ${
                      filter === value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {icon} {label}
                    {value !== 'all' && (
                      <span className="ml-1 bg-white bg-opacity-30 px-1.5 py-0.5 rounded text-xs">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Available</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">By</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center text-gray-500">
                        <div className="text-4xl mb-2">📭</div>
                        <p className="text-lg">No transactions found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((record, idx) => {
                      const isReturn = record.action === 'RETURN' || record.action === 'return' || 
                                       (record.action || '').toLowerCase().includes('return');
                      const isSale = record.action === 'SALE' || record.action === 'sale' || 
                                     record.action === 'sell' || 
                                     (record.action || '').toLowerCase().includes('sale') || 
                                     (record.action || '').toLowerCase().includes('sell');
                      const isDamage = record.action === 'damage' || record.action === 'damage_shop' || 
                                       record.action === 'damage_customer' || record.action === 'exchange' ||
                                       (record.action || '').toLowerCase().includes('damage');
                      const isAdd = record.action === 'add' || record.action === 'add_stock' || 
                                    (record.action || '').toLowerCase().includes('add') ||
                                    (record.action || '').toLowerCase().includes('stock');
                      const isEdit = record.action === 'Product Update' || record.action === 'edit' ||
                                     (record.action || '').toLowerCase().includes('update') ||
                                     (record.action || '').toLowerCase().includes('edit');
                      
                      const isClickable = (isSale || isReturn || isEdit) && record.invoiceId;
                      const hasCustomer = record.customerId;
                      
                      return (
                        <tr 
                          key={record._id || idx} 
                          className="border-b border-gray-200 transition hover:bg-gray-50"
                        >
                        {/* Date & Time */}
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="font-semibold">
                            {new Date(record.createdAt || record.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: '2-digit'
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(record.createdAt || record.date).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${getActionColor(record.action)}`}>
                              {getActionIcon(record.action)} {getActionLabel(record.action)}
                            </span>
                            {isClickable && (
                              <button
                                onClick={() => navigate(`/sales/invoice/${record.invoiceId}`)}
                                className="text-blue-600 hover:text-blue-800 text-xs font-semibold text-left"
                              >
                                🔗 View Invoice
                              </button>
                            )}
                            {hasCustomer && record.customerName && (
                              <button
                                onClick={() => navigate(`/sales/customer/${record.customerId}`)}
                                className="text-green-600 hover:text-green-800 hover:underline text-xs font-semibold text-left transition"
                              >
                                <span className="inline-block">Customer: {record.customerName}</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Quantity Changed */}
                        <td className="px-4 py-3">
                          {isEdit ? (
                            <span className="text-sm text-gray-600">
                              {record.notes ? (
                                <div className="text-xs space-y-1">
                                  <p className="font-semibold text-indigo-700">
                                    {formatQty(record.change)}
                                  </p>
                                  <p className="text-gray-600">
                                    {record.notes.includes('Quantity changed') 
                                      ? record.notes.substring(record.notes.indexOf('Quantity changed')) 
                                      : record.notes.substring(0, 50) + '...'}
                                  </p>
                                </div>
                              ) : (
                                <span>(Normalized)</span>
                              )}
                            </span>
                          ) : (
                            <span className={`text-base font-bold ${
                              isAdd || isReturn
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {isAdd || isReturn ? '+' : '-'}
                              {formatQty(record.change)}
                            </span>
                          )}
                        </td>

                        {/* Balance After */}
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {formatQty(record.quantity)}
                        </td>

                        {/* Performed By */}
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {record.performedBy || 'System'}
                        </td>

                        {/* Notes */}
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                          {record.notes ? (
                            <div className="flex flex-col gap-1">
                              <p className="truncate">{record.notes}</p>
                              {isEdit && record.change && (
                                <p className="text-xs text-indigo-600 font-semibold">
                                  📊 {`Available: ${formatQty(record.quantity)}`}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span>-</span>
                          )}
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Stats */}
          {filteredHistory.length > 0 && (
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-4 border border-blue-200">
              <h3 className="text-base font-bold text-gray-900 mb-3">📊 Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white bg-opacity-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Total Transactions</p>
                  <p className="text-xl font-bold text-blue-600">{filteredHistory.length}</p>
                </div>
                <div className="bg-white bg-opacity-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Stock Additions</p>
                  <p className="text-xl font-bold text-green-600">
                    {history.filter(h => {
                      const action = (h.action || '').toLowerCase();
                      return h.action === 'add' || h.action === 'add_stock' || action.includes('add') || action.includes('stock');
                    }).length}
                  </p>
                </div>
                <div className="bg-white bg-opacity-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Sales Made</p>
                  <p className="text-xl font-bold text-orange-600">
                    {history.filter(h => {
                      const action = (h.action || '').toLowerCase();
                      return h.action === 'sell' || h.action === 'sale' || action.includes('sell') || action.includes('sale');
                    }).length}
                  </p>
                </div>
                <div className="bg-white bg-opacity-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Damage/Returns</p>
                  <p className="text-xl font-bold text-red-600">
                    {history.filter(h => {
                      const action = (h.action || '').toLowerCase();
                      return h.action === 'damage' || h.action === 'damage_shop' || h.action === 'damage_customer' || h.action === 'exchange' || h.action === 'return'
                        || action.includes('damage') || action.includes('exchange') || action.includes('return');
                    }).length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductHistory;
