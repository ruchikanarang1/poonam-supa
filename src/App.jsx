import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Catalogue from './pages/Catalogue';
import Cart from './pages/Cart';
import AdminDashboard from './pages/AdminDashboard';
import LogisticsPortal from './pages/LogisticsPortal';
import TicketsPortal from './pages/TicketsPortal';
import PurchaseOrders from './pages/PurchaseOrders';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <Router>
      <div className="app-container">
        <Navbar toggleSidebar={toggleSidebar} />
        <div className="main-layout">
          <Sidebar isOpen={isSidebarOpen} closeSidebar={closeSidebar} />
          {/* Overlay for mobile sidebar */}
          {isSidebarOpen && (
            <div 
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 999
              }} 
              onClick={closeSidebar}
              className="mobile-overlay"
            />
          )}
          <main className="content-area">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/catalogue" element={<Catalogue />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/transport" element={<LogisticsPortal type="transport" title="Transport Entry" />} />
              <Route path="/bills" element={<LogisticsPortal type="bills" title="Bill Entry" />} />
              <Route path="/tickets" element={<TicketsPortal />} />
              <Route path="/purchase-orders" element={<PurchaseOrders />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
