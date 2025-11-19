import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from '../../components/Layout/Sidebar';
import { useToast } from '../../components/Toast';

/**
 * Invoice Detail Page
 * Display complete invoice information with payment tracking
 */

function InvoiceDetail() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [paymentData, setPaymentData] = useState({
    paymentAmount: '',
    paymentMethod: 'CASH',
    paymentDate: new Date().toISOString().split('T')[0], // Today's date
    nextDueDate: '',
    transactionId: '',
    notes: ''
  });

  useEffect(() => {
    fetchInvoiceDetail();
  }, [invoiceId]);

  useEffect(() => {
    // Fetch payments after invoice detail is loaded
    if (invoice) {
      fetchPaymentHistory();
    }
  }, [invoice]);

  const fetchInvoiceDetail = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5000/api/invoices/${invoiceId}`);
      setInvoice(response.data.invoice);
    } catch (err) {
      console.error('Error fetching invoice:', err);
      showToast({ message: 'Failed to fetch invoice details', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/payments?invoiceId=${invoiceId}`);
      let allPayments = response.data.payments || [];
      
      // If this invoice has initial payment (totalPaid from creation), add it to the timeline
      if (invoice && invoice.payment && invoice.payment.totalPaid > 0) {
        // Check if initial payment already exists in the list
        const hasInitialPayment = allPayments.some(p => p.isInitialPayment === true || p.paymentNumber === 'INITIAL');
        
        if (!hasInitialPayment) {
          const initialPayment = {
            _id: `initial_${invoice._id}`,
            invoiceId: invoice._id,
            amount: invoice.payment.totalPaid,
            paymentMethod: invoice.paymentMethod || 'CASH',
            paymentDate: invoice.invoiceDate,
            paymentNumber: 'INITIAL',
            remainingAmount: invoice.payment.pendingAmount || (invoice.finalAmount - invoice.payment.totalPaid),
            notes: 'Payment collected at invoice creation',
            isInitialPayment: true
          };
          // Add initial payment at the beginning
          allPayments.unshift(initialPayment);
        }
      }
      
      setPayments(allPayments);
    } catch (err) {
      console.error('Error fetching payment history:', err);
    }
  };

  const handlePaymentUpdate = async (e) => {
    e.preventDefault();
    
    if (!paymentData.paymentAmount || parseFloat(paymentData.paymentAmount) <= 0) {
      showToast({ message: 'Please enter a valid payment amount', type: 'error' });
      return;
    }

    const paymentAmount = parseFloat(paymentData.paymentAmount);
    const remainingAmount = invoice.payment.pendingAmount;

    if (paymentAmount < remainingAmount && !paymentData.nextDueDate) {
      showToast({ message: 'Please set next due date for partial payment', type: 'error' });
      return;
    }

    try {
      await axios.post(`http://localhost:5000/api/invoices/${invoice._id}/payment`, {
        paymentAmount,
        paymentMethod: paymentData.paymentMethod,
        paymentDate: paymentData.paymentDate || new Date().toISOString(),
        nextDueDate: paymentData.nextDueDate || null,
        transactionId: paymentData.transactionId,
        notes: paymentData.notes
      });

      showToast({ 
        message: paymentAmount >= remainingAmount 
          ? 'Payment completed successfully!' 
          : 'Partial payment recorded successfully!', 
        type: 'success' 
      });

      setShowPaymentModal(false);
      setPaymentData({
        paymentAmount: '',
        paymentMethod: 'CASH',
        paymentDate: new Date().toISOString().split('T')[0],
        nextDueDate: '',
        transactionId: '',
        notes: ''
      });
      fetchInvoiceDetail();
      fetchPaymentHistory();
    } catch (err) {
      console.error('Error updating payment:', err);
      showToast({ message: err.response?.data?.message || 'Failed to update payment', type: 'error' });
    }
  };

  const handleDeleteInvoice = async () => {
    setDeleting(true);
    try {
      await axios.delete(`http://localhost:5000/api/invoices/${invoice._id}`);
      
      showToast({ 
        message: 'Invoice cancelled successfully! Stock has been restored and balances updated.', 
        type: 'success' 
      });
      
      setTimeout(() => {
        navigate('/sales/invoice-list');
      }, 1000);
    } catch (err) {
      console.error('Error deleting invoice:', err);
      showToast({ message: err.response?.data?.message || 'Failed to cancel invoice', type: 'error' });
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handlePrint = () => {
    if (!invoice) return;

    // LOG INVOICE DETAILS TO CONSOLE FOR MANUAL VERIFICATION
    console.log('%c═══════════════════════════════════════════════════════════════', 'color: #0066cc; font-weight: bold; font-size: 14px');
    console.log('%c📄 INVOICE DETAILS - CONSOLE OUTPUT FOR VERIFICATION', 'color: #0066cc; font-weight: bold; font-size: 14px');
    console.log('%c═══════════════════════════════════════════════════════════════', 'color: #0066cc; font-weight: bold; font-size: 14px');
    
    // Invoice Header Information
    console.log('%cINVOICE HEADER INFORMATION:', 'color: #003300; font-weight: bold; font-size: 12px');
    console.log({
      invoiceNumber: invoice.invoiceNumber,
      invoiceType: invoice.invoiceType,
      invoiceDate: new Date(invoice.invoiceDate).toLocaleDateString('en-IN'),
      salesChannel: invoice.salesChannel,
      paymentStatus: invoice.payment?.status,
      totalPaid: invoice.payment?.totalPaid || 0,
      pendingAmount: invoice.payment?.pendingAmount || 0
    });

    // Customer Information
    console.log('%cCUSTOMER INFORMATION:', 'color: #003300; font-weight: bold; font-size: 12px');
    console.log({
      name: invoice.customerDetails?.name,
      phone: invoice.customerDetails?.phone,
      address: invoice.customerDetails?.address,
      gstNumber: invoice.customerDetails?.gstNumber
    });

    // All Invoice Items (JSON format)
    console.log('%cALL INVOICE ITEMS (JSON):', 'color: #003300; font-weight: bold; font-size: 12px');
    console.table(invoice.items.map((item, index) => ({
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
    invoice.items.forEach((item, index) => {
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
      subtotal: `₹${invoice.subtotal?.toFixed(2)}`,
      discountApplied: `₹${invoice.discount?.toFixed(2)}`,
      cgst: `₹${invoice.cgst?.toFixed(2)} (${invoice.invoiceType === 'GST' ? '9%' : 'N/A'})`,
      sgst: `₹${invoice.sgst?.toFixed(2)} (${invoice.invoiceType === 'GST' ? '9%' : 'N/A'})`,
      igst: `₹${invoice.igst?.toFixed(2)} (${invoice.invoiceType === 'GST' ? '18%' : 'N/A'})`,
      totalTax: `₹${invoice.totalTax?.toFixed(2)}`,
      totalAmount: `₹${invoice.totalAmount?.toFixed(2)}`,
      roundOffAmount: `₹${invoice.roundOffAmount?.toFixed(2)}`,
      finalAmount: `₹${invoice.finalAmount?.toFixed(2)}`
    });

    // Payment Information
    console.log('%cPAYMENT INFORMATION:', 'color: #330033; font-weight: bold; font-size: 12px');
    console.log({
      paymentStatus: invoice.payment?.status,
      totalPaid: `₹${invoice.payment?.totalPaid?.toFixed(2)}`,
      pendingAmount: `₹${invoice.payment?.pendingAmount?.toFixed(2)}`,
      nextDueDate: invoice.payment?.nextDueDate ? new Date(invoice.payment.nextDueDate).toLocaleDateString('en-IN') : 'N/A',
      paymentHistory: invoice.payment?.paymentHistory || []
    });

    // Additional Notes
    console.log('%cADDITIONAL INFORMATION:', 'color: #333333; font-weight: bold; font-size: 12px');
    console.log({
      invoiceNotes: invoice.notes || 'No notes',
      status: invoice.status || 'ACTIVE'
    });

    console.log('%c═══════════════════════════════════════════════════════════════', 'color: #0066cc; font-weight: bold; font-size: 14px');
    console.log('%c✅ END OF INVOICE DETAILS - Check above for all item details', 'color: #00aa00; font-weight: bold; font-size: 12px');
    console.log('%c═══════════════════════════════════════════════════════════════', 'color: #0066cc; font-weight: bold; font-size: 14px');

    const formatQty = (boxes, pieces) => {
      if (boxes === 0 && pieces === 0) return '0';
      if (boxes === 0) return `${pieces} pc`;
      if (pieces === 0) return `${boxes} bx`;
      return `${boxes} bx, ${pieces} pc`;
    };

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
    const minRows = 10;
    const emptyRowsCount = Math.max(0, minRows - invoice.items.length);
    const emptyRows = Array(emptyRowsCount).fill(null).map((_, i) => `
      <tr class="h-6">
        <td class="p-0.5 border border-gray-400 text-center"></td>
        <td class="p-0.5 border border-gray-400"></td>
        ${invoice.invoiceType === 'GST' ? '<td class="p-0.5 border border-gray-400"></td>' : ''}
        <td class="p-0.5 border border-gray-400"></td>
        <td class="p-0.5 border border-gray-400"></td>
        <td class="p-0.5 border border-gray-400"></td>
      </tr>
    `).join('');

    const invoiceHTML = `
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
          @media print {
            body {
              width: 148mm;
              height: 210mm;
              margin: 0 !important;
              padding: 0 !important;
            }
            .invoice-page {
              box-shadow: none !important;
              border: none !important;
              padding: 4mm 8mm 0mm 8mm !important;
              background-color: #fce4ec !important;
              margin: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              height: 210mm !important;
              max-height: 210mm !important;
              overflow: hidden !important;
            }
            @page {
              size: A5;
              margin: 0;
            }
          }
          .underline-fill {
            display: inline-block;
            border-bottom: 1px solid #4b5563;
            flex-grow: 1;
            min-width: 0;
          }
          .text-shadow-rose {
            text-shadow: 1px 1px 1px rgba(224, 36, 94, 0.3);
          }
        </style>
      </head>
      <body class="bg-gray-100 font-sans" style="margin: 0; padding: 0;">
        <div class="invoice-page max-w-[14.8cm] mx-auto min-h-[21cm] bg-varmora-light p-4 shadow-xl border border-gray-300">
          
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
                <span class="underline-fill pl-1">${formatDate(invoice.createdAt)}</span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div class="flex items-end gap-1">
                <span class="font-semibold text-varmora-accent whitespace-nowrap">Customer</span>
                <span class="underline-fill pl-1">${invoice.customerDetails.name}</span>
              </div>
              <div class="flex items-end gap-1">
                <span class="font-semibold text-varmora-accent whitespace-nowrap">Phone.</span>
                <span class="underline-fill pl-1">${invoice.customerDetails.phone}</span>
              </div>
            </div>

            ${invoice.invoiceType === 'GST' && invoice.customerDetails.gstNumber ? `
            <div class="flex items-end gap-1">
              <span class="font-semibold text-varmora-accent whitespace-nowrap">GST No.</span>
              <span class="underline-fill pl-1">${invoice.customerDetails.gstNumber}</span>
            </div>
            ` : ''}

            <div class="flex items-end gap-1">
              <span class="font-semibold text-varmora-accent whitespace-nowrap">Address.</span>
              <span class="underline-fill pl-1">${invoice.customerDetails.address || 'N/A'}</span>
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
                const isTile = item.productType && (item.productType.toLowerCase().includes('tile') || item.productType.toLowerCase().includes('floor') || item.productType.toLowerCase().includes('wall'));
                // For GST bills, don't include HSN in product name (separate column)
                // For Non-GST bills, don't show HSN at all
                const productDisplay = item.productName + (isTile && item.productSize ? ' (' + item.productSize + ')' : '');
                
                return `
                <tr class="h-6">
                  <td class="p-0.5 border border-gray-400 text-center">${index + 1}</td>
                  <td class="p-0.5 border border-gray-400 pl-1">${productDisplay}</td>
                  ${invoice.invoiceType === 'GST' ? `
                  <td class="p-0.5 border border-gray-400 text-center">${item.hsnNo || item.hsnCode || '-'}</td>
                  ` : ''}
                  <td class="p-0.5 border border-gray-400 text-right pr-1">${formatQty(item.quantity.boxes, item.quantity.pieces)}</td>
                  <td class="p-0.5 border border-gray-400 text-right pr-1">₹${item.pricePerBox.toFixed(2)}</td>
                  <td class="p-0.5 border border-gray-400 text-right pr-1">₹${item.itemTotal.toFixed(2)}</td>
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
                  <div class="p-0.5 text-right">₹${invoice.subtotal.toFixed(2)}</div>
                </div>
                ${invoice.discount > 0 ? `
                <div class="grid grid-cols-2 border-b border-gray-500">
                  <div class="p-0.5 font-medium">Discount</div>
                  <div class="p-0.5 text-right">- ₹${invoice.discount.toFixed(2)}</div>
                </div>
                <div class="grid grid-cols-2 border-b border-gray-500">
                  <div class="p-0.5 font-medium">Amount After Discount</div>
                  <div class="p-0.5 text-right">₹${(invoice.subtotal - invoice.discount).toFixed(2)}</div>
                </div>
                ` : ''}
                <div class="grid grid-cols-2 border-b border-gray-500">
                  <div class="p-0.5 font-medium">CGST @ 9%</div>
                  <div class="p-0.5 text-right">₹${invoice.cgst.toFixed(2)}</div>
                </div>
                <div class="grid grid-cols-2 border-b border-gray-500">
                  <div class="p-0.5 font-medium">SGST @ 9%</div>
                  <div class="p-0.5 text-right">₹${invoice.sgst.toFixed(2)}</div>
                </div>
                <div class="grid grid-cols-2 bg-gray-200 text-gray-800 font-bold border-b border-gray-500">
                  <div class="p-0.5">Total Tax</div>
                  <div class="p-0.5 text-right">₹${invoice.totalTax.toFixed(2)}</div>
                </div>
                <div class="grid grid-cols-2 bg-white border border-gray-500">
                  <div class="p-1 font-black text-gray-900">TOTAL AMOUNT</div>
                  <div class="p-1 text-right font-black text-gray-900">₹${invoice.finalAmount.toFixed(2)}</div>
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
                  <div class="p-0.5 text-right">₹${invoice.subtotal.toFixed(2)}</div>
                </div>
                <div class="grid grid-cols-2 border-b border-gray-500">
                  <div class="p-0.5 font-medium">Discount</div>
                  <div class="p-0.5 text-right">- ₹${invoice.discount.toFixed(2)}</div>
                </div>
                ` : ''}
                <div class="grid grid-cols-2 bg-white">
                  <div class="p-1.5 font-black text-gray-900">TOTAL AMOUNT</div>
                  <div class="p-1.5 text-right font-black text-gray-900">₹${invoice.finalAmount.toFixed(2)}</div>
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
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `;

    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups for this website to print invoices');
        return;
      }
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
    } catch (error) {
      console.error('Print error:', error);
      alert('Failed to open print window. Please check your browser settings.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return '-';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'PARTIAL': return 'bg-orange-100 text-orange-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-64 min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
          <div className="max-w-6xl mx-auto text-center py-12">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Loading invoice details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-64 min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
          <div className="max-w-6xl mx-auto text-center py-12">
            <div className="text-6xl mb-4">❌</div>
            <p className="text-xl text-gray-600">Invoice not found</p>
            <button
              onClick={() => navigate('/sales/invoice-list')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              Back to Invoice List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="mb-6 no-print">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-2xl">📄</span>
                Invoice Details
              </h1>
              <div className="flex gap-2 flex-wrap">
                {invoice.payment.status !== 'PAID' && (
                  <button
                    onClick={() => {
                      setPaymentData({
                        ...paymentData,
                        paymentAmount: invoice.payment.pendingAmount.toString()
                      });
                      setShowPaymentModal(true);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition text-sm"
                  >
                    💰 Collect Payment
                  </button>
                )}
                <button
                  onClick={() => navigate(`/sales/edit-invoice/${invoice._id}`)}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-semibold transition text-sm"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={handlePrint}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition text-sm"
                >
                  🖨️ Print
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition text-sm"
                >
                  🗑️ Cancel
                </button>
                <button
                  onClick={() => navigate('/sales/invoice-list')}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold transition text-sm"
                >
                  ← Back
                </button>
              </div>
            </div>
          </div>

          {/* Invoice Card */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden print:shadow-none">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold mb-0.5">INVOICE</h2>
                  <p className="text-sm text-blue-100">Hindustan Tiles</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold mb-0.5">{invoice.invoiceNumber}</div>
                  <div className="text-xs text-blue-100">{formatDate(invoice.createdAt)}</div>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6">
              
              {/* Payment Summary - TOP SECTION */}
              <div className="mb-8 pb-6 border-b-2 border-gray-200">
                <h3 className="text-sm font-bold text-gray-600 uppercase mb-4">Payment Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Invoice Value (Before Discount) */}
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4 shadow-md">
                    <p className="text-xs font-semibold mb-1 opacity-90">INVOICE VALUE</p>
                    <p className="text-2xl font-bold">₹{(invoice.invoiceValue || invoice.subtotal + (invoice.cgst || 0) + (invoice.sgst || 0) + (invoice.igst || 0)).toFixed(2)}</p>
                  </div>

                  {/* Discount */}
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-4 shadow-md">
                    <p className="text-xs font-semibold mb-1 opacity-90">DISCOUNT</p>
                    <p className="text-2xl font-bold">₹{invoice.discount.toFixed(2)}</p>
                  </div>

                  {/* Paid Amount */}
                  <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4 shadow-md">
                    <p className="text-xs font-semibold mb-1 opacity-90">COLLECTED</p>
                    <p className="text-2xl font-bold">₹{invoice.payment.totalPaid.toFixed(2)}</p>
                  </div>

                  {/* Pending Amount */}
                  <div className={`bg-gradient-to-br ${Math.max(0, invoice.payment.pendingAmount || 0) > 0 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600'} text-white rounded-lg p-4 shadow-md`}>
                    <p className="text-xs font-semibold mb-1 opacity-90">PENDING</p>
                    <p className="text-2xl font-bold">₹{Math.max(0, invoice.payment.pendingAmount || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Customer & Invoice Info - Compact */}
              <div className="grid grid-cols-2 gap-6 mb-8 pb-6 border-b-2 border-gray-200">
                {/* Customer Details */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Bill To</h4>
                  <div className="space-y-1 text-sm">
                    <p 
                      onClick={() => invoice.customerId && navigate(`/sales/customer/${invoice.customerId}`)}
                      className={`font-semibold text-gray-900 ${invoice.customerId ? 'cursor-pointer hover:text-blue-600' : ''}`}
                    >
                      {invoice.customerDetails.name}
                    </p>
                    {invoice.customerDetails.phone && (
                      <p className="text-gray-600 text-xs">📞 {invoice.customerDetails.phone}</p>
                    )}
                    {invoice.customerDetails.address && (
                      <p className="text-gray-600 text-xs">📍 {invoice.customerDetails.address}</p>
                    )}
                    {invoice.customerDetails.gstNumber && (
                      <p className="text-gray-600 text-xs">GST: {invoice.customerDetails.gstNumber}</p>
                    )}
                  </div>
                </div>

                {/* Invoice Info */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Invoice Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        invoice.invoiceType === 'GST' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>{invoice.invoiceType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(invoice.payment.status)}`}>
                        {invoice.payment.status}
                      </span>
                    </div>
                    {invoice.payment.nextDueDate && invoice.payment.status !== 'PAID' && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Due Date:</span>
                        <span className="font-semibold text-orange-600 text-xs">{formatDate(invoice.payment.nextDueDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Table - MIDDLE SECTION */}
              <div className="mb-8 pb-6 border-b-2 border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 border-b">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Product</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Qty</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Rate</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Amount</th>
                        {invoice.invoiceType === 'GST' && (
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Tax</th>
                        )}
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoice.items.map((item, index) => {
                        const isTiles = item.productType && item.productType.toLowerCase().includes('tiles');
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <div className="font-semibold text-gray-900 text-xs">{item.productName}</div>
                              {isTiles && (
                                <div className="text-xs text-gray-500">{item.productType} - {item.productSize}</div>
                              )}
                              {item.piecesPerBox > 0 && (
                                <div className="text-xs text-gray-500">({item.piecesPerBox} pcs/box)</div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center text-xs font-semibold">
                              {item.quantity.boxes > 0 && `${item.quantity.boxes}bx`}
                              {item.quantity.boxes > 0 && item.quantity.pieces > 0 && ' '}
                              {item.quantity.pieces > 0 && `${item.quantity.pieces}pc`}
                            </td>
                            <td className="px-3 py-2 text-right text-xs text-gray-700">
                              ₹{item.pricePerBox.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right text-xs text-gray-700">
                              ₹{item.itemTotal.toFixed(2)}
                            </td>
                            {invoice.invoiceType === 'GST' && (
                              <td className="px-3 py-2 text-right text-xs text-gray-700">
                                ₹{item.taxAmount.toFixed(2)}
                              </td>
                            )}
                            <td className="px-3 py-2 text-right text-xs font-bold text-gray-900 bg-gray-50">
                              ₹{(item.itemTotal + item.taxAmount).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Calculations Summary */}
                <div className="flex justify-end mt-4">
                  <div className="w-full md:w-1/3 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-700">
                      <span>Subtotal:</span>
                      <span className="font-semibold">₹{invoice.subtotal.toFixed(2)}</span>
                    </div>

                    {invoice.invoiceType === 'GST' && (
                      <>
                        {invoice.cgst > 0 && (
                          <div className="flex justify-between text-gray-700">
                            <span>CGST:</span>
                            <span className="font-semibold">₹{invoice.cgst.toFixed(2)}</span>
                          </div>
                        )}
                        {invoice.sgst > 0 && (
                          <div className="flex justify-between text-gray-700">
                            <span>SGST:</span>
                            <span className="font-semibold">₹{invoice.sgst.toFixed(2)}</span>
                          </div>
                        )}
                        {invoice.igst > 0 && (
                          <div className="flex justify-between text-gray-700">
                            <span>IGST:</span>
                            <span className="font-semibold">₹{invoice.igst.toFixed(2)}</span>
                          </div>
                        )}
                      </>
                    )}

                    {invoice.discount > 0 && (
                      <div className="flex justify-between items-center bg-gradient-to-r from-orange-50 to-amber-50 p-3 rounded-lg border-2 border-orange-300">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🎯</span>
                          <span className="font-semibold text-gray-800">Discount Applied:</span>
                        </div>
                        <span className="font-bold text-lg text-orange-600">- ₹{invoice.discount.toFixed(2)}</span>
                      </div>
                    )}

                    {invoice.roundOffAmount !== 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Round Off:</span>
                        <span className="font-semibold">₹{invoice.roundOffAmount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-lg font-bold text-gray-900 border-t-2 pt-2 bg-blue-50 p-2 rounded">
                      <span>Total:</span>
                      <span className="text-blue-600">₹{invoice.finalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment History - BOTTOM SECTION */}
              {payments && payments.length > 0 && (
                <div className="pt-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Payment History</h3>
                  <div className="space-y-3">
                    {/* Invoice Created */}
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">Invoice Created</p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            Invoice #{invoice.invoiceNumber} for ₹{invoice.finalAmount.toFixed(2)}
                          </p>
                        </div>
                        <p className="text-xs font-semibold text-gray-700">{formatDate(invoice.invoiceDate)}</p>
                      </div>
                    </div>

                    {/* Payment Records */}
                    {payments.map((payment) => (
                      <div key={payment._id} className={`border-l-4 p-4 rounded-r-lg ${
                        payment.amount > 0 
                          ? 'bg-green-50 border-green-500' 
                          : 'bg-orange-50 border-orange-500'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 text-base">
                              {payment.amount > 0 ? '💰 Payment Received' : '📅 Due Date Extended'}
                            </p>
                            
                            {payment.amount > 0 && (
                              <>
                                <p className="text-sm text-gray-700 mt-2 font-semibold">
                                  Amount: <span className="text-lg font-bold text-green-700">₹{payment.amount.toFixed(2)}</span>
                                </p>
                                <p className="text-xs text-gray-700 mt-1">
                                  <span className="font-semibold">Method:</span>{' '}
                                  <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 font-semibold">
                                    {payment.paymentMethod}
                                  </span>
                                </p>
                                {payment.transactionId && (
                                  <p className="text-xs text-gray-700 mt-1">
                                    <span className="font-semibold">Txn ID:</span> {payment.transactionId}
                                  </p>
                                )}
                                <p className="text-sm text-gray-700 mt-2 font-semibold">
                                  Remaining: <span className={`text-lg font-bold ${payment.remainingAmount > 0 ? 'text-red-700' : 'text-green-700'}`}>₹{payment.remainingAmount.toFixed(2)}</span>
                                </p>
                              </>
                            )}
                            
                            {payment.nextDueDate && (
                              <p className="text-xs text-gray-700 mt-1">
                                <span className="font-semibold">Next Due:</span>{' '}
                                <span className="text-orange-600 font-semibold">{formatDate(payment.nextDueDate)}</span>
                              </p>
                            )}
                            
                            {payment.notes && (
                              <p className="text-xs text-gray-600 mt-2 italic">📝 {payment.notes}</p>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <p className="text-xs font-semibold text-gray-700">{formatDate(payment.paymentDate)}</p>
                            <p className="text-xs text-gray-500 mt-1">{payment.paymentNumber}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Returns History */}
              {invoice.return?.returnsHistory && invoice.return.returnsHistory.length > 0 && (
                <div className="border-t-2 border-gray-200 pt-6 mt-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Returns</h3>
                  <div className="space-y-3">
                    {invoice.return.returnsHistory.map((returnRecord, index) => (
                      <div key={index} className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-sm">
                              {returnRecord.returnType === 'CREDIT' && 'Credit Note'}
                              {returnRecord.returnType === 'REFUND' && 'Refund'}
                              {returnRecord.returnType === 'EXCHANGE' && 'Exchange'}
                            </p>
                            
                            <p className="text-xs text-gray-700 mt-1">
                              <span className="font-semibold">Return #:</span>{' '}
                              <button
                                onClick={() => navigate(`/sales/returns/${returnRecord.returnId}`)}
                                className="text-blue-600 hover:text-blue-800 font-semibold"
                              >
                                {returnRecord.returnNumber}
                              </button>
                            </p>
                            
                            <p className="text-xs text-gray-700">
                              <span className="font-semibold">Value:</span> ₹{returnRecord.returnValue?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                          
                          <p className="text-xs font-semibold text-gray-700">{formatDate(returnRecord.returnDate)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {invoice.notes && (
                <div className="border-t-2 border-gray-200 pt-6 mt-6">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Notes</h4>
                  <p className="text-sm text-gray-700">{invoice.notes}</p>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-3 border-t">
              <p className="text-xs text-gray-600 text-center">Thank you for your business!</p>
            </div>
          </div>

        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 no-print">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Collect Payment</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            
            {/* Invoice Summary */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Invoice Number</p>
                  <p className="text-lg font-bold text-gray-900">{invoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Customer</p>
                  <p className="text-lg font-bold text-gray-900">{invoice.customerDetails.name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Total Amount</p>
                  <p className="text-lg font-bold text-gray-900">₹{invoice.finalAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Already Paid</p>
                  <p className="text-lg font-bold text-green-600">₹{invoice.payment.totalPaid.toFixed(2)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-semibold text-gray-600">Remaining Amount</p>
                  <p className="text-2xl font-bold text-red-600">₹{invoice.payment.pendingAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handlePaymentUpdate}>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={invoice.payment.pendingAmount}
                    value={paymentData.paymentAmount}
                    onChange={(e) => setPaymentData({...paymentData, paymentAmount: e.target.value})}
                    onWheel={(e) => e.preventDefault()}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentData({...paymentData, paymentAmount: invoice.payment.pendingAmount.toString()})}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold hover:bg-blue-200"
                    >
                      Full Amount
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentData({...paymentData, paymentAmount: (invoice.payment.pendingAmount / 2).toFixed(2)})}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold hover:bg-green-200"
                    >
                      Half Amount
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method *</label>
                  <select
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({...paymentData, paymentMethod: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Payment Date *</label>
                  <input
                    type="date"
                    value={paymentData.paymentDate}
                    onChange={(e) => setPaymentData({...paymentData, paymentDate: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Next Due Date {parseFloat(paymentData.paymentAmount || 0) < invoice.payment.pendingAmount && '*'}
                  </label>
                  <input
                    type="date"
                    value={paymentData.nextDueDate}
                    onChange={(e) => setPaymentData({...paymentData, nextDueDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Transaction ID</label>
                  <input
                    type="text"
                    value={paymentData.transactionId}
                    onChange={(e) => setPaymentData({...paymentData, transactionId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentData({
                      paymentAmount: '',
                      paymentMethod: 'CASH',
                      nextDueDate: '',
                      transactionId: '',
                      notes: ''
                    });
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                >
                  Collect Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Cancel Invoice?</h2>
              <p className="text-gray-600 mb-4">
                Are you sure you want to cancel this invoice? This action will:
              </p>
              <ul className="text-sm text-gray-700 space-y-2 text-left bg-red-50 p-4 rounded-lg mb-4">
                <li>✓ Restore all stock to inventory</li>
                <li>✓ Reverse sales amounts from customer</li>
                <li>✓ Revert payment balances</li>
                <li>✓ Delete all payment records</li>
                <li>✓ Remove invoice permanently</li>
              </ul>
              <p className="text-sm text-red-600 font-semibold">
                This action cannot be undone!
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50"
              >
                No, Keep It
              </button>
              <button
                onClick={handleDeleteInvoice}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Cancelling...
                  </>
                ) : (
                  <>
                    <span>🗑️</span>
                    Yes, Cancel Invoice
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>

    </div>
  );
}

export default InvoiceDetail;
