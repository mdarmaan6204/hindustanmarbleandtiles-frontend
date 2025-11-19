import React, { useState, useEffect, useRef } from "react";
import { useToast } from "../components/Toast";
import DualUnitInput from "../components/DualUnitInput";
import productService from "../services/productService";
import {
  getPiecesPerBox,
  AVAILABLE_SIZES,
  TILE_TYPES,
  formatQuantityDisplay,
} from "../utils/inventory";

/**
 * AddProduct Page
 * Smart form that allows adding new products or adding stock to existing products
 * - User enters product name
 * - If match found in database, show it in dropdown to select
 * - If selected, pre-fill details and show quantity input only
 * - If not selected or no match, show all fields as empty for new product
 */
export default function AddProduct() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const searchTimeoutRef = useRef(null);

  // Form fields
  const [formData, setFormData] = useState({
    productName: "",
    type: "",
    subCategory: "",
    size: "",
    piecesPerBoxChoice: null, // For 1×2, user choice between 5 or 6
    description: "",
    images: [],
    varmora3DLink: "",
    stock: null, // { type: "boxes" | "pieces", boxes, pieces, totalPieces }
    costPerBox: "",
    supplier: "Varmora",
  });

  const [errors, setErrors] = useState({});

  // Handle product name input with auto-search
  const handleProductNameChange = (e) => {
    const name = e.target.value;
    setFormData((prev) => ({ ...prev, productName: name }));
    setSelectedProduct(null); // Clear selection when name changes
    setSearchResults([]);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (name.trim().length >= 2) {
      setSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await productService.searchProducts(name);
          setSearchResults(results || []);
        } catch (error) {
          console.error("Search error:", error);
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      }, 500); // Debounce 500ms
    }
  };

  // Handle selecting a product from search results
  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setFormData((prev) => ({
      ...prev,
      productName: product.productName,
      type: product.type,
      subCategory: product.subCategory,
      size: product.size,
      piecesPerBoxChoice: product.piecesPerBox,
      description: product.description || "",
      images: product.images || [],
      varmora3DLink: product.varmora3DLink || "",
      costPerBox: product.costPerBox || "",
      supplier: product.supplier || "Varmora",
      stock: null, // Reset stock input
    }));
    setSearchResults([]);
  };

  // Clear selected product
  const handleClearSelection = () => {
    setSelectedProduct(null);
    setFormData((prev) => ({
      ...prev,
      type: "",
      subCategory: "",
      size: "",
      piecesPerBoxChoice: null,
      description: "",
      images: [],
      varmora3DLink: "",
      costPerBox: "",
      supplier: "Varmora",
      stock: null,
    }));
    setErrors({});
  };

  // Handle size change - auto-set pieces per box
  const handleSizeChange = (e) => {
    const size = e.target.value;
    setFormData((prev) => ({
      ...prev,
      size,
      piecesPerBoxChoice: null, // Reset choice
    }));
  };

  // Handle 1×2 pieces per box choice
  const handlePiecesPerBoxChoice = (choice) => {
    setFormData((prev) => ({
      ...prev,
      piecesPerBoxChoice: choice,
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.productName.trim()) {
      newErrors.productName = "Product name is required";
    }
    if (!formData.type) {
      newErrors.type = "Type is required";
    }
    if (!formData.subCategory) {
      newErrors.subCategory = "Sub-category is required";
    }
    if (!formData.size) {
      newErrors.size = "Size is required";
    }

    // For 1×2, user must choose 5 or 6 pieces per box
    if (formData.size === "1×2" && !formData.piecesPerBoxChoice) {
      newErrors.piecesPerBoxChoice =
        "Select pieces per box for 1×2 tiles (5 or 6)";
    }

    if (!formData.stock) {
      newErrors.stock = "Stock quantity is required";
    }

    if (!formData.costPerBox || formData.costPerBox <= 0) {
      newErrors.costPerBox = "Cost per box must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast({
        message: "Please fill all required fields correctly",
        type: "error",
      });
      return;
    }

    setLoading(true);

    try {
      const piecesPerBox =
        formData.size === "1×2"
          ? formData.piecesPerBoxChoice
          : getPiecesPerBox(formData.size);

      const payload = {
        productName: formData.productName.trim(),
        type: formData.type,
        subCategory: formData.subCategory,
        size: formData.size,
        piecesPerBox,
        stock: {
          boxes: formData.stock.boxes,
          pieces: formData.stock.pieces,
        },
        description: formData.description,
        images: formData.images,
        varmora3DLink: formData.varmora3DLink,
        costPerBox: parseFloat(formData.costPerBox),
        supplier: formData.supplier,
      };

      // The backend's createProduct endpoint is smart:
      // - If product exists (same name+type+size), it adds to stock
      // - If product doesn't exist, it creates a new one
      const result = await productService.createProduct(payload);
      
      showToast({
        message: selectedProduct
          ? `✅ Stock added! ${formData.stock.boxes} bx + ${formData.stock.pieces} pc added to ${formData.productName}`
          : `✅ Product created! ${formData.productName} added to inventory`,
        type: "success",
        duration: 4000,
      });

      // Reset form
      setFormData({
        productName: "",
        type: "",
        subCategory: "",
        size: "",
        piecesPerBoxChoice: null,
        description: "",
        images: [],
        varmora3DLink: "",
        stock: null,
        costPerBox: "",
        supplier: "Varmora",
      });
      setSelectedProduct(null);
      setErrors({});
    } catch (error) {
      showToast({
        message: error.message || "Failed to save product",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const piecesPerBox = formData.size
    ? formData.size === "1×2"
      ? formData.piecesPerBoxChoice || 6
      : getPiecesPerBox(formData.size)
    : 1;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            📦 Add/Update Product
          </h1>
          <p className="mt-2 text-gray-600">
            {selectedProduct
              ? "Adding stock to existing product"
              : "Create a new product or add stock to existing"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* ========== PRODUCT NAME WITH SEARCH ========== */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Product Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.productName}
                onChange={handleProductNameChange}
                disabled={selectedProduct !== null}
                placeholder="Enter product name (e.g., 2×2 Glossy Tile)..."
                className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                  errors.productName
                    ? "border-red-500"
                    : selectedProduct
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300"
                }`}
              />

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  <div className="p-2">
                    <p className="text-xs text-gray-500 px-2 py-1 font-medium">
                      Found {searchResults.length} product(s):
                    </p>
                    {searchResults.map((product, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectProduct(product)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-100 rounded transition"
                      >
                        <div className="font-medium text-gray-900">
                          {product.productName}
                        </div>
                        <div className="text-xs text-gray-600">
                          {product.type} | {product.size} | {product.subCategory}
                        </div>
                        <div className="text-xs text-blue-600">
                          Current stock: {product.stock?.boxes || 0} bx +{" "}
                          {product.stock?.pieces || 0} pc
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {searching && (
                <div className="absolute right-3 top-3">
                  <span className="text-gray-400 text-sm">Searching...</span>
                </div>
              )}
            </div>
            {errors.productName && (
              <p className="text-red-600 text-sm">❌ {errors.productName}</p>
            )}

            {/* Selected Product Info */}
            {selectedProduct && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      ✅ Selected: {selectedProduct.productName}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Type: {selectedProduct.type} | Size: {selectedProduct.size}{" "}
                      | Current: {selectedProduct.stock?.boxes || 0} bx +{" "}
                      {selectedProduct.stock?.pieces || 0} pc
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-green-600 hover:text-green-800 font-bold text-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ========== TYPE ========== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, type: e.target.value }))
                }
                disabled={selectedProduct !== null}
                className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.type ? "border-red-500" : "border-gray-300"
                } ${selectedProduct ? "bg-gray-100" : ""}`}
              >
                <option value="">Select Type</option>
                {Object.keys(TILE_TYPES).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.type && (
                <p className="text-red-600 text-sm">❌ {errors.type}</p>
              )}
            </div>

            {/* ========== SUB-CATEGORY ========== */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Sub-Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.subCategory}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, subCategory: e.target.value }))
                }
                disabled={selectedProduct !== null || !formData.type}
                className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.subCategory ? "border-red-500" : "border-gray-300"
                } ${selectedProduct ? "bg-gray-100" : ""}`}
              >
                <option value="">Select Sub-Category</option>
                {formData.type &&
                  TILE_TYPES[formData.type]?.map((subCat) => (
                    <option key={subCat} value={subCat}>
                      {subCat}
                    </option>
                  ))}
              </select>
              {errors.subCategory && (
                <p className="text-red-600 text-sm">❌ {errors.subCategory}</p>
              )}
            </div>
          </div>

          {/* ========== SIZE ========== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Size <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.size}
                onChange={handleSizeChange}
                disabled={selectedProduct !== null}
                className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.size ? "border-red-500" : "border-gray-300"
                } ${selectedProduct ? "bg-gray-100" : ""}`}
              >
                <option value="">Select Size</option>
                {AVAILABLE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              {errors.size && (
                <p className="text-red-600 text-sm">❌ {errors.size}</p>
              )}
            </div>

            {/* ========== PIECES PER BOX CHOICE (For 1×2) ========== */}
            {formData.size === "1×2" && !selectedProduct && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Pieces per Box <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {[5, 6].map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => handlePiecesPerBoxChoice(choice)}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 font-medium transition ${
                        formData.piecesPerBoxChoice === choice
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      {choice} pcs/bx
                    </button>
                  ))}
                </div>
                {errors.piecesPerBoxChoice && (
                  <p className="text-red-600 text-sm">
                    ❌ {errors.piecesPerBoxChoice}
                  </p>
                )}
              </div>
            )}

            {/* Display PPB if selected product */}
            {selectedProduct && formData.size === "1×2" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Pieces per Box
                </label>
                <div className="px-4 py-2 bg-gray-100 rounded-lg border-2 border-gray-300">
                  <p className="font-medium text-gray-700">
                    {formData.piecesPerBoxChoice} pieces/box
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ========== STOCK QUANTITY ========== */}
          <DualUnitInput
            piecesPerBox={piecesPerBox}
            value={formData.stock?.totalPieces}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, stock: value }))
            }
            label={selectedProduct ? "Add Stock Quantity" : "Initial Stock Quantity"}
            required
            error={errors.stock}
            disabled={false}
          />

          {/* ========== COST PER BOX ========== */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Cost per Box (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="10"
              value={formData.costPerBox}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, costPerBox: e.target.value }))
              }
              placeholder="Enter cost per box..."
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.costPerBox ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.costPerBox && (
              <p className="text-red-600 text-sm">❌ {errors.costPerBox}</p>
            )}
          </div>

          {/* ========== DESCRIPTION (Only for new products) ========== */}
          {!selectedProduct && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Enter product description..."
                rows="3"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* ========== VARMORA 3D LINK (Only for new products) ========== */}
          {!selectedProduct && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Varmora 3D Link (Optional)
              </label>
              <input
                type="url"
                value={formData.varmora3DLink}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, varmora3DLink: e.target.value }))
                }
                placeholder="https://varmora.com/3d/..."
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* ========== SUPPLIER ========== */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Supplier
            </label>
            <input
              type="text"
              value={formData.supplier}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, supplier: e.target.value }))
              }
              placeholder="Supplier name..."
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* ========== SUBMIT BUTTON ========== */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Processing...
                </>
              ) : (
                <>
                  <span>✅</span>
                  {selectedProduct ? "Add Stock" : "Create Product"}
                </>
              )}
            </button>
            {selectedProduct && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                ❌ New Product
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
