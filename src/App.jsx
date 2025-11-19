import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/Toast.jsx';
import { useKeepAlive } from './hooks/useKeepAlive.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';

// Stock Management Pages
import AddProduct from './pages/Stock/AddProduct.jsx';
import ViewProduct from './pages/Stock/ViewProduct.jsx';
import ProductDetail from './pages/Stock/ProductDetail.jsx';
import ProductHistory from './pages/Stock/ProductHistory.jsx';
import EditProduct from './pages/Stock/EditProduct.jsx';
import ProductList from './pages/Stock/ProductList.jsx';
import SaleProduct from './pages/Stock/SaleProduct.jsx';
import DamageProduct from './pages/Stock/DamageProduct.jsx';
import ReturnProduct from './pages/Stock/ReturnProduct.jsx';
import LowStock from './pages/Stock/LowStock.jsx';

// Sales Management Pages
import CreateInvoice from './pages/Sales/CreateInvoice.jsx';
import InvoiceList from './pages/Sales/InvoiceList.jsx';
import InvoiceDetail from './pages/Sales/InvoiceDetail.jsx';
import EditInvoice from './pages/Sales/EditInvoice.jsx';
import Customers from './pages/Sales/Customers.jsx';
import CustomerDetail from './pages/Sales/CustomerDetail.jsx';
import Payments from './pages/Sales/Payments.jsx';
import PendingPayments from './pages/Sales/PendingPayments.jsx';
import Returns from './pages/Sales/Returns.jsx';
import ReturnDetail from './pages/Sales/ReturnDetail.jsx';

function App() {
  useKeepAlive(); // Keep backend alive on Render free tier
  
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Authentication */}
          <Route path="/login" element={<Login />} />
          
          {/* Dashboard */}
          <Route path="/" element={<Dashboard />} />
          
          {/* Stock Management Routes */}
          <Route path="/stock/add-product" element={<AddProduct />} />
          <Route path="/stock/view-product" element={<ViewProduct />} />
          <Route path="/stock/product/:productId" element={<ProductDetail />} />
          <Route path="/stock/product/:productId/history" element={<ProductHistory />} />
          <Route path="/stock/edit-product/:productId" element={<EditProduct />} />
          <Route path="/stock/product-list" element={<ProductList />} />
          <Route path="/stock/products" element={<ProductList />} />
          <Route path="/stock/sale-product" element={<SaleProduct />} />
          <Route path="/stock/damage-product" element={<DamageProduct />} />
          <Route path="/stock/return-product" element={<ReturnProduct />} />
          <Route path="/stock/low-stock" element={<LowStock />} />
          
          {/* Sales Management Routes */}
          <Route path="/sales/create-invoice" element={<CreateInvoice />} />
          <Route path="/sales/invoice-list" element={<InvoiceList />} />
          <Route path="/sales/invoice/:invoiceId" element={<InvoiceDetail />} />
          <Route path="/sales/invoice-detail/:invoiceId" element={<InvoiceDetail />} />
          <Route path="/sales/edit-invoice/:id" element={<EditInvoice />} />
          <Route path="/sales/customers" element={<Customers />} />
          <Route path="/sales/customer/:customerId" element={<CustomerDetail />} />
          <Route path="/sales/payments" element={<Payments />} />
          <Route path="/sales/pending-payments" element={<PendingPayments />} />
          <Route path="/sales/returns" element={<Returns />} />
          <Route path="/sales/returns/:returnId" element={<ReturnDetail />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
