import React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    Truck, FileText, LayoutDashboard, TicketCheck,
    Package, ShoppingBag, Users, Settings, GitMerge,
    Ticket, ClipboardList, ChevronRight, Building2, PackageSearch, Database,
    ChevronLeft
} from 'lucide-react';

export default function Sidebar({ isOpen, isCollapsed, toggleCollapse, closeSidebar }) {
    const { currentUser, userData, isAdmin } = useAuth();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentTab = searchParams.get('tab') || 'products';
    const onAdminPage = location.pathname === '/admin';

    const roles = userData?.roles || [];
    
    const isActivePath = (path) => location.pathname === path;
    const isActiveTab = (tab) => onAdminPage && currentTab === tab;

    const navLink = (to, icon, label, isActive) => (
        <Link
            to={to}
            title={isCollapsed ? label : ''}
            onClick={() => {
                if (window.innerWidth <= 768) closeSidebar();
            }}
            style={{
                display: 'flex', alignItems: 'center', gap: isCollapsed ? '0' : '0.75rem',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                padding: isCollapsed ? '0.6rem 0' : '0.6rem 1rem', textDecoration: 'none',
                color: isActive ? 'var(--color-accent-blue)' : 'var(--color-text-light)',
                background: isActive ? '#e8f0fe' : 'transparent',
                borderRadius: '6px', fontWeight: isActive ? '600' : 'normal',
                marginBottom: '2px', transition: 'all 0.15s',
                fontSize: '0.9rem',
                minWidth: isCollapsed ? '0' : 'auto'
            }}
        >
            {icon} 
            {!isCollapsed && label}
            {isActive && !isCollapsed && <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--color-accent-blue)' }} />}
        </Link>
    );

    const tabLink = (tab, icon, label) => navLink(
        `/admin?tab=${tab}`, icon, label, isActiveTab(tab)
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
                    zIndex: 1001,
                    transition: 'all 0.2s'
                }}
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* --- Global --- */}
            {navLink('/', <LayoutDashboard size={18} />, 'Home / Catalogue', isActivePath('/'))}
            {divider()}

            {/* --- Logged in only --- */}
            {currentUser && (
                <>
                    {/* --- Employee Portals --- */}
                    {sectionLabel('Employee Portals')}

                    {isAdmin && (
                        navLink('/admin?tab=reconciliation', <GitMerge size={18} color={isActiveTab('reconciliation') ? 'var(--color-accent-blue)' : 'gray'} />, 'Logistics Matcher', isActiveTab('reconciliation'))
                    )}

                    {isAdmin && (
                        navLink('/logistics-history', <Database size={18} color={isActivePath('/logistics-history') ? 'var(--color-accent-blue)' : 'gray'} />, 'Logistics Archive', isActivePath('/logistics-history'))
                    )}

                    {(isAdmin || roles.includes('transport')) &&
                        navLink('/transport', <Truck size={18} color={isActivePath('/transport') ? 'var(--color-accent-orange)' : 'gray'} />, 'Transport Entry', isActivePath('/transport'))
                    }
                    {(isAdmin || roles.includes('bills')) &&
                        navLink('/bills', <FileText size={18} color={isActivePath('/bills') ? 'var(--color-accent-blue)' : 'gray'} />, 'Bill Entry', isActivePath('/bills'))
                    }
                    {(isAdmin || roles.includes('tickets')) &&
                        navLink('/tickets', <TicketCheck size={18} color={isActivePath('/tickets') ? '#6f42c1' : 'gray'} />, 'My Tickets', isActivePath('/tickets'))
                    }
                    {(isAdmin || roles.includes('orders')) &&
                        navLink('/purchase-orders', <ShoppingBag size={18} color={isActivePath('/purchase-orders') ? '#e67e22' : 'gray'} />, 'Purchase Orders', isActivePath('/purchase-orders'))
                    }
                    {(isAdmin || roles.includes('checkin') || roles.includes('transport')) &&
                        navLink('/check-in', <PackageSearch size={18} color={isActivePath('/check-in') ? 'var(--color-accent-orange)' : 'gray'} />, 'Goods Check-In', isActivePath('/check-in'))
                    }

                    {/* --- Admin Only --- */}
                    {isAdmin && (
                        <>
                            {divider()}
                            {sectionLabel('Catalogue')}
                            {tabLink('overview', <LayoutDashboard size={16} color={isActiveTab('overview') ? 'var(--color-accent-blue)' : 'gray'} />, 'Dashboard Overview')}
                            {tabLink('products', <Package size={16} color={isActiveTab('products') ? 'var(--color-accent-blue)' : 'gray'} />, 'Manage Products')}
                            {tabLink('orders', <ShoppingBag size={16} color={isActiveTab('orders') ? 'var(--color-accent-blue)' : 'gray'} />, 'View Orders')}

                            {divider()}
                            {sectionLabel('Team & Forms')}
                            {tabLink('team', <Users size={16} color={isActiveTab('team') ? 'var(--color-accent-blue)' : 'gray'} />, 'Team & Roles')}
                            {tabLink('forms', <Settings size={16} color={isActiveTab('forms') ? 'var(--color-accent-blue)' : 'gray'} />, 'Dynamic Forms')}

                            {divider()}
                            {sectionLabel('Logistics')}

                            {divider()}
                            {sectionLabel('Tickets')}
                            {tabLink('ticket_builder', <ClipboardList size={16} color={isActiveTab('ticket_builder') ? 'var(--color-accent-blue)' : 'gray'} />, 'Ticket Categories')}
                            {tabLink('ticket_reviews', <Ticket size={16} color={isActiveTab('ticket_reviews') ? 'var(--color-accent-blue)' : 'gray'} />, 'Ticket Reviews')}

                            {divider()}
                            {sectionLabel('Databases')}
                            {tabLink('suppliers', <Building2 size={16} color={isActiveTab('suppliers') ? 'var(--color-accent-blue)' : 'gray'} />, 'Supplier Database')}
                            {tabLink('transports', <Truck size={16} color={isActiveTab('transports') ? 'var(--color-accent-blue)' : 'gray'} />, 'Transport Database')}
                            {tabLink('brand_registry', <Database size={16} color={isActiveTab('brand_registry') ? 'var(--color-accent-blue)' : 'gray'} />, 'Vendor-Brand Registry')}

                        </>
                    )}
                </>
            )}
        </aside>
    );
}
