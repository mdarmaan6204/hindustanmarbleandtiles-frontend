import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from '../../components/Layout/Sidebar';
import { useToast } from '../../components/Toast';
import { TILE_TYPES, HSN_NUMBERS, LOCATIONS } from '../../utils/inventory';

/**
 * Low Stock Management Page
 * - View products below low stock threshold
 * - Set individual low stock thresholds
 * - Bulk set thresholds for multiple products
 * - Filter and search capabilities
 */

function LowStock() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters - Input values
  const [filterType, setFilterType] = useState('');
  const [filterSubType, setFilterSubType] = useState('');
  const [filterSize, setFilterSize] = useState('');
  const [filterHSN, setFilterHSN] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  
  // Applied filters
  const [appliedFilters, setAppliedFilters] = useState({
    type: '',
    subType: '',
    size: '',
    hsn: '',
    location: '',
    search: ''
  });
  
  // Sorting
  const [sortBy, setSortBy] = useState('low-stock'); // low-stock, name, type
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Selection for bulk operations
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Modals
  const [showSetThresholdModal, setShowSetThresholdModal] = useState(false);
  const [showBulkSetModal, setShowBulkSetModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [thresholdValue, setThresholdValue] = useState('');
  const [bulkThresholdValue, setBulkThresholdValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch all products
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/products');
      
      const productData = Array.isArray(response.data) 
        ? response.data 
        : response.data.products || [];
      
      setProducts(productData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching products:', err);
      showToast({ message: 'Failed to load products', type: 'error' });
      setLoading(false);
    }
  };

  // Calculate available stock in boxes
  const calculateAvailableBoxes = (product) => {
    if (!product) return 0;
    
    const piecesPerBox = product.piecesPerBox || 1;
    const stockPieces = (product.stock?.boxes || 0) * piecesPerBox + (product.stock?.pieces || 0);
    const salesPieces = (product.sales?.boxes || 0) * piecesPerBox + (product.sales?.pieces || 0);
    const damagePieces = (product.damage?.boxes || 0) * piecesPerBox + (product.damage?.pieces || 0);
    const returnsPieces = (product.returns?.boxes || 0) * piecesPerBox + (product.returns?.pieces || 0);
    
    const availablePieces = stockPieces - salesPieces - damagePieces + returnsPieces;
    const availableBoxes = Math.floor(availablePieces / piecesPerBox);
    
    return availableBoxes;
  };

  // Format quantity display
  const formatQty = (qty) => {
    if (!qty) return '0 bx';
    const boxes = qty.boxes || 0;
    const pieces = qty.pieces || 0;
    
    if (pieces > 0) {
      return `${boxes} bx ${pieces} pcs`;
    }
    return `${boxes} bx`;
  };

  // Apply filters button handler
  const handleApplyFilters = () => {
    setAppliedFilters({
      type: filterType,
      subType: filterSubType,
      size: filterSize,
      hsn: filterHSN,
      location: filterLocation,
      search: searchTerm
    });
    setCurrentPage(1);
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilterType('');
    setFilterSubType('');
    setFilterSize('');
    setFilterHSN('');
    setFilterLocation('');
    setSearchTerm('');
    setAppliedFilters({
      type: '',
      subType: '',
      size: '',
      hsn: '',
      location: '',
      search: ''
    });
    setCurrentPage(1);
  };

  // Filter products
  const getFilteredProducts = () => {
    let filtered = products.filter(product => {
      // Apply text search
      if (appliedFilters.search) {
        const search = appliedFilters.search.toLowerCase();
        const matchesSearch = 
          product.productName?.toLowerCase().includes(search) ||
          product.size?.toLowerCase().includes(search) ||
          product.type?.toLowerCase().includes(search) ||
          product.subType?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Apply dropdown filters
      if (appliedFilters.type && product.type !== appliedFilters.type) return false;
      if (appliedFilters.subType && product.subType !== appliedFilters.subType) return false;
      if (appliedFilters.size && product.size !== appliedFilters.size) return false;
      if (appliedFilters.hsn && product.hsnNo !== appliedFilters.hsn) return false;
      if (appliedFilters.location && product.location !== appliedFilters.location) return false;

      return true;
    });

    // Sort products
    filtered.sort((a, b) => {
      if (sortBy === 'low-stock') {
        const aAvailable = calculateAvailableBoxes(a);
        const bAvailable = calculateAvailableBoxes(b);
        const aThreshold = a.lowStockThreshold || 0;
        const bThreshold = b.lowStockThreshold || 0;
        const aDiff = aAvailable - aThreshold;
        const bDiff = bAvailable - bThreshold;
        return aDiff - bDiff; // Most critical first
      } else if (sortBy === 'name') {
        return (a.productName || '').localeCompare(b.productName || '');
      } else if (sortBy === 'type') {
        return (a.type || '').localeCompare(b.type || '');
      }
      return 0;
    });

    return filtered;
  };

  const filteredProducts = getFilteredProducts();

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProducts(currentProducts.map(p => p._id));
      setSelectAll(true);
    } else {
      setSelectedProducts([]);
      setSelectAll(false);
    }
  };

  const handleSelectProduct = (productId) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  // Open set threshold modal
  const openSetThresholdModal = (product) => {
    setCurrentProduct(product);
    setThresholdValue(product.lowStockThreshold?.toString() || '0');
    setShowSetThresholdModal(true);
  };

  // Save individual threshold
  const handleSaveThreshold = async () => {
    if (!currentProduct) return;
    
    const threshold = parseInt(thresholdValue) || 0;
    if (threshold < 0) {
      showToast({ message: 'Threshold must be 0 or greater', type: 'error' });
      return;
    }

    try {
      setSaving(true);
      await axios.patch(`http://localhost:5000/api/products/${currentProduct._id}/low-stock-threshold`, {
        lowStockThreshold: threshold
      });
      
      showToast({ message: 'Low stock threshold updated', type: 'success' });
      setShowSetThresholdModal(false);
      fetchProducts();
    } catch (err) {
      console.error('Error updating threshold:', err);
      showToast({ message: 'Failed to update threshold', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Open bulk set modal
  const openBulkSetModal = () => {
    if (selectedProducts.length === 0) {
      showToast({ message: 'Please select products first', type: 'warning' });
      return;
    }
    setBulkThresholdValue('');
    setShowBulkSetModal(true);
  };

  // Save bulk threshold
  const handleBulkSaveThreshold = async () => {
    const threshold = parseInt(bulkThresholdValue) || 0;
    if (threshold < 0) {
      showToast({ message: 'Threshold must be 0 or greater', type: 'error' });
      return;
    }

    try {
      setSaving(true);
      await axios.patch('http://localhost:5000/api/products/bulk-low-stock-threshold', {
        productIds: selectedProducts,
        lowStockThreshold: threshold
      });
      
      showToast({ 
        message: `Updated threshold for ${selectedProducts.length} products`, 
        type: 'success' 
      });
      setShowBulkSetModal(false);
      setSelectedProducts([]);
      setSelectAll(false);
      fetchProducts();
    } catch (err) {
      console.error('Error updating bulk threshold:', err);
      showToast({ message: 'Failed to update thresholds', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Get unique values for filters
  const uniqueTypes = [...new Set(products.map(p => p.type).filter(Boolean))];
  const uniqueSubTypes = [...new Set(products.map(p => p.subType).filter(Boolean))];
  const uniqueSizes = [...new Set(products.map(p => p.size).filter(Boolean))];

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Sidebar />
      
      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  Low Stock Management
                </h1>
                <p className="text-gray-600 mt-2">Monitor and manage products below stock threshold</p>
              </div>
              
              <button
                onClick={() => navigate('/stock/products')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                ← Back to Products
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white shadow-lg">
                <p className="text-red-100 text-xs font-medium mb-1">Critical (Below Threshold)</p>
                <p className="text-3xl font-bold">
                  {products.filter(p => calculateAvailableBoxes(p) < (p.lowStockThreshold || 0) && (p.lowStockThreshold || 0) > 0).length}
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-4 text-white shadow-lg">
                <p className="text-yellow-100 text-xs font-medium mb-1">No Threshold Set</p>
                <p className="text-3xl font-bold">
                  {products.filter(p => !p.lowStockThreshold || p.lowStockThreshold === 0).length}
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white shadow-lg">
                <p className="text-green-100 text-xs font-medium mb-1">Healthy Stock</p>
                <p className="text-3xl font-bold">
                  {products.filter(p => calculateAvailableBoxes(p) >= (p.lowStockThreshold || 0) && (p.lowStockThreshold || 0) > 0).length}
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Filters</h2>
            
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by name, size, type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleApplyFilters()}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <select
                value={filterSubType}
                onChange={(e) => setFilterSubType(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sub-Types</option>
                {uniqueSubTypes.map(subType => (
                  <option key={subType} value={subType}>{subType}</option>
                ))}
              </select>

              <select
                value={filterSize}
                onChange={(e) => setFilterSize(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sizes</option>
                {uniqueSizes.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>

              <select
                value={filterHSN}
                onChange={(e) => setFilterHSN(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All HSN</option>
                {HSN_NUMBERS.map(hsn => (
                  <option key={hsn} value={hsn}>{hsn}</option>
                ))}
              </select>

              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Locations</option>
                {LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleApplyFilters}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md font-medium"
              >
                🔍 Apply Filters
              </button>
              
              <button
                onClick={handleResetFilters}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-md font-medium"
              >
                ↺ Reset
              </button>

              <div className="flex-1"></div>

              <button
                onClick={openBulkSetModal}
                disabled={selectedProducts.length === 0}
                className={`px-6 py-3 rounded-lg transition-all shadow-md font-medium ${
                  selectedProducts.length > 0
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                📋 Bulk Set Threshold ({selectedProducts.length})
              </button>
            </div>

            {/* Sort */}
            <div className="mt-4 flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="low-stock">Most Critical First</option>
                <option value="name">Product Name</option>
                <option value="type">Type</option>
              </select>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : currentProducts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500 text-lg">No products found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                      <tr>
                        <th className="px-4 py-4 text-left">
                          <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAll}
                            className="w-5 h-5 rounded border-2 border-white cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-4 text-left font-semibold">Image</th>
                        <th className="px-4 py-4 text-left font-semibold">Product Name</th>
                        <th className="px-4 py-4 text-left font-semibold">Type</th>
                        <th className="px-4 py-4 text-left font-semibold">Size</th>
                        <th className="px-4 py-4 text-left font-semibold">Available Stock</th>
                        <th className="px-4 py-4 text-left font-semibold">Low Stock Threshold</th>
                        <th className="px-4 py-4 text-left font-semibold">Status</th>
                        <th className="px-4 py-4 text-left font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentProducts.map((product, index) => {
                        const availableBoxes = calculateAvailableBoxes(product);
                        const threshold = product.lowStockThreshold || 0;
                        const isCritical = threshold > 0 && availableBoxes < threshold;
                        const isSelected = selectedProducts.includes(product._id);

                        return (
                          <tr 
                            key={product._id} 
                            className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                              isCritical ? 'bg-red-50' : ''
                            }`}
                          >
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectProduct(product._id)}
                                className="w-5 h-5 rounded border-2 border-gray-300 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-4">
                              {product.images && product.images.length > 0 ? (
                                <img 
                                  src={product.images[0]} 
                                  alt={product.productName}
                                  className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200"
                                />
                              ) : (
                                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">No image</span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-semibold text-gray-800">{product.productName}</p>
                              <p className="text-sm text-gray-500">{product.subType || '-'}</p>
                            </td>
                            <td className="px-4 py-4">
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                {product.type}
                              </span>
                            </td>
                            <td className="px-4 py-4 font-medium text-gray-700">{product.size}</td>
                            <td className="px-4 py-4">
                              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                isCritical 
                                  ? 'bg-red-100 text-red-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {availableBoxes} boxes
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-700">
                                {threshold} boxes
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              {threshold === 0 ? (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                  ⚠️ Not Set
                                </span>
                              ) : isCritical ? (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                  🔴 Critical
                                </span>
                              ) : (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                  ✅ Healthy
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <button
                                onClick={() => openSetThresholdModal(product)}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all text-sm font-medium shadow-md"
                              >
                                ⚙️ Set Threshold
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 py-6 bg-gray-50">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg bg-white border-2 border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors font-medium"
                    >
                      ← Previous
                    </button>
                    
                    <div className="flex gap-2">
                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            currentPage === i + 1
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                              : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-lg bg-white border-2 border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors font-medium"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Set Threshold Modal */}
      {showSetThresholdModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <h3 className="text-2xl font-bold mb-4 text-gray-800">Set Low Stock Threshold</h3>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-2">Product: <span className="font-semibold">{currentProduct?.productName}</span></p>
              <p className="text-gray-600 mb-4">Current Available: <span className="font-semibold text-blue-600">{calculateAvailableBoxes(currentProduct)} boxes</span></p>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Threshold Value (in boxes)
              </label>
              <input
                type="number"
                min="0"
                value={thresholdValue}
                onChange={(e) => setThresholdValue(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter threshold in boxes"
                autoFocus
              />
              <p className="text-sm text-gray-500 mt-2">
                💡 Alert will trigger when available stock falls below this value
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSetThresholdModal(false)}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveThreshold}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : '💾 Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Set Threshold Modal */}
      {showBulkSetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <h3 className="text-2xl font-bold mb-4 text-gray-800">Bulk Set Low Stock Threshold</h3>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Setting threshold for <span className="font-semibold text-purple-600">{selectedProducts.length} selected products</span>
              </p>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Threshold Value (in boxes)
              </label>
              <input
                type="number"
                min="0"
                value={bulkThresholdValue}
                onChange={(e) => setBulkThresholdValue(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter threshold in boxes"
                autoFocus
              />
              <p className="text-sm text-gray-500 mt-2">
                💡 This threshold will be applied to all selected products
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkSetModal(false)}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSaveThreshold}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : '💾 Apply to All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LowStock;
