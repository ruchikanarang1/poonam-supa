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
  return (
    <Router>
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <div style={{ display: 'flex', flex: 1 }}>
          <Sidebar />
          <main style={{ flex: 1, padding: '1rem' }}>
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
