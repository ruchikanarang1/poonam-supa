import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, Search, FileText, Phone, Mail, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { updateOrderStatus, generateInvoice, sendNotification } from '../lib/orderLifecycle';

export default function CustomerOrders() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('received');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [company, setCompany] = useState(null);

  // Load company info
  useEffect(() => {
    if (profile?.company_id) {
      supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single()
        .then(({ data }) => setCompany(data));
    }
  }, [profile]);

  // Load orders
  useEffect(() => {
    loadOrders();
  }, [activeTab, profile]);

  const loadOrders = async () => {
    if (!profile?.company_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('status', activeTab)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsSent = async (order) => {
    if (!window.confirm('Mark this order as sent/out for delivery?')) return;

    const result = await updateOrderStatus(order.id, 'sent', user.id);
    if (result.success) {
      alert('Order marked as sent!');
      loadOrders();
    } else {
      alert('Error: ' + result.error);
    }
  };

  const handleGenerateInvoice = async (order) => {
    const result = await generateInvoice(order, company);
    if (result.success) {
      alert('Invoice generated and downloaded!');
    } else {
      alert('Error: ' + result.error);
    }
  };

  const handleSendNotification = async (order, channel) => {
    const result = await sendNotification(order.id, 'status_update', channel);
    if (result.success) {
      alert(`${channel.toUpperCase()} notification sent!`);
    } else {
      alert('Error: ' + result.error);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.customer_name?.toLowerCase().includes(query) ||
      order.customer_phone?.includes(query) ||
      order.customer_email?.toLowerCase().includes(query) ||
      order.id.toLowerCase().includes(query)
    );
  });

  const tabs = [
    { id: 'received', label: 'New Orders', icon: Package, color: '#FF6A00' },
    { id: 'sent', label: 'Out for Delivery', icon: Truck, color: '#0ea5e9' },
    { id: 'payment_received', label: 'Completed', icon: CheckCircle, color: '#22c55e' }
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>
          Customer Orders
        </h1>
        <p style={{ color: '#64748b', margin: 0 }}>
          Manage orders from your public website
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        borderBottom: '2px solid #e2e8f0',
        flexWrap: 'wrap'
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = orders.length;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '1rem 1.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: isActive ? tab.color : '#64748b',
                fontWeight: isActive ? 700 : 500,
                borderBottom: isActive ? `3px solid ${tab.color}` : '3px solid transparent',
                marginBottom: '-2px',
                transition: 'all 0.2s'
              }}
            >
              <Icon size={20} />
              {tab.label}
              {isActive && count > 0 && (
                <span style={{
                  background: tab.color,
                  color: 'white',
                  borderRadius: '999px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search
            size={20}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8'
            }}
          />
          <input
            type="text"
            placeholder="Search by customer name, phone, email, or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.5rem',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '0.95rem'
            }}
          />
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          Loading orders...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '2px dashed #e2e8f0'
        }}>
          <Package size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
          <p style={{ color: '#64748b', fontSize: '1.1rem', margin: 0 }}>
            {searchQuery ? 'No orders found matching your search' : 'No orders in this category'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              activeTab={activeTab}
              onMarkAsSent={handleMarkAsSent}
              onGenerateInvoice={handleGenerateInvoice}
              onSendNotification={handleSendNotification}
              onViewDetails={setSelectedOrder}
            />
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onGenerateInvoice={handleGenerateInvoice}
          onSendNotification={handleSendNotification}
        />
      )}
    </div>
  );
}

function OrderCard({ order, activeTab, onMarkAsSent, onGenerateInvoice, onSendNotification, onViewDetails }) {
  const statusColors = {
    received: '#FF6A00',
    sent: '#0ea5e9',
    payment_received: '#22c55e'
  };

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '1.5rem',
      transition: 'all 0.2s',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
    onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
    onClick={() => onViewDetails(order)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {order.customer_name || 'Customer'}
            </h3>
            <span style={{
              background: statusColors[order.status] + '20',
              color: statusColors[order.status],
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              {order.status === 'received' ? 'New' : order.status === 'sent' ? 'Out for Delivery' : 'Completed'}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
            Order ID: {order.id.substring(0, 8)} • {new Date(order.created_at).toLocaleDateString()}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            ₹{order.total?.toFixed(2) || '0.00'}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {order.items?.length || 0} items
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {order.customer_phone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.9rem' }}>
            <Phone size={16} />
            {order.customer_phone}
          </div>
        )}
        {order.customer_email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.9rem' }}>
            <Mail size={16} />
            {order.customer_email}
          </div>
        )}
      </div>

      {order.customer_address && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
          <MapPin size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{order.customer_address}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
        {activeTab === 'received' && (
          <button
            onClick={() => onMarkAsSent(order)}
            style={{
              background: '#0ea5e9',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Truck size={16} />
            Mark as Sent
          </button>
        )}
        <button
          onClick={() => onGenerateInvoice(order)}
          style={{
            background: 'white',
            color: '#FF6A00',
            border: '1px solid #FF6A00',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <FileText size={16} />
          Invoice
        </button>
      </div>
    </div>
  );
}

function OrderDetailsModal({ order, onClose, onGenerateInvoice, onSendNotification }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '2rem'
    }}
    onClick={onClose}
    >
      <div style={{
        background: 'white',
        borderRadius: '12px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '2rem'
      }}
      onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>
          Order Details
        </h2>

        {/* Customer Info */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Customer Information</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div><strong>Name:</strong> {order.customer_name}</div>
            <div><strong>Phone:</strong> {order.customer_phone}</div>
            {order.customer_email && <div><strong>Email:</strong> {order.customer_email}</div>}
            {order.customer_address && <div><strong>Address:</strong> {order.customer_address}</div>}
          </div>
        </div>

        {/* Items */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Order Items</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>Item</th>
                <th style={{ textAlign: 'center', padding: '0.75rem' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '0.75rem' }}>Price</th>
                <th style={{ textAlign: 'right', padding: '0.75rem' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem' }}>{item.name}</td>
                  <td style={{ textAlign: 'center', padding: '0.75rem' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '0.75rem' }}>₹{item.price}</td>
                  <td style={{ textAlign: 'right', padding: '0.75rem' }}>₹{(item.quantity * item.price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #e2e8f0', fontWeight: 700 }}>
                <td colSpan="3" style={{ textAlign: 'right', padding: '0.75rem' }}>Grand Total:</td>
                <td style={{ textAlign: 'right', padding: '0.75rem' }}>₹{order.total?.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={() => onGenerateInvoice(order)}
            style={{
              background: '#FF6A00',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Generate Invoice
          </button>
          <button
            onClick={onClose}
            style={{
              background: '#e2e8f0',
              color: '#0f172a',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
