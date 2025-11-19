import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from '../../components/Layout/Sidebar';
import { useToast } from '../../components/Toast';

/**
 * Damage Product Page - Simplified Single Form
 * Record damage with all scenarios in one page
 */

function DamageProduct() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const searchTimeoutRef = useRef(null);

  // Form data
  const [damageType, setDamageType] = useState('own');
  const [customerActionType, setCustomerActionType] = useState('refund'); // refund | exchange-same | exchange-different
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [replacementProduct, setReplacementProduct] = useState(null);
  
  const [formData, setFormData] = useState({
    damagedBoxes: '',
    damagedPieces: '',
    replacementBoxes: '',
    replacementPieces: '',
    customerName: '',
    damageReason: '',
    description: ''
  });

  // Product search
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  const [replacementSearchTerm, setReplacementSearchTerm] = useState('');
  const [replacementSearchResults, setReplacementSearchResults] = useState([]);
  const [replacementSearching, setReplacementSearching] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Disable scroll on number inputs to prevent accidental value changes
  useEffect(() => {
    const handleWheel = (e) => {
      if (document.activeElement.type === 'number') {
        document.activeElement.blur();
      }
    };
    document.addEventListener('wheel', handleWheel, { passive: true });
    return () => document.removeEventListener('wheel', handleWheel);
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/products`);
      const productsData = response.data.products || response.data;
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err) {
      console.error('Error fetching products:', err);
      showToast({ message: 'Failed to load products', type: 'error' });
    }
  };

  // Search damaged product
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      const results = value.trim() === ''
        ? []
        : products.filter(p => {
            const searchLower = value.toLowerCase();
            return (
              p.productName?.toLowerCase().includes(searchLower) ||
              p.type?.toLowerCase().includes(searchLower) ||
              p.subType?.toLowerCase().includes(searchLower) ||
              p.size?.toLowerCase().includes(searchLower)
            );
          });
      setSearchResults(results);
      setSearching(false);
    }, 300);
  };

  // Search replacement product
  const handleReplacementSearchChange = (e) => {
    const value = e.target.value;
    setReplacementSearchTerm(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setReplacementSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      const results = value.trim() === ''
        ? []
        : products.filter(p => {
            const searchLower = value.toLowerCase();
            return (
              p.productName?.toLowerCase().includes(searchLower) ||
              p.type?.toLowerCase().includes(searchLower) ||
              p.subType?.toLowerCase().includes(searchLower) ||
              p.size?.toLowerCase().includes(searchLower)
            );
          });
      setReplacementSearchResults(results);
      setReplacementSearching(false);
    }, 300);
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setSearchTerm(product.productName);
    setSearchResults([]);
  };

  const handleSelectReplacementProduct = (product) => {
    setReplacementProduct(product);
    setReplacementSearchTerm(product.productName);
    setReplacementSearchResults([]);
  };

  // Format quantity
  const formatQty = (boxes, pieces) => {
    if (boxes === 0 && pieces === 0) return '0';
    if (boxes === 0) return `${pieces} pc`;
    if (pieces === 0) return `${boxes} bx`;
    return `${boxes} bx, ${pieces} pc`;
  };

  // Calculate available stock
  const calculateAvailable = (product) => {
    const piecesPerBox = product.piecesPerBox || 4;
    const stockPieces = (product.stock?.boxes || 0) * piecesPerBox + (product.stock?.pieces || 0);
    const salesPieces = (product.sales?.boxes || 0) * piecesPerBox + (product.sales?.pieces || 0);
    const damagePieces = (product.damage?.boxes || 0) * piecesPerBox + (product.damage?.pieces || 0);
    const returnsPieces = (product.returns?.boxes || 0) * piecesPerBox + (product.returns?.pieces || 0);
    const availablePieces = Math.max(0, stockPieces - salesPieces - damagePieces + returnsPieces);
    const boxes = Math.floor(availablePieces / piecesPerBox);
    const pieces = availablePieces % piecesPerBox;
    return { boxes, pieces };
  };

  // Get final damage type for backend
  const getFinalDamageType = () => {
    if (damageType === 'own') return 'own';
    if (damageType === 'customer') {
      if (customerActionType === 'refund') return 'customer-refund';
      if (customerActionType === 'exchange-same') return 'exchange-same';
      if (customerActionType === 'exchange-different') return 'exchange-different';
    }
    return 'own';
  };

  // Validation
  const validateForm = () => {
    if (!selectedProduct) {
      showToast({ message: 'Please select a product', type: 'error' });
      return false;
    }

    const damagedBoxes = parseInt(formData.damagedBoxes) || 0;
    const damagedPieces = parseInt(formData.damagedPieces) || 0;
    if (damagedBoxes === 0 && damagedPieces === 0) {
      showToast({ message: 'Please enter damaged quantity', type: 'error' });
      return false;
    }

    if (damageType === 'customer' && (customerActionType === 'exchange-same' || customerActionType === 'exchange-different')) {
      const replBoxes = parseInt(formData.replacementBoxes) || 0;
      const replPieces = parseInt(formData.replacementPieces) || 0;
      if (replBoxes === 0 && replPieces === 0) {
        showToast({ message: 'Please enter replacement quantity', type: 'error' });
        return false;
      }
    }

    if (damageType === 'customer' && customerActionType === 'exchange-different' && !replacementProduct) {
      showToast({ message: 'Please select replacement product', type: 'error' });
      return false;
    }

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirmModal(true);
    }
  };

  // Perform damage recording
  const performDamageRecord = async () => {
    setShowConfirmModal(false);
    setLoading(true);

    try {
      const finalDamageType = getFinalDamageType();
      
      const payload = {
        damageType: finalDamageType,
        productId: selectedProduct._id,
        damagedQuantity: {
          boxes: parseInt(formData.damagedBoxes) || 0,
          pieces: parseInt(formData.damagedPieces) || 0
        },
        customerName: formData.customerName,
        damageReason: formData.damageReason,
        description: formData.description
      };

      if (customerActionType === 'exchange-same' || customerActionType === 'exchange-different') {
        payload.replacementQuantity = {
          boxes: parseInt(formData.replacementBoxes) || 0,
          pieces: parseInt(formData.replacementPieces) || 0
        };
      }

      if (customerActionType === 'exchange-different') {
        payload.replacementProductId = replacementProduct._id;
      }

      await axios.post(`${import.meta.env.VITE_API_URL}/api/damage/record`, payload);

      showToast({ 
        message: 'Damage recorded successfully', 
        type: 'success' 
      });

      // Reset form
      setTimeout(() => {
        resetForm();
      }, 1500);

    } catch (err) {
      console.error('Error recording damage:', err);
      showToast({ 
        message: err.response?.data?.message || 'Failed to record damage', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDamageType('own');
    setCustomerActionType('refund');
    setSelectedProduct(null);
    setReplacementProduct(null);
    setSearchTerm('');
    setReplacementSearchTerm('');
    setFormData({
      damagedBoxes: '',
      damagedPieces: '',
      replacementBoxes: '',
      replacementPieces: '',
      customerName: '',
      damageReason: '',
      description: ''
    });
  };

  // Generate confirmation message
  const getConfirmationMessage = () => {
    const finalType = getFinalDamageType();
    const damagedQty = formatQty(parseInt(formData.damagedBoxes) || 0, parseInt(formData.damagedPieces) || 0);
    
    let message = `Product "${selectedProduct.productName}" - ${damagedQty} damaged`;
    
    if (finalType === 'customer-refund') {
      message += ` (Customer Return - Refund)`;
    } else if (finalType === 'exchange-same') {
      const replQty = formatQty(parseInt(formData.replacementBoxes) || 0, parseInt(formData.replacementPieces) || 0);
      message += ` and exchanged with ${replQty} of same product`;
    } else if (finalType === 'exchange-different' && replacementProduct) {
      const replQty = formatQty(parseInt(formData.replacementBoxes) || 0, parseInt(formData.replacementPieces) || 0);
      message += ` and exchanged with "${replacementProduct.productName}" - ${replQty}`;
    }
    
    if (formData.customerName) {
      message += ` | Customer: ${formData.customerName}`;
    }
    
    return message;
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen bg-gradient-to-br from-red-50 to-orange-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-5xl">🔴</span>
                Record Damage
              </h1>
              <button
                onClick={() => navigate('/stock/product-list')}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-semibold transition"
              >
                ← Back
              </button>
            </div>
            <p className="text-gray-600 text-lg">Record damaged products and customer returns/exchanges</p>
          </div>

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl p-8 space-y-8">
            
            {/* Damage Type Selection */}
            <div>
              <label className="block text-lg font-bold text-gray-900 mb-4">
                Damage Type <span className="text-red-600">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setDamageType('own')}
                  className={`p-4 border-2 rounded-lg transition ${
                    damageType === 'own'
                      ? 'border-red-600 bg-red-50'
                      : 'border-gray-200 hover:border-red-300'
                  }`}
                >
                  <div className="text-3xl mb-2">🏪</div>
                  <div className="font-bold">Own Damage</div>
                  <div className="text-xs text-gray-600">Warehouse/Storage</div>
                </button>
                <button
                  type="button"
                  onClick={() => setDamageType('customer')}
                  className={`p-4 border-2 rounded-lg transition ${
                    damageType === 'customer'
                      ? 'border-orange-600 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                >
                  <div className="text-3xl mb-2">👤</div>
                  <div className="font-bold">Customer Damage</div>
                  <div className="text-xs text-gray-600">Return/Exchange</div>
                </button>
              </div>
            </div>

            {/* Customer Action Type (if customer damage) */}
            {damageType === 'customer' && (
              <div>
                <label className="block text-lg font-bold text-gray-900 mb-4">
                  Customer Action <span className="text-red-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setCustomerActionType('refund')}
                    className={`p-4 border-2 rounded-lg transition ${
                      customerActionType === 'refund'
                        ? 'border-orange-600 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">💰</div>
                    <div className="font-bold text-sm">Refund Only</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerActionType('exchange-same')}
                    className={`p-4 border-2 rounded-lg transition ${
                      customerActionType === 'exchange-same'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">🔄</div>
                    <div className="font-bold text-sm">Exchange Same</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerActionType('exchange-different')}
                    className={`p-4 border-2 rounded-lg transition ${
                      customerActionType === 'exchange-different'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">🔀</div>
                    <div className="font-bold text-sm">Exchange Different</div>
                  </button>
                </div>
              </div>
            )}

            {/* Damaged Product Selection */}
            <div>
              <label className="block text-lg font-bold text-gray-900 mb-3">
                Damaged Product <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search by name, type, or size..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                {searching && (
                  <div className="absolute right-3 top-3 text-gray-400">Searching...</div>
                )}
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                    {searchResults.map((product) => {
                      const available = calculateAvailable(product);
                      return (
                        <button
                          key={product._id}
                          type="button"
                          onClick={() => handleSelectProduct(product)}
                          className="w-full text-left px-4 py-3 hover:bg-red-50 border-b border-gray-100 transition"
                        >
                          <div className="font-semibold text-gray-900">{product.productName}</div>
                          <div className="text-sm text-gray-600 flex gap-4 mt-1">
                            <span>📦 {formatQty(product.stock?.boxes || 0, product.stock?.pieces || 0)}</span>
                            <span>⚠️ Damage: {formatQty(product.damage?.boxes || 0, product.damage?.pieces || 0)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {selectedProduct && (
                <div className="mt-3 p-4 bg-red-50 border-2 border-red-200 rounded-lg flex justify-between items-center">
                  <div>
                    <div className="font-bold text-gray-900">{selectedProduct.productName}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Current Damage: {formatQty(selectedProduct.damage?.boxes || 0, selectedProduct.damage?.pieces || 0)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setSearchTerm('');
                    }}
                    className="text-red-600 hover:text-red-800 font-semibold"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Damaged Quantity */}
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Damaged Quantity <span className="text-red-600">*</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Boxes</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.damagedBoxes}
                    onChange={(e) => setFormData(prev => ({ ...prev, damagedBoxes: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pieces</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.damagedPieces}
                    onChange={(e) => setFormData(prev => ({ ...prev, damagedPieces: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>

            {/* Replacement Product & Quantity (for exchange-different) */}
            {damageType === 'customer' && customerActionType === 'exchange-different' && (
              <>
                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-3">
                    Replacement Product <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={replacementSearchTerm}
                      onChange={handleReplacementSearchChange}
                      placeholder="Search replacement product..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    {replacementSearching && (
                      <div className="absolute right-3 top-3 text-gray-400">Searching...</div>
                    )}
                    {replacementSearchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                        {replacementSearchResults.map((product) => {
                          const available = calculateAvailable(product);
                          return (
                            <button
                              key={product._id}
                              type="button"
                              onClick={() => handleSelectReplacementProduct(product)}
                              className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b border-gray-100 transition"
                            >
                              <div className="font-semibold text-gray-900">{product.productName}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                Available: {formatQty(available.boxes, available.pieces)}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {replacementProduct && (
                    <div className="mt-3 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg flex justify-between items-center">
                      <div className="font-bold text-gray-900">{replacementProduct.productName}</div>
                      <button
                        type="button"
                        onClick={() => {
                          setReplacementProduct(null);
                          setReplacementSearchTerm('');
                        }}
                        className="text-purple-600 hover:text-purple-800 font-semibold"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Replacement Quantity (for all exchanges) */}
            {damageType === 'customer' && (customerActionType === 'exchange-same' || customerActionType === 'exchange-different') && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Replacement Quantity <span className="text-red-600">*</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Boxes</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.replacementBoxes}
                      onChange={(e) => setFormData(prev => ({ ...prev, replacementBoxes: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pieces</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.replacementPieces}
                      onChange={(e) => setFormData(prev => ({ ...prev, replacementPieces: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Customer Name (for customer damage) */}
            {damageType === 'customer' && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Customer Name <span className="text-gray-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Enter customer name..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            )}

            {/* Damage Reason */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Damage Reason <span className="text-gray-500">(Optional)</span>
              </label>
              <select
                value={formData.damageReason}
                onChange={(e) => setFormData(prev => ({ ...prev, damageReason: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select reason...</option>
                <option value="Broken">Broken</option>
                <option value="Chipped">Chipped</option>
                <option value="Cracked">Cracked</option>
                <option value="Manufacturing Defect">Manufacturing Defect</option>
                <option value="Damaged during transit">Damaged during transit</option>
                <option value="Poor quality">Poor quality</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Additional Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Additional Notes <span className="text-gray-500">(Optional)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter any additional details..."
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/stock/product-list')}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition"
              >
                {loading ? 'Recording...' : 'Record Damage'}
              </button>
            </div>
          </form>

          {/* Simple Confirmation Modal */}
          {showConfirmModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full">
                <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-6 rounded-t-lg flex justify-between items-center">
                  <h2 className="text-2xl font-bold">⚠️ Confirm Damage Record</h2>
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="text-white hover:text-red-100 text-3xl font-bold leading-none"
                  >
                    ×
                  </button>
                </div>
                
                <div className="p-6">
                  <p className="text-lg text-gray-900 mb-6">
                    {getConfirmationMessage()}
                  </p>
                  
                  {formData.damageReason && (
                    <p className="text-sm text-gray-700 mb-4">
                      <span className="font-semibold">Reason:</span> {formData.damageReason}
                    </p>
                  )}
                  
                  {formData.description && (
                    <p className="text-sm text-gray-700 mb-4">
                      <span className="font-semibold">Notes:</span> {formData.description}
                    </p>
                  )}

                  <div className="flex gap-4 pt-6 border-t border-gray-200">
                    <button
                      onClick={performDamageRecord}
                      disabled={loading}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition"
                    >
                      {loading ? '⏳ Recording...' : '✓ Confirm'}
                    </button>
                    <button
                      onClick={() => setShowConfirmModal(false)}
                      disabled={loading}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-800 py-3 rounded-lg font-semibold transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default DamageProduct;
