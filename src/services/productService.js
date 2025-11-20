/**
 * Product API Service
 * Handles all product-related API calls
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL}/api`;

// =====================================================
// Product Service Functions
// =====================================================

export const productService = {
  // Get all products with filters
  async getAllProducts(filters = {}, pagination = {}) {
    try {
      const params = new URLSearchParams();
      
      if (pagination.page) params.append("page", pagination.page);
      if (pagination.limit) params.append("limit", pagination.limit);
      
      if (filters.search) params.append("q", filters.search);
      if (filters.type) params.append("type", filters.type);
      if (filters.size) params.append("size", filters.size);
      if (filters.inStockOnly) params.append("inStockOnly", filters.inStockOnly);
      
      const response = await fetch(`${API_BASE_URL}/products?${params}`);
      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();
      return data.products || [];
    } catch (error) {
      console.error("Error fetching products:", error);
      throw error;
    }
  },

  // Search products by name/type/size - returns array of products
  async searchProducts(query) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      return data.products || [];
    } catch (error) {
      console.error("Error searching products:", error);
      throw error;
    }
  },

  // Get single product details
  async getProduct(productId) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${productId}`);
      if (!response.ok) throw new Error("Failed to fetch product");
      const data = await response.json();
      return data.product;
    } catch (error) {
      console.error("Error fetching product:", error);
      throw error;
    }
  },

  // Create new product
  async createProduct(data) {
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create product");
      }
      
      const result = await response.json();
      return result.product;
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  },

  // Update existing product
  async updateProduct(productId, data) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update product");
      }
      
      const result = await response.json();
      return result.product;
    } catch (error) {
      console.error("Error updating product:", error);
      throw error;
    }
  },

  // Add stock to product
  async addStock(productId, boxes, pieces, notes) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${productId}/stock/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ boxes, pieces, notes })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add stock");
      }
      
      const result = await response.json();
      return result.product;
    } catch (error) {
      console.error("Error adding stock:", error);
      throw error;
    }
  },

  // Record sale
  async recordSale(productId, boxes, pieces, notes) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${productId}/stock/reduce`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ boxes, pieces, notes })
      });
      
      if (!response.ok) throw new Error("Failed to record sale");
      const result = await response.json();
      return result.product;
    } catch (error) {
      console.error("Error recording sale:", error);
      throw error;
    }
  },

  // Record damage
  async recordDamage(productId, boxes, pieces, damageType = "shop", notes) {
    try {
      const endpoint = damageType === "customer" 
        ? `${API_BASE_URL}/products/${productId}/stock/damage-exchange`
        : `${API_BASE_URL}/products/${productId}/stock/damage-shop`;
        
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(damageType === "customer" 
          ? { damageBoxes: boxes, damagePieces: pieces, notes }
          : { boxes, pieces, notes }
        )
      });
      
      if (!response.ok) throw new Error("Failed to record damage");
      const result = await response.json();
      return result.product;
    } catch (error) {
      console.error("Error recording damage:", error);
      throw error;
    }
  },

  // Record return
  async recordReturn(productId, boxes, pieces, notes) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${productId}/stock/return`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ boxes, pieces, notes })
      });
      
      if (!response.ok) throw new Error("Failed to record return");
      const result = await response.json();
      return result.product;
    } catch (error) {
      console.error("Error recording return:", error);
      throw error;
    }
  }
};

export default productService;

