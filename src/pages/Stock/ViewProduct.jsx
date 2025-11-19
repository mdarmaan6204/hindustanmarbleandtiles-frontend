import React, { useState, useEffect } from 'react';
import { Sidebar } from '../../components/Layout/Sidebar';
import { Header } from '../../components/Layout/Header';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

/**
 * View Product Page - MongoDB Integration with Pagination
 * Fetches products from MongoDB and displays them
 * 10 products per page with pagination
 * Smaller image thumbnails that link to detailed product view
 */

function ViewProduct() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 10;

  // Calculate available stock
  const calculateAvailable = (product) => {
    if (!product) return { boxes: 0, pieces: 0 };

    const stock = product.stock || { boxes: 0, pieces: 0 };
    const sales = product.sales || { boxes: 0, pieces: 0 };
    const damage = product.damage || { boxes: 0, pieces: 0 };
    const returns = product.returns || { boxes: 0, pieces: 0 };
    const piecesPerBox = product.piecesPerBox || 1;

    // Convert everything to pieces for calculation
    const stockPieces = (stock.boxes * piecesPerBox) + stock.pieces;
    const salesPieces = (sales.boxes * piecesPerBox) + sales.pieces;
    const damagePieces = (damage.boxes * piecesPerBox) + damage.pieces;
    const returnsPieces = (returns.boxes * piecesPerBox) + returns.pieces;

    // Calculate: Stock - Sales - Damage + Returns
    const availablePieces = Math.max(0, stockPieces - salesPieces - damagePieces + returnsPieces);
    const boxes = Math.floor(availablePieces / piecesPerBox);
    const pieces = availablePieces % piecesPerBox;

    return { boxes, pieces };
  };

  const formatQty = (boxes, pieces) => {
    if (boxes === 0 && pieces === 0) return '0';
    if (boxes === 0) return `${pieces} pc`;
    if (pieces === 0) return `${boxes} bx`;
    return `${boxes} bx, ${pieces} pc`;
  };

  // Fetch products from MongoDB
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setPageLoading(true);
        const response = await fetch('http://localhost:5000/api/products', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const data = await response.json();
        setProducts(data.products || []);
        setError('');
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products from MongoDB. Make sure backend is running.');
        setProducts([]);
      } finally {
        setPageLoading(false);
      }
    };

    if (!loading && user) {
      fetchProducts();
    }
  }, [user, loading]);

  // Auth check
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-lg">Loading...</div>;
  }

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Filter products by search term
  const filteredProducts = products.filter(p =>
    p.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const handleProductClick = (productId) => {
    navigate(`/stock/product/${productId}`);
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header user={user} onLogout={handleLogout} />
        <main className="p-6 bg-gray-100 min-h-[calc(100vh-80px)]">
          <div className="max-w-6xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h2 className="text-4xl font-bold text-gray-800 mb-2">👁️ View Product</h2>
              <p className="text-gray-600">Fetching products from MongoDB database</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg border-l-4 border-red-600">
                ⚠️ {error}
              </div>
            )}

            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search products by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 text-lg"
              />
            </div>

            {/* Loading State */}
            {pageLoading && (
              <div className="text-center py-12 bg-white rounded-lg">
                <div className="inline-block text-2xl animate-bounce">⏳</div>
                <p className="text-gray-600 font-semibold mt-2">Loading products from MongoDB...</p>
              </div>
            )}

            {/* Info */}
            <div className="mb-4 text-sm text-gray-600">
              Showing <strong>{currentProducts.length > 0 ? startIndex + 1 : 0}-{endIndex > filteredProducts.length ? filteredProducts.length : endIndex}</strong> of <strong>{filteredProducts.length}</strong> products
            </div>

            {/* Product Grid - Smaller Icons */}
            {!pageLoading && filteredProducts.length > 0 ? (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                  {currentProducts.map((product) => (
                    <div
                      key={product._id}
                      onClick={() => handleProductClick(product._id)}
                      className="bg-white rounded-lg shadow-md hover:shadow-xl transition cursor-pointer overflow-hidden border-2 border-gray-200 hover:border-blue-600"
                    >
                      {/* Small Product Image */}
                      <div className="h-32 bg-gray-100 overflow-hidden flex items-center justify-center">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.productName}
                            className="h-full w-full object-contain hover:scale-110 transition duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
                            📷
                          </div>
                        )}
                      </div>

                      {/* Product Info - Compact */}
                      <div className="p-3">
                        <h3 className="text-sm font-bold text-gray-800 truncate">{product.productName}</h3>
                        <div className="space-y-1 text-xs text-gray-600 mt-1">
                          <p>📦 {product.type}</p>
                          {product.size && <p>📐 {product.size}</p>}
                          <p className="text-green-700 font-semibold">
                            � {formatQty(calculateAvailable(product).boxes, calculateAvailable(product).pieces)}
                          </p>
                          {product.images && product.images.length > 1 && (
                            <p>🖼️ {product.images.length} images</p>
                          )}
                        </div>
                        <button className="w-full mt-2 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition font-semibold">
                          View →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mb-8">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      ← Previous
                    </button>

                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 rounded-lg transition font-semibold ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            ) : !pageLoading && filteredProducts.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg">
                <div className="text-4xl mb-2">{products.length === 0 ? '📦' : '🔍'}</div>
                <p className="text-gray-600 font-semibold">
                  {products.length === 0 ? 'No products in MongoDB yet. Add some from "Add Product" page.' : 'No products match your search'}
                </p>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

export default ViewProduct;
