import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../../components/Layout/Sidebar';
import { useToast } from '../../components/Toast';
import api, { productAPI } from '../../services/api.js';
import { TILE_TYPES, HSN_NUMBERS, LOCATIONS } from '../../utils/inventory';
import { productEvents, PRODUCT_EVENTS } from '../../utils/events';

/**
 * Enhanced Product List Page with PDF/Excel Export
 * - Image column with thumbnails
 * - Date range filter
 * - PDF & Excel export with filters
 * - Improved UI and layout
 */

function ProductList() {
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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Applied filters - Only these are used for filtering
  const [appliedFilters, setAppliedFilters] = useState({
    type: '',
    subType: '',
    size: '',
    hsn: '',
    location: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  
  // Sorting
  const [sortBy, setSortBy] = useState('recent'); // recent, stock-asc, stock-desc, name
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, productId: null, productName: '' });
  const [deleting, setDeleting] = useState(false);
  
  // Dropdown menu state
  const [openDropdown, setOpenDropdown] = useState(null);
  
  // Report generation state
  const [generatingReport, setGeneratingReport] = useState(null); // 'pdf' or 'excel'

  // Fetch all products
  useEffect(() => {
    fetchProducts();
  }, []);
  
  // Listen for product events
  useEffect(() => {
    const handleProductAdded = () => {
      fetchProducts();
      showToast({ message: 'Product list refreshed', type: 'info', duration: 2000 });
    };
    
    productEvents.on(PRODUCT_EVENTS.PRODUCT_ADDED, handleProductAdded);
    productEvents.on(PRODUCT_EVENTS.STOCK_UPDATED, handleProductAdded);
    
    return () => {
      productEvents.off(PRODUCT_EVENTS.PRODUCT_ADDED, handleProductAdded);
      productEvents.off(PRODUCT_EVENTS.STOCK_UPDATED, handleProductAdded);
    };
  }, []);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getAll();
      
      // Handle both response formats: array or {products: array}
      const productData = Array.isArray(response.data) 
        ? response.data 
        : response.data.products || [];
      
      setProducts(productData);
      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
      showToast({ message: 'Failed to load products', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Format boxes and pieces as "X bx, Y pc"
  const formatQuantity = (boxes, pieces) => {
    if (boxes === 0 && pieces === 0) return '0';
    if (boxes === 0) return `${pieces} pc`;
    if (pieces === 0) return `${boxes} bx`;
    return `${boxes} bx, ${pieces} pc`;
  };

  // Calculate available stock (Stock - Sales - Damage + Returns)
  const calculateAvailable = (product) => {
    const piecesPerBox = product.piecesPerBox || 4;
    
    const stockPieces = (product.stock?.boxes || 0) * piecesPerBox + (product.stock?.pieces || 0);
    const salesPieces = (product.sales?.boxes || 0) * piecesPerBox + (product.sales?.pieces || 0);
    const damagePieces = (product.damage?.boxes || 0) * piecesPerBox + (product.damage?.pieces || 0);
    const returnsPieces = (product.returns?.boxes || 0) * piecesPerBox + (product.returns?.pieces || 0);
    
    const availablePieces = Math.max(0, stockPieces - salesPieces - damagePieces + returnsPieces);
    
    const boxes = Math.floor(availablePieces / piecesPerBox);
    const pieces = availablePieces % piecesPerBox;
    
    return { boxes, pieces, totalPieces: availablePieces };
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setFilterType('');
    setFilterSubType('');
    setFilterSize('');
    setFilterHSN('');
    setFilterLocation('');
    setDateFrom('');
    setDateTo('');
    setSortBy('recent');
    setCurrentPage(1);
    setAppliedFilters({
      type: '',
      subType: '',
      size: '',
      hsn: '',
      location: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    });
  };

  // Apply filters - Only called when Search/Apply button is clicked
  const applyFilters = () => {
    setAppliedFilters({
      type: filterType,
      subType: filterSubType,
      size: filterSize,
      hsn: filterHSN,
      location: filterLocation,
      dateFrom: dateFrom,
      dateTo: dateTo,
      search: searchTerm
    });
    setCurrentPage(1);
  };

  // Filter and sort products
  const getFilteredAndSortedProducts = () => {
    let filtered = [...products];

    // Search filter - Use appliedFilters.search
    if (appliedFilters.search) {
      filtered = filtered.filter(product =>
        product.productName.toLowerCase().includes(appliedFilters.search.toLowerCase())
      );
    }

    // Date range filter - Use appliedFilters
    if (appliedFilters.dateFrom || appliedFilters.dateTo) {
      filtered = filtered.filter(product => {
        const productDate = new Date(product.createdAt);
        const fromDate = appliedFilters.dateFrom ? new Date(appliedFilters.dateFrom) : null;
        const toDate = appliedFilters.dateTo ? new Date(appliedFilters.dateTo) : null;
        
        // Set toDate to end of day (23:59:59) to include the entire selected day
        if (toDate) {
          toDate.setHours(23, 59, 59, 999);
        }
        
        // Set fromDate to start of day (00:00:00)
        if (fromDate) {
          fromDate.setHours(0, 0, 0, 0);
        }
        
        if (fromDate && toDate) {
          return productDate >= fromDate && productDate <= toDate;
        } else if (fromDate) {
          return productDate >= fromDate;
        } else if (toDate) {
          return productDate <= toDate;
        }
        return true;
      });
    }

    // Type filter - Use appliedFilters
    if (appliedFilters.type) {
      filtered = filtered.filter(product => product.type === appliedFilters.type);
    }

    // SubType filter - Use appliedFilters
    if (appliedFilters.subType) {
      filtered = filtered.filter(product => product.subType === appliedFilters.subType);
    }

    // Size filter - Use appliedFilters
    if (appliedFilters.size) {
      filtered = filtered.filter(product => product.size === appliedFilters.size);
    }

    // HSN filter - Use appliedFilters
    if (appliedFilters.hsn) {
      filtered = filtered.filter(product => product.hsnNo === appliedFilters.hsn);
    }

    // Location filter - Use appliedFilters
    if (appliedFilters.location) {
      filtered = filtered.filter(product => product.location === appliedFilters.location);
    }

    // Sorting
    if (sortBy === 'recent') {
      // Most recent first (by createdAt or _id)
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'stock-asc') {
      // Available stock A to Z (low to high)
      filtered.sort((a, b) => {
        const aAvail = calculateAvailable(a);
        const bAvail = calculateAvailable(b);
        return aAvail.totalPieces - bAvail.totalPieces;
      });
    } else if (sortBy === 'stock-desc') {
      // Available stock Z to A (high to low)
      filtered.sort((a, b) => {
        const aAvail = calculateAvailable(a);
        const bAvail = calculateAvailable(b);
        return bAvail.totalPieces - aAvail.totalPieces;
      });
    } else if (sortBy === 'name') {
      // Alphabetical by name
      filtered.sort((a, b) => a.productName.localeCompare(b.productName));
    }

    return filtered;
  };

  const filteredProducts = getFilteredAndSortedProducts();

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Handle page change
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Get unique sizes from products
  const getAvailableSizes = () => {
    const sizes = new Set();
    products.forEach(p => {
      if (p.size) sizes.add(p.size);
    });
    return Array.from(sizes).sort();
  };

  // Get unique types from products (including custom types)
  const getAvailableTypes = () => {
    const types = new Set(Object.keys(TILE_TYPES));
    products.forEach(p => {
      if (p.type) types.add(p.type);
    });
    return Array.from(types).sort();
  };

  // Get unique locations from products
  const getAvailableLocations = () => {
    const locations = new Set(LOCATIONS);
    products.forEach(p => {
      if (p.location && !LOCATIONS.includes(p.location)) {
        locations.add(p.location);
      }
    });
    return Array.from(locations).sort();
  };

  // Generate PDF Report
  const handleGeneratePDF = async () => {
    try {
      setGeneratingReport('pdf');
      
      // Build query parameters from appliedFilters
      const params = new URLSearchParams();
      if (appliedFilters.search) params.append('search', appliedFilters.search);
      if (appliedFilters.type) params.append('type', appliedFilters.type);
      if (appliedFilters.subType) params.append('subType', appliedFilters.subType);
      if (appliedFilters.size) params.append('size', appliedFilters.size);
      if (appliedFilters.hsn) params.append('hsn', appliedFilters.hsn);
      if (appliedFilters.location) params.append('location', appliedFilters.location);
      if (appliedFilters.dateFrom) params.append('dateFrom', appliedFilters.dateFrom);
      if (appliedFilters.dateTo) params.append('dateTo', appliedFilters.dateTo);
      if (sortBy) params.append('sortBy', sortBy);
      
      const url = `${import.meta.env.VITE_API_URL}/api/reports/products/pdf?${params.toString()}`;
      window.open(url, '_blank');
      
      showToast({ message: 'PDF report opened in new tab', type: 'success' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast({ message: 'Failed to generate PDF report', type: 'error' });
    } finally {
      setGeneratingReport(null);
    }
  };

  // Generate Excel Report
  const handleGenerateExcel = async () => {
    try {
      setGeneratingReport('excel');
      
      // Build query parameters from appliedFilters
      const params = new URLSearchParams();
      if (appliedFilters.search) params.append('search', appliedFilters.search);
      if (appliedFilters.type) params.append('type', appliedFilters.type);
      if (appliedFilters.subType) params.append('subType', appliedFilters.subType);
      if (appliedFilters.size) params.append('size', appliedFilters.size);
      if (appliedFilters.hsn) params.append('hsn', appliedFilters.hsn);
      if (appliedFilters.location) params.append('location', appliedFilters.location);
      if (appliedFilters.dateFrom) params.append('dateFrom', appliedFilters.dateFrom);
      if (appliedFilters.dateTo) params.append('dateTo', appliedFilters.dateTo);
      if (sortBy) params.append('sortBy', sortBy);
      
      const response = await api.get(`/reports/products/excel`, {
        params: Object.fromEntries(params.entries()),
        responseType: 'blob'
      });
      
      // Create download link
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Product_List_${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      showToast({ message: 'Excel report downloaded successfully', type: 'success' });
    } catch (error) {
      console.error('Error generating Excel:', error);
      showToast({ message: 'Failed to generate Excel report', type: 'error' });
    } finally {
      setGeneratingReport(null);
    }
  };

  // Delete product
  const handleDelete = async () => {
    if (!deleteConfirm.productId) return;
    
    setDeleting(true);
    try {
      await productAPI.delete(deleteConfirm.productId);
      showToast({ 
        message: `${deleteConfirm.productName} deleted successfully`, 
        type: 'success' 
      });
      fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      showToast({ 
        message: 'Failed to delete product', 
        type: 'error' 
      });
    } finally {
      setDeleting(false);
      setDeleteConfirm({ show: false, productId: null, productName: '' });
    }
  };

  if (loading) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-64 min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Loading products...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">📦 Product Inventory</h1>
            <p className="text-gray-600">
              Showing {currentProducts.length} of {filteredProducts.length} products
              {filteredProducts.length !== products.length && ` (filtered from ${products.length} total)`}
            </p>
          </div>

          {/* Filters Section */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">🔍 Filters & Search</h2>
              <div className="flex items-center gap-3">
                {/* Product Count Display */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                  <p className="text-xs text-blue-600 font-semibold mb-0.5">📊 Products</p>
                  <p className="text-lg font-bold text-blue-800">
                    {filteredProducts.length}
                    {filteredProducts.length !== products.length && (
                      <span className="text-xs text-blue-600 font-normal ml-1">
                        / {products.length}
                      </span>
                    )}
                  </p>
                </div>

                {/* Excel Export Button */}
                <button
                  onClick={handleGenerateExcel}
                  disabled={generatingReport === 'excel'}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition shadow-md"
                  title="Export to Excel"
                >
                  {generatingReport === 'excel' ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      <span className="hidden sm:inline">Generating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
                        <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                      </svg>
                      <span className="hidden sm:inline">Excel</span>
                    </>
                  )}
                </button>
                
                {/* PDF Export Button */}
                <button
                  onClick={handleGeneratePDF}
                  disabled={generatingReport === 'pdf'}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition shadow-md"
                  title="Export to PDF"
                >
                  {generatingReport === 'pdf' ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      <span className="hidden sm:inline">Generating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                      </svg>
                      <span className="hidden sm:inline">PDF</span>
                    </>
                  )}
                </button>

                <button
                  onClick={resetFilters}
                  className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                >
                  🔄 Reset All
                </button>
              </div>
            </div>

            {/* Filter Row 1 - Search and Sort */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Search Product</label>
                <input
                  type="text"
                  placeholder="Search by product name..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      applyFilters();
                    }
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="recent">Most Recent</option>
                  <option value="stock-desc">Stock: High to Low</option>
                  <option value="stock-asc">Stock: Low to High</option>
                  <option value="name">Name: A to Z</option>
                </select>
              </div>
            </div>

            {/* Filter Row 2 - Type, Size, HSN */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    setFilterSubType('');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  {getAvailableTypes().map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Size */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Size</label>
                <select
                  value={filterSize}
                  onChange={(e) => {
                    setFilterSize(e.target.value);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Sizes</option>
                  {getAvailableSizes().map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>

              {/* HSN Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">HSN Number</label>
                <select
                  value={filterHSN}
                  onChange={(e) => {
                    setFilterHSN(e.target.value);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All HSN</option>
                  {HSN_NUMBERS.map(hsn => (
                    <option key={hsn} value={hsn}>{hsn}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter Row 3 - Date Range & Location */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Date From */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Added From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Added To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                <select
                  value={filterLocation}
                  onChange={(e) => {
                    setFilterLocation(e.target.value);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Locations</option>
                  {getAvailableLocations().map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Apply Filters Button */}
            <div className="flex justify-center gap-3">
              <button
                onClick={applyFilters}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition shadow-md flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search / Apply Filters
              </button>
              <button
                onClick={resetFilters}
                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition shadow-md flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
              </button>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            {currentProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">No products found</p>
                <button
                  onClick={() => navigate('/stock/add-product')}
                  className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Add First Product
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">#</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Image</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Product Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">HSN Code</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Size</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Stock</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Sales</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Damage</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Returns</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Available</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Location</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentProducts.map((product, index) => {
                        const available = calculateAvailable(product);
                        const globalIndex = startIndex + index + 1;
                        
                        // Alternating row colors
                        const rowColor = index % 2 === 0 
                          ? 'bg-white hover:bg-blue-50' 
                          : 'bg-gray-50 hover:bg-blue-50';
                        
                        return (
                          <tr 
                            key={product._id} 
                            className={`${rowColor} border-b border-gray-200 transition-colors duration-150`}
                          >
                            <td className="px-4 py-4 text-sm text-gray-700">{globalIndex}</td>
                            
                            {/* Image Column */}
                            <td className="px-4 py-4">
                              {product.images && product.images.length > 0 ? (
                                <img 
                                  src={product.images[0]}
                                  alt={product.productName}
                                  className="w-12 h-12 object-cover rounded border border-gray-300"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"%3E%3Crect width="24" height="24" rx="2" stroke-width="2"/%3E%3Cpath d="M9 9l6 6M15 9l-6 6" stroke-width="2"/%3E%3C/svg%3E';
                                  }}
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                                  No Image
                                </div>
                              )}
                            </td>
                            
                            <td className="px-4 py-4">
                              <button
                                onClick={() => navigate(`/stock/product/${product._id}`)}
                                className="text-blue-600 hover:text-blue-800 font-semibold hover:underline text-left"
                              >
                                <div className="font-semibold">{product.productName}</div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {product.type}{product.subType && ` - ${product.subType}`}
                                </div>
                              </button>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-700">
                              <span className="inline-block bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                                {product.hsnNo || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-700">{product.size}</td>
                            <td className="px-4 py-4">
                              <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                                {formatQuantity(product.stock?.boxes || 0, product.stock?.pieces || 0)}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="inline-block bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-semibold">
                                {formatQuantity(product.sales?.boxes || 0, product.sales?.pieces || 0)}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="inline-block bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">
                                {formatQuantity(product.damage?.boxes || 0, product.damage?.pieces || 0)}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">
                                {formatQuantity(product.returns?.boxes || 0, product.returns?.pieces || 0)}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-block px-2 py-1 rounded text-sm font-bold ${
                                available.totalPieces === 0 
                                  ? 'bg-red-100 text-red-800' 
                                  : available.totalPieces < product.piecesPerBox 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {formatQuantity(available.boxes, available.pieces)}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-700">
                              {product.location || '-'}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdown(openDropdown === product._id ? null : product._id);
                                  }}
                                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-md flex items-center gap-1"
                                >
                                  ⚙️
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                
                                {/* Dropdown Menu - Show upwards for last 3 rows */}
                                {openDropdown === product._id && (
                                  <div className={`absolute right-0 ${
                                    index >= currentProducts.length - 3 ? 'bottom-full mb-2' : 'top-full mt-2'
                                  } w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50`}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/stock/product/${product._id}`);
                                      }}
                                      className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3 text-sm font-medium text-gray-700 hover:text-blue-600 transition border-b border-gray-100"
                                    >
                                      <span className="text-lg">👁️</span>
                                      View Details
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/stock/product/${product._id}/history`);
                                      }}
                                      className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center gap-3 text-sm font-medium text-gray-700 hover:text-indigo-600 transition border-b border-gray-100"
                                    >
                                      <span className="text-lg">📜</span>
                                      Product History
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Navigate to AddProduct with product data
                                        sessionStorage.setItem('addStockProduct', JSON.stringify(product));
                                        navigate('/stock/add-product?mode=addstock');
                                      }}
                                      className="w-full text-left px-4 py-3 hover:bg-purple-50 flex items-center gap-3 text-sm font-medium text-gray-700 hover:text-purple-600 transition border-b border-gray-100"
                                    >
                                      <span className="text-lg">📦</span>
                                      Add Stock
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/stock/edit-product/${product._id}`);
                                      }}
                                      className="w-full text-left px-4 py-3 hover:bg-green-50 flex items-center gap-3 text-sm font-medium text-gray-700 hover:text-green-600 transition border-b border-gray-100"
                                    >
                                      <span className="text-lg">✏️</span>
                                      Edit Product
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenDropdown(null);
                                        setDeleteConfirm({ 
                                          show: true, 
                                          productId: product._id, 
                                          productName: product.productName 
                                        });
                                      }}
                                      className="w-full text-left px-4 py-3 hover:bg-red-50 flex items-center gap-3 text-sm font-medium text-gray-700 hover:text-red-600 transition rounded-b-lg"
                                    >
                                      <span className="text-lg">🗑️</span>
                                      Delete Product
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
                        <span className="font-semibold">{Math.min(endIndex, filteredProducts.length)}</span> of{' '}
                        <span className="font-semibold">{filteredProducts.length}</span> results
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Previous Button */}
                        <button
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                        >
                          ← Previous
                        </button>

                        {/* Page Numbers */}
                        <div className="flex gap-1">
                          {[...Array(totalPages)].map((_, i) => {
                            const pageNum = i + 1;
                            // Show first page, last page, current page, and adjacent pages
                            if (
                              pageNum === 1 ||
                              pageNum === totalPages ||
                              (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                            ) {
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => goToPage(pageNum)}
                                  className={`px-3 py-2 border rounded-lg text-sm font-semibold ${
                                    currentPage === pageNum
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            } else if (
                              pageNum === currentPage - 2 ||
                              pageNum === currentPage + 2
                            ) {
                              return <span key={pageNum} className="px-2 py-2 text-gray-500">...</span>;
                            }
                            return null;
                          })}
                        </div>

                        {/* Next Button */}
                        <button
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">⚠️ Confirm Delete</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <strong>{deleteConfirm.productName}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-semibold transition disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setDeleteConfirm({ show: false, productId: null, productName: '' })}
                disabled={deleting}
                className="flex-1 bg-gray-300 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-400 font-semibold transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductList;
