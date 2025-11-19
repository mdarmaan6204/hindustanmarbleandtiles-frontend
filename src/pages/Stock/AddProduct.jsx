import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from '../../components/Layout/Sidebar';
import { useToast } from '../../components/Toast';
import { 
  TILE_TYPES, 
  getPiecesPerBox,
  getPiecesPerBoxOptions,
  getAvailableSizes, 
  HSN_NUMBERS,
  LOCATIONS 
} from '../../utils/inventory';

/**
 * Professional Add/Update Product Form
 * Comprehensive inventory management with piecesPerBox customization
 */

function AddProduct() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [mode, setMode] = useState('new'); // 'new' or 'existing'
  const searchTimeoutRef = useRef(null);

  const [formData, setFormData] = useState({
    productName: '',
    type: '',
    customType: '',
    subType: '',
    size: '',
    piecesPerBox: '',
    quantityBoxes: '',
    quantityPieces: '',
    description: '',
    hsnNo: '',
    customHsn: '',
    link3D: '',
    location: '',
    customLocation: '',
    images: [],
    imageFiles: [], // Store selected files
  });

  const [mainImageIndex, setMainImageIndex] = useState(0); // Track main image index
  const [piecesPerBoxWarning, setPiecesPerBoxWarning] = useState(null); // Warning for incorrect piecesPerBox
  const [duplicateProduct, setDuplicateProduct] = useState(null); // Store duplicate product if found
  const [showDuplicateModal, setShowDuplicateModal] = useState(false); // Show duplicate confirmation modal
  const [nameSearchResults, setNameSearchResults] = useState([]); // Autocomplete results
  const [showNameDropdown, setShowNameDropdown] = useState(false); // Show/hide dropdown
  const nameInputRef = useRef(null); // Reference to product name input
  const imageInputRef = useRef(null); // Reference to native file input to clear value

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

  // Handle image file selection
  const handleImageFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setFormData(prev => ({ 
        ...prev, 
        imageFiles: [...prev.imageFiles, ...filesArray] 
      }));
    }
  };

  // Set main image from file previews
  const handleSetMainImage = (index) => {
    setMainImageIndex(index);
  };

  // Upload images one by one with progress
  const uploadImagesWithProgress = async (files) => {
    if (!files || files.length === 0) return [];
    
    const uploadedUrls = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/upload`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );
        
        if (response.data.ok && response.data.imageUrl) {
          uploadedUrls.push(response.data.imageUrl);
        } else if (response.data.url) {
          uploadedUrls.push(response.data.url);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Image upload error:', error);
        throw error;
      }
    }
    
    return uploadedUrls;
  };

  // Remove image preview
  const removeImageFile = (index) => {
    setFormData(prev => ({
      ...prev,
      imageFiles: prev.imageFiles.filter((_, i) => i !== index)
    }));
    
    // Adjust mainImageIndex if necessary
    if (index === mainImageIndex) {
      // If removing the main image, reset to first image
      setMainImageIndex(0);
    } else if (index < mainImageIndex) {
      // If removing an image before the main, adjust the index down
      setMainImageIndex(prev => prev - 1);
    }
  };

  // Get image preview URL
  const getImagePreviewUrl = (file) => {
    return URL.createObjectURL(file);
  };

  const [errors, setErrors] = useState({});

  // Fetch all products on mount
  useEffect(() => {
    fetchAllProducts();
  }, []);
  
  // Check for pre-filled product data from sessionStorage (from ProductList "Add Stock" action)
  useEffect(() => {
    const addStockData = sessionStorage.getItem('addStockProduct');
    if (addStockData) {
      try {
        const product = JSON.parse(addStockData);
        handleSelectProduct(product);
        setMode('existing');
        sessionStorage.removeItem('addStockProduct'); // Clean up
      } catch (err) {
        console.error('Error loading add stock data:', err);
      }
    }
  }, [products]); // Run after products are loaded

  // Cleanup object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      formData.imageFiles.forEach(file => {
        URL.revokeObjectURL(URL.createObjectURL(file));
      });
    };
  }, [formData.imageFiles]);

  const fetchAllProducts = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/products`);
      // Handle both array response and {ok, products} response
      const productsData = response.data.products || response.data;
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err) {
      console.error('Error fetching products:', err);
      showToast({ 
        message: 'Failed to load products. Please refresh the page.', 
        type: 'error' 
      });
    }
  };

  // Check for duplicate product by name
  const checkDuplicateProduct = (productName) => {
    if (!productName || productName.trim() === '') {
      setDuplicateProduct(null);
      setNameSearchResults([]);
      setShowNameDropdown(false);
      return;
    }
    
    const trimmedName = productName.trim().toLowerCase();
    
    // Find exact match
    const exactMatch = products.find(p => 
      p.productName.toLowerCase() === trimmedName
    );
    
    // Find partial matches for autocomplete
    const partialMatches = products.filter(p => 
      p.productName.toLowerCase().includes(trimmedName) &&
      p.productName.toLowerCase() !== trimmedName
    ).slice(0, 8); // Limit to 8 suggestions
    
    if (exactMatch && mode === 'new') {
      setDuplicateProduct(exactMatch);
      setNameSearchResults([]);
      setShowNameDropdown(false);
    } else {
      setDuplicateProduct(null);
      setNameSearchResults(partialMatches);
      setShowNameDropdown(partialMatches.length > 0);
    }
  };

  // Handle switching to add stock for duplicate product
  const handleAddToDuplicate = () => {
    if (duplicateProduct) {
      handleSelectProduct(duplicateProduct);
      setMode('existing');
      setShowDuplicateModal(false);
      setDuplicateProduct(null);
      setShowNameDropdown(false);
      showToast({
        message: `Switched to adding stock for "${duplicateProduct.productName}"`,
        type: 'info'
      });
    }
  };

  // Handle selecting a product from autocomplete dropdown
  const handleSelectFromDropdown = (product) => {
    handleSelectProduct(product);
    setMode('existing');
    setShowNameDropdown(false);
    setNameSearchResults([]);
    setDuplicateProduct(null);
    showToast({
      message: `Selected "${product.productName}" - Add stock below`,
      type: 'success'
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (nameInputRef.current && !nameInputRef.current.contains(event.target)) {
        setShowNameDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle search - search by product name, type, subType, size
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, searchTerm: value }));
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
    }, 200);
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setFormData(prev => ({
      ...prev,
      searchTerm: product.productName,
      productName: product.productName,
      type: product.type,
      subType: product.subType || '',
      size: product.size,
      piecesPerBox: product.piecesPerBox.toString(),
      description: product.description || '',
      hsnNo: product.hsnNo || '',
      link3D: product.link3D || '',
      location: product.location || '',
      images: product.images || [],
      quantityBoxes: '',
      quantityPieces: '',
      imageFiles: [], // Reset new image files
    }));
    setSearchResults([]);
    setErrors({});
    // Clear native file input so prior filenames don't persist in the UI
    if (imageInputRef && imageInputRef.current) imageInputRef.current.value = '';
  };

  // Validation
  const validateForm = () => {
    const newErrors = {};
    const finalType = formData.type === 'Other' ? formData.customType : formData.type;

    // Mandatory fields
    // Product name is optional for new products (will be auto-generated)
    // But required for existing products (pre-filled)
    if (!finalType) newErrors.type = 'Type is required';
    if (!formData.size) newErrors.size = 'Size is required';
    if (!formData.quantityBoxes && !formData.quantityPieces) {
      newErrors.quantity = 'Enter quantity (boxes or pieces)';
    }

    // Only Floor requires subType
    if (finalType === 'Floor' && !formData.subType) {
      newErrors.subType = 'SubType is required for Floor';
    }

    // Validate numeric fields
    if (formData.quantityBoxes && isNaN(formData.quantityBoxes)) {
      newErrors.quantityBoxes = 'Must be numeric';
    }
    if (formData.quantityPieces && isNaN(formData.quantityPieces)) {
      newErrors.quantityPieces = 'Must be numeric';
    }
    if (formData.piecesPerBox && isNaN(formData.piecesPerBox)) {
      newErrors.piecesPerBox = 'Must be numeric';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast({ message: 'Please fill all required fields', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const finalType = formData.type === 'Other' ? formData.customType : formData.type;
      let boxes = parseInt(formData.quantityBoxes) || 0;
      let pieces = parseInt(formData.quantityPieces) || 0;
      const finalPiecesPerBox = parseInt(formData.piecesPerBox) || getPiecesPerBox(formData.size);
      
      // Auto-normalize pieces to boxes+pieces
      if (pieces >= finalPiecesPerBox) {
        boxes += Math.floor(pieces / finalPiecesPerBox);
        pieces = pieces % finalPiecesPerBox;
      }
      
      const finalHsn = formData.hsnNo === 'other' ? formData.customHsn : formData.hsnNo;
      const finalLocation = formData.location === 'other' ? formData.customLocation : formData.location;

      // Generate product name if not provided (for new products)
      const finalProductName = formData.productName || 
        (finalType === 'Floor' 
          ? `${finalType} ${formData.subType} ${formData.size}`
          : `${finalType} ${formData.size}`);

      // Step 2: Determine if creating new product or adding stock to existing
      if (selectedProduct) {
        // EXISTING PRODUCT - Add stock only
        const endpoint = `${import.meta.env.VITE_API_URL}/api/products/${selectedProduct._id}/stock/add`;
        const payload = {
          boxes,
          pieces,
          ...(finalLocation && { location: finalLocation })
        };

        const response = await axios.post(endpoint, payload);

        showToast({ 
          message: `✅ Stock added to ${selectedProduct.productName}`,
          type: 'success',
          duration: 3000
        });
      } else {
        // NEW PRODUCT - Create product with initial stock
        
        // Upload images with progress if there are any
        let imageUrls = [];
        if (formData.imageFiles.length > 0) {
          imageUrls = await uploadImagesWithProgress(formData.imageFiles);
          
          // Reorder: Move main image to index 0
          if (mainImageIndex > 0 && mainImageIndex < imageUrls.length) {
            const mainImage = imageUrls.splice(mainImageIndex, 1)[0];
            imageUrls.unshift(mainImage);
          }
        }

        const payload = {
          productName: finalProductName,
          type: finalType,
          ...(finalType === 'Floor' && { subType: formData.subType }),
          size: formData.size,
          piecesPerBox: finalPiecesPerBox,
          stock: { boxes, pieces },
          description: formData.description,
          hsnNo: finalHsn,
          link3D: formData.link3D,
          location: finalLocation,
          ...(imageUrls.length > 0 && { images: imageUrls }),
        };

        const endpoint = `${import.meta.env.VITE_API_URL}/api/products`;
        const response = await axios.post(endpoint, payload);

        showToast({ 
          message: `✅ ${finalProductName} created successfully`,
          type: 'success',
          duration: 3000
        });
      }

      // Reset form for next product
      setFormData({
        productName: '',
        type: '',
        customType: '',
        subType: '',
        size: '',
        piecesPerBox: '',
        quantityBoxes: '',
        quantityPieces: '',
        description: '',
        hsnNo: '',
        customHsn: '',
        link3D: '',
        location: '',
        customLocation: '',
        images: [],
        imageFiles: [],
        searchTerm: ''
      });
      // Clear native file input to avoid showing previous filenames
      if (imageInputRef && imageInputRef.current) {
        try { imageInputRef.current.value = ''; } catch(e) { /* ignore */ }
      }
      setSelectedProduct(null);
      setMainImageIndex(0);
      setMode('new');
      fetchAllProducts(); // Refresh product list
    } catch (err) {
      console.error('Error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Error saving product. Please try again.';
      showToast({ 
        message: `❌ Failed: ${errorMsg}`,
        type: 'error',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getSubTypeOptions = () => {
    const finalType = formData.type === 'Other' ? formData.customType : formData.type;
    return TILE_TYPES[finalType] || [];
  };

  const getSizeOptions = () => {
    const finalType = formData.type === 'Other' ? formData.customType : formData.type;
    return getAvailableSizes(finalType, formData.subType);
  };

  const getPiecesPerBoxOptionsLocal = () => {
    if (!formData.size) return [];
    const finalType = formData.type === 'Other' ? formData.customType : formData.type;
    return getPiecesPerBoxOptions(formData.size, finalType, formData.subType);
  };

  // Calculate available stock (Stock - Sales - Damage + Returns)
  const calculateAvailable = (product) => {
    if (!product) return { boxes: 0, pieces: 0 };
    
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

  const needsSubType = (formData.type === 'Other' ? formData.customType : formData.type) === 'Floor';
  const finalType = formData.type === 'Other' ? formData.customType : formData.type;
  const defaultPiecesPerBox = formData.size ? getPiecesPerBox(formData.size, finalType, formData.subType) : null;

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Mode Toggle */}
          <div className="flex gap-4 mb-8">
            <button
              type="button"
              className={`px-6 py-2 rounded-lg font-semibold border transition ${mode === 'new' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-900 border-gray-300'}`}
              onClick={() => { setMode('new'); setSelectedProduct(null); }}
            >
              New Product
            </button>
            <button
              type="button"
              className={`px-6 py-2 rounded-lg font-semibold border transition ${mode === 'existing' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-900 border-gray-300'}`}
              onClick={() => { setMode('existing'); setFormData(f => ({ ...f, searchTerm: '' })); setSelectedProduct(null); }}
            >
              Existing Product
            </button>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900">
              {selectedProduct ? '➕ Add Stock' : '📦 New Product'}
            </h1>
            <p className="text-gray-600 mt-2">
              {selectedProduct
                ? `Adding inventory to: ${selectedProduct.productName}`
                : 'Create new tile product with complete specifications'}
            </p>
          </div>

          {/* Selected Product Info Card */}
          {selectedProduct && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-6 mb-6 shadow-md">
              <div className="flex items-start gap-4">
                {/* Product Image */}
                {selectedProduct.images && selectedProduct.images.length > 0 && (
                  <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border-2 border-blue-400 bg-white">
                    <img 
                      src={selectedProduct.images[0]} 
                      alt={selectedProduct.productName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {/* Product Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{selectedProduct.productName}</h3>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                          {selectedProduct.type}
                        </span>
                        {selectedProduct.subType && (
                          <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                            {selectedProduct.subType}
                          </span>
                        )}
                        <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                          {selectedProduct.size}
                        </span>
                        <span className="bg-gray-700 text-white px-3 py-1 rounded-full text-sm font-semibold">
                          {selectedProduct.piecesPerBox} tiles/box
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(null);
                        setFormData({
                          productName: '',
                          type: '',
                          customType: '',
                          subType: '',
                          size: '',
                          piecesPerBox: '',
                          quantityBoxes: '',
                          quantityPieces: '',
                          description: '',
                          hsnNo: '',
                          customHsn: '',
                          link3D: '',
                          location: '',
                          customLocation: '',
                          images: [],
                          imageFiles: [],
                          searchTerm: ''
                        });
                        if (imageInputRef && imageInputRef.current) {
                          try { imageInputRef.current.value = ''; } catch(e) {}
                        }
                      }}
                      className="px-4 py-2 bg-white border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-600 hover:text-white transition"
                    >
                      Change Product
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <p className="text-xs text-gray-600 mb-1">Available Stock</p>
                      <p className="text-lg font-bold text-green-700">
                        {(() => {
                          const available = calculateAvailable(selectedProduct);
                          return `${available.boxes}B + ${available.pieces}P`;
                        })()}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <p className="text-xs text-gray-600 mb-1">Location</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedProduct.location || 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
            <div className="space-y-8">

              {/* ==================== MODE: EXISTING ==================== */}
              {mode === 'existing' && !selectedProduct && (
                <div className="pb-6 border-b border-gray-200">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    🔍 Search Existing Product
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.searchTerm || ''}
                      onChange={handleSearchChange}
                      placeholder="Search by name, type, subtype, or size..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {searching && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10 p-4 text-center text-gray-600">
                        Searching...
                      </div>
                    )}
                    {!searching && searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
                        {searchResults.map((product) => {
                          // Calculate available for each product
                          const stockPieces = (product.stock?.boxes || 0) * product.piecesPerBox + (product.stock?.pieces || 0);
                          const salesPieces = (product.sales?.boxes || 0) * product.piecesPerBox + (product.sales?.pieces || 0);
                          const damagePieces = (product.damage?.boxes || 0) * product.piecesPerBox + (product.damage?.pieces || 0);
                          const returnsPieces = (product.returns?.boxes || 0) * product.piecesPerBox + (product.returns?.pieces || 0);
                          const availablePieces = stockPieces - salesPieces - damagePieces + returnsPieces;
                          const availableBoxes = Math.floor(availablePieces / product.piecesPerBox);
                          const availablePcs = availablePieces % product.piecesPerBox;
                          
                          return (
                            <button
                              key={product._id}
                              type="button"
                              onClick={() => handleSelectProduct(product)}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-200 last:border-b-0 flex gap-4 items-center transition"
                            >
                              {/* Image Thumbnail */}
                              <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                {product.images && product.images.length > 0 ? (
                                  <img 
                                    src={product.images[0]} 
                                    alt={product.productName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                    No Image
                                  </div>
                                )}
                              </div>
                              
                              {/* Product Details */}
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 mb-1">{product.productName}</div>
                                <div className="text-sm text-gray-600 flex gap-3 flex-wrap">
                                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">
                                    {product.type}
                                  </span>
                                  {product.subType && (
                                    <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-medium">
                                      {product.subType}
                                    </span>
                                  )}
                                  <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded font-medium">
                                    {product.size}
                                  </span>
                                  <span className="text-green-700 font-semibold">
                                    ✓ Available: {availableBoxes}B + {availablePcs}P
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {!searching && formData.searchTerm && searchResults.length === 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10 p-4 text-center text-gray-600">
                        No products found matching "{formData.searchTerm}"
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ==================== PRODUCT SPECIFICATION FIELDS (Only show for New Products) ==================== */}
              {!selectedProduct && (
                <>
                  {/* ==================== PRODUCT NAME ==================== */}
                  <div className="relative" ref={nameInputRef}>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Product Name (Optional - Auto-generated)
                    </label>
                    <input
                      type="text"
                      value={formData.productName}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setFormData(prev => ({ ...prev, productName: newName }));
                        checkDuplicateProduct(newName);
                      }}
                      placeholder="Leave empty to auto-generate (e.g., Floor Matte 2×2)"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">If left empty, name will be generated from Type, SubType, and Size</p>
                    
                    {/* Autocomplete Dropdown */}
                    {showNameDropdown && nameSearchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                        <div className="p-2 bg-blue-50 border-b border-blue-200">
                          <p className="text-xs font-semibold text-blue-800">
                            💡 Found {nameSearchResults.length} matching product{nameSearchResults.length > 1 ? 's' : ''} - Click to add stock
                          </p>
                        </div>
                        {nameSearchResults.map((product, index) => (
                          <div
                            key={product._id || index}
                            onClick={() => handleSelectFromDropdown(product)}
                            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900 text-sm">{product.productName}</p>
                                <p className="text-xs text-gray-600 mt-0.5">
                                  {product.type} {product.subType && `- ${product.subType}`} • {product.size}
                                </p>
                              </div>
                              <div className="ml-3 text-right">
                                <p className="text-xs font-semibold text-green-600">
                                  {calculateAvailable(product).boxes} bx
                                </p>
                                <p className="text-xs text-green-600">
                                  {calculateAvailable(product).pieces} pc
                                </p>
                              </div>
                            </div>
                            {product.location && (
                              <p className="text-xs text-gray-500 mt-1">📍 {product.location}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Duplicate Product Warning */}
                    {duplicateProduct && mode === 'new' && (
                      <div className="mt-3 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3 flex-1">
                            <h3 className="text-sm font-medium text-yellow-800">
                              Product Already Exists!
                            </h3>
                            <div className="mt-2 text-sm text-gray-700">
                              <p className="font-semibold mb-2">{duplicateProduct.productName}</p>
                              <div className="space-y-1 bg-white p-3 rounded border border-yellow-200">
                                <p><span className="font-medium">Type:</span> {duplicateProduct.type} {duplicateProduct.subType && `- ${duplicateProduct.subType}`}</p>
                                <p><span className="font-medium">Size:</span> {duplicateProduct.size}</p>
                                <p className="font-semibold text-green-600">
                                  <span className="font-medium text-gray-700">Available Stock:</span> {calculateAvailable(duplicateProduct).boxes} bx, {calculateAvailable(duplicateProduct).pieces} pc
                                </p>
                                <p><span className="font-medium">Location:</span> {duplicateProduct.location || 'Not specified'}</p>
                              </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                onClick={handleAddToDuplicate}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Stock to This Product
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, productName: '' }));
                                  setDuplicateProduct(null);
                                }}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                Change Name
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ==================== TYPE / SUBTYPE / SIZE ==================== */}
                  {!duplicateProduct && (
                  <div className="grid grid-cols-2 gap-6">
                {/* TYPE */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Type <span className="text-red-500">*</span>
                    {selectedProduct && <span className="text-xs text-gray-500 ml-2">(Read-only)</span>}
                  </label>
                  <div className="space-y-2">
                    {Object.keys(TILE_TYPES).map(type => (
                      <label key={type} className={`flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg ${selectedProduct ? 'cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:bg-gray-50'}`}>
                        <input
                          type="radio"
                          name="type"
                          value={type}
                          checked={formData.type === type}
                          disabled={selectedProduct !== null}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              type: e.target.value,
                              subType: '',
                              size: '',
                              piecesPerBox: '',
                              customType: ''
                            }));
                            setPiecesPerBoxWarning(null);
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-gray-900 font-medium">{type}</span>
                      </label>
                    ))}
                  </div>
                  {formData.type === 'Other' && (
                    <input
                      type="text"
                      value={formData.customType}
                      onChange={(e) => setFormData(prev => ({ ...prev, customType: e.target.value }))}
                      placeholder="Enter custom type"
                      className="w-full mt-2 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  {errors.type && <p className="text-red-600 text-sm mt-1">{errors.type}</p>}
                </div>

                {/* SUBTYPE (Only for Floor) */}
                {needsSubType && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      SubType <span className="text-red-500">*</span>
                      {selectedProduct && <span className="text-xs text-gray-500 ml-2">(Read-only)</span>}
                    </label>
                    <select
                      value={formData.subType}
                      disabled={selectedProduct !== null}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          subType: e.target.value,
                          size: '',
                          piecesPerBox: ''
                        }));
                        setPiecesPerBoxWarning(null);
                      }}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition ${
                        selectedProduct ? 'bg-gray-50 cursor-not-allowed' : ''
                      } ${
                        errors.subType ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    >
                      <option value="">Select SubType</option>
                      {getSubTypeOptions().map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                    {errors.subType && <p className="text-red-600 text-sm mt-1">{errors.subType}</p>}
                  </div>
                )}
              </div>
              )}

              {/* ==================== SIZE ==================== */}
              {!duplicateProduct && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Size <span className="text-red-500">*</span>
                  {selectedProduct && <span className="text-xs text-gray-500 ml-2">(Read-only)</span>}
                </label>
                <select
                  value={formData.size}
                  disabled={selectedProduct !== null}
                  onChange={(e) => {
                    const size = e.target.value;
                    const finalType = formData.type === 'Other' ? formData.customType : formData.type;
                    const calculatedPiecesPerBox = getPiecesPerBox(size, finalType, formData.subType);
                    setFormData(prev => ({
                      ...prev,
                      size,
                      piecesPerBox: calculatedPiecesPerBox ? calculatedPiecesPerBox.toString() : ''
                    }));
                    setPiecesPerBoxWarning(null);
                  }}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition ${
                    selectedProduct ? 'bg-gray-50 cursor-not-allowed' : ''
                  } ${
                    errors.size ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                >
                  <option value="">Select Size</option>
                  {getSizeOptions().map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                {errors.size && <p className="text-red-600 text-sm mt-1">{errors.size}</p>}
              </div>
              )}

              {/* ==================== PIECES PER BOX ==================== */}
              {formData.size && !duplicateProduct && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Tiles Per Box
                    {selectedProduct && <span className="text-xs text-gray-500 ml-2">(Read-only)</span>}
                    {!selectedProduct && getPiecesPerBoxOptionsLocal().length > 1 && (
                      <span className="text-gray-600 text-xs font-normal ml-2">(Adjustable for this design)</span>
                    )}
                  </label>
                  <div className="flex gap-4 items-center">
                    {getPiecesPerBoxOptionsLocal().length > 1 && !selectedProduct ? (
                      <div className="flex gap-2">
                        {getPiecesPerBoxOptionsLocal().map(option => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, piecesPerBox: option.toString() }));
                              setPiecesPerBoxWarning(null);
                            }}
                            className={`px-4 py-2.5 rounded-lg font-semibold transition ${
                              formData.piecesPerBox === option.toString()
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="number"
                        value={formData.piecesPerBox}
                        disabled={selectedProduct !== null}
                        onChange={(e) => {
                          const enteredValue = e.target.value;
                          const finalType = formData.type === 'Other' ? formData.customType : formData.type;
                          const calculatedPiecesPerBox = getPiecesPerBox(formData.size, finalType, formData.subType);
                          
                          setFormData(prev => ({ ...prev, piecesPerBox: enteredValue }));
                          
                          // Validate if user-entered value differs from calculated value
                          if (enteredValue && calculatedPiecesPerBox && parseInt(enteredValue) !== calculatedPiecesPerBox) {
                            const options = getPiecesPerBoxOptions(formData.size, finalType, formData.subType);
                            if (options.length > 0 && !options.includes(parseInt(enteredValue))) {
                              setPiecesPerBoxWarning(`⚠️ Expected ${calculatedPiecesPerBox} pieces per box for ${finalType}${formData.subType ? ' ' + formData.subType : ''} ${formData.size}. Valid options: ${options.join(', ')}`);
                            } else {
                              setPiecesPerBoxWarning(null);
                            }
                          } else {
                            setPiecesPerBoxWarning(null);
                          }
                        }}
                        className={`px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-24 ${
                          selectedProduct ? 'bg-gray-50 cursor-not-allowed' : ''
                        }`}
                      />
                    )}
                    <span className="text-sm text-gray-600">
                      {defaultPiecesPerBox && `(Default: ${defaultPiecesPerBox})`}
                    </span>
                  </div>
                    {errors.piecesPerBox && <p className="text-red-600 text-sm mt-1">{errors.piecesPerBox}</p>}
                    {piecesPerBoxWarning && (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-sm">
                        {piecesPerBoxWarning}
                      </div>
                    )}
                  </div>
                )}
              </>
              )}

              {/* ==================== QUANTITY ==================== */}
              {!duplicateProduct && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">📦</span>
                    <h3 className="text-lg font-bold text-gray-900">
                      {selectedProduct ? 'Add to Existing Stock' : 'Initial Stock Quantity'}
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      {selectedProduct ? 'Add Boxes' : 'Quantity - Boxes'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.quantityBoxes}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantityBoxes: e.target.value }))}
                      placeholder="0"
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition ${
                        errors.quantityBoxes ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {errors.quantityBoxes && <p className="text-red-600 text-sm mt-1">{errors.quantityBoxes}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      {selectedProduct ? 'Add Pieces' : 'Quantity - Pieces'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.quantityPieces}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantityPieces: e.target.value }))}
                      placeholder="0"
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition ${
                        errors.quantityPieces ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {errors.quantityPieces && <p className="text-red-600 text-sm mt-1">{errors.quantityPieces}</p>}
                  </div>
                </div>
                {errors.quantity && <p className="text-red-600 text-sm mt-2">{errors.quantity}</p>}
              </div>
              )}

              {/* ==================== OPTIONAL FIELDS (Only for New Products) ==================== */}
              {!selectedProduct && !duplicateProduct && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information (Optional)</h3>

                {/* Description */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Product details, features, etc."
                    rows="3"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* HSN Number */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">HSN Number</label>
                  <select
                    value={formData.hsnNo}
                    onChange={(e) => setFormData(prev => ({ ...prev, hsnNo: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  >
                    <option value="">Select HSN Number</option>
                    {HSN_NUMBERS.map(hsn => (
                      <option key={hsn} value={hsn}>{hsn}</option>
                    ))}
                    <option value="other">Other</option>
                  </select>
                  {formData.hsnNo === 'other' && (
                    <input
                      type="text"
                      value={formData.customHsn}
                      onChange={(e) => setFormData(prev => ({ ...prev, customHsn: e.target.value }))}
                      placeholder="Enter HSN number"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>

                {/* Location */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Storage Location</label>
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  >
                    <option value="">Select Location</option>
                    {LOCATIONS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                    <option value="other">Other</option>
                  </select>
                  {formData.location === 'other' && (
                    <input
                      type="text"
                      value={formData.customLocation}
                      onChange={(e) => setFormData(prev => ({ ...prev, customLocation: e.target.value }))}
                      placeholder="Enter location"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>

                {/* 3D Link */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">3D View Link</label>
                  <input
                    type="url"
                    value={formData.link3D}
                    onChange={(e) => setFormData(prev => ({ ...prev, link3D: e.target.value }))}
                    placeholder="https://example.com/3d-view"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Images */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Product Images
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    Select images, choose which one is main, then click "Add Product" to upload and create
                  </p>
                  
                  {/* File input */}
                  <div className="mb-4">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageFileChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>

                  {/* Show selected image previews with main selector */}
                  {formData.imageFiles.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        Selected Images ({formData.imageFiles.length})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {formData.imageFiles.map((file, idx) => (
                          <div 
                            key={idx} 
                            className="relative group cursor-pointer"
                            onClick={() => handleSetMainImage(idx)}
                          >
                            <div className={`aspect-square rounded-lg overflow-hidden transition-all ${
                              idx === mainImageIndex 
                                ? 'border-4 border-blue-600 ring-2 ring-blue-300' 
                                : 'border-2 border-gray-300 hover:border-gray-400'
                            } bg-gray-100`}>
                              <img 
                                src={getImagePreviewUrl(file)} 
                                alt={`Preview ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            
                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeImageFile(idx);
                              }}
                              className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 text-lg font-bold shadow-lg"
                            >
                              ×
                            </button>
                            
                            {/* Main label */}
                            {idx === mainImageIndex && (
                              <div className="absolute top-2 left-2">
                                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded font-bold shadow-lg">
                                  MAIN
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* ==================== ACTION BUTTONS ==================== */}
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={loading || (duplicateProduct && mode === 'new')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing{formData.imageFiles.length > 0 ? ' & Uploading...' : '...'}</span>
                    </>
                  ) : (
                    selectedProduct ? '✓ Add Stock' : '✓ Create Product'
                  )}
                </button>

                {selectedProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setFormData({
                        productName: '',
                        type: '',
                        customType: '',
                        subType: '',
                        size: '',
                        piecesPerBox: '',
                        quantityBoxes: '',
                        quantityPieces: '',
                        description: '',
                        hsnNo: '',
                        customHsn: '',
                        link3D: '',
                        location: '',
                        customLocation: '',
                        images: [],
                        newImageUrl: '',
                      });
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold transition"
                  >
                    ➕ New Product
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => navigate('/stock/product-list')}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddProduct;
