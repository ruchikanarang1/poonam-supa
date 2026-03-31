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
import ProfileSetup from './components/ProfileSetup';
import LogisticsArchive from './components/admin/LogisticsArchive';
import GoodsCheckIn from './pages/GoodsCheckIn';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { currentUser } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleCollapse = () => setIsSidebarCollapsed(!isSidebarCollapsed);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <Router>
      <div className="app-container">
        <Navbar toggleSidebar={toggleSidebar} />
        <div className="main-layout">
          <Sidebar isOpen={isSidebarOpen} isCollapsed={isSidebarCollapsed} toggleCollapse={toggleCollapse} closeSidebar={closeSidebar} />
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
          <main className={`content-area ${isSidebarCollapsed ? 'collapsed' : ''}`}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/catalogue" element={<Catalogue />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/transport" element={<LogisticsPortal type="transport" title="Transport Entry" />} />
              <Route path="/bills" element={<LogisticsPortal type="bills" title="Bill Entry" />} />
              <Route path="/tickets" element={<TicketsPortal />} />
              <Route path="/purchase-orders" element={<PurchaseOrders />} />
              <Route path="/check-in" element={<GoodsCheckIn />} />
              <Route path="/logistics-history" element={<LogisticsArchive />} />
              <Route path="/setup-company" element={<ProfileSetup />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
