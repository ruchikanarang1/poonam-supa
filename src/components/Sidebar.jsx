import React, { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    Truck, FileText, LayoutDashboard, TicketCheck,
    Package, ShoppingBag, Users, Settings, GitMerge,
    Ticket, ClipboardList, ChevronRight, Building2, PackageSearch, Database,
    ChevronLeft, ChevronDown, FolderOpen, FileBarChart
} from 'lucide-react';

export default function Sidebar({ isOpen, isCollapsed, toggleCollapse, closeSidebar }) {
    const { currentUser, userData, isAdmin } = useAuth();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentTab = searchParams.get('tab') || 'products';
    const onAdminPage = location.pathname === '/admin';

    const roles = userData?.roles || [];
    
    // State for collapsible categories
    const [expandedCategories, setExpandedCategories] = useState({
        purchaseOrders: true,
        customerOrders: true,
        catalogue: true,
        databases: true
    });

    const toggleCategory = (category) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };
    
    const isActivePath = (path) => location.pathname === path;
    const isActiveTab = (tab) => onAdminPage && currentTab === tab;

    const navLink = (to, icon, label, isActive, indent = false) => (
        <Link
            to={to}
            title={isCollapsed ? label : ''}
            onClick={() => {
                if (window.innerWidth <= 768) closeSidebar();
            }}
            style={{
                display: 'flex', alignItems: 'center', gap: isCollapsed ? '0' : '0.75rem',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                padding: isCollapsed ? '0.6rem 0' : '0.6rem 1rem', 
                paddingLeft: indent && !isCollapsed ? '2rem' : (isCollapsed ? '0' : '1rem'),
                textDecoration: 'none',
                color: isActive ? 'var(--color-accent-blue)' : 'var(--color-text-light)',
                background: isActive ? '#e8f0fe' : 'transparent',
                borderRadius: '6px', fontWeight: isActive ? '600' : 'normal',
                marginBottom: '2px', transition: 'all 0.15s',
                fontSize: indent ? '0.85rem' : '0.9rem',
                minWidth: isCollapsed ? '0' : 'auto'
            }}
        >
            {icon} 
            {!isCollapsed && label}
            {isActive && !isCollapsed && <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--color-accent-blue)' }} />}
        </Link>
    );

    const categoryHeader = (label, icon, isExpanded, onToggle) => (
        <div
            onClick={onToggle}
            style={{
                display: 'flex', alignItems: 'center', gap: isCollapsed ? '0' : '0.75rem',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                padding: isCollapsed ? '0.6rem 0' : '0.6rem 1rem',
                cursor: 'pointer',
                color: 'var(--color-text)',
                background: '#f8fafc',
                borderRadius: '6px',
                fontWeight: '700',
                marginBottom: '4px',
                fontSize: '0.85rem',
                transition: 'all 0.15s',
                border: '1px solid #e2e8f0'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {icon}
                {!isCollapsed && label}
            </div>
            {!isCollapsed && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
        </div>
    );

    const tabLink = (tab, icon, label, indent = false) => navLink(
        `/admin?tab=${tab}`, icon, label, isActiveTab(tab), indent
    );

    const sectionLabel = (text) => !isCollapsed && (
        <div style={{
            fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px',
            color: '#999', fontWeight: '700', padding: '0.75rem 1rem 0.25rem'
        }}>
            {text}
        </div>
    );

    const divider = () => <div style={{ borderBottom: '1px solid #eee', margin: '0.5rem 0' }} />;

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
            {/* Collapse Toggle Arrow (Desktop Only) */}
            <button 
                onClick={toggleCollapse}
                className="hide-on-mobile"
                style={{
                    position: 'absolute',
                    right: '-12px',
                    top: '20px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'white',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    zIndex: 1002,
                    transition: 'all 0.2s'
                }}
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            <div style={{ overflowY: 'auto', overflowX: 'hidden', height: '100%', paddingRight: '4px' }}>
            {/* --- Global --- */}
            {navLink('/', <LayoutDashboard size={18} />, 'Home / Catalogue', isActivePath('/'), false)}
            {divider()}

            {/* --- Logged in only --- */}
            {currentUser && (
                <>
                    {/* --- PURCHASE ORDERS CATEGORY --- */}
                    {(isAdmin || roles.includes('transport') || roles.includes('bills') || roles.includes('orders') || roles.includes('checkin')) && (
                        <>
                            {categoryHeader(
                                'Purchase Orders',
                                <ShoppingBag size={18} color="var(--color-accent-blue)" />,
                                expandedCategories.purchaseOrders,
                                () => toggleCategory('purchaseOrders')
                            )}
                            {expandedCategories.purchaseOrders && !isCollapsed && (
                                <div style={{ marginBottom: '0.5rem' }}>
                                    {(isAdmin || roles.includes('orders')) &&
                                        navLink('/purchase-orders', <ShoppingBag size={16} color={isActivePath('/purchase-orders') ? '#e67e22' : 'gray'} />, 'Purchase Orders', isActivePath('/purchase-orders'), true)
                                    }
                                    {(isAdmin || roles.includes('transport')) &&
                                        navLink('/transport', <Truck size={16} color={isActivePath('/transport') ? 'var(--color-accent-orange)' : 'gray'} />, 'Transport Entry', isActivePath('/transport'), true)
                                    }
                                    {(isAdmin || roles.includes('bills')) &&
                                        navLink('/bills', <FileText size={16} color={isActivePath('/bills') ? 'var(--color-accent-blue)' : 'gray'} />, 'Bill Entry', isActivePath('/bills'), true)
                                    }
                                    {(isAdmin || roles.includes('checkin') || roles.includes('transport')) &&
                                        navLink('/check-in', <PackageSearch size={16} color={isActivePath('/check-in') ? 'var(--color-accent-orange)' : 'gray'} />, 'Goods Check-In', isActivePath('/check-in'), true)
                                    }
                                </div>
                            )}
                        </>
                    )}

                    {/* --- CUSTOMER ORDERS CATEGORY --- */}
                    {(isAdmin || roles.includes('orders')) && (
                        <>
                            {categoryHeader(
                                'Customer Orders',
                                <ShoppingBag size={18} color="#22c55e" />,
                                expandedCategories.customerOrders,
                                () => toggleCategory('customerOrders')
                            )}
                            {expandedCategories.customerOrders && !isCollapsed && (
                                <div style={{ marginBottom: '0.5rem' }}>
                                    {navLink('/customer-orders', <ShoppingBag size={16} color={isActivePath('/customer-orders') ? '#22c55e' : 'gray'} />, 'Orders', isActivePath('/customer-orders'), true)}
                                    {navLink('/customer-payments', <FileText size={16} color={isActivePath('/customer-payments') ? '#22c55e' : 'gray'} />, 'Payments/Collection', isActivePath('/customer-payments'), true)}
                                    {navLink('/manage-customers', <Users size={16} color={isActivePath('/manage-customers') ? '#22c55e' : 'gray'} />, 'Manage Customers', isActivePath('/manage-customers'), true)}
                                </div>
                            )}
                        </>
                    )}

                    {/* --- CATALOGUE CATEGORY --- */}
                    {isAdmin && (
                        <>
                            {categoryHeader(
                                'Catalogue',
                                <Package size={18} color="var(--color-accent-blue)" />,
                                expandedCategories.catalogue,
                                () => toggleCategory('catalogue')
                            )}
                            {expandedCategories.catalogue && !isCollapsed && (
                                <div style={{ marginBottom: '0.5rem' }}>
                                    {tabLink('products', <Package size={16} color={isActiveTab('products') ? 'var(--color-accent-blue)' : 'gray'} />, 'Manage Products', true)}
                                </div>
                            )}
                        </>
                    )}

                    {/* --- RECONCILIATION (Direct Link) --- */}
                    {isAdmin && (
                        navLink('/admin?tab=reconciliation', <GitMerge size={18} color={isActiveTab('reconciliation') ? 'var(--color-accent-blue)' : 'gray'} />, 'Reconciliation', isActiveTab('reconciliation'), false)
                    )}

                    {/* --- REPORTS (Direct Link) --- */}
                    {isAdmin && (
                        navLink('/logistics-history', <FileBarChart size={18} color={isActivePath('/logistics-history') ? 'var(--color-accent-blue)' : 'gray'} />, 'Reports', isActivePath('/logistics-history'), false)
                    )}

                    {/* --- DATABASES CATEGORY --- */}
                    {isAdmin && (
                        <>
                            {categoryHeader(
                                'Databases',
                                <Database size={18} color="var(--color-accent-blue)" />,
                                expandedCategories.databases,
                                () => toggleCategory('databases')
                            )}
                            {expandedCategories.databases && !isCollapsed && (
                                <div style={{ marginBottom: '0.5rem' }}>
                                    {tabLink('transports', <Truck size={16} color={isActiveTab('transports') ? 'var(--color-accent-blue)' : 'gray'} />, 'Transport Database', true)}
                                    {tabLink('suppliers', <Building2 size={16} color={isActiveTab('suppliers') ? 'var(--color-accent-blue)' : 'gray'} />, 'Supplier Database', true)}
                                    {tabLink('brand_registry', <FolderOpen size={16} color={isActiveTab('brand_registry') ? 'var(--color-accent-blue)' : 'gray'} />, 'Vendor-Brand Registry', true)}
                                </div>
                            )}
                        </>
                    )}

                    {/* --- Other Links --- */}
                    {(isAdmin || roles.includes('tickets')) && (
                        <>
                            {divider()}
                            {navLink('/tickets', <TicketCheck size={18} color={isActivePath('/tickets') ? '#6f42c1' : 'gray'} />, 'My Tickets', isActivePath('/tickets'), false)}
                        </>
                    )}

                    {/* --- Admin Only --- */}
                    {isAdmin && (
                        <>
                            {divider()}
                            {sectionLabel('Admin')}
                            {tabLink('overview', <LayoutDashboard size={16} color={isActiveTab('overview') ? 'var(--color-accent-blue)' : 'gray'} />, 'Dashboard Overview', false)}
                            {tabLink('orders', <ShoppingBag size={16} color={isActiveTab('orders') ? 'var(--color-accent-blue)' : 'gray'} />, 'Customer Orders', false)}
                            {tabLink('team', <Users size={16} color={isActiveTab('team') ? 'var(--color-accent-blue)' : 'gray'} />, 'Team & Roles', false)}
                            {tabLink('forms', <Settings size={16} color={isActiveTab('forms') ? 'var(--color-accent-blue)' : 'gray'} />, 'Dynamic Forms', false)}
                            {tabLink('ticket_builder', <ClipboardList size={16} color={isActiveTab('ticket_builder') ? 'var(--color-accent-blue)' : 'gray'} />, 'Ticket Categories', false)}
                            {tabLink('ticket_reviews', <Ticket size={16} color={isActiveTab('ticket_reviews') ? 'var(--color-accent-blue)' : 'gray'} />, 'Ticket Reviews', false)}
                        </>
                    )}
                </>
            )}
            </div>
        </aside>
    );
}
