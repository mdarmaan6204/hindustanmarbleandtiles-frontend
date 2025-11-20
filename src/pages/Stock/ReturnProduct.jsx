import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../../components/Layout/Sidebar';
import { useToast } from '../../components/Toast';
import api, { productAPI } from '../../services/api.js';
import DualUnitInput from '../../components/DualUnitInput';

/**
 * ReturnProduct Page - Process Customer Returns
 * Track product returns and process refunds
 */

function ReturnProduct() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const searchTimeoutRef = useRef(null);

  // Form data
  const [formData, setFormData] = useState({
    searchTerm: '',
    quantityReturned: null,
    customerName: '',
    customerContact: '',
    returnReason: '',
    refundAmount: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});

  // Fetch all products on mount
  useEffect(() => {
    fetchAllProducts();
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

  const fetchAllProducts = async () => {
    try {
      const response = await productAPI.getAll();
      setProducts(Array.isArray(response.data) ? response.data : response.data.products || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  // Handle product search
  const handleSearchChange = (e) => {
    const term = e.target.value;
    setFormData(prev => ({ ...prev, searchTerm: term }));
    setSelectedProduct(null);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (term.trim().length >= 2) {
      setSearching(true);
      searchTimeoutRef.current = setTimeout(() => {
        const results = products.filter(p =>
          p.productName.toLowerCase().includes(term.toLowerCase())
        );
        setSearchResults(results);
        setSearching(false);
      }, 300);
    } else {
      setSearchResults([]);
      setSearching(false);
    }
  };

  // Handle selecting a product
  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setFormData(prev => ({ 
      ...prev, 
      searchTerm: product.productName, 
      quantityReturned: null,
      refundAmount: (product.costPerBox || 0).toFixed(2)
    }));
    setSearchResults([]);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    if (!selectedProduct) newErrors.product = 'Please select a product';
    if (!formData.quantityReturned) newErrors.quantity = 'Please enter quantity returned';
    if (!formData.customerName.trim()) newErrors.customerName = 'Customer name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setLoading(true);

    try {
      await api.post(`/products/${selectedProduct._id}/stock/return`, {
        boxes: formData.quantityReturned.boxes,
        pieces: formData.quantityReturned.pieces,
        customerName: formData.customerName.trim(),
        customerContact: formData.customerContact.trim(),
        returnReason: formData.returnReason.trim(),
        refundAmount: parseFloat(formData.refundAmount) || 0,
        notes: formData.notes.trim(),
      });

      showToast(
        `✅ Return processed! ${formData.quantityReturned.boxes} bx + ${formData.quantityReturned.pieces} pc returned. Refund: ₹${parseFloat(formData.refundAmount).toFixed(2)}`,
        'success'
      );

      // Reset form
      setFormData({
        searchTerm: '',
        quantityReturned: null,
        customerName: '',
        customerContact: '',
        returnReason: '',
        refundAmount: '',
        notes: '',
      });
      setSelectedProduct(null);
      setErrors({});

      // Refresh products
      fetchAllProducts();
    } catch (err) {
      console.error('Error processing return:', err);
      showToast(
        err.response?.data?.message || err.message || 'Failed to process return',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const piecesPerBox = selectedProduct ? selectedProduct.piecesPerBox : 1;

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              🔄 Process Return
            </h1>
            <p className="mt-2 text-gray-600">Handle customer product returns and refunds</p>
          </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Product Search */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Product <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.searchTerm}
                onChange={handleSearchChange}
                placeholder="Search product name..."
                disabled={selectedProduct !== null}
                className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${
                  errors.product ? 'border-red-500' : selectedProduct ? 'border-purple-500 bg-purple-50' : 'border-gray-300'
                }`}
              />

              {/* Search Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {searchResults.map((product) => (
                    <button
                      key={product._id}
                      type="button"
                      onClick={() => handleSelectProduct(product)}
                      className="w-full text-left px-4 py-3 hover:bg-purple-100 border-b border-gray-200 last:border-b-0 transition"
                    >
                      <div className="font-medium text-gray-900">{product.productName}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {product.type} | {product.size}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searching && <div className="absolute right-3 top-3 text-gray-400 text-sm">Searching...</div>}
            </div>
            {errors.product && <p className="text-red-600 text-sm">❌ {errors.product}</p>}

            {/* Selected Product Info */}
            {selectedProduct && (
              <div className="mt-3 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-purple-900">✅ {selectedProduct.productName}</p>
                    <p className="text-xs text-purple-700 mt-2">
                      Type: {selectedProduct.type} | Size: {selectedProduct.size}
                    </p>
                    <p className="text-xs text-purple-700 mt-1">
                      Cost: ₹{(selectedProduct.costPerBox || 0).toFixed(2)}/box
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setFormData(prev => ({ ...prev, searchTerm: '' }));
                    }}
                    className="text-purple-600 hover:text-purple-800 font-bold text-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quantity Input */}
          {selectedProduct && (
            <DualUnitInput
              piecesPerBox={piecesPerBox}
              value={formData.quantityReturned?.totalPieces}
              onChange={(value) => setFormData(prev => ({ ...prev, quantityReturned: value }))}
              label="Quantity Returned"
              required
              error={errors.quantity}
            />
          )}

          {/* Customer Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
              placeholder="Enter customer name..."
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.customerName ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.customerName && <p className="text-red-600 text-sm">❌ {errors.customerName}</p>}
          </div>

          {/* Customer Contact */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Customer Contact</label>
            <input
              type="text"
              value={formData.customerContact}
              onChange={(e) => setFormData(prev => ({ ...prev, customerContact: e.target.value }))}
              placeholder="Phone or email..."
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Return Reason */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Return Reason <span className="text-gray-500">(Optional)</span>
            </label>
            <input
              type="text"
              value={formData.returnReason}
              onChange={(e) => setFormData(prev => ({ ...prev, returnReason: e.target.value }))}
              placeholder="e.g., Not as per specifications, Color variation..."
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Refund Amount */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Refund Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              value={formData.refundAmount}
              onChange={(e) => setFormData(prev => ({ ...prev, refundAmount: e.target.value }))}
              placeholder="0.00"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any other details..."
              rows="3"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading || !selectedProduct}
              className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Processing...
                </>
              ) : (
                <>
                  <span>✅</span>
                  Process Return
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/stock/product-list')}
              className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-400 transition"
            >
              Back to List
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}

export default ReturnProduct;
