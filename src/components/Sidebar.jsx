import React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    Truck, FileText, LayoutDashboard, TicketCheck,
    Package, ShoppingBag, Users, Settings, GitMerge,
    Ticket, ClipboardList, ChevronRight, Building2
} from 'lucide-react';

export default function Sidebar({ isOpen, closeSidebar }) {
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
            onClick={() => {
                if (window.innerWidth <= 768) closeSidebar();
            }}
            style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.6rem 1rem', textDecoration: 'none',
                color: isActive ? 'var(--color-accent-blue)' : 'var(--color-text-light)',
                background: isActive ? '#e8f0fe' : 'transparent',
                borderRadius: '6px', fontWeight: isActive ? '600' : 'normal',
                marginBottom: '2px', transition: 'background 0.15s',
                fontSize: '0.9rem'
            }}
        >
            {icon} {label}
            {isActive && <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--color-accent-blue)' }} />}
        </Link>
    );

    const tabLink = (tab, icon, label) => navLink(
        `/admin?tab=${tab}`, icon, label, isActiveTab(tab)
    );

    const sectionLabel = (text) => (
        <div style={{
            fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px',
            color: '#999', fontWeight: '700', padding: '0.75rem 1rem 0.25rem'
        }}>
            {text}
        </div>
    );

    const divider = () => <div style={{ borderBottom: '1px solid #eee', margin: '0.5rem 0' }} />;

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>

            {/* --- Global --- */}
            {navLink('/', <LayoutDashboard size={18} />, 'Home / Catalogue', isActivePath('/'))}
            {divider()}

            {/* --- Logged in only --- */}
            {currentUser && (
                <>
                    {/* --- Employee Portals --- */}
                    {sectionLabel('Employee Portals')}

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
                            {tabLink('reconciliation', <GitMerge size={16} color={isActiveTab('reconciliation') ? 'var(--color-accent-blue)' : 'gray'} />, 'Logistics Matcher')}

                            {divider()}
                            {sectionLabel('Tickets')}
                            {tabLink('ticket_builder', <ClipboardList size={16} color={isActiveTab('ticket_builder') ? 'var(--color-accent-blue)' : 'gray'} />, 'Ticket Categories')}
                            {tabLink('ticket_reviews', <Ticket size={16} color={isActiveTab('ticket_reviews') ? 'var(--color-accent-blue)' : 'gray'} />, 'Ticket Reviews')}

                            {divider()}
                            {sectionLabel('Procurement')}
                            {tabLink('suppliers', <Building2 size={16} color={isActiveTab('suppliers') ? 'var(--color-accent-blue)' : 'gray'} />, 'Supplier Database')}
                        </>
                    )}
                </>
            )}
        </aside>
    );
}
