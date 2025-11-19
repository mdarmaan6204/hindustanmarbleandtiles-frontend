import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
 * EditProduct Page - Update Product Information
 * Separate page for editing existing products (not for stock changes)
 */

function EditProduct() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchingProduct, setFetchingProduct] = useState(true);
  const [originalProduct, setOriginalProduct] = useState(null);

  const [formData, setFormData] = useState({
    productName: '',
    type: '',
    customType: '',
    subType: '',
    size: '',
    piecesPerBox: '',
    stockBoxes: '',
    stockPieces: '',
    salesBoxes: '',
    salesPieces: '',
    damageBoxes: '',
    damagePieces: '',
    returnsBoxes: '',
    returnsPieces: '',
    description: '',
    hsnNo: '',
    customHsn: '',
    link3D: '',
    location: '',
    customLocation: '',
    images: [],
    imageFiles: [], // New images to upload
  });

  const [errors, setErrors] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [mainImageIndex, setMainImageIndex] = useState(0); // Track main image index

  useEffect(() => {
    fetchProductForEdit();
  }, [productId]);

  // Fetch product data
  const fetchProductForEdit = async () => {
    try {
      setFetchingProduct(true);
      const response = await axios.get(`http://localhost:5000/api/products/${productId}`);
      const product = response.data.product || response.data;
      
      setOriginalProduct(product);
      setFormData({
        productName: product.productName || '',
        type: product.type || '',
        customType: '',
        subType: product.subType || '',
        size: product.size || '',
        piecesPerBox: product.piecesPerBox?.toString() || '',
        stockBoxes: product.stock?.boxes?.toString() || '0',
        stockPieces: product.stock?.pieces?.toString() || '0',
        salesBoxes: product.sales?.boxes?.toString() || '0',
        salesPieces: product.sales?.pieces?.toString() || '0',
        damageBoxes: product.damage?.boxes?.toString() || '0',
        damagePieces: product.damage?.pieces?.toString() || '0',
        returnsBoxes: product.returns?.boxes?.toString() || '0',
        returnsPieces: product.returns?.pieces?.toString() || '0',
        description: product.description || '',
        hsnNo: product.hsnNo || '',
        customHsn: '',
        link3D: product.link3D || '',
        location: product.location || '',
        customLocation: '',
        images: product.images || [],
        imageFiles: []
      });
    } catch (err) {
      console.error('Error fetching product:', err);
      showToast({ 
        message: 'Failed to load product for editing', 
        type: 'error' 
      });
      navigate('/stock/product-list');
    } finally {
      setFetchingProduct(false);
    }
  };

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

  // Remove new image file from preview
  const removeImageFile = (index) => {
    setFormData(prev => ({
      ...prev,
      imageFiles: prev.imageFiles.filter((_, i) => i !== index)
    }));
  };

  // Remove existing image
  const removeExistingImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    
    // Adjust mainImageIndex if necessary
    if (index === mainImageIndex) {
      setMainImageIndex(0);
    } else if (index < mainImageIndex) {
      setMainImageIndex(prev => prev - 1);
    }
  };

  // Set main image from existing images
  const handleSetMainImage = (index) => {
    setMainImageIndex(index);
  };

  // Get image preview URL
  const getImagePreviewUrl = (file) => {
    return URL.createObjectURL(file);
  };

  // Upload images to ImageKit
  const uploadImagesToImageKit = async (files) => {
    if (!files || files.length === 0) return [];
    
    const uploadedUrls = [];
    
    for (const file of files) {
      try {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        
        const response = await axios.post(
          'http://localhost:5000/api/upload',
          formDataUpload,
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
        }
      } catch (err) {
        console.error('Image upload error:', err);
      }
    }
    
    return uploadedUrls;
  };

  // Validation
  const validateForm = () => {
    const newErrors = {};
    const finalType = formData.type === 'Other' ? formData.customType : formData.type;

    if (!finalType.trim()) {
      newErrors.type = 'Type is required';
    }

    if (!formData.size.trim()) {
      newErrors.size = 'Size is required';
    }

    if (!formData.piecesPerBox || isNaN(formData.piecesPerBox)) {
      newErrors.piecesPerBox = 'Tiles per box must be numeric';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Generate product name
  const generateProductName = () => {
    const type = formData.type === 'Other' ? formData.customType : formData.type;
    const subType = formData.subType || '';
    const size = formData.size || '';
    
    return `${type}${subType ? ' ' + subType : ''} ${size}`.trim();
  };

  // Track what changed for history
  const getChanges = () => {
    const changes = [];
    
    if (formData.productName !== originalProduct.productName) {
      changes.push(`Name: "${originalProduct.productName}" → "${formData.productName}"`);
    }
    if (formData.type !== originalProduct.type) {
      changes.push(`Type: "${originalProduct.type}" → "${formData.type}"`);
    }
    if (formData.subType !== originalProduct.subType) {
      changes.push(`SubType: "${originalProduct.subType || 'None'}" → "${formData.subType || 'None'}"`);
    }
    if (formData.size !== originalProduct.size) {
      changes.push(`Size: "${originalProduct.size}" → "${formData.size}"`);
    }
    if (parseInt(formData.piecesPerBox) !== originalProduct.piecesPerBox) {
      changes.push(`Tiles/Box: ${originalProduct.piecesPerBox} → ${formData.piecesPerBox}`);
    }
    
    // Check quantity changes
    if (parseInt(formData.stockBoxes) !== (originalProduct.stock?.boxes || 0) || 
        parseInt(formData.stockPieces) !== (originalProduct.stock?.pieces || 0)) {
      changes.push(`Stock: ${originalProduct.stock?.boxes || 0} bx, ${originalProduct.stock?.pieces || 0} pc → ${formData.stockBoxes} bx, ${formData.stockPieces} pc`);
    }
    if (parseInt(formData.salesBoxes) !== (originalProduct.sales?.boxes || 0) || 
        parseInt(formData.salesPieces) !== (originalProduct.sales?.pieces || 0)) {
      changes.push(`Sales: ${originalProduct.sales?.boxes || 0} bx, ${originalProduct.sales?.pieces || 0} pc → ${formData.salesBoxes} bx, ${formData.salesPieces} pc`);
    }
    if (parseInt(formData.damageBoxes) !== (originalProduct.damage?.boxes || 0) || 
        parseInt(formData.damagePieces) !== (originalProduct.damage?.pieces || 0)) {
      changes.push(`Damage: ${originalProduct.damage?.boxes || 0} bx, ${originalProduct.damage?.pieces || 0} pc → ${formData.damageBoxes} bx, ${formData.damagePieces} pc`);
    }
    if (parseInt(formData.returnsBoxes) !== (originalProduct.returns?.boxes || 0) || 
        parseInt(formData.returnsPieces) !== (originalProduct.returns?.pieces || 0)) {
      changes.push(`Returns: ${originalProduct.returns?.boxes || 0} bx, ${originalProduct.returns?.pieces || 0} pc → ${formData.returnsBoxes} bx, ${formData.returnsPieces} pc`);
    }
    
    if (formData.description !== originalProduct.description) {
      changes.push(`Description updated`);
    }
    if (formData.hsnNo !== originalProduct.hsnNo) {
      changes.push(`HSN: "${originalProduct.hsnNo || 'None'}" → "${formData.hsnNo || 'None'}"`);
    }
    if (formData.link3D !== originalProduct.link3D) {
      changes.push(`3D Link updated`);
    }
    if (formData.location !== originalProduct.location) {
      changes.push(`Location: "${originalProduct.location || 'None'}" → "${formData.location || 'None'}"`);
    }
    
    return changes;
  };
  
  // Check if a field has changed (for highlighting)
  const isFieldChanged = (fieldName) => {
    if (!originalProduct) return false;
    
    switch(fieldName) {
      case 'productName':
        return formData.productName !== originalProduct.productName;
      case 'type':
        return formData.type !== originalProduct.type;
      case 'subType':
        return formData.subType !== (originalProduct.subType || '');
      case 'size':
        return formData.size !== originalProduct.size;
      case 'piecesPerBox':
        return parseInt(formData.piecesPerBox) !== originalProduct.piecesPerBox;
      case 'stockBoxes':
        return parseInt(formData.stockBoxes) !== (originalProduct.stock?.boxes || 0);
      case 'stockPieces':
        return parseInt(formData.stockPieces) !== (originalProduct.stock?.pieces || 0);
      case 'salesBoxes':
        return parseInt(formData.salesBoxes) !== (originalProduct.sales?.boxes || 0);
      case 'salesPieces':
        return parseInt(formData.salesPieces) !== (originalProduct.sales?.pieces || 0);
      case 'damageBoxes':
        return parseInt(formData.damageBoxes) !== (originalProduct.damage?.boxes || 0);
      case 'damagePieces':
        return parseInt(formData.damagePieces) !== (originalProduct.damage?.pieces || 0);
      case 'returnsBoxes':
        return parseInt(formData.returnsBoxes) !== (originalProduct.returns?.boxes || 0);
      case 'returnsPieces':
        return parseInt(formData.returnsPieces) !== (originalProduct.returns?.pieces || 0);
      case 'description':
        return formData.description !== (originalProduct.description || '');
      case 'hsnNo':
        return formData.hsnNo !== (originalProduct.hsnNo || '');
      case 'link3D':
        return formData.link3D !== (originalProduct.link3D || '');
      case 'location':
        return formData.location !== (originalProduct.location || '');
      default:
        return false;
    }
  };

  // Handle form submission - show confirmation first
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast({ message: 'Please fix validation errors', type: 'error' });
      return;
    }
    
    // Show confirmation modal with changes
    setShowConfirmModal(true);
  };
  
  // Actually perform the update after confirmation
  const performUpdate = async () => {
    setShowConfirmModal(false);
    setLoading(true);

    try {
      // Upload new images
      let newImageUrls = [];
      if (formData.imageFiles.length > 0) {
        newImageUrls = await uploadImagesToImageKit(formData.imageFiles);
      }

      // Combine existing and new images
      let allImages = [...formData.images, ...newImageUrls];
      
      // Reorder: Move main image to index 0
      if (mainImageIndex > 0 && mainImageIndex < allImages.length) {
        const mainImage = allImages.splice(mainImageIndex, 1)[0];
        allImages.unshift(mainImage);
      }

      // Auto-generate product name if empty
      const productName = formData.productName.trim() || generateProductName();

      // Get final values
      const finalType = formData.type === 'Other' ? formData.customType : formData.type;
      const finalHsn = formData.hsnNo === 'Other' ? formData.customHsn : formData.hsnNo;
      const finalLocation = formData.location === 'Other' ? formData.customLocation : formData.location;

      // Track changes for history
      const changes = getChanges();
      const changeNotes = changes.length > 0 ? changes.join('; ') : 'Product information updated';

      // Prepare update payload
      const updateData = {
        productName,
        type: finalType,
        subType: formData.subType,
        size: formData.size,
        piecesPerBox: parseInt(formData.piecesPerBox),
        stock: {
          boxes: parseInt(formData.stockBoxes) || 0,
          pieces: parseInt(formData.stockPieces) || 0
        },
        sales: {
          boxes: parseInt(formData.salesBoxes) || 0,
          pieces: parseInt(formData.salesPieces) || 0
        },
        damage: {
          boxes: parseInt(formData.damageBoxes) || 0,
          pieces: parseInt(formData.damagePieces) || 0
        },
        returns: {
          boxes: parseInt(formData.returnsBoxes) || 0,
          pieces: parseInt(formData.returnsPieces) || 0
        },
        description: formData.description,
        hsnNo: finalHsn,
        link3D: formData.link3D,
        location: finalLocation,
        images: allImages,
        updateNotes: changeNotes // Send change notes for history
      };

      // Call update endpoint
      const response = await axios.put(
        `http://localhost:5000/api/products/${productId}`,
        updateData
      );

      showToast({ 
        message: `${productName} updated successfully`, 
        type: 'success' 
      });

      // Redirect to product detail page
      setTimeout(() => {
        navigate(`/stock/product/${productId}`);
      }, 1500);

    } catch (err) {
      console.error('Error updating product:', err);
      showToast({ 
        message: err.response?.data?.message || 'Failed to update product', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingProduct) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-64 min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Loading product...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900">✏️ Edit Product</h1>
            <p className="text-gray-600 mt-2">
              Update product information for: <strong>{originalProduct?.productName}</strong>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
            <div className="space-y-8">
              
              {/* Product Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Product Name (Optional - Auto-generated)
                  {isFieldChanged('productName') && <span className="ml-2 text-xs text-orange-600 font-bold">✏️ CHANGED</span>}
                </label>
                <input
                  type="text"
                  value={formData.productName}
                  onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                  placeholder="Leave empty to auto-generate"
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isFieldChanged('productName') ? 'bg-yellow-50' : ''
                  }`}
                />
                <p className="text-xs text-gray-500 mt-1">If left empty, name will be generated from Type, SubType, and Size</p>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Type <span className="text-red-500">*</span>
                  {isFieldChanged('type') && <span className="ml-2 text-xs text-orange-600 font-bold">✏️ CHANGED</span>}
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({ 
                      ...prev, 
                      type: value,
                      subType: '', // Reset subtype when type changes
                      size: '',
                      piecesPerBox: value !== 'Other' ? getPiecesPerBox(value) : ''
                    }));
                  }}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition ${
                    errors.type ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  } ${isFieldChanged('type') ? 'bg-yellow-50' : ''}`}
                >
                  <option value="">Select Type</option>
                  {Object.keys(TILE_TYPES).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                  <option value="Other">Other (Custom)</option>
                </select>
                {errors.type && <p className="text-red-600 text-sm mt-1">{errors.type}</p>}
              </div>

              {/* Custom Type */}
              {formData.type === 'Other' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Custom Type <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.customType}
                    onChange={(e) => setFormData(prev => ({ ...prev, customType: e.target.value }))}
                    placeholder="Enter custom type"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* SubType */}
              {formData.type && formData.type !== 'Other' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    SubType (Optional)
                    {isFieldChanged('subType') && <span className="ml-2 text-xs text-orange-600 font-bold">✏️ CHANGED</span>}
                  </label>
                  <select
                    value={formData.subType}
                    onChange={(e) => setFormData(prev => ({ ...prev, subType: e.target.value }))}
                    className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isFieldChanged('subType') ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <option value="">Select SubType (Optional)</option>
                    {TILE_TYPES[formData.type]?.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Size */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Size <span className="text-red-500">*</span>
                  {isFieldChanged('size') && <span className="ml-2 text-xs text-orange-600 font-bold">✏️ CHANGED</span>}
                </label>
                <select
                  value={formData.size}
                  onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition ${
                    errors.size ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  } ${isFieldChanged('size') ? 'bg-yellow-50' : ''}`}
                  disabled={!formData.type}
                >
                  <option value="">Select Size</option>
                  {formData.type && formData.type !== 'Other' && getAvailableSizes(formData.type, formData.subType).map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                  {formData.type === 'Other' && (
                    <>
                      <option value="2×2">2×2</option>
                      <option value="2×4">2×4</option>
                      <option value="Custom">Custom</option>
                    </>
                  )}
                </select>
                {errors.size && <p className="text-red-600 text-sm mt-1">{errors.size}</p>}
              </div>

              {/* Tiles Per Box */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Tiles Per Box <span className="text-red-500">*</span>
                  {isFieldChanged('piecesPerBox') && <span className="ml-2 text-xs text-orange-600 font-bold">✏️ CHANGED</span>}
                </label>
                <select
                  value={formData.piecesPerBox}
                  onChange={(e) => setFormData(prev => ({ ...prev, piecesPerBox: e.target.value }))}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition ${
                    errors.piecesPerBox ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  } ${isFieldChanged('piecesPerBox') ? 'bg-yellow-50' : ''}`}
                >
                  <option value="">Select Tiles Per Box</option>
                  {formData.size && getPiecesPerBoxOptions(formData.size).map(count => (
                    <option key={count} value={count}>{count}</option>
                  ))}
                </select>
                {errors.piecesPerBox && <p className="text-red-600 text-sm mt-1">{errors.piecesPerBox}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Description
                  {isFieldChanged('description') && <span className="ml-2 text-xs text-orange-600 font-bold">✏️ CHANGED</span>}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Product details, features, etc."
                  rows="3"
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isFieldChanged('description') ? 'bg-yellow-50' : ''
                  }`}
                />
              </div>

              {/* HSN Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  HSN Number
                  {isFieldChanged('hsnNo') && <span className="ml-2 text-xs text-orange-600 font-bold">✏️ CHANGED</span>}
                </label>
                <select
                  value={formData.hsnNo}
                  onChange={(e) => setFormData(prev => ({ ...prev, hsnNo: e.target.value }))}
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isFieldChanged('hsnNo') ? 'bg-yellow-50' : ''
                  }`}
                >
                  <option value="">Select HSN</option>
                  {HSN_NUMBERS.map(hsn => (
                    <option key={hsn} value={hsn}>{hsn}</option>
                  ))}
                  <option value="Other">Other (Custom)</option>
                </select>
              </div>

              {formData.hsnNo === 'Other' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Custom HSN Number</label>
                  <input
                    type="text"
                    value={formData.customHsn}
                    onChange={(e) => setFormData(prev => ({ ...prev, customHsn: e.target.value }))}
                    placeholder="Enter custom HSN"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* 3D Link */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  3D View Link
                  {isFieldChanged('link3D') && <span className="ml-2 text-xs text-orange-600 font-bold">✏️ CHANGED</span>}
                </label>
                <input
                  type="url"
                  value={formData.link3D}
                  onChange={(e) => setFormData(prev => ({ ...prev, link3D: e.target.value }))}
                  placeholder="https://example.com/3d-view"
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isFieldChanged('link3D') ? 'bg-yellow-50' : ''
                  }`}
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Storage Location
                  {isFieldChanged('location') && <span className="ml-2 text-xs text-orange-600 font-bold">✏️ CHANGED</span>}
                </label>
                <select
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isFieldChanged('location') ? 'bg-yellow-50' : ''
                  }`}
                >
                  <option value="">Select Location</option>
                  {LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                  <option value="Other">Other (Custom)</option>
                </select>
              </div>

              {formData.location === 'Other' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Custom Location</label>
                  <input
                    type="text"
                    value={formData.customLocation}
                    onChange={(e) => setFormData(prev => ({ ...prev, customLocation: e.target.value }))}
                    placeholder="Enter custom location"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Quantity Management Section */}
              <div className="border-2 border-purple-200 rounded-lg p-6 bg-purple-50">
                <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                  📊 Quantity Management
                </h3>
                <p className="text-sm text-purple-700 mb-4">Update stock quantities directly from here.</p>
                
                <div className="grid grid-cols-2 gap-6">
                  {/* Stock */}
                  <div className="bg-white p-4 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      📦 Stock
                      {(isFieldChanged('stockBoxes') || isFieldChanged('stockPieces')) && 
                        <span className="text-xs text-orange-600 font-bold">✏️ CHANGED</span>}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Boxes</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.stockBoxes}
                          onChange={(e) => setFormData(prev => ({ ...prev, stockBoxes: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            isFieldChanged('stockBoxes') ? 'bg-yellow-50 border-orange-300' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Pieces</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.stockPieces}
                          onChange={(e) => setFormData(prev => ({ ...prev, stockPieces: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            isFieldChanged('stockPieces') ? 'bg-yellow-50 border-orange-300' : 'border-gray-300'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sales */}
                  <div className="bg-white p-4 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      💰 Sales
                      {(isFieldChanged('salesBoxes') || isFieldChanged('salesPieces')) && 
                        <span className="text-xs text-orange-600 font-bold">✏️ CHANGED</span>}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Boxes</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.salesBoxes}
                          onChange={(e) => setFormData(prev => ({ ...prev, salesBoxes: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            isFieldChanged('salesBoxes') ? 'bg-yellow-50 border-orange-300' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Pieces</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.salesPieces}
                          onChange={(e) => setFormData(prev => ({ ...prev, salesPieces: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            isFieldChanged('salesPieces') ? 'bg-yellow-50 border-orange-300' : 'border-gray-300'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Damage */}
                  <div className="bg-white p-4 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      ⚠️ Damage
                      {(isFieldChanged('damageBoxes') || isFieldChanged('damagePieces')) && 
                        <span className="text-xs text-orange-600 font-bold">✏️ CHANGED</span>}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Boxes</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.damageBoxes}
                          onChange={(e) => setFormData(prev => ({ ...prev, damageBoxes: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            isFieldChanged('damageBoxes') ? 'bg-yellow-50 border-orange-300' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Pieces</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.damagePieces}
                          onChange={(e) => setFormData(prev => ({ ...prev, damagePieces: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            isFieldChanged('damagePieces') ? 'bg-yellow-50 border-orange-300' : 'border-gray-300'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Returns */}
                  <div className="bg-white p-4 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      🔄 Returns
                      {(isFieldChanged('returnsBoxes') || isFieldChanged('returnsPieces')) && 
                        <span className="text-xs text-orange-600 font-bold">✏️ CHANGED</span>}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Boxes</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.returnsBoxes}
                          onChange={(e) => setFormData(prev => ({ ...prev, returnsBoxes: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            isFieldChanged('returnsBoxes') ? 'bg-yellow-50 border-orange-300' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Pieces</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.returnsPieces}
                          onChange={(e) => setFormData(prev => ({ ...prev, returnsPieces: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            isFieldChanged('returnsPieces') ? 'bg-yellow-50 border-orange-300' : 'border-gray-300'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Product Images</label>
                
                {/* Existing Images */}
                {formData.images.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Existing Images (Click to set as main):</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {formData.images.map((img, idx) => (
                        <div 
                          key={idx} 
                          className="relative group cursor-pointer"
                          onClick={() => handleSetMainImage(idx)}
                        >
                          <div className={`aspect-square rounded-lg overflow-hidden transition-all ${
                            idx === mainImageIndex 
                              ? 'border-4 border-blue-600 ring-2 ring-blue-300' 
                              : 'border-2 border-gray-300 hover:border-gray-400'
                          }`}>
                            <img 
                              src={img} 
                              alt={`Product ${idx + 1}`} 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeExistingImage(idx);
                            }}
                            className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 text-lg font-bold shadow-lg"
                          >
                            ×
                          </button>
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

                {/* New Images */}
                {formData.imageFiles.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">New Images to Upload:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {formData.imageFiles.map((file, idx) => (
                        <div key={idx} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden border-2 border-green-300">
                            <img 
                              src={getImagePreviewUrl(file)} 
                              alt={`New ${idx + 1}`} 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImageFile(idx)}
                            className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 text-lg font-bold shadow-lg"
                          >
                            ×
                          </button>
                          <span className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded font-bold shadow-lg">
                            NEW
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Button */}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageFileChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">You can select multiple images</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition"
                >
                  {loading ? 'Updating...' : '✓ Update Product'}
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/stock/product/${productId}`)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-lg flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">⚠️ Confirm Update</h2>
                <p className="text-blue-100 mt-2">Review changes before updating</p>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-white hover:text-blue-100 text-3xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              {/* Product Name */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Product:</h3>
                <p className="text-xl font-bold text-blue-600">
                  {formData.productName || generateProductName()}
                </p>
              </div>
              
              {/* Changes List */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Changes to be made:</h3>
                {getChanges().length > 0 ? (
                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                    <ul className="space-y-2">
                      {getChanges().map((change, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className="text-orange-600 font-bold">→</span>
                          <span className="text-gray-800">{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-gray-600 italic">No changes detected</p>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={performUpdate}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition text-lg"
                >
                  {loading ? '⏳ Updating...' : '✓ Confirm & Update'}
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={loading}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-800 py-3 rounded-lg font-semibold transition text-lg"
                >
                  ✕ Cancel
                </button>
              </div>
              
              <p className="text-xs text-gray-500 mt-4 text-center">
                Click Cancel to return and make corrections
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditProduct;
