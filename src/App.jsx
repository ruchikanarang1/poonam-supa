import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Catalogue from './pages/Catalogue';
import Cart from './pages/Cart';
import AdminDashboard from './pages/AdminDashboard';
import LogisticsPortal from './pages/LogisticsPortal';
import TicketsPortal from './pages/TicketsPortal';
import PurchaseOrders from './pages/PurchaseOrders';
import ProfileSetup from './components/ProfileSetup';
import LogisticsArchive from './components/admin/LogisticsArchive';
import GoodsCheckIn from './pages/GoodsCheckIn';
import Home from './pages/Home';
import LandingPage from './pages/LandingPage';
import AccessPending from './pages/AccessPending';
import CustomerStore from './pages/CustomerStore';
import { useAuth } from './contexts/AuthContext';

// ── Full-screen layout for ERP (with navbar + sidebar) ──────────────────────
function ERPShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="app-container">
      <Navbar toggleSidebar={() => setIsSidebarOpen(o => !o)} />
      <div className="main-layout">
        <Sidebar
          isOpen={isSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          toggleCollapse={() => setIsSidebarCollapsed(c => !c)}
          closeSidebar={() => setIsSidebarOpen(false)}
        />
        {isSidebarOpen && (
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 999 }}
            onClick={() => setIsSidebarOpen(false)}
            className="mobile-overlay"
          />
        )}
        <main className={`content-area ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <Routes>
            <Route path="/"                   element={<Home />} />
            <Route path="/catalogue"          element={<Catalogue />} />
            <Route path="/cart"               element={<Cart />} />
            <Route path="/admin"              element={<AdminDashboard />} />
            <Route path="/transport"          element={<LogisticsPortal type="transport" title="Transport Entry" />} />
            <Route path="/bills"              element={<LogisticsPortal type="bills" title="Bill Entry" />} />
            <Route path="/tickets"            element={<TicketsPortal />} />
            <Route path="/purchase-orders"    element={<PurchaseOrders />} />
            <Route path="/check-in"           element={<GoodsCheckIn />} />
            <Route path="/logistics-history"  element={<LogisticsArchive />} />
            <Route path="/setup-company"      element={<ProfileSetup />} />
            {/* Catch-all inside ERP */}
            <Route path="*"                   element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

// ── Root router: decides what the user sees ──────────────────────────────────
function AppRouter() {
  const { currentUser, userData, isApproved, isSuperAdmin, companies } = useAuth();

  // /store is always public — no auth needed
  // handled at the Router level below

  if (!currentUser) {
    // Not logged in → landing page (public)
    return <LandingPage />;
  }

  if (!isApproved && !isSuperAdmin) {
    // Logged in but not yet approved by admin
    return <AccessPending />;
  }

  if (currentUser && userData && companies.length === 0 && !isSuperAdmin) {
    // Approved but hasn't created a company yet
    return <ProfileSetup />;
  }

  // Fully authenticated + approved + has company → ERP
  return <ERPShell />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public customer storefront — no auth, no sidebar */}
        <Route path="/store" element={<CustomerStore />} />
        {/* Everything else goes through auth guard */}
        <Route path="/*" element={<AppRouter />} />
      </Routes>
    </Router>
  );
}
