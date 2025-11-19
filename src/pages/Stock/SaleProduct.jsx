import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from '../../components/Layout/Sidebar';
import { useToast } from '../../components/Toast';
import DualUnitInput from '../../components/DualUnitInput';
import { getPiecesPerBox, formatQuantityDisplay } from '../../utils/inventory';

/**
 * SaleProduct Page - Record Sales
 * Search product -> Enter quantity -> Record sale
 * Updates product stock immediately
 */

function SaleProduct() {
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
    quantitySold: null, // { boxes, pieces, totalPieces }
    buyerName: '',
    buyerContact: '',
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
      const response = await axios.get('http://localhost:5000/api/products');
      setProducts(response.data);
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
    setFormData(prev => ({ ...prev, searchTerm: product.productName, quantitySold: null }));
    setSearchResults([]);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    if (!selectedProduct) newErrors.product = 'Please select a product';
    if (!formData.quantitySold) newErrors.quantity = 'Please enter quantity sold';
    if (!formData.buyerName.trim()) newErrors.buyerName = 'Buyer name is required';
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
      const response = await axios.post(
        `http://localhost:5000/api/products/${selectedProduct._id}/stock/reduce`,
        {
          boxes: formData.quantitySold.boxes,
          pieces: formData.quantitySold.pieces,
          buyerName: formData.buyerName.trim(),
          buyerContact: formData.buyerContact.trim(),
          notes: formData.notes.trim(),
        }
      );

      showToast(
        `✅ Sale recorded! ${formData.quantitySold.boxes} bx + ${formData.quantitySold.pieces} pc of ${selectedProduct.productName} sold to ${formData.buyerName}`,
        'success'
      );

      // Reset form
      setFormData({
        searchTerm: '',
        quantitySold: null,
        buyerName: '',
        buyerContact: '',
        notes: '',
      });
      setSelectedProduct(null);
      setErrors({});

      // Refresh products
      fetchAllProducts();
    } catch (err) {
      console.error('Error recording sale:', err);
      showToast(
        err.response?.data?.message || err.message || 'Failed to record sale',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const piecesPerBox = selectedProduct ? selectedProduct.piecesPerBox : 1;
  const available = selectedProduct
    ? {
        boxes: (selectedProduct.stock?.boxes || 0) - (selectedProduct.sales?.boxes || 0) - (selectedProduct.damage?.boxes || 0) - (selectedProduct.returns?.boxes || 0),
        pieces: (selectedProduct.stock?.pieces || 0) - (selectedProduct.sales?.pieces || 0) - (selectedProduct.damage?.pieces || 0) - (selectedProduct.returns?.pieces || 0),
      }
    : { boxes: 0, pieces: 0 };

  const formatQty = (boxes, pieces) => {
    if (boxes === 0 && pieces === 0) return '0';
    if (boxes === 0) return `${pieces} pc`;
    if (pieces === 0) return `${boxes} bx`;
    return `${boxes} bx, ${pieces} pc`;
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              🛒 Record Sale
            </h1>
            <p className="mt-2 text-gray-600">Record when products are sold to customers</p>
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
                className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition ${
                  errors.product ? 'border-red-500' : selectedProduct ? 'border-green-500 bg-green-50' : 'border-gray-300'
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
                      className="w-full text-left px-4 py-3 hover:bg-green-100 border-b border-gray-200 last:border-b-0 transition"
                    >
                      <div className="font-medium text-gray-900">{product.productName}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {product.type} | {product.size} | Available: {formatQty(
                          (product.stock?.boxes || 0) - (product.sales?.boxes || 0) - (product.damage?.boxes || 0) - (product.returns?.boxes || 0),
                          (product.stock?.pieces || 0) - (product.sales?.pieces || 0) - (product.damage?.pieces || 0) - (product.returns?.pieces || 0)
                        )}
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
              <div className="mt-3 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-green-900">✅ {selectedProduct.productName}</p>
                    <p className="text-xs text-green-700 mt-2">
                      Type: {selectedProduct.type} | Size: {selectedProduct.size}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Current Stock: {formatQty(selectedProduct.stock?.boxes || 0, selectedProduct.stock?.pieces || 0)}
                    </p>
                    <p className="text-xs text-green-700">
                      Available: {formatQty(available.boxes, available.pieces)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setFormData(prev => ({ ...prev, searchTerm: '' }));
                    }}
                    className="text-green-600 hover:text-green-800 font-bold text-lg"
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
              value={formData.quantitySold?.totalPieces}
              onChange={(value) => setFormData(prev => ({ ...prev, quantitySold: value }))}
              label="Quantity Sold"
              required
              error={errors.quantity}
            />
          )}

          {/* Buyer Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Buyer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.buyerName}
              onChange={(e) => setFormData(prev => ({ ...prev, buyerName: e.target.value }))}
              placeholder="Enter buyer name..."
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.buyerName ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.buyerName && <p className="text-red-600 text-sm">❌ {errors.buyerName}</p>}
          </div>

          {/* Buyer Contact */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Buyer Contact (Optional)</label>
            <input
              type="tel"
              value={formData.buyerContact}
              onChange={(e) => setFormData(prev => ({ ...prev, buyerContact: e.target.value }))}
              placeholder="Phone or email..."
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes..."
              rows="3"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading || !selectedProduct}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Recording...
                </>
              ) : (
                <>
                  <span>✅</span>
                  Record Sale
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

export default SaleProduct;
