import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { invoiceAPI, customerAPI, productAPI } from '../../services/api.js';
import { Sidebar } from '../../components/Layout/Sidebar';
import { useToast } from '../../components/Toast';

/**
 * Edit Invoice Page
 * Allows editing of existing invoices - modify items, quantities, prices, customer details, etc.
 */

function EditInvoice() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showToast } = useToast();
  const searchTimeoutRef = useRef(null);

  // Loading state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Invoice details
  const [invoice, setInvoice] = useState(null);
  const [invoiceType, setInvoiceType] = useState('NON_GST');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // Customer data
  const [customers, setCustomers] = useState([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    gstNumber: ''
  });

  // Products data
  const [products, setProducts] = useState([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [showCustomProductForm, setShowCustomProductForm] = useState(false);
  const [customProductData, setCustomProductData] = useState({
    productName: '',
    quantity: '',
    pricePerPiece: ''
  });

  // Invoice items
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [lastPurchaseMap, setLastPurchaseMap] = useState({}); // Map productId -> {boxes, pieces}

  // Financial calculations
  const [subtotal, setSubtotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [totalTax, setTotalTax] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [roundOff, setRoundOff] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);

  // Payment details
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paidAmount, setPaidAmount] = useState(0);
  const [nextDueDate, setNextDueDate] = useState('');

  // Fetch invoice and initial data
  useEffect(() => {
    fetchInvoice();
    fetchCustomers();
    fetchProducts();
  }, [id]);

  // Calculate totals whenever items or discount change
  useEffect(() => {
    calculateTotals();
  }, [invoiceItems, discount, invoiceType]);

  const fetchInvoice = async () => {
    try {
      const response = await invoiceAPI.getById(id);
      const inv = response.data.invoice;
      setInvoice(inv);
      setInvoiceType(inv.invoiceType);
      setInvoiceDate(inv.invoiceDate ? inv.invoiceDate.split('T')[0] : new Date().toISOString().split('T')[0]);
      setInvoiceNotes(inv.invoiceNotes || '');
      setInvoiceItems(inv.items || []);
      setDiscount(inv.discount || 0);
      setSelectedCustomer(inv.customerDetails);
      setCustomerSearchTerm(inv.customerDetails.name);
      setPaymentMethod(inv.payment?.method || 'CASH');
      setPaidAmount(inv.payment?.totalPaid || 0);
      setNextDueDate(inv.payment?.nextDueDate || '');
      setLoading(false);
    } catch (err) {
      console.error('Error fetching invoice:', err);
      showToast({ message: 'Failed to load invoice', type: 'error' });
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await customerAPI.getAll();
      setCustomers(response.data.customers || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productAPI.getAll();
      const productsData = response.data.products || response.data;
      setProducts(Array.isArray(productsData) ? productsData : []);
      
      // Fetch last purchase for each product
      if (Array.isArray(productsData)) {
        const lastPurchases = {};
        for (const product of productsData) {
          try {
            const historyRes = await productAPI.getHistory(product._id, { limit: 50 });
            const history = historyRes.data.history || [];
            // Find most recent sell entry
            const lastSell = history.find(h => h.action === 'sell');
            if (lastSell) {
              lastPurchases[product._id] = lastSell.quantity || { boxes: 0, pieces: 0 };
            }
          } catch (err) {
            console.error(`Error fetching history for product ${product._id}:`, err);
          }
        }
        setLastPurchaseMap(lastPurchases);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  // Customer search
  const handleCustomerSearch = (e) => {
    const value = e.target.value;
    setCustomerSearchTerm(value);
    if (value.trim() === '') {
      setCustomerSearchResults([]);
      return;
    }
    const results = customers.filter(c =>
      c.name?.toLowerCase().includes(value.toLowerCase()) ||
      c.phone?.includes(value)
    );
    setCustomerSearchResults(results);
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearchTerm(customer.name);
    setCustomerSearchResults([]);
  };

  const handleCreateNewCustomer = async () => {
    if (!newCustomer.name) {
      showToast({ message: 'Name is required', type: 'error' });
      return;
    }
    try {
      const response = await customerAPI.create(newCustomer);
      const createdCustomer = response.data.customer;
      setCustomers([...customers, createdCustomer]);
      selectCustomer(createdCustomer);
      setShowNewCustomerForm(false);
      setNewCustomer({ name: '', phone: '', address: '', gstNumber: '' });
      showToast({ message: 'Customer created successfully', type: 'success' });
    } catch (err) {
      showToast({ message: 'Failed to create customer', type: 'error' });
    }
  };

  // Product search
  const handleProductSearch = (e) => {
    const value = e.target.value;
    setProductSearchTerm(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      if (value.trim() === '') {
        setProductSearchResults([]);
        return;
      }
      const results = products.filter(p =>
        p.productName?.toLowerCase().includes(value.toLowerCase()) ||
        p.type?.toLowerCase().includes(value.toLowerCase()) ||
        p.size?.toLowerCase().includes(value.toLowerCase())
      );
      setProductSearchResults(results);
    }, 300);
  };

  const addProductToInvoice = (product) => {
    // Check if product already in invoice
    const exists = invoiceItems.find(item => item.productId === product._id);
    if (exists) {
      showToast({ message: 'Product already added', type: 'warning' });
      return;
    }

    const newItem = {
      productId: product._id,
      productName: product.productName,
      productType: product.type,
      productSize: product.size,
      piecesPerBox: product.piecesPerBox || 4,
      hsnNo: product.hsnNo || '', // Add HSN from product
      quantity: { boxes: 0, pieces: 0 },
      pricePerBox: product.pricePerBox || 0,
      pricePerPiece: 0,
      taxRate: invoiceType === 'GST' ? 18 : 0,
      itemTotal: 0,
      taxAmount: 0
    };

    setInvoiceItems([...invoiceItems, newItem]);
    setProductSearchTerm('');
    setProductSearchResults([]);
  };

  const addCustomProductToInvoice = () => {
    if (!customProductData.productName.trim()) {
      showToast({ message: 'Please enter product name', type: 'error' });
      return;
    }

    if (!customProductData.quantity || parseFloat(customProductData.quantity) <= 0) {
      showToast({ message: 'Please enter valid quantity', type: 'error' });
      return;
    }

    if (!customProductData.pricePerPiece || parseFloat(customProductData.pricePerPiece) <= 0) {
      showToast({ message: 'Please enter valid price', type: 'error' });
      return;
    }

    const quantity = parseFloat(customProductData.quantity);
    const pricePerPiece = parseFloat(customProductData.pricePerPiece);
    const totalPrice = quantity * pricePerPiece;

    const newItem = {
      productId: null,
      productName: customProductData.productName,
      productType: 'Custom',
      productSize: 'N/A',
      isCustom: true,
      piecesPerBox: 1,
      quantity: { boxes: 0, pieces: quantity }, // Store as pieces for custom products
      pricePerBox: 0,
      pricePerPiece: pricePerPiece,
      taxRate: invoiceType === 'GST' ? 18 : 0,
      itemTotal: invoiceType === 'GST' ? totalPrice / 1.18 : totalPrice,
      taxAmount: invoiceType === 'GST' ? totalPrice - (totalPrice / 1.18) : 0
    };

    setInvoiceItems([...invoiceItems, newItem]);
    setCustomProductData({ productName: '', quantity: '', pricePerPiece: '' });
    setShowCustomProductForm(false);
    showToast({ message: 'Custom product added', type: 'success' });
  };

  const updateInvoiceItem = (index, field, value) => {
    const updated = [...invoiceItems];
    const item = updated[index];

    if (field === 'boxes' || field === 'pieces') {
      updated[index].quantity[field] = parseInt(value) || 0;
    } else if (field === 'pricePerBox') {
      updated[index].pricePerBox = parseFloat(value) || 0;
      const piecesPerBox = updated[index].piecesPerBox || 1;
      updated[index].pricePerPiece = (parseFloat(value) || 0) / piecesPerBox;
    } else if (field === 'pricePerPiece') {
      updated[index].pricePerPiece = parseFloat(value) || 0;
    } else if (field === 'taxRate') {
      updated[index].taxRate = parseFloat(value) || 0;
    } else {
      updated[index][field] = value;
    }

    // Calculate item total
    const updatedItem = updated[index];
    const totalPieces = (updatedItem.quantity.boxes * updatedItem.piecesPerBox) + updatedItem.quantity.pieces;
    const totalPrice = (updatedItem.quantity.boxes * updatedItem.pricePerBox) + (updatedItem.quantity.pieces * updatedItem.pricePerPiece);

    if (invoiceType === 'GST' && updatedItem.taxRate > 0) {
      const basePrice = totalPrice / (1 + (updatedItem.taxRate / 100));
      updatedItem.itemTotal = basePrice;
      updatedItem.taxAmount = totalPrice - basePrice;
    } else {
      updatedItem.itemTotal = totalPrice;
      updatedItem.taxAmount = 0;
    }

    setInvoiceItems(updated);
  };

  /**
   * Update item quantity without normalizing - normalization happens on save
   * This allows users to enter any number of pieces as they type
   */
  const updateQuantityWithoutNormalize = (index, field, value) => {
    const updated = [...invoiceItems];
    const item = updated[index];
    const newValue = Math.max(0, parseInt(value) || 0);
    
    if (field === 'boxes') {
      item.quantity.boxes = newValue;
    } else if (field === 'pieces') {
      item.quantity.pieces = newValue;
    }
    
    // Recalculate totals WITHOUT normalizing
    const totalPrice = (item.quantity.boxes * item.pricePerBox) + (item.quantity.pieces * item.pricePerPiece);
    if (invoiceType === 'GST' && item.taxRate > 0) {
      const basePrice = totalPrice / (1 + (item.taxRate / 100));
      item.itemTotal = basePrice;
      item.taxAmount = totalPrice - basePrice;
    } else {
      item.itemTotal = totalPrice;
      item.taxAmount = 0;
    }
    
    setInvoiceItems(updated);
  };

  /**
   * Normalize all invoice items - converts excess pieces to boxes
   * Called only when saving the invoice
   */
  const normalizeAllItems = (items) => {
    return items.map(item => {
      if (item.isCustom) {
        // Custom products don't need normalization
        return item;
      }
      
      const piecesPerBox = item.piecesPerBox || 1;
      let boxes = item.quantity.boxes || 0;
      let pieces = item.quantity.pieces || 0;
      
      // Convert excess pieces to boxes
      if (pieces >= piecesPerBox) {
        const extraBoxes = Math.floor(pieces / piecesPerBox);
        boxes += extraBoxes;
        pieces = pieces % piecesPerBox;
      }
      
      // Recalculate totals with normalized quantities
      const totalPrice = (boxes * item.pricePerBox) + (pieces * item.pricePerPiece);
      if (invoiceType === 'GST' && item.taxRate > 0) {
        const basePrice = totalPrice / (1 + (item.taxRate / 100));
        item.itemTotal = basePrice;
        item.taxAmount = totalPrice - basePrice;
      } else {
        item.itemTotal = totalPrice;
        item.taxAmount = 0;
      }
      
      return {
        ...item,
        quantity: { boxes, pieces }
      };
    });
  };

  /**
   * Normalize and recalculate totals
   * Converts excess pieces to boxes automatically (e.g., if piecesPerBox=10 and pieces=15, converts to 1 box + 5 pieces)
   */
  const normalizeAndRecalculate = (updated, idx) => {
    const item = updated[idx];
    const piecesPerBox = item.piecesPerBox || 1;
    
    // Normalize pieces - convert excess to boxes
    if (item.quantity.pieces >= piecesPerBox) {
      const extraBoxes = Math.floor(item.quantity.pieces / piecesPerBox);
      item.quantity.boxes += extraBoxes;
      item.quantity.pieces = item.quantity.pieces % piecesPerBox;
    }
    
    // Recalculate totals
    const totalPrice = (item.quantity.boxes * item.pricePerBox) + (item.quantity.pieces * item.pricePerPiece);
    if (invoiceType === 'GST' && item.taxRate > 0) {
      const basePrice = totalPrice / (1 + (item.taxRate / 100));
      item.itemTotal = basePrice;
      item.taxAmount = totalPrice - basePrice;
    } else {
      item.itemTotal = totalPrice;
      item.taxAmount = 0;
    }
  };

  // Increase/Decrease quantity functions
  const increaseQuantity = (index, unit = 'pieces') => {
    const updated = [...invoiceItems];
    const item = updated[index];
    
    if (unit === 'boxes') {
      item.quantity.boxes += 1;
    } else if (unit === 'pieces') {
      item.quantity.pieces += 1;
      // Auto-convert to boxes if pieces reach piecesPerBox
      if (item.quantity.pieces >= item.piecesPerBox) {
        item.quantity.boxes += Math.floor(item.quantity.pieces / item.piecesPerBox);
        item.quantity.pieces = item.quantity.pieces % item.piecesPerBox;
      }
    }
    
    // Recalculate totals
    const totalPrice = (item.quantity.boxes * item.pricePerBox) + (item.quantity.pieces * item.pricePerPiece);
    if (invoiceType === 'GST' && item.taxRate > 0) {
      const basePrice = totalPrice / (1 + (item.taxRate / 100));
      item.itemTotal = basePrice;
      item.taxAmount = totalPrice - basePrice;
    } else {
      item.itemTotal = totalPrice;
      item.taxAmount = 0;
    }
    
    setInvoiceItems(updated);
  };

  const decreaseQuantity = (index, unit = 'pieces') => {
    const updated = [...invoiceItems];
    const item = updated[index];

    if (unit === 'boxes') {
      if (item.quantity.boxes > 0) {
        item.quantity.boxes -= 1;
      }
    } else if (unit === 'pieces') {
      if (item.quantity.pieces > 0) {
        item.quantity.pieces -= 1;
      } else if (item.quantity.boxes > 0) {
        item.quantity.boxes -= 1;
        item.quantity.pieces = item.piecesPerBox - 1;
      }
    }

    // Recalculate totals
    const totalPrice = (item.quantity.boxes * item.pricePerBox) + (item.quantity.pieces * item.pricePerPiece);
    if (invoiceType === 'GST' && item.taxRate > 0) {
      const basePrice = totalPrice / (1 + (item.taxRate / 100));
      item.itemTotal = basePrice;
      item.taxAmount = totalPrice - basePrice;
    } else {
      item.itemTotal = totalPrice;
      item.taxAmount = 0;
    }

    setInvoiceItems(updated);
  };

  const removeInvoiceItem = (index) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const sub = invoiceItems.reduce((sum, item) => sum + item.itemTotal, 0);
    setSubtotal(sub);

    const tax = invoiceItems.reduce((sum, item) => sum + item.taxAmount, 0);
    setTotalTax(tax);

    // Calculate totalBeforeDiscount = subtotal + tax
    const totalBeforeDiscount = sub + tax;

    // Calculate total after discount
    const total = totalBeforeDiscount - discount;
    setTotalAmount(total);

    const rounded = Math.round(total);
    setRoundOff(rounded - total);
    setFinalAmount(rounded);
  };

  const formatQty = (boxes, pieces) => {
    if (boxes === 0 && pieces === 0) return '0';
    if (boxes === 0) return `${pieces} pc`;
    if (pieces === 0) return `${boxes} bx`;
    return `${boxes} bx, ${pieces} pc`;
  };

  const handleSaveInvoice = async () => {
    if (!selectedCustomer) {
      showToast({ message: 'Please select a customer', type: 'error' });
      return;
    }

    if (invoiceItems.length === 0) {
      showToast({ message: 'Please add at least one item', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      // Normalize all items before saving
      const normalizedItems = normalizeAllItems(invoiceItems);
      
      const payload = {
        invoiceType,
        invoiceDate,
        invoiceNotes,
        customerId: selectedCustomer._id,
        items: normalizedItems,
        discount,
        subtotal,
        totalTax,
        // Add totalBeforeDiscount and invoiceValue
        totalBeforeDiscount: subtotal + totalTax,
        invoiceValue: invoiceType === 'GST' ? (subtotal + totalTax) : subtotal,
        totalAmount,
        roundOff,
        finalAmount,
        paymentMethod,
        paidAmount,
        nextDueDate
      };

      const response = await invoiceAPI.update(id, payload);

      showToast({ message: 'Invoice updated successfully', type: 'success' });
      setTimeout(() => {
        navigate(`/sales/invoice/${id}`);
      }, 500);
    } catch (err) {
      console.error('Error saving invoice:', err);
      showToast({ message: err.response?.data?.message || 'Failed to save invoice', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center min-h-screen">
          <div className="text-lg text-gray-600">Loading invoice...</div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center min-h-screen">
          <div className="text-lg text-red-600">Invoice not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 ml-64 p-6">
        <div className="max-w-full mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Edit Invoice #{invoice.invoiceNumber}</h1>
            <button
              onClick={() => navigate('/sales/invoice-list')}
              className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              ← Back
            </button>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - Items and Totals */}
            <div className="col-span-2 space-y-6">
              {/* Invoice Date */}
              <div className="bg-white p-6 rounded-lg shadow">
                <label className="block text-sm font-medium text-gray-700 mb-2">📅 Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Add Product */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">➕ Add Products</h3>
                <div className="relative mb-3">
                  <input
                    type="text"
                    placeholder="Search products by name, type, or size..."
                    value={productSearchTerm}
                    onChange={handleProductSearch}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {productSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg mt-2 z-10 max-h-64 overflow-y-auto">
                      {productSearchResults.map(product => (
                        <div
                          key={product._id}
                          onClick={() => addProductToInvoice(product)}
                          className="px-4 py-3 cursor-pointer hover:bg-blue-50 border-b last:border-b-0"
                        >
                          <div className="font-medium text-gray-800">{product.productName}</div>
                          <div className="text-sm text-gray-600">{product.type} - {product.size}</div>
                          <div className="text-sm text-green-600">Available: {product.stock.boxes} bx, {product.stock.pieces} pc</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => setShowCustomProductForm(!showCustomProductForm)}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition"
                >
                  {showCustomProductForm ? '✕ Close Custom Form' : '🎨 Add Custom Product'}
                </button>

                {showCustomProductForm && (
                  <div className="mt-4 p-4 border-2 border-purple-200 rounded-lg bg-purple-50">
                    <h4 className="font-semibold text-gray-800 mb-3">Add Custom Product</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                        <input
                          type="text"
                          value={customProductData.productName}
                          onChange={(e) => setCustomProductData({...customProductData, productName: e.target.value})}
                          placeholder="e.g., Special Order Item"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                          <input
                            type="number"
                            value={customProductData.quantity}
                            onChange={(e) => setCustomProductData({...customProductData, quantity: e.target.value})}
                            onWheel={(e) => e.target.blur()}
                            placeholder="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Price (per unit)</label>
                          <input
                            type="number"
                            value={customProductData.pricePerPiece}
                            onChange={(e) => setCustomProductData({...customProductData, pricePerPiece: e.target.value})}
                            onWheel={(e) => e.target.blur()}
                            placeholder="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      <button
                        onClick={addCustomProductToInvoice}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition"
                      >
                        ✓ Add Custom Product
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Invoice Items */}
              <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Items</h3>
                {invoiceItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No items added yet</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Product</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-700">Qty</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Price/Box</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Amount</th>
                        {invoiceType === 'GST' && <th className="px-4 py-2 text-right font-semibold text-gray-700">Tax</th>}
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Total</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-800">{item.productName}</div>
                            <div className="text-xs text-gray-500">{item.productType} - {item.productSize}</div>
                            {invoiceType === 'GST' && item.hsnNo && (
                              <div className="text-xs text-blue-600 font-semibold">🔢 HSN: {item.hsnNo}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.isCustom ? (
                              // Custom product: simple quantity field, no normalization
                              <input
                                type="number"
                                value={item.quantity.pieces === 0 ? '' : item.quantity.pieces}
                                onChange={(e) => {
                                  const updated = [...invoiceItems];
                                  const quantity = Math.max(0, parseFloat(e.target.value) || 0);
                                  updated[idx].quantity.pieces = quantity;
                                  
                                  // Simple calculation for custom products - NO NORMALIZATION
                                  const totalPrice = quantity * item.pricePerPiece;
                                  if (invoiceType === 'GST' && item.taxRate > 0) {
                                    const basePrice = totalPrice / (1 + (item.taxRate / 100));
                                    updated[idx].itemTotal = basePrice;
                                    updated[idx].taxAmount = totalPrice - basePrice;
                                  } else {
                                    updated[idx].itemTotal = totalPrice;
                                    updated[idx].taxAmount = 0;
                                  }
                                  
                                  setInvoiceItems(updated);
                                }}
                                onWheel={(e) => e.target.blur()}
                                placeholder="0"
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                              />
                            ) : (
                              // Regular product (from DB): boxes + pieces input WITHOUT normalization on input
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-center gap-1">
                                  <label className="text-xs text-gray-600">Box:</label>
                                  <input
                                    type="number"
                                    value={item.quantity.boxes === 0 ? '' : item.quantity.boxes}
                                    onChange={(e) => updateQuantityWithoutNormalize(idx, 'boxes', e.target.value)}
                                    onWheel={(e) => e.target.blur()}
                                    placeholder="0"
                                    className="w-12 px-1 py-1 border border-gray-300 rounded text-center text-sm"
                                  />
                                  <span className="text-xs text-gray-600">Pc:</span>
                                  <input
                                    type="number"
                                    value={item.quantity.pieces === 0 ? '' : item.quantity.pieces}
                                    onChange={(e) => updateQuantityWithoutNormalize(idx, 'pieces', e.target.value)}
                                    onWheel={(e) => e.target.blur()}
                                    placeholder="0"
                                    className="w-12 px-1 py-1 border border-gray-300 rounded text-center text-sm"
                                  />
                                </div>
                                <span className="text-xs text-blue-600 font-medium">{formatQty(item.quantity.boxes, item.quantity.pieces)}</span>
                                {lastPurchaseMap[item.productId] && (
                                  <span className="text-xs text-gray-500">Last: {formatQty(lastPurchaseMap[item.productId].boxes || 0, lastPurchaseMap[item.productId].pieces || 0)}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {item.isCustom ? (
                              // Custom product: price per unit
                              <input
                                type="number"
                                value={item.pricePerPiece === 0 ? '' : item.pricePerPiece}
                                onChange={(e) => {
                                  const updated = [...invoiceItems];
                                  updated[idx].pricePerPiece = parseFloat(e.target.value) || 0;
                                  
                                  // Recalculate totals - NO NORMALIZATION
                                  const quantity = updated[idx].quantity.pieces;
                                  const totalPrice = quantity * updated[idx].pricePerPiece;
                                  if (invoiceType === 'GST' && updated[idx].taxRate > 0) {
                                    const basePrice = totalPrice / (1 + (updated[idx].taxRate / 100));
                                    updated[idx].itemTotal = basePrice;
                                    updated[idx].taxAmount = totalPrice - basePrice;
                                  } else {
                                    updated[idx].itemTotal = totalPrice;
                                    updated[idx].taxAmount = 0;
                                  }
                                  
                                  setInvoiceItems(updated);
                                }}
                                onWheel={(e) => e.target.blur()}
                                placeholder="0"
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
                              />
                            ) : (
                              // Regular product: price per box
                              <input
                                type="number"
                                value={item.pricePerBox === 0 ? '' : item.pricePerBox}
                                onChange={(e) => updateInvoiceItem(idx, 'pricePerBox', e.target.value)}
                                onWheel={(e) => e.target.blur()}
                                placeholder="0"
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            ₹{item.itemTotal?.toFixed(2) || '0.00'}
                          </td>
                          {invoiceType === 'GST' && (
                            <td className="px-4 py-3 text-right">
                              ₹{item.taxAmount?.toFixed(2) || '0.00'}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right font-semibold">
                            ₹{(item.itemTotal + item.taxAmount)?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => removeInvoiceItem(idx)}
                              className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 font-medium"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Right Column - Summary & Details */}
            <div className="space-y-6">
              {/* Totals Summary */}
              <div className="bg-white p-6 rounded-lg shadow space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Summary</h3>
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Discount:</span>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                  />
                </div>
                {invoiceType === 'GST' && (
                  <div className="flex justify-between text-gray-700">
                    <span>Tax (18%):</span>
                    <span className="font-medium">₹{totalTax.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between text-lg font-bold text-gray-800">
                  <span>Final Amount:</span>
                  <span>₹{finalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Customer Details */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer</h3>
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Search customer..."
                    value={customerSearchTerm}
                    onChange={handleCustomerSearch}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {customerSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg mt-2 z-10 max-h-40 overflow-y-auto">
                      {customerSearchResults.map(customer => (
                        <div
                          key={customer._id}
                          onClick={() => selectCustomer(customer)}
                          className="px-4 py-3 cursor-pointer hover:bg-blue-50 border-b last:border-b-0"
                        >
                          <div className="font-medium text-gray-800">{customer.name}</div>
                          <div className="text-sm text-gray-600">{customer.phone}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedCustomer && (
                  <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                    <div><strong className="text-gray-700">Name:</strong> <span className="text-gray-600">{selectedCustomer.name}</span></div>
                    <div><strong className="text-gray-700">Phone:</strong> <span className="text-gray-600">{selectedCustomer.phone || 'N/A'}</span></div>
                    <div><strong className="text-gray-700">Address:</strong> <span className="text-gray-600">{selectedCustomer.address || 'N/A'}</span></div>
                    {invoiceType === 'GST' && (
                      <div><strong className="text-gray-700">GST:</strong> <span className="text-gray-600">{selectedCustomer.gstNumber || 'N/A'}</span></div>
                    )}
                  </div>
                )}
              </div>

              {/* Invoice Notes */}
              <div className="bg-white p-6 rounded-lg shadow">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                <textarea
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="Add any notes about this invoice..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleSaveInvoice}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {saving ? 'Saving...' : '💾 Save Changes'}
                </button>
                <button
                  onClick={() => navigate('/sales/invoice-list')}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditInvoice;
