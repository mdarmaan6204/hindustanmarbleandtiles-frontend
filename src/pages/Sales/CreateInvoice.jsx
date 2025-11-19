import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from '../../components/Layout/Sidebar';
import { useToast } from '../../components/Toast';

/**
 * Create Invoice Page
 * Supports both GST and Non-GST billing
 * Features: Customer selection, product selection, automatic calculations, print/save
 */

function CreateInvoice() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const searchTimeoutRef = useRef(null);

  // Invoice type toggle
  const [invoiceType, setInvoiceType] = useState('NON_GST'); // GST or NON_GST

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

  // Invoice items
  const [invoiceItems, setInvoiceItems] = useState([]);

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
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]); // Today's date

  // Invoice number (editable)
  const [customInvoiceNumber, setCustomInvoiceNumber] = useState('');
  const [isInvoiceNumberEdited, setIsInvoiceNumberEdited] = useState(false);

  // UI states
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Handle Bajaj Finserve auto-payment
  useEffect(() => {
    if (paymentMethod === 'BAJAJ_FINSERVE') {
      setPaidAmount(finalAmount);
      if (invoiceNotes === '' || !invoiceNotes.includes('Bajaj Finserve')) {
        setInvoiceNotes(prev => prev ? `${prev}\nPayment via Bajaj Finserve - Will receive money from Bajaj` : 'Payment via Bajaj Finserve - Will receive money from Bajaj');
      }
    }
  }, [paymentMethod, finalAmount]);

  // Fetch data on mount
  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  // Calculate totals whenever items or discount change
  useEffect(() => {
    calculateTotals();
  }, [invoiceItems, discount, invoiceType]);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/customers');
      setCustomers(response.data.customers || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/products');
      const productsData = response.data.products || response.data;
      setProducts(Array.isArray(productsData) ? productsData : []);
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
      // Check if editing existing customer or creating new
      if (newCustomer._id) {
        // Update existing customer
        const response = await axios.put(`http://localhost:5000/api/customers/${newCustomer._id}`, newCustomer);
        const updatedCustomer = response.data.customer;
        setCustomers(customers.map(c => c._id === updatedCustomer._id ? updatedCustomer : c));
        selectCustomer(updatedCustomer);
        setShowNewCustomerForm(false);
        setNewCustomer({ name: '', phone: '', address: '', gstNumber: '' });
        showToast({ message: 'Customer updated successfully', type: 'success' });
      } else {
        // Create new customer
        const response = await axios.post('http://localhost:5000/api/customers', newCustomer);
        const createdCustomer = response.data.customer;
        setCustomers([...customers, createdCustomer]);
        selectCustomer(createdCustomer);
        setShowNewCustomerForm(false);
        setNewCustomer({ name: '', phone: '', address: '', gstNumber: '' });
        showToast({ message: 'Customer created successfully', type: 'success' });
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || (newCustomer._id ? 'Failed to update customer' : 'Failed to create customer');
      showToast({ message: errorMessage, type: 'error' });
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
      pricePerPiece: 0, // Will be calculated automatically
      taxRate: invoiceType === 'GST' ? 18 : 0, // Default to 18% for GST invoices
      itemTotal: 0,
      taxAmount: 0
    };

    setInvoiceItems([...invoiceItems, newItem]);
    setProductSearchTerm('');
    setProductSearchResults([]);
  };

  const updateInvoiceItem = (index, field, value) => {
    const updated = [...invoiceItems];
    const item = updated[index];
    
    if (field === 'boxes' || field === 'pieces') {
      updated[index].quantity[field] = parseInt(value) || 0;
    } else if (field === 'pricePerBox') {
      updated[index].pricePerBox = parseFloat(value) || 0;
      // Auto-calculate price per piece
      const piecesPerBox = updated[index].piecesPerBox || 1;
      updated[index].pricePerPiece = (parseFloat(value) || 0) / piecesPerBox;
    } else if (field === 'pricePerPiece') {
      // For custom products
      updated[index].pricePerPiece = parseFloat(value) || 0;
    } else if (field === 'taxRate') {
      updated[index].taxRate = parseFloat(value) || 0;
    } else if (field === 'hsnNo') {
      // For HSN Code
      updated[index].hsnNo = value;
    } else {
      updated[index][field] = value;
    }

    // Calculate item total
    const updatedItem = updated[index];
    
    if (updatedItem.isCustom) {
      // Custom product: calculate based on pieces only
      const totalPieces = updatedItem.quantity.pieces || 0;
      const totalPrice = totalPieces * (updatedItem.pricePerPiece || 0);
      
      // For GST invoices: entered price includes GST, extract base price
      if (invoiceType === 'GST' && updatedItem.taxRate > 0) {
        const basePrice = totalPrice / (1 + (updatedItem.taxRate / 100));
        updatedItem.itemTotal = basePrice;
        updatedItem.taxAmount = totalPrice - basePrice;
      } else {
        // For Non-GST invoices: entered price is the final price
        updatedItem.itemTotal = totalPrice;
        updatedItem.taxAmount = 0;
      }
    } else {
      // Regular product: calculate based on boxes and pieces
      const totalPieces = (updatedItem.quantity.boxes * updatedItem.piecesPerBox) + updatedItem.quantity.pieces;
      const totalPrice = (updatedItem.quantity.boxes * updatedItem.pricePerBox) + (updatedItem.quantity.pieces * updatedItem.pricePerPiece);
      
      // For GST invoices: entered price includes GST, extract base price
      if (invoiceType === 'GST' && updatedItem.taxRate > 0) {
        const basePrice = totalPrice / (1 + (updatedItem.taxRate / 100));
        updatedItem.itemTotal = basePrice;
        updatedItem.taxAmount = totalPrice - basePrice;
      } else {
        // For Non-GST invoices: entered price is the final price
        updatedItem.itemTotal = totalPrice;
        updatedItem.taxAmount = 0;
      }
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

  // Calculate available stock for a product
  const calculateAvailable = (product) => {
    if (!product) return { boxes: 0, pieces: 0 };
    
    const piecesPerBox = product.piecesPerBox || 1;
    const stockPieces = (product.stock?.boxes || 0) * piecesPerBox + (product.stock?.pieces || 0);
    const salesPieces = (product.sales?.boxes || 0) * piecesPerBox + (product.sales?.pieces || 0);
    const damagePieces = (product.damage?.boxes || 0) * piecesPerBox + (product.damage?.pieces || 0);
    const returnsPieces = (product.returns?.boxes || 0) * piecesPerBox + (product.returns?.pieces || 0);
    
    const availablePieces = Math.max(0, stockPieces - salesPieces - damagePieces + returnsPieces);
    
    return {
      boxes: Math.floor(availablePieces / piecesPerBox),
      pieces: availablePieces % piecesPerBox
    };
  };

  // Print preview state
  const [printPageSize, setPrintPageSize] = useState('A5'); // A4, A5, custom

  const handlePrintInvoice = () => {
    if (!savedInvoice) {
      showToast({ message: 'Invoice not found', type: 'error' });
      return;
    }

    // Fetch latest invoice data and open in new tab for printing
    openPrintWindow();

    try {
      // LOG INVOICE DETAILS TO CONSOLE FOR MANUAL VERIFICATION
      console.log('%c═══════════════════════════════════════════════════════════════', 'color: #0066cc; font-weight: bold; font-size: 14px');
      console.log('%c📄 INVOICE DETAILS - CONSOLE OUTPUT FOR VERIFICATION', 'color: #0066cc; font-weight: bold; font-size: 14px');
      console.log('%c═══════════════════════════════════════════════════════════════', 'color: #0066cc; font-weight: bold; font-size: 14px');
      
      // Invoice Header Information
      console.log('%cINVOICE HEADER INFORMATION:', 'color: #003300; font-weight: bold; font-size: 12px');
      console.log({
        invoiceNumber: savedInvoice.invoiceNumber,
        invoiceType: savedInvoice.invoiceType,
        invoiceDate: new Date(savedInvoice.invoiceDate).toLocaleDateString('en-IN'),
        salesChannel: savedInvoice.salesChannel,
        paymentStatus: savedInvoice.payment?.status,
        totalPaid: savedInvoice.payment?.totalPaid || 0,
        pendingAmount: savedInvoice.payment?.pendingAmount || 0
      });

      // Customer Information
      console.log('%cCUSTOMER INFORMATION:', 'color: #003300; font-weight: bold; font-size: 12px');
      console.log({
        name: savedInvoice.customerDetails?.name,
        phone: savedInvoice.customerDetails?.phone,
        address: savedInvoice.customerDetails?.address,
        gstNumber: savedInvoice.customerDetails?.gstNumber
      });

      // All Invoice Items (JSON format)
      console.log('%cALL INVOICE ITEMS (JSON):', 'color: #003300; font-weight: bold; font-size: 12px');
      console.table(savedInvoice.items.map((item, index) => ({
        'Index': index + 1,
        'Product Name': item.productName,
        'Product Type': item.productType,
        'Product Size': item.productSize,
        'Pieces/Box': item.piecesPerBox,
        'Qty (Boxes)': item.quantity?.boxes || 0,
        'Qty (Pieces)': item.quantity?.pieces || 0,
        'Price/Box (₹)': item.pricePerBox?.toFixed(2),
        'Price/Piece (₹)': item.pricePerPiece?.toFixed(2),
        'Item Total (₹)': item.itemTotal?.toFixed(2),
        'Tax Rate (%)': item.taxRate || 0,
        'Tax Amount (₹)': item.taxAmount?.toFixed(2),
        'HSN Code': item.hsnNo || 'N/A',
        'Is Custom': item.isCustom ? 'Yes' : 'No'
      })));

      // Detailed Item-by-Item Breakdown
      console.log('%cDETAILED ITEM-BY-ITEM BREAKDOWN:', 'color: #003300; font-weight: bold; font-size: 12px');
      savedInvoice.items.forEach((item, index) => {
        console.group(`📦 Item ${index + 1}: ${item.productName}`);
        console.log({
          productName: item.productName,
          productType: item.productType || 'N/A',
          productSize: item.productSize || 'N/A',
          hsnCode: item.hsnNo || 'N/A',
          isCustomProduct: item.isCustom || false,
          piecesPerBox: item.piecesPerBox,
          quantity: {
            boxes: item.quantity?.boxes || 0,
            pieces: item.quantity?.pieces || 0,
            totalPieces: ((item.quantity?.boxes || 0) * item.piecesPerBox) + (item.quantity?.pieces || 0)
          },
          pricing: {
            pricePerBox: item.pricePerBox,
            pricePerPiece: item.pricePerPiece,
            calculation: `(${item.quantity?.boxes || 0} × ₹${item.pricePerBox}) + (${item.quantity?.pieces || 0} × ₹${item.pricePerPiece}) = ₹${item.itemTotal}`
          },
          tax: {
            taxRate: item.taxRate || 0,
            taxAmount: item.taxAmount || 0,
            totalWithTax: (item.itemTotal || 0) + (item.taxAmount || 0)
          }
        });
        console.groupEnd();
      });

      // Financial Summary
      console.log('%cFINANCIAL SUMMARY:', 'color: #660000; font-weight: bold; font-size: 12px');
      console.log({
        subtotal: `₹${savedInvoice.subtotal?.toFixed(2)}`,
        discountApplied: `₹${savedInvoice.discount?.toFixed(2)}`,
        cgst: `₹${savedInvoice.cgst?.toFixed(2)} (${savedInvoice.invoiceType === 'GST' ? '9%' : 'N/A'})`,
        sgst: `₹${savedInvoice.sgst?.toFixed(2)} (${savedInvoice.invoiceType === 'GST' ? '9%' : 'N/A'})`,
        igst: `₹${savedInvoice.igst?.toFixed(2)} (${savedInvoice.invoiceType === 'GST' ? '18%' : 'N/A'})`,
        totalTax: `₹${savedInvoice.totalTax?.toFixed(2)}`,
        totalAmount: `₹${savedInvoice.totalAmount?.toFixed(2)}`,
        roundOffAmount: `₹${savedInvoice.roundOffAmount?.toFixed(2)}`,
        finalAmount: `₹${savedInvoice.finalAmount?.toFixed(2)}`
      });

      // Payment Information
      console.log('%cPAYMENT INFORMATION:', 'color: #330033; font-weight: bold; font-size: 12px');
      console.log({
        paymentStatus: savedInvoice.payment?.status,
        totalPaid: `₹${savedInvoice.payment?.totalPaid?.toFixed(2)}`,
        pendingAmount: `₹${savedInvoice.payment?.pendingAmount?.toFixed(2)}`,
        nextDueDate: savedInvoice.payment?.nextDueDate ? new Date(savedInvoice.payment.nextDueDate).toLocaleDateString('en-IN') : 'N/A',
        paymentHistory: savedInvoice.payment?.paymentHistory || []
      });

      // Additional Notes
      console.log('%cADDITIONAL INFORMATION:', 'color: #333333; font-weight: bold; font-size: 12px');
      console.log({
        invoiceNotes: savedInvoice.notes || 'No notes',
        status: savedInvoice.status || 'ACTIVE'
      });

      console.log('%c═══════════════════════════════════════════════════════════════', 'color: #0066cc; font-weight: bold; font-size: 14px');
      console.log('%c✅ END OF INVOICE DETAILS - Check above for all item details', 'color: #00aa00; font-weight: bold; font-size: 12px');
      console.log('%c═══════════════════════════════════════════════════════════════', 'color: #0066cc; font-weight: bold; font-size: 14px');
    } catch (err) {
      console.error('Error logging invoice details:', err);
    }
  };

  const openPrintWindow = () => {
    // Fetch latest invoice data from server to ensure we have updated data
    axios.get(`http://localhost:5000/api/invoices/${savedInvoice._id}`)
      .then(response => {
        const latestInvoice = response.data.invoice;
        const invoiceHTML = generateInvoicePDF(latestInvoice, 'A5');
        
        if (!invoiceHTML) {
          showToast({ message: 'Failed to generate invoice', type: 'error' });
          return;
        }
        
        // Open in a new tab
        const newTab = window.open('', '_blank');
        if (!newTab) {
          showToast({ message: 'Please allow pop-ups to open the invoice', type: 'error' });
          return;
        }
        
        newTab.document.write(invoiceHTML);
        newTab.document.close();
        newTab.focus();
      })
      .catch(err => {
        console.error('Error fetching latest invoice:', err);
        showToast({ message: 'Failed to fetch latest invoice data', type: 'error' });
      });
  };

  const savePDF = () => {
    // Fetch latest invoice data from server
    axios.get(`http://localhost:5000/api/invoices/${savedInvoice._id}`)
      .then(response => {
        const latestInvoice = response.data.invoice;
        const invoiceHTML = generateInvoicePDF(latestInvoice, 'A5');
        
        if (!invoiceHTML) {
          showToast({ message: 'Failed to generate invoice', type: 'error' });
          return;
        }
        
        // Create blob and download
        const blob = new Blob([invoiceHTML], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${latestInvoice.invoiceNumber}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast({ message: 'Invoice saved successfully', type: 'success' });
      })
      .catch(err => {
        console.error('Error fetching latest invoice:', err);
        showToast({ message: 'Failed to fetch latest invoice data', type: 'error' });
      });
  };

  const generateInvoicePDF = (invoice, pageSize = 'A5') => {
    const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    // Convert number to words for Indian currency
    const numberToWords = (num) => {
      const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      
      if (num === 0) return 'Zero';
      
      const numToWords = (n) => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
        if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
        if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
        if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '');
        return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numToWords(n % 10000000) : '');
      };
      
      return numToWords(Math.floor(num)) + ' Only';
    };

    const amountInWords = numberToWords(invoice.finalAmount);

    // Calculate minimum rows needed (reduced to 10 items per invoice for space)
    const minRows = 10;
    const actualRows = invoice.items.length;
    
    // Generate empty rows for remaining space
    const emptyRowsCount = Math.max(0, minRows - actualRows);
    const emptyRows = Array(emptyRowsCount).fill(null).map((_, i) => `
      <tr class="h-7">
        <td class="p-0.5 border border-gray-400 text-center"></td>
        <td class="p-0.5 border border-gray-400"></td>
        ${invoice.invoiceType === 'GST' ? '<td class="p-0.5 border border-gray-400"></td>' : ''}
        <td class="p-0.5 border border-gray-400"></td>
        <td class="p-0.5 border border-gray-400"></td>
        <td class="p-0.5 border border-gray-400"></td>
      </tr>
    `).join('');

    // Page size dimensions in mm
    const pageSizes = {
      'A4': { width: 210, height: 297 },
      'A5': { width: 148, height: 210 },
      'A6': { width: 105, height: 148 }
    };
    
    const size = pageSizes[pageSize] || pageSizes['A5'];
    const pageStyle = `
      @media print {
        body {
          width: ${size.width}mm;
          height: ${size.height}mm;
          margin: 0 !important;
          padding: 0 !important;
        }
        .invoice-page {
          box-shadow: none !important;
          border: none !important;
          padding: 4mm 8mm -5px 8mm !important;
          background-color: #fce4ec !important;
          margin: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
          height: ${size.height}mm !important;
          max-height: ${size.height}mm !important;
          overflow: hidden !important;
          page-break-after: avoid !important;
        }
        * {
          page-break-inside: avoid !important;
          page-break-after: avoid !important;
        }
        @page {
          size: ${pageSize};
          margin: 0;
          orphans: 0;
          widows: 0;
        }
      }
    `;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                fontFamily: {
                  sans: ['Inter', 'Arial', 'sans-serif'],
                },
                colors: {
                  'varmora-pink': '#e91e63',
                  'varmora-light': '#fce4ec',
                  'varmora-accent': '#c2185b',
                },
              }
            }
          }
        </script>
        <style>
          ${pageStyle}
          .underline-fill {
            display: inline-block;
            border-bottom: 1px solid #4b5563;
            flex-grow: 1;
            min-width: 0;
          }
          .text-shadow-rose {
            text-shadow: 1px 1px 1px rgba(224, 36, 94, 0.3);
          }
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
        </style>
      </head>
      <body class="bg-gray-100 font-sans" style="margin: 0; padding: 0;">
        <!-- Page Size Selector (No Print) -->
        <div class="no-print bg-white p-4 border-b border-gray-300 flex gap-3 items-center sticky top-0 z-10 shadow">
          <label class="font-semibold text-gray-700">📄 Invoice: ${invoice.invoiceNumber}</label>
          <div class="flex gap-2 ml-auto">
            <button onclick="window.print()" class="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 text-sm transition">
              🖨️ Print
            </button>
            <button onclick="downloadPDF()" class="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 text-sm transition">
              📥 Download PDF
            </button>
            <button onclick="window.close()" class="px-4 py-2 bg-gray-400 text-white rounded-lg font-semibold hover:bg-gray-500 text-sm transition">
              ❌ Close
            </button>
          </div>
        </div>

        <div class="invoice-page max-w-[${size.width}mm] mx-auto min-h-[${size.height}mm] bg-varmora-light p-4 shadow-xl border border-gray-300" data-invoice-container data-invoice-number="${invoice.invoiceNumber}">
          
          <!-- Header Block -->
          <header class="mb-1 border-b-2 border-varmora-pink pb-1">
            ${invoice.invoiceType === 'GST' ? `
            <div class="flex justify-start items-start text-xs mb-0.5">
              <div class="space-y-0">
                <p><strong>GSTIN:</strong> 20AEFPW1772A1ZX</p>
                <p><strong>PAN:</strong> PW1772A1ZX</p>
              </div>
            </div>
            ` : ''}

            <div class="text-center mb-1">
              <h2 class="text-base font-black text-varmora-accent leading-tight text-shadow-rose">
                HINDUSTAN MARBLE & TILES
              </h2>
              <p class="text-[0.6rem] font-semibold text-gray-700">
                Authorised Dealer for <strong>Varmora Tiles and Granite</strong>
              </p>
              <p class="text-[0.55rem] text-gray-600">
                Tundi Road, Barwadih, Giridih (Jharkhand) Pin - 815301 | Mob.: 8581808501
              </p>
            </div>
          </header>

          <!-- Billing Details Block -->
          <section class="mb-1 space-y-0.5 text-xs">
            <div class="grid grid-cols-2 gap-2">
              <div class="flex items-end gap-1">
                <span class="font-semibold text-varmora-accent whitespace-nowrap">Bill No.</span>
                <span class="underline-fill pl-1">${invoice.invoiceNumber}</span>
              </div>
              <div class="flex items-end gap-1">
                <span class="font-semibold text-varmora-accent whitespace-nowrap">Date.</span>
                <span class="underline-fill pl-1">${formatDate(invoice.createdAt || new Date().toISOString())}</span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div class="flex items-end gap-1">
                <span class="font-semibold text-varmora-accent whitespace-nowrap">Customer</span>
                <span class="underline-fill pl-1">${invoice.customerDetails?.name || 'N/A'}</span>
              </div>
              <div class="flex items-end gap-1">
                <span class="font-semibold text-varmora-accent whitespace-nowrap">Phone.</span>
                <span class="underline-fill pl-1">${invoice.customerDetails?.phone || 'N/A'}</span>
              </div>
            </div>

            ${invoice.invoiceType === 'GST' && invoice.customerDetails?.gstNumber ? `
            <div class="flex items-end gap-1">
              <span class="font-semibold text-varmora-accent whitespace-nowrap">GST No.</span>
              <span class="underline-fill pl-1">${invoice.customerDetails.gstNumber}</span>
            </div>
            ` : ''}

            <div class="flex items-end gap-1">
              <span class="font-semibold text-varmora-accent whitespace-nowrap">Address.</span>
              <span class="underline-fill pl-1">${invoice.customerDetails?.address || 'N/A'}</span>
            </div>
          </section>

          <!-- Invoice Table -->
          <table class="w-full border-collapse text-[0.6rem] mb-1">
            <thead>
              <tr class="bg-gray-200 text-gray-900 border border-gray-400">
                <th class="w-[8%] p-0.5 border border-gray-400 font-black text-center">SI No.</th>
                <th class="${invoice.invoiceType === 'GST' ? 'w-[35%]' : 'w-[50%]'} p-0.5 border border-gray-400 font-black text-center">PARTICULARS</th>
                  ${invoice.invoiceType === 'GST' ? `
                <th class="w-[15%] p-0.5 border border-gray-400 font-black text-center">HSN CODE</th>
                ` : ''}
                <th class="w-[12%] p-0.5 border border-gray-400 font-black text-center">QNTY.</th>
                <th class="w-[15%] p-0.5 border border-gray-400 font-black text-center">RATE</th>
                <th class="w-[15%] p-0.5 border border-gray-400 font-black text-center">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map((item, index) => {
                // Only show size in brackets for tile products
                const isTile = item.productType && (item.productType.toLowerCase().includes('tile') || item.productType.toLowerCase().includes('floor') || item.productType.toLowerCase().includes('wall'));
                // For GST bills, don't include HSN in product name (separate column)
                // For Non-GST bills, don't show HSN at all
                const productDisplay = item.productName + (isTile && item.productSize ? ' (' + item.productSize + ')' : '');
                const boxesQty = item.quantity?.boxes || 0;
                const piecesQty = item.quantity?.pieces || 0;
                const qtyDisplay = boxesQty === 0 && piecesQty === 0 ? '0' : 
                                   boxesQty === 0 ? piecesQty + ' pc' :
                                   piecesQty === 0 ? boxesQty + ' bx' :
                                   boxesQty + ' bx, ' + piecesQty + ' pc';
                // For custom products, use pricePerPiece; for regular products, use pricePerBox
                const rateDisplay = item.isCustom ? (item.pricePerPiece || 0).toFixed(2) : (item.pricePerBox || 0).toFixed(2);
                
                return `
                <tr class="h-6">
                  <td class="p-0.5 border border-gray-400 text-center">${index + 1}</td>
                  <td class="p-0.5 border border-gray-400 pl-1">${productDisplay}</td>
                  ${invoice.invoiceType === 'GST' ? `
                  <td class="p-0.5 border border-gray-400 text-center">${item.hsnNo || item.hsnCode || '-'}</td>
                  ` : ''}
                  <td class="p-0.5 border border-gray-400 text-right pr-1">${qtyDisplay}</td>
                  <td class="p-0.5 border border-gray-400 text-right pr-1">₹${rateDisplay}</td>
                  <td class="p-0.5 border border-gray-400 text-right pr-1">₹${(item.itemTotal || 0).toFixed(2)}</td>
                </tr>
              `}).join('')}
              ${emptyRows}
            </tbody>
          </table>

          <!-- Footer Section -->
          <footer class="text-xs mt-auto">
            
            <!-- Total in Words and Amount Section -->
            <div class="border border-varmora-accent bg-white p-1 mb-1.5">
              <p class="font-bold text-varmora-accent text-[0.6rem]">Total Invoice Amount (In Words):</p>
              <p class="mt-0.5 pl-1 text-gray-800 text-[0.6rem]">Rupees ${amountInWords}</p>
            </div>

            <!-- Total Amount Display -->
            <div class="mb-1.5">
              ${invoice.invoiceType === 'GST' ? `
              <div class="border border-gray-500 text-gray-800 text-[0.6rem]">
                <div class="grid grid-cols-2 border-b border-gray-500">
                  <div class="p-0.5 font-medium">Total Amount</div>
                  <div class="p-0.5 text-right">₹${(invoice.subtotal || 0).toFixed(2)}</div>
                </div>
                ${invoice.discount > 0 ? `
                <div class="grid grid-cols-2 border-b border-gray-500">
                  <div class="p-0.5 font-medium">Discount</div>
                  <div class="p-0.5 text-right">- ₹${(invoice.discount || 0).toFixed(2)}</div>
                </div>
                <div class="grid grid-cols-2 border-b border-gray-500">
                  <div class="p-0.5 font-medium">Amount After Discount</div>
                  <div class="p-0.5 text-right">₹${((invoice.subtotal || 0) - (invoice.discount || 0)).toFixed(2)}</div>
                </div>
                ` : ''}
                <div class="grid grid-cols-2 border-b border-gray-500">
                  <div class="p-0.5 font-medium">CGST @ 9%</div>
                  <div class="p-0.5 text-right">₹${(invoice.cgst || 0).toFixed(2)}</div>
                </div>
                <div class="grid grid-cols-2 border-b border-gray-500">
                  <div class="p-0.5 font-medium">SGST @ 9%</div>
                  <div class="p-0.5 text-right">₹${(invoice.sgst || 0).toFixed(2)}</div>
                </div>
                <div class="grid grid-cols-2 bg-gray-200 text-gray-800 font-bold border-b border-gray-500">
                  <div class="p-0.5">Total Tax</div>
                  <div class="p-0.5 text-right">₹${(invoice.totalTax || 0).toFixed(2)}</div>
                </div>
                <div class="grid grid-cols-2 bg-white border border-gray-500">
                  <div class="p-1 font-black text-gray-900">TOTAL AMOUNT</div>
                  <div class="p-1 text-right font-black text-gray-900">₹${(invoice.finalAmount || 0).toFixed(2)}</div>
                </div>
                <div class="grid grid-cols-1 border-t border-gray-500 bg-gray-50 p-1">
                  <div class="text-[0.6rem] text-gray-700 text-center">
                    <span class="font-semibold">Paid (₹${(invoice.payment?.totalPaid || 0).toFixed(2)})</span>
                    ${(invoice.payment?.pendingAmount || 0) > 0 ? ` | <span class="font-semibold text-red-700">Remaining Due (₹${(invoice.payment?.pendingAmount || 0).toFixed(2)})</span>` : ''}
                  </div>
                </div>
              </div>
              ` : `
              <div class="border border-gray-500 text-gray-800 text-[0.6rem]">
                ${invoice.discount > 0 ? `
                <div class="grid grid-cols-2 border-b border-gray-500">
                  <div class="p-0.5 font-medium">Total Amount</div>
                  <div class="p-0.5 text-right">₹${(invoice.subtotal || 0).toFixed(2)}</div>
                </div>
                <div class="grid grid-cols-2 border-b border-gray-500">
                  <div class="p-0.5 font-medium">Discount</div>
                  <div class="p-0.5 text-right">- ₹${(invoice.discount || 0).toFixed(2)}</div>
                </div>
                ` : ''}
                <div class="grid grid-cols-2 bg-white">
                  <div class="p-1.5 font-black text-gray-900">TOTAL AMOUNT</div>
                  <div class="p-1.5 text-right font-black text-gray-900">₹${(invoice.finalAmount || 0).toFixed(2)}</div>
                </div>
                <div class="grid grid-cols-1 border-t border-gray-500 bg-gray-50 p-1">
                  <div class="text-[0.6rem] text-gray-700 text-center">
                    <span class="font-semibold">Paid (₹${(invoice.payment?.totalPaid || 0).toFixed(2)})</span>
                    ${(invoice.payment?.pendingAmount || 0) > 0 ? ` | <span class="font-semibold text-red-700">Remaining Due (₹${(invoice.payment?.pendingAmount || 0).toFixed(2)})</span>` : ''}
                  </div>
                </div>
              </div>
              `}
            </div>

            <!-- Signature Section with Space -->
            <div class="text-right mt-2">
              <div class="pt-1 mx-4 inline-block min-w-[150px]">
                <p class="text-[0.6rem] font-semibold text-varmora-accent">For Hindustan Marble & Tiles</p>
                <p class="text-[0.55rem] text-gray-700">Auth. Signature</p>
              </div>
            </div>

          </footer>

        </div>

        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <script>
          function downloadPDF() {
            const element = document.querySelector('[data-invoice-container]');
            const filename = \`Invoice_\${element?.getAttribute('data-invoice-number') || 'Invoice'}.pdf\`;
            
            const opt = {
              margin: 5,
              filename: filename,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2 },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            html2pdf().set(opt).from(element).save();
          }
        </script>
      </body>
      </html>
    `;
  };

  // Update tax rates when switching to GST invoice type
  useEffect(() => {
    if (invoiceType === 'GST') {
      const updated = invoiceItems.map(item => {
        // If item doesn't have a tax rate, set it to 18% by default
        if (item.taxRate === 0 || item.taxRate === '0') {
          return { ...item, taxRate: 18 };
        }
        return item;
      });
      setInvoiceItems(updated);
    }
  }, [invoiceType]);

  const handleSaveInvoice = async () => {
    // Validation
    if (!selectedCustomer) {
      showToast({ message: 'Please select a customer', type: 'error' });
      return;
    }
    if (invoiceItems.length === 0) {
      showToast({ message: 'Please add at least one product', type: 'error' });
      return;
    }

    // Validate custom items have price
    const invalidItems = invoiceItems.filter(item => 
      item.isCustom && (!item.pricePerPiece || parseFloat(item.pricePerPiece) <= 0)
    );
    if (invalidItems.length > 0) {
      showToast({ message: 'Please enter price for all custom products', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        invoiceType,
        invoiceDate: invoiceDate || new Date().toISOString(),
        customerId: selectedCustomer._id,
        customerDetails: {
          name: selectedCustomer.name,
          phone: selectedCustomer.phone,
          address: selectedCustomer.address || '',
          gstNumber: selectedCustomer.gstNumber || ''
        },
        items: invoiceItems,
        subtotal,
        discount,
        cgst: invoiceType === 'GST' ? totalTax / 2 : 0,
        sgst: invoiceType === 'GST' ? totalTax / 2 : 0,
        totalTax,
        // Calculate totalBeforeDiscount and invoiceValue
        totalBeforeDiscount: subtotal + totalTax,
        invoiceValue: invoiceType === 'GST' ? (subtotal + totalTax) : subtotal,
        totalAmount,
        roundOffAmount: roundOff,
        finalAmount,
        payment: {
          status: paidAmount >= finalAmount ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'PENDING',
          totalPaid: paidAmount,
          pendingAmount: finalAmount - paidAmount,
          nextDueDate: nextDueDate || null
        },
        notes: invoiceNotes
      };

      // Add custom invoice number if provided
      if (customInvoiceNumber.trim()) {
        payload.customInvoiceNumber = customInvoiceNumber.trim();
      }

      const response = await axios.post('http://localhost:5000/api/invoices', payload);
      setSavedInvoice(response.data.invoice);
      setShowSuccessModal(true);
      showToast({ message: 'Invoice created successfully!', type: 'success' });

    } catch (err) {
      console.error('Error creating invoice:', err);
      showToast({ message: err.response?.data?.message || 'Failed to create invoice', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-5xl">📝</span>
                Create Invoice
              </h1>
              <button
                onClick={() => navigate('/sales/invoice-list')}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-semibold transition"
              >
                ← Back
              </button>
            </div>
          </div>

          {/* Invoice Type Toggle */}
          <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <label className="text-sm font-bold text-gray-700">Invoice Type:</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setInvoiceType('NON_GST')}
                    className={`py-2 px-6 rounded-lg font-semibold text-sm transition ${
                      invoiceType === 'NON_GST'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Non-GST Bill
                  </button>
                  <button
                    onClick={() => setInvoiceType('GST')}
                    className={`py-2 px-6 rounded-lg font-semibold text-sm transition ${
                      invoiceType === 'GST'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    GST Invoice
                  </button>
                </div>
              </div>

              <div className="flex-1 flex items-center gap-3">
                <label className="text-sm font-bold text-gray-700">Invoice Number:</label>
                <div className="relative flex-1 max-w-xs">
                  <input
                    type="text"
                    value={customInvoiceNumber}
                    onChange={(e) => {
                      setCustomInvoiceNumber(e.target.value);
                      setIsInvoiceNumberEdited(true);
                    }}
                    placeholder="Auto-generated (optional)"
                    className={`w-full px-3 py-2 border-2 rounded-lg transition ${
                      isInvoiceNumberEdited 
                        ? 'border-orange-400 bg-orange-50' 
                        : 'border-gray-300'
                    }`}
                  />
                  {isInvoiceNumberEdited && (
                    <span className="absolute right-3 top-2 text-orange-600 font-semibold text-xs">
                      ⚠️ Custom
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Selection */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">👤 Customer Details</h2>
            
            {!selectedCustomer ? (
              <>
                <div className="relative mb-4">
                  <input
                    type="text"
                    value={customerSearchTerm}
                    onChange={handleCustomerSearch}
                    placeholder="Search customer by name or phone..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {/* Show dropdown when search term exists */}
                  {customerSearchTerm.trim() !== '' && (customerSearchResults.length > 0 || customerSearchTerm.trim() !== '') && (
                    <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {customerSearchResults.length > 0 ? (
                        <>
                          {customerSearchResults.map((customer) => (
                            <button
                              key={customer._id}
                              onClick={() => selectCustomer(customer)}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 transition"
                            >
                              <div className="font-semibold text-gray-900">{customer.name}</div>
                              <div className="text-sm text-gray-600">📱 {customer.phone}</div>
                              {customer.address && (
                                <div className="text-xs text-gray-500">📍 {customer.address}</div>
                              )}
                            </button>
                          ))}
                          {/* Always show "Add New Customer" option in dropdown when results exist */}
                          <button
                            onClick={() => {
                              setShowNewCustomerForm(true);
                              setCustomerSearchResults([]);
                              if (customerSearchTerm.trim()) {
                                setNewCustomer({...newCustomer, name: customerSearchTerm.trim()});
                              }
                            }}
                            className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 border-t-2 border-green-200 transition font-semibold text-green-700"
                          >
                            <div className="flex items-center">
                              <span className="text-xl mr-2">+</span>
                              <span>Add New Customer "{customerSearchTerm}"</span>
                            </div>
                            <div className="text-xs text-green-600 mt-1">Click to create a new customer with this name</div>
                          </button>
                        </>
                      ) : (
                        /* Show only "Add New Customer" when no results found */
                        <button
                          onClick={() => {
                            setShowNewCustomerForm(true);
                            setCustomerSearchResults([]);
                            if (customerSearchTerm.trim()) {
                              setNewCustomer({...newCustomer, name: customerSearchTerm.trim()});
                            }
                          }}
                          className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 transition font-semibold text-green-700"
                        >
                          <div className="flex items-center">
                            <span className="text-xl mr-2">+</span>
                            <span>Add New Customer "{customerSearchTerm}"</span>
                          </div>
                          <div className="text-xs text-green-600 mt-1">No matching customers found. Click to create new customer.</div>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setShowNewCustomerForm(!showNewCustomerForm);
                    // Auto-populate name if user has entered search term
                    if (!showNewCustomerForm && customerSearchTerm.trim()) {
                      setNewCustomer({...newCustomer, name: customerSearchTerm.trim()});
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                >
                  + Add New Customer
                </button>

                {showNewCustomerForm && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-3">{newCustomer._id ? 'Edit Customer' : 'New Customer'}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Name *"
                        value={newCustomer.name}
                        onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Phone"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="GST Number"
                        value={newCustomer.gstNumber}
                        onChange={(e) => setNewCustomer({...newCustomer, gstNumber: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Address"
                        value={newCustomer.address}
                        onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                        className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleCreateNewCustomer}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
                      >
                        {newCustomer._id ? '💾 Update Customer' : '✓ Create Customer'}
                      </button>
                      <button
                        onClick={() => {
                          setShowNewCustomerForm(false);
                          setNewCustomer({ name: '', phone: '', address: '', gstNumber: '' });
                          if (selectedCustomer) {
                            setCustomerSearchTerm(selectedCustomer.name);
                          }
                        }}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg flex justify-between items-start">
                <div>
                  <div className="font-bold text-lg text-gray-900">{selectedCustomer.name}</div>
                  {selectedCustomer.phone && <div className="text-sm text-gray-700 mt-1">📱 {selectedCustomer.phone}</div>}
                  {selectedCustomer.address && <div className="text-sm text-gray-700">📍 {selectedCustomer.address}</div>}
                  {selectedCustomer.gstNumber && <div className="text-sm text-gray-700">🏢 GST: {selectedCustomer.gstNumber}</div>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowNewCustomerForm(true);
                      setNewCustomer({...selectedCustomer});
                      setCustomerSearchTerm('');
                      setCustomerSearchResults([]);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-semibold transition"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearchTerm('');
                      setNewCustomer({ name: '', phone: '', address: '', gstNumber: '' });
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-semibold transition"
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Add Products */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📦 Add Products</h2>
            
            <div className="relative mb-4">
              <input
                type="text"
                value={productSearchTerm}
                onChange={handleProductSearch}
                placeholder="Search products or type custom product name..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {productSearchTerm && (
                <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                  {productSearchResults.length > 0 ? (
                    productSearchResults.map((product) => {
                      const available = calculateAvailable(product);
                      return (
                        <button
                          key={product._id}
                          onClick={() => addProductToInvoice(product)}
                          className="w-full text-left px-4 py-3 hover:bg-green-50 border-b border-gray-100 transition"
                        >
                          <div className="font-semibold text-gray-900">{product.productName}</div>
                          <div className="text-sm text-gray-600 flex gap-4 mt-1">
                            <span className="text-green-700 font-semibold">📦 Available: {formatQty(available.boxes, available.pieces)}</span>
                            {product.productType && <span>🏷️ {product.productType}</span>}
                            {(product.hsnNo || product.hsnCode) && <span>🔢 HSN: {product.hsnNo || product.hsnCode}</span>}
                            {product.location && <span>📍 {product.location}</span>}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <button
                      onClick={() => {
                        // Add custom product - simple quantity and price per piece
                        const customItem = {
                          productId: null, // No product ID for custom items
                          productName: productSearchTerm,
                          productType: 'Custom',
                          productSize: '-',
                          piecesPerBox: 1, // Always 1 for custom products (we count by pieces only)
                          quantity: { boxes: 0, pieces: 0 },
                          pricePerBox: 0,
                          pricePerPiece: '', // Empty instead of 0
                          hsnNo: '', // Add HSN Code for custom products
                          taxRate: invoiceType === 'GST' ? 18 : 0,
                          itemTotal: 0,
                          taxAmount: 0,
                          isCustom: true
                        };
                        setInvoiceItems([...invoiceItems, customItem]);
                        setProductSearchTerm('');
                        setProductSearchResults([]);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 transition"
                    >
                      <div className="font-semibold text-blue-600">➕ Add "{productSearchTerm}" as custom item</div>
                      <div className="text-sm text-gray-600">Click to add this product (not in database)</div>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Invoice Items Table */}
            {invoiceItems.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-3 py-2 text-left">#</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Product</th>
                      {invoiceType === 'GST' && <th className="border border-gray-300 px-3 py-2 text-center">HSN Code</th>}
                      <th className="border border-gray-300 px-3 py-2 text-center">Quantity</th>
                      <th className="border border-gray-300 px-3 py-2 text-right">Price/Box</th>
                      {invoiceType === 'GST' && <th className="border border-gray-300 px-3 py-2 text-center">GST%</th>}
                      {invoiceType === 'GST' && <th className="border border-gray-300 px-3 py-2 text-right">Base Amount</th>}
                      {invoiceType === 'GST' && <th className="border border-gray-300 px-3 py-2 text-right">Tax</th>}
                      <th className="border border-gray-300 px-3 py-2 text-right">Total</th>
                      <th className="border border-gray-300 px-3 py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceItems.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-3 py-2">{index + 1}</td>
                        <td className="border border-gray-300 px-3 py-2">
                          <div className="font-semibold">{item.productName}</div>
                          <div className="text-xs text-gray-600">
                            {item.isCustom ? '🎨 Custom Product' : `${item.productType} - ${item.productSize} (${item.piecesPerBox} pc/box)`}
                          </div>
                        </td>
                        {invoiceType === 'GST' && (
                          <td className="border border-gray-300 px-3 py-2">
                            {item.isCustom ? (
                              <input
                                type="text"
                                value={item.hsnNo || ''}
                                onChange={(e) => updateInvoiceItem(index, 'hsnNo', e.target.value)}
                                placeholder="e.g., 6802"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                maxLength="8"
                              />
                            ) : (
                              <div className="text-center text-sm font-semibold text-blue-600">{item.hsnNo || '-'}</div>
                            )}
                          </td>
                        )}
                        <td className="border border-gray-300 px-3 py-2">
                          {item.isCustom ? (
                            // Custom product - single quantity input
                            <input
                              type="number"
                              min="0"
                              value={item.quantity.pieces || ''}
                              onChange={(e) => updateInvoiceItem(index, 'pieces', e.target.value)}
                              placeholder="0"
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-center"
                            />
                          ) : (
                            // Regular product - boxes and pieces
                            <div className="flex gap-2 items-center justify-center">
                              <input
                                type="number"
                                min="0"
                                value={item.quantity.boxes || ''}
                                onChange={(e) => updateInvoiceItem(index, 'boxes', e.target.value)}
                                placeholder="0"
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                              />
                              <span className="text-gray-500">bx</span>
                              <input
                                type="number"
                                min="0"
                                max={item.piecesPerBox - 1}
                                value={item.quantity.pieces || ''}
                                onChange={(e) => updateInvoiceItem(index, 'pieces', e.target.value)}
                                placeholder="0"
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                              />
                              <span className="text-gray-500">pc</span>
                            </div>
                          )}
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.isCustom ? (item.pricePerPiece || '') : (item.pricePerBox || '')}
                            onChange={(e) => updateInvoiceItem(index, item.isCustom ? 'pricePerPiece' : 'pricePerBox', e.target.value)}
                            onWheel={(e) => e.preventDefault()}
                            className="w-28 px-2 py-1 border border-gray-300 rounded text-right"
                            placeholder={item.isCustom ? "0" : "0"}
                          />
                        </td>
                        {invoiceType === 'GST' && (
                          <td className="border border-gray-300 px-3 py-2 text-center">
                            <select
                              value={item.taxRate}
                              onChange={(e) => updateInvoiceItem(index, 'taxRate', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>
                        )}
                        {invoiceType === 'GST' && (
                          <td className="border border-gray-300 px-3 py-2 text-right font-semibold">
                            ₹{item.itemTotal.toFixed(2)}
                          </td>
                        )}
                        {invoiceType === 'GST' && (
                          <td className="border border-gray-300 px-3 py-2 text-right text-green-700">
                            ₹{item.taxAmount.toFixed(2)}
                          </td>
                        )}
                        <td className="border border-gray-300 px-3 py-2 text-right font-bold text-blue-700">
                          ₹{(item.itemTotal + item.taxAmount).toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          <button
                            onClick={() => removeInvoiceItem(index)}
                            className="text-red-600 hover:text-red-800 font-bold"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Calculations & Payment */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Payment Details - Sticky */}
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4 h-fit">
              <h2 className="text-xl font-bold text-gray-900 mb-4">💳 Payment Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Set the date for this invoice</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="BAJAJ_FINSERVE">Bajaj Finserve</option>
                  </select>
                  {paymentMethod === 'BAJAJ_FINSERVE' && (
                    <p className="mt-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                      ℹ️ This invoice will be marked as fully paid. Money will be received from Bajaj Finserve.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Paid Amount</label>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-3">
                    <input
                      type="number"
                      min="0"
                      value={paidAmount || ''}
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                      disabled={paymentMethod === 'BAJAJ_FINSERVE'}
                      className={`w-full px-3 py-2 border-2 border-green-400 rounded-lg font-bold text-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        paymentMethod === 'BAJAJ_FINSERVE' ? 'bg-gray-100 cursor-not-allowed text-gray-600' : 'bg-white text-green-700'
                      }`}
                      placeholder="0"
                    />
                  </div>
                  {paymentMethod === 'BAJAJ_FINSERVE' && (
                    <p className="mt-1 text-xs text-gray-600">Auto-filled as full amount</p>
                  )}
                </div>

                {paidAmount < finalAmount && (finalAmount - paidAmount) > 0 && (
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-300 rounded-lg p-3">
                    <input
                      type="checkbox"
                      id="autoDiscount"
                      checked={discount === (finalAmount - paidAmount)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDiscount(finalAmount - paidAmount);
                        }
                        // When unchecked, user can manually enter discount
                      }}
                      className="w-5 h-5 cursor-pointer accent-blue-600"
                    />
                    <label htmlFor="autoDiscount" className="cursor-pointer flex-1 text-sm font-semibold text-gray-700">
                      Auto Discount (₹{(finalAmount - paidAmount).toFixed(2)})
                    </label>
                  </div>
                )}

                {paidAmount < finalAmount && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Next Due Date</label>
                    <input
                      type="date"
                      value={nextDueDate}
                      onChange={(e) => setNextDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Invoice Notes</label>
                  <textarea
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Add any notes..."
                  />
                </div>
              </div>
            </div>

            {/* Bill Summary - Sticky */}
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4 h-fit">
              <h2 className="text-xl font-bold text-gray-900 mb-4">💰 Bill Summary</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Manual Discount:</span>
                  <input
                    type="number"
                    min="0"
                    value={discount === 0 ? '' : discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-32 px-3 py-1 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                {invoiceType === 'GST' && (
                  <>
                    <div className="flex justify-between text-gray-700">
                      <span>CGST:</span>
                      <span className="font-semibold">₹{(totalTax / 2).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>SGST:</span>
                      <span className="font-semibold">₹{(totalTax / 2).toFixed(2)}</span>
                    </div>
                  </>
                )}

                <div className="border-t border-gray-300 pt-3 flex justify-between text-gray-700">
                  <span>Total:</span>
                  <span className="font-semibold">₹{totalAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-gray-600 text-sm">
                  <span>Round Off:</span>
                  <span>{roundOff >= 0 ? '+' : ''}{roundOff.toFixed(2)}</span>
                </div>

                <div className="border-t-2 border-gray-400 pt-3 flex justify-between text-xl font-bold text-gray-900">
                  <span>Final Amount:</span>
                  <span className="text-green-600">₹{finalAmount.toFixed(2)}</span>
                </div>

                {paidAmount > 0 && (
                  <>
                    <div className="flex justify-between text-blue-700">
                      <span>Paid:</span>
                      <span className="font-semibold">₹{paidAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-red-700 font-bold">
                      <span>Pending:</span>
                      <span>₹{(finalAmount - paidAmount).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => navigate('/sales/invoice-list')}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-8 py-3 rounded-lg font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveInvoice}
              disabled={loading || !selectedCustomer || invoiceItems.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-semibold transition"
            >
              {loading ? '⏳ Saving...' : '✓ Save Invoice'}
            </button>
          </div>

        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && savedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center relative">
            {/* Close Button (X) - Red */}
            <button
              onClick={() => {
                setShowSuccessModal(false);
                setSavedInvoice(null);
              }}
              className="absolute top-4 right-4 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full p-1 transition"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Created Successfully!</h2>
            <p className="text-lg text-gray-700 mb-2">Invoice Number: <strong>{savedInvoice.invoiceNumber}</strong></p>
            <p className="text-md text-gray-600 mb-6">Amount: ₹{savedInvoice.finalAmount.toFixed(2)}</p>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={handlePrintInvoice}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
              >
                <span className="text-xl">🖨️</span> Print Invoice
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate('/sales/invoice-list');
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                View All Invoices
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSavedInvoice(null);
                  // Reset form
                  setSelectedCustomer(null);
                  setCustomerSearchTerm('');
                  setInvoiceItems([]);
                  setDiscount(0);
                  setPaidAmount(0);
                  setNextDueDate('');
                  setInvoiceNotes('');
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg font-semibold transition"
              >
                Create Another Invoice
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

export default CreateInvoice;
