import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '../../components/Layout/Sidebar';
import { useToast } from '../../components/Toast';
import { productAPI } from '../../services/api.js';

/**
 * ProductDetail Page - View Product Information
 * Display product details with image gallery and action buttons
 */

function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mainImage, setMainImage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProductDetail();
  }, [productId]);

  const fetchProductDetail = async () => {
    try {
      const response = await productAPI.getById(productId);
      const productData = response.data.product || response.data;
      setProduct(productData);
      
      // Set first image as main image
      if (productData.images && productData.images.length > 0) {
        setMainImage(productData.images[0]);
      }
    } catch (err) {
      console.error('Error fetching product:', err);
      showToast({ message: 'Failed to load product details', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Normalize pieces to boxes+pieces format
  const normalizePieces = (pieces, piecesPerBox) => {
    if (!pieces || pieces < piecesPerBox) {
      return { boxes: 0, pieces: pieces || 0 };
    }
    const boxes = Math.floor(pieces / piecesPerBox);
    const remainingPieces = pieces % piecesPerBox;
    return { boxes, pieces: remainingPieces };
  };

  // Calculate available stock (Stock - Sales - Damage + Returns)
  const calculateAvailable = () => {
    if (!product) return { boxes: 0, pieces: 0 };

    const stock = product.stock || { boxes: 0, pieces: 0 };
    const sales = product.sales || { boxes: 0, pieces: 0 };
    const damage = product.damage || { boxes: 0, pieces: 0 };
    const returns = product.returns || { boxes: 0, pieces: 0 };
    const piecesPerBox = product.piecesPerBox || 4;

    // Convert everything to pieces for calculation
    const stockPieces = (stock.boxes * piecesPerBox) + stock.pieces;
    const salesPieces = (sales.boxes * piecesPerBox) + sales.pieces;
    const damagePieces = (damage.boxes * piecesPerBox) + damage.pieces;
    const returnsPieces = (returns.boxes * piecesPerBox) + returns.pieces;

    // Calculate: Stock - Sales - Damage + Returns
    const availablePieces = stockPieces - salesPieces - damagePieces + returnsPieces;

    // Normalize back to boxes + pieces
    return normalizePieces(Math.max(0, availablePieces), piecesPerBox);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await productAPI.delete(productId);
      showToast({ 
        message: `${product.productName} deleted successfully`, 
        type: 'success' 
      });
      setTimeout(() => navigate('/stock/product-list'), 1500);
    } catch (err) {
      console.error('Error deleting product:', err);
      showToast({ 
        message: 'Failed to delete product', 
        type: 'error' 
      });
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const formatQty = (boxes, pieces) => {
    if (boxes === 0 && pieces === 0) return '0';
    if (boxes === 0) return `${pieces} pc`;
    if (pieces === 0) return `${boxes} bx`;
    return `${boxes} bx, ${pieces} pc`;
  };

  if (loading) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-64 min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Loading product details...</p>
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

  const available = calculateAvailable();

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header with Back Button */}
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-4xl font-bold text-gray-900">{product.productName}</h1>
            <button
              onClick={() => navigate('/stock/product-list')}
              className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 font-semibold transition"
            >
              ← Back to List
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-5 gap-4 mb-8">
            {/* Stock Card */}
            <div className="bg-white rounded-lg shadow-md border-2 border-blue-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">📦</span>
                <h3 className="text-sm font-semibold text-gray-600 uppercase">Stock</h3>
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {formatQty(product.stock?.boxes || 0, product.stock?.pieces || 0)}
              </p>
            </div>

            {/* Sales Card */}
            <div className="bg-white rounded-lg shadow-md border-2 border-green-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">💰</span>
                <h3 className="text-sm font-semibold text-gray-600 uppercase">Sales</h3>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {formatQty(product.sales?.boxes || 0, product.sales?.pieces || 0)}
              </p>
            </div>

            {/* Damage Card */}
            <div className="bg-white rounded-lg shadow-md border-2 border-red-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">⚠️</span>
                <h3 className="text-sm font-semibold text-gray-600 uppercase">Damage</h3>
              </div>
              <p className="text-3xl font-bold text-red-600">
                {formatQty(product.damage?.boxes || 0, product.damage?.pieces || 0)}
              </p>
            </div>

            {/* Returns Card */}
            <div className="bg-white rounded-lg shadow-md border-2 border-yellow-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">🔄</span>
                <h3 className="text-sm font-semibold text-gray-600 uppercase">Returns</h3>
              </div>
              <p className="text-3xl font-bold text-yellow-600">
                {formatQty(product.returns?.boxes || 0, product.returns?.pieces || 0)}
              </p>
            </div>

            {/* Available Card */}
            <div className="bg-white rounded-lg shadow-md border-2 border-purple-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">✅</span>
                <h3 className="text-sm font-semibold text-gray-600 uppercase">Available</h3>
              </div>
              <p className="text-3xl font-bold text-purple-600">
                {formatQty(available.boxes, available.pieces)}
              </p>
            </div>
          </div>

          {/* Main Content Grid: Image Gallery + Product Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Image Gallery */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🖼️ Product Images</h2>
              
              {/* Main Image */}
              <div className="w-full aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300 mb-4">
                {mainImage ? (
                  <img 
                    src={mainImage} 
                    alt={product.productName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <svg className="w-24 h-24 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-lg font-semibold">No Image Available</p>
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {product.images && product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setMainImage(img)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition hover:border-blue-500 ${
                        mainImage === img ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300'
                      }`}
                    >
                      <img 
                        src={img} 
                        alt={`${product.productName} ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">📋 Product Information</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Type</p>
                    <p className="text-lg font-semibold text-gray-900">{product.type || '-'}</p>
                  </div>
                  {product.subType && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">SubType</p>
                      <p className="text-lg font-semibold text-gray-900">{product.subType}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Size</p>
                    <p className="text-lg font-semibold text-gray-900">{product.size || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Tiles Per Box</p>
                    <p className="text-lg font-semibold text-gray-900">{product.piecesPerBox || '-'}</p>
                  </div>
                </div>

                {product.description && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Description</p>
                    <p className="text-base text-gray-900">{product.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {product.hsnNo && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">HSN Number</p>
                      <p className="text-base text-gray-900">{product.hsnNo}</p>
                    </div>
                  )}
                  {product.location && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Storage Location</p>
                      <p className="text-base text-gray-900">{product.location}</p>
                    </div>
                  )}
                </div>

                {product.link3D && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">3D View Link</p>
                    <a 
                      href={product.link3D} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      View 3D Model →
                    </a>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Date Added</p>
                  <p className="text-base text-gray-900">
                    {new Date(product.createdAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center mb-8">
            <button
              onClick={() => navigate(`/stock/add-product?edit=${productId}`)}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-semibold transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Product
            </button>

            <button
              onClick={() => navigate(`/stock/product/${productId}/history`)}
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-semibold transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View History
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 font-semibold transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Product
            </button>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Confirm Delete</h3>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
                  >
                    ×
                  </button>
                </div>
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete <strong>{product.productName}</strong>? This action cannot be undone.
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
                    onClick={() => setShowDeleteModal(false)}
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
      </div>
    </div>
  );
}

export default ProductDetail;
