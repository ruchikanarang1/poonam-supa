import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
    FileText, TrendingUp, Package, Users, Award, 
    DollarSign, Truck, ShoppingCart, Search, Filter,
    Download, Printer, Save, RefreshCw, X, MapPin, Calendar,
    ChevronUp, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { format, startOfWeek, startOfMonth, startOfQuarter, startOfYear, subMonths, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import GenericAutocomplete from '../components/GenericAutocomplete';
import { 
    getSuppliers, getTransports, getVendorBrandRegistry,
    getTransportEntriesFiltered, getBillsEntriesFiltered, getInventoryReport,
    getVendorPerformanceMetrics, getBrandAnalysisMetrics, getFinancialSummary,
    getDeliveryTrackingReport, getPurchaseOrdersReport
} from '../lib/db';

// Right Sidebar Filters Component
function RightSidebarFilters({ filters, onFilterChange, reportType, currentCompanyId }) {
    const [vendors, setVendors] = useState([]);
    const [transports, setTransports] = useState([]);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        loadFilterOptions();
    }, [currentCompanyId]);
    
    const loadFilterOptions = async () => {
        setLoading(true);
        try {
            const [vendorsList, transportsList, brandsList] = await Promise.all([
                getSuppliers(currentCompanyId),
                getTransports(currentCompanyId),
                getVendorBrandRegistry(currentCompanyId)
            ]);
            
            setVendors(vendorsList);
            setTransports(transportsList);
            
            // Extract unique brands
            const uniqueBrands = [...new Set(brandsList.map(b => b.brand_name).filter(Boolean))];
            setBrands(uniqueBrands);
        } catch (err) {
            console.error('Failed to load filter options:', err);
        } finally {
            setLoading(false);
        }
    };
    
    const datePresets = [
        { label: 'Today', getValue: () => ({ start: format(new Date(), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') }) },
        { label: 'This Week', getValue: () => ({ start: format(startOfWeek(new Date()), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') }) },
        { label: 'This Month', getValue: () => ({ start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') }) },
        { label: 'Last Month', getValue: () => ({ start: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'), end: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd') }) },
        { label: 'This Quarter', getValue: () => ({ start: format(startOfQuarter(new Date()), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') }) },
        { label: 'This Year', getValue: () => ({ start: format(startOfYear(new Date()), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') }) }
    ];
    
    const handleDatePreset = (preset) => {
        const dateRange = preset.getValue();
        onFilterChange({ ...filters, dateRange });
    };
    
    const handleClearAll = () => {
        onFilterChange({
            dateRange: { start: '', end: '' },
            brands: [],
            vendors: [],
            locations: [],
            categories: [],
            transportCompanies: [],
            statuses: []
        });
    };
    
    const toggleArrayFilter = (filterKey, value) => {
        const currentValues = filters[filterKey] || [];
        const newValues = currentValues.includes(value)
            ? currentValues.filter(v => v !== value)
            : [...currentValues, value];
        onFilterChange({ ...filters, [filterKey]: newValues });
    };
    
    return (
        <div style={{
            width: '280px',
            background: 'white',
            borderLeft: '1px solid var(--color-border)',
            height: '100%',
            overflowY: 'auto',
            padding: '1rem',
            flexShrink: 0
        }}>
            {/* Header */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid var(--color-border)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Filter size={16} color="var(--color-accent-blue)" />
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Filters</h3>
                </div>
                <button
                    onClick={handleClearAll}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        fontSize: '0.7rem',
                        color: 'var(--color-accent-blue)',
                        fontWeight: 500
                    }}
                >
                    Clear All
                </button>
            </div>
            
            {loading ? (
                <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                    Loading...
                </div>
            ) : (
                <>
                    {/* Date Range Section */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 700, 
                            color: 'var(--color-text-light)',
                            textTransform: 'uppercase',
                            marginBottom: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <Calendar size={12} />
                            Date Range
                        </div>
                        
                        {/* Date Presets */}
                        <div style={{ 
                            display: 'flex', 
                            gap: '0.4rem', 
                            flexWrap: 'wrap',
                            marginBottom: '0.5rem'
                        }}>
                            {datePresets.map(preset => (
                                <button
                                    key={preset.label}
                                    onClick={() => handleDatePreset(preset)}
                                    style={{
                                        padding: '0.3rem 0.5rem',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '4px',
                                        background: 'white',
                                        fontSize: '0.7rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--color-accent-blue)';
                                        e.currentTarget.style.background = '#f8f9fa';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--color-border)';
                                        e.currentTarget.style.background = 'white';
                                    }}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                        
                        {/* Custom Date Inputs */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div>
                                <label style={{ 
                                    fontSize: '0.7rem', 
                                    color: 'var(--color-text-light)',
                                    display: 'block',
                                    marginBottom: '0.25rem'
                                }}>
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={filters.dateRange.start}
                                    onChange={(e) => onFilterChange({ 
                                        ...filters, 
                                        dateRange: { ...filters.dateRange, start: e.target.value }
                                    })}
                                    style={{
                                        width: '100%',
                                        padding: '0.4rem',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ 
                                    fontSize: '0.7rem', 
                                    color: 'var(--color-text-light)',
                                    display: 'block',
                                    marginBottom: '0.25rem'
                                }}>
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={filters.dateRange.end}
                                    onChange={(e) => onFilterChange({ 
                                        ...filters, 
                                        dateRange: { ...filters.dateRange, end: e.target.value }
                                    })}
                                    style={{
                                        width: '100%',
                                        padding: '0.4rem',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* Vendor Filter */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 700, 
                            color: 'var(--color-text-light)',
                            textTransform: 'uppercase',
                            display: 'block',
                            marginBottom: '0.5rem'
                        }}>
                            Vendors ({filters.vendors?.length || 0})
                        </label>
                        <div style={{ 
                            maxHeight: '120px', 
                            overflowY: 'auto',
                            border: '1px solid var(--color-border)',
                            borderRadius: '4px',
                            padding: '0.4rem'
                        }}>
                            {vendors.length === 0 ? (
                                <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                                    No vendors
                                </div>
                            ) : (
                                vendors.map(vendor => (
                                    <label 
                                        key={vendor.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            padding: '0.3rem',
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={filters.vendors?.includes(vendor.name) || false}
                                            onChange={() => toggleArrayFilter('vendors', vendor.name)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <span>{vendor.name}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                    
                    {/* Transport Company Filter */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 700, 
                            color: 'var(--color-text-light)',
                            textTransform: 'uppercase',
                            display: 'block',
                            marginBottom: '0.5rem'
                        }}>
                            Transport ({filters.transportCompanies?.length || 0})
                        </label>
                        <div style={{ 
                            maxHeight: '120px', 
                            overflowY: 'auto',
                            border: '1px solid var(--color-border)',
                            borderRadius: '4px',
                            padding: '0.4rem'
                        }}>
                            {transports.length === 0 ? (
                                <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                                    No transports
                                </div>
                            ) : (
                                transports.map(transport => (
                                    <label 
                                        key={transport.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            padding: '0.3rem',
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={filters.transportCompanies?.includes(transport.name) || false}
                                            onChange={() => toggleArrayFilter('transportCompanies', transport.name)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <span>{transport.name}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                    
                    {/* Brand Filter */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 700, 
                            color: 'var(--color-text-light)',
                            textTransform: 'uppercase',
                            display: 'block',
                            marginBottom: '0.5rem'
                        }}>
                            Brands ({filters.brands?.length || 0})
                        </label>
                        <div style={{ 
                            maxHeight: '120px', 
                            overflowY: 'auto',
                            border: '1px solid var(--color-border)',
                            borderRadius: '4px',
                            padding: '0.4rem'
                        }}>
                            {brands.length === 0 ? (
                                <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                                    No brands
                                </div>
                            ) : (
                                brands.map(brand => (
                                    <label 
                                        key={brand}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            padding: '0.3rem',
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={filters.brands?.includes(brand) || false}
                                            onChange={() => toggleArrayFilter('brands', brand)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <span>{brand}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// Report Type Selector Component - Compact Dropdown
function ReportTypeSelector({ reportType, onReportTypeChange }) {
    const [isOpen, setIsOpen] = useState(false);
    
    const reportTypes = [
        { id: 'transport-entries', label: 'Transport Entries', icon: Truck },
        { id: 'bills-entries', label: 'Bills Entries', icon: FileText },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'vendor-performance', label: 'Vendor Performance', icon: Users },
        { id: 'brand-analysis', label: 'Brand Analysis', icon: Award },
        { id: 'financial-summary', label: 'Financial Summary', icon: DollarSign },
        { id: 'delivery-tracking', label: 'Delivery Tracking', icon: MapPin },
        { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart }
    ];
    
    const currentReport = reportTypes.find(r => r.id === reportType);
    const CurrentIcon = currentReport?.icon || FileText;
    
    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.6rem 1rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    background: 'white',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minWidth: '220px',
                    justifyContent: 'space-between',
                    color: 'var(--color-accent-blue)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CurrentIcon size={18} />
                    <span>{currentReport?.label}</span>
                </div>
                <ChevronDown size={16} style={{ 
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                }} />
            </button>
            
            {isOpen && (
                <>
                    <div 
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 999
                        }}
                        onClick={() => setIsOpen(false)}
                    />
                    <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        background: 'white',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 1000,
                        maxHeight: '400px',
                        overflowY: 'auto'
                    }}>
                        {reportTypes.map(type => {
                            const Icon = type.icon;
                            const isActive = reportType === type.id;
                            
                            return (
                                <button
                                    key={type.id}
                                    onClick={() => {
                                        onReportTypeChange(type.id);
                                        setIsOpen(false);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem 1rem',
                                        width: '100%',
                                        border: 'none',
                                        background: isActive ? '#f0f9ff' : 'white',
                                        color: isActive ? 'var(--color-accent-blue)' : 'var(--color-text-main)',
                                        fontSize: '0.85rem',
                                        fontWeight: isActive ? 600 : 400,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'background 0.2s',
                                        borderBottom: '1px solid #f0f0f0'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isActive) e.currentTarget.style.background = '#f8f9fa';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActive) e.currentTarget.style.background = 'white';
                                    }}
                                >
                                    <Icon size={16} />
                                    <span>{type.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

// Report Configurations for all 8 report types
const reportConfigs = {
    'transport-entries': {
        type: 'transport-entries',
        label: 'Transport Entries',
        icon: Truck,
        columns: [
            { key: 'lr_number', label: 'LR Number', type: 'string' },
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'vendor_name', label: 'Vendor', type: 'string' },
            { key: 'transport_company', label: 'Transport Co.', type: 'string' },
            { key: 'location', label: 'Location', type: 'string' },
            { key: 'status', label: 'Status', type: 'string' }
        ],
        dataSource: 'getTransportEntriesFiltered',
        summaryMetrics: ['totalEntries', 'pendingCount'],
        searchFields: ['lr_number', 'vendor_name', 'transport_company', 'location'],
        exportFileName: 'transport_entries'
    },
    'bills-entries': {
        type: 'bills-entries',
        label: 'Bills Entries',
        icon: FileText,
        columns: [
            { key: 'lr_number', label: 'LR Number', type: 'string' },
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'vendor_name', label: 'Vendor', type: 'string' },
            { key: 'transport_company', label: 'Transport Co.', type: 'string' },
            { key: 'booking_station', label: 'Booking Station', type: 'string' },
            { key: 'delivery_status', label: 'Delivery Status', type: 'string' },
            { key: 'days_elapsed', label: 'Days Elapsed', type: 'number' }
        ],
        dataSource: 'getBillsEntriesFiltered',
        summaryMetrics: ['totalEntries', 'overdueCount', 'avgDeliveryTime'],
        searchFields: ['lr_number', 'vendor_name', 'transport_company', 'booking_station'],
        exportFileName: 'bills_entries'
    },
    'inventory': {
        type: 'inventory',
        label: 'Inventory',
        icon: Package,
        columns: [
            { key: 'product_name', label: 'Product', type: 'string' },
            { key: 'category', label: 'Category', type: 'string' },
            { key: 'brand', label: 'Brand', type: 'string' },
            { key: 'stock_quantity', label: 'Stock', type: 'number' },
            { key: 'unit', label: 'Unit', type: 'string' },
            { key: 'is_dead_stock', label: 'Dead Stock', type: 'boolean' }
        ],
        dataSource: 'getInventoryReport',
        summaryMetrics: ['totalProducts', 'totalStock', 'deadStockCount'],
        searchFields: ['product_name', 'category', 'brand'],
        exportFileName: 'inventory_report'
    },
    'vendor-performance': {
        type: 'vendor-performance',
        label: 'Vendor Performance',
        icon: Users,
        columns: [
            { key: 'vendor_name', label: 'Vendor', type: 'string' },
            { key: 'total_purchase_amount', label: 'Total Purchase', type: 'currency' },
            { key: 'total_orders', label: 'Total Orders', type: 'number' },
            { key: 'brands_supplied', label: 'Brands Supplied', type: 'array' },
            { key: 'avg_delivery_time', label: 'Avg Delivery (days)', type: 'number' },
            { key: 'on_time_percentage', label: 'On-Time %', type: 'percentage' }
        ],
        dataSource: 'getVendorPerformanceMetrics',
        summaryMetrics: ['totalVendors', 'totalPurchaseAmount', 'avgDeliveryTime'],
        searchFields: ['vendor_name', 'brands_supplied'],
        exportFileName: 'vendor_performance'
    },
    'brand-analysis': {
        type: 'brand-analysis',
        label: 'Brand Analysis',
        icon: Award,
        columns: [
            { key: 'brand_name', label: 'Brand', type: 'string' },
            { key: 'total_amount', label: 'Total Amount', type: 'currency' },
            { key: 'entry_count', label: 'Entry Count', type: 'number' },
            { key: 'vendors', label: 'Vendors', type: 'array' },
            { key: 'avg_amount_per_entry', label: 'Avg per Entry', type: 'currency' }
        ],
        dataSource: 'getBrandAnalysisMetrics',
        summaryMetrics: ['totalBrands', 'totalAmount', 'avgAmountPerBrand'],
        searchFields: ['brand_name', 'vendors'],
        exportFileName: 'brand_analysis'
    },
    'financial-summary': {
        type: 'financial-summary',
        label: 'Financial Summary',
        icon: DollarSign,
        columns: [
            { key: 'group_name', label: 'Group', type: 'string' },
            { key: 'total', label: 'Total', type: 'currency' },
            { key: 'average', label: 'Average', type: 'currency' },
            { key: 'min', label: 'Min', type: 'currency' },
            { key: 'max', label: 'Max', type: 'currency' },
            { key: 'count', label: 'Count', type: 'number' }
        ],
        dataSource: 'getFinancialSummary',
        summaryMetrics: ['totalAmount', 'avgAmount', 'entryCount'],
        searchFields: ['group_name'],
        exportFileName: 'financial_summary'
    },
    'delivery-tracking': {
        type: 'delivery-tracking',
        label: 'Delivery Tracking',
        icon: MapPin,
        columns: [
            { key: 'lr_number', label: 'LR Number', type: 'string' },
            { key: 'vendor_name', label: 'Vendor', type: 'string' },
            { key: 'transport_company', label: 'Transport Co.', type: 'string' },
            { key: 'booking_date', label: 'Booking Date', type: 'date' },
            { key: 'booking_station', label: 'Booking Station', type: 'string' },
            { key: 'days_elapsed', label: 'Days Elapsed', type: 'number' },
            { key: 'delivery_status', label: 'Status', type: 'string' }
        ],
        dataSource: 'getDeliveryTrackingReport',
        summaryMetrics: ['totalDeliveries', 'onTimePercentage', 'avgDeliveryTime', 'overdueCount'],
        searchFields: ['lr_number', 'vendor_name', 'transport_company', 'booking_station'],
        exportFileName: 'delivery_tracking'
    },
    'purchase-orders': {
        type: 'purchase-orders',
        label: 'Purchase Orders',
        icon: ShoppingCart,
        columns: [
            { key: 'po_number', label: 'PO Number', type: 'string' },
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'vendor_name', label: 'Vendor', type: 'string' },
            { key: 'total_amount', label: 'Total Amount', type: 'currency' },
            { key: 'status', label: 'Status', type: 'string' },
            { key: 'items_count', label: 'Items', type: 'number' }
        ],
        dataSource: 'getPurchaseOrdersReport',
        summaryMetrics: ['totalOrders', 'totalAmount', 'openOrders'],
        searchFields: ['po_number', 'vendor_name'],
        exportFileName: 'purchase_orders'
    }
};

// Summary Cards Component
function SummaryCards({ metrics, reportType }) {
    const cards = [];
    
    // Total Entries Card
    cards.push({
        label: 'Total Entries',
        value: metrics.totalEntries,
        icon: FileText,
        color: '#0A192F'
    });
    
    // Total Amount Card (for financial reports)
    if (reportType === 'bills-entries' || reportType === 'financial-summary' || reportType === 'purchase-orders') {
        cards.push({
            label: 'Total Amount',
            value: `₹${metrics.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
            icon: DollarSign,
            color: '#16a34a'
        });
    }
    
    // Avg Delivery Time Card
    if (reportType === 'delivery-tracking' || reportType === 'vendor-performance') {
        cards.push({
            label: 'Avg Delivery Time',
            value: `${metrics.avgDeliveryTime} days`,
            icon: Truck,
            color: '#0369a1'
        });
    }
    
    return (
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1rem'
        }}>
            {cards.map((card, idx) => {
                const Icon = card.icon;
                return (
                    <div 
                        key={idx}
                        style={{
                            background: 'white',
                            borderRadius: '8px',
                            padding: '1.25rem',
                            border: '1px solid var(--color-border)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem'
                        }}
                    >
                        <div style={{
                            background: `${card.color}15`,
                            padding: '0.75rem',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Icon size={24} color={card.color} />
                        </div>
                        <div>
                            <div style={{ 
                                fontSize: '0.75rem', 
                                color: 'var(--color-text-light)',
                                marginBottom: '0.25rem'
                            }}>
                                {card.label}
                            </div>
                            <div style={{ 
                                fontSize: '1.5rem', 
                                fontWeight: 700,
                                color: 'var(--color-text-main)'
                            }}>
                                {card.value}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// Data Table Component
function DataTable({ data, columns, sortConfig, onSort }) {
    const formatValue = (value, type) => {
        if (value === null || value === undefined) return '-';
        
        switch (type) {
            case 'date':
                return value ? format(new Date(value), 'dd MMM yyyy') : '-';
            case 'currency':
                return `₹${parseFloat(value).toLocaleString('en-IN')}`;
            case 'percentage':
                return `${value}%`;
            case 'array':
                return Array.isArray(value) ? value.join(', ') : value;
            case 'boolean':
                return value ? 'Yes' : 'No';
            default:
                return value;
        }
    };
    
    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '0.85rem'
            }}>
                <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '2px solid var(--color-border)' }}>
                        {columns.map(col => (
                            <th 
                                key={col.key}
                                onClick={() => onSort(col.key)}
                                style={{
                                    padding: '0.75rem',
                                    textAlign: 'left',
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                    textTransform: 'uppercase',
                                    color: 'var(--color-text-light)',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {col.label}
                                    {sortConfig.key === col.key && (
                                        sortConfig.direction === 'asc' 
                                            ? <ChevronUp size={14} />
                                            : <ChevronDown size={14} />
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td 
                                colSpan={columns.length}
                                style={{
                                    padding: '3rem',
                                    textAlign: 'center',
                                    color: 'var(--color-text-light)'
                                }}
                            >
                                No data available
                            </td>
                        </tr>
                    ) : (
                        data.map((row, idx) => (
                            <tr 
                                key={idx}
                                style={{
                                    borderBottom: '1px solid #f0f0f0',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                            >
                                {columns.map(col => (
                                    <td 
                                        key={col.key}
                                        style={{
                                            padding: '0.75rem',
                                            color: 'var(--color-text-main)'
                                        }}
                                    >
                                        {formatValue(row[col.key], col.type)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

// Pagination Component
function Pagination({ currentPage, totalPages, onPageChange }) {
    const pages = [];
    const maxVisible = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }
    
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem',
            borderTop: '1px solid var(--color-border)'
        }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-light)' }}>
                Page {currentPage} of {totalPages}
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    style={{
                        padding: '0.5rem 0.75rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: '4px',
                        background: 'white',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        opacity: currentPage === 1 ? 0.5 : 1,
                        fontSize: '0.85rem'
                    }}
                >
                    First
                </button>
                
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                        padding: '0.5rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: '4px',
                        background: 'white',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        opacity: currentPage === 1 ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <ChevronLeft size={16} />
                </button>
                
                {pages.map(page => (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        style={{
                            padding: '0.5rem 0.75rem',
                            border: page === currentPage ? '2px solid var(--color-accent-blue)' : '1px solid var(--color-border)',
                            borderRadius: '4px',
                            background: page === currentPage ? 'var(--color-accent-blue)' : 'white',
                            color: page === currentPage ? 'white' : 'var(--color-text-main)',
                            cursor: 'pointer',
                            fontWeight: page === currentPage ? 600 : 400,
                            fontSize: '0.85rem'
                        }}
                    >
                        {page}
                    </button>
                ))}
                
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                        padding: '0.5rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: '4px',
                        background: 'white',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        opacity: currentPage === totalPages ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <ChevronRight size={16} />
                </button>
                
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    style={{
                        padding: '0.5rem 0.75rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: '4px',
                        background: 'white',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        opacity: currentPage === totalPages ? 0.5 : 1,
                        fontSize: '0.85rem'
                    }}
                >
                    Last
                </button>
            </div>
        </div>
    );
}

export default function Reports() {
    const { currentUser, userData, isAdmin, currentCompanyId } = useAuth();
    
    // Core State
    const [reportType, setReportType] = useState('transport-entries');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Data State
    const [rawData, setRawData] = useState([]);
    
    // Filter State
    const [filters, setFilters] = useState({
        dateRange: { start: '', end: '' },
        brands: [],
        vendors: [],
        locations: [],
        categories: [],
        transportCompanies: [],
        statuses: []
    });
    
    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    
    // Sort State
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(50);
    
    // Last Refresh Timestamp
    const [lastRefresh, setLastRefresh] = useState(new Date());
    
    // Access Control
    const roles = userData?.roles || [];
    const hasAccess = isAdmin || roles.includes('reports') || roles.includes('analytics');
    
    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);
    
    // Load data when report type or filters change
    useEffect(() => {
        if (!currentUser || !currentCompanyId || !hasAccess) return;
        loadReportData();
    }, [currentUser, currentCompanyId, hasAccess, reportType, filters]);
    
    const loadReportData = async () => {
        setLoading(true);
        setError(null);
        
        try {
            let data = [];
            
            switch (reportType) {
                case 'transport-entries':
                    data = await getTransportEntriesFiltered(currentCompanyId, filters);
                    break;
                case 'bills-entries':
                    data = await getBillsEntriesFiltered(currentCompanyId, filters);
                    break;
                case 'inventory':
                    data = await getInventoryReport(currentCompanyId, filters);
                    break;
                case 'vendor-performance':
                    data = await getVendorPerformanceMetrics(currentCompanyId, filters);
                    break;
                case 'brand-analysis':
                    data = await getBrandAnalysisMetrics(currentCompanyId, filters);
                    break;
                case 'financial-summary':
                    data = await getFinancialSummary(currentCompanyId, filters, 'vendor');
                    break;
                case 'delivery-tracking':
                    const trackingData = await getDeliveryTrackingReport(currentCompanyId, filters);
                    data = trackingData.entries || [];
                    break;
                case 'purchase-orders':
                    data = await getPurchaseOrdersReport(currentCompanyId, filters);
                    break;
                default:
                    data = [];
            }
            
            setRawData(data);
            
        } catch (err) {
            console.error('Failed to load report data:', err);
            setError(err.message || 'Failed to load report data');
        } finally {
            setLoading(false);
            setLastRefresh(new Date());
        }
    };
    
    // Apply filters and search
    const filteredData = useMemo(() => {
        let data = [...rawData];
        
        // Apply search
        if (debouncedSearch) {
            const searchLower = debouncedSearch.toLowerCase();
            const config = reportConfigs[reportType];
            const searchFields = config?.searchFields || [];
            
            data = data.filter(item => {
                return searchFields.some(field => {
                    const value = item[field];
                    if (Array.isArray(value)) {
                        return value.some(v => String(v).toLowerCase().includes(searchLower));
                    }
                    return String(value || '').toLowerCase().includes(searchLower);
                });
            });
        }
        
        return data;
    }, [rawData, debouncedSearch, reportType]);
    
    // Apply sorting
    const sortedData = useMemo(() => {
        if (!sortConfig.key) return filteredData;
        
        return [...filteredData].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];
            
            if (aVal === bVal) return 0;
            
            const comparison = aVal < bVal ? -1 : 1;
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
    }, [filteredData, sortConfig]);
    
    // Apply pagination
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedData.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedData, currentPage, itemsPerPage]);
    
    const totalPages = Math.ceil(sortedData.length / itemsPerPage);
    
    // Calculate summary metrics
    const summaryMetrics = useMemo(() => {
        const metrics = {
            totalEntries: filteredData.length,
            totalAmount: 0,
            avgDeliveryTime: 0,
            customMetric: 0
        };
        
        if (reportType === 'bills-entries' || reportType === 'financial-summary') {
            metrics.totalAmount = filteredData.reduce((sum, item) => {
                return sum + (parseFloat(item.total || item.amount || item.metadata?.amount || 0));
            }, 0);
        }
        
        if (reportType === 'delivery-tracking' || reportType === 'vendor-performance') {
            const deliveryTimes = filteredData
                .map(item => item.days_elapsed || item.avg_delivery_time)
                .filter(t => t !== undefined && t !== null);
            
            if (deliveryTimes.length > 0) {
                metrics.avgDeliveryTime = (deliveryTimes.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / deliveryTimes.length).toFixed(1);
            }
        }
        
        return metrics;
    }, [filteredData, reportType]);
    
    // Handle sort
    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };
    
    // Export to Excel
    const exportToExcel = () => {
        try {
            const config = reportConfigs[reportType];
            const worksheet = XLSX.utils.json_to_sheet(
                sortedData.map(item => {
                    const row = {};
                    config.columns.forEach(col => {
                        let value = item[col.key];
                        if (Array.isArray(value)) {
                            value = value.join(', ');
                        }
                        row[col.label] = value || '';
                    });
                    return row;
                })
            );
            
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, config.label);
            
            const fileName = `${config.exportFileName}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.xlsx`;
            XLSX.writeFile(workbook, fileName);
        } catch (err) {
            console.error('Export failed:', err);
            alert('Failed to export data');
        }
    };
    
    // Export to CSV
    const exportToCSV = () => {
        try {
            const config = reportConfigs[reportType];
            const headers = config.columns.map(col => col.label).join(',');
            const rows = sortedData.map(item => {
                return config.columns.map(col => {
                    let value = item[col.key];
                    if (Array.isArray(value)) {
                        value = value.join('; ');
                    }
                    value = String(value || '').replace(/"/g, '""');
                    return `"${value}"`;
                }).join(',');
            });
            
            const csv = [headers, ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${config.exportFileName}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed:', err);
            alert('Failed to export data');
        }
    };
    
    // Print
    const handlePrint = () => {
        window.print();
    };
    
    // Render access denied
    if (!currentUser) {
        return (
            <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Please log in to access reports.</p>
            </div>
        );
    }
    
    if (!currentCompanyId) {
        return (
            <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{ 
                    background: '#fff', 
                    padding: '3rem', 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0', 
                    maxWidth: '500px', 
                    margin: '0 auto' 
                }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>
                        No Company Selected
                    </h2>
                    <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: 1.6 }}>
                        You need to be part of an active company to access reports.
                    </p>
                </div>
            </div>
        );
    }
    
    if (!hasAccess) {
        return (
            <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{ 
                    background: '#fff', 
                    padding: '3rem', 
                    borderRadius: '12px', 
                    border: '1px solid #fee', 
                    maxWidth: '500px', 
                    margin: '0 auto' 
                }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#dc2626', marginBottom: '1rem' }}>
                        Access Denied
                    </h2>
                    <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: 1.6 }}>
                        You do not have permission to access reports. Please contact your administrator.
                    </p>
                </div>
            </div>
        );
    }
    
    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
            {/* Main Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                {/* Header */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '1rem',
                    borderBottom: '1px solid var(--color-border)',
                    paddingBottom: '0.5rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ 
                            background: 'var(--color-accent-blue)', 
                            color: 'white', 
                            padding: '0.5rem', 
                            borderRadius: '4px' 
                        }}>
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <h2 style={{ 
                                fontSize: '1.2rem', 
                                fontWeight: 700, 
                                margin: 0, 
                                color: 'var(--color-accent-blue)' 
                            }}>
                                Reports & Analytics
                            </h2>
                            <p style={{ 
                                fontSize: '0.75rem', 
                                color: 'var(--color-text-light)', 
                                margin: 0 
                            }}>
                                Comprehensive reporting and analytics dashboard
                            </p>
                        </div>
                    </div>
                    <div style={{ 
                        textAlign: 'right', 
                        fontSize: '0.7rem', 
                        color: 'var(--color-text-light)' 
                    }}>
                        Last updated: {lastRefresh.toLocaleTimeString()}
                    </div>
                </div>
                
                {/* Main Content */}
                {loading ? (
                    <div style={{ 
                        background: 'white',
                        borderRadius: '8px',
                        padding: '3rem',
                        textAlign: 'center',
                        border: '1px solid var(--color-border)'
                    }}>
                        <div style={{ 
                            display: 'inline-block',
                            width: '40px', 
                            height: '40px', 
                            border: '3px solid #f3f3f3',
                            borderTop: '3px solid var(--color-accent-orange)',
                            borderRadius: '50%', 
                            animation: 'spin 1s linear infinite'
                        }} />
                        <p style={{ marginTop: '1rem', color: 'var(--color-text-light)' }}>
                            Loading report data...
                        </p>
                    </div>
                ) : error ? (
                    <div style={{ 
                        background: 'white',
                        borderRadius: '8px',
                        padding: '3rem',
                        textAlign: 'center',
                        border: '1px solid #fee',
                        color: '#dc2626'
                    }}>
                        <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                            Error Loading Data
                        </p>
                        <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                            {error}
                        </p>
                        <button 
                            onClick={loadReportData}
                            className="btn btn-primary"
                            style={{ fontSize: '0.85rem' }}
                        >
                            <RefreshCw size={16} style={{ marginRight: '0.5rem' }} />
                            Retry
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Compact Header Bar with Report Type and Actions */}
                        <div style={{ 
                            background: 'white', 
                            borderRadius: '8px', 
                            padding: '1rem',
                            border: '1px solid var(--color-border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '1rem',
                            flexWrap: 'wrap'
                        }}>
                            {/* Left: Report Type Selector */}
                            <ReportTypeSelector 
                                reportType={reportType} 
                                onReportTypeChange={(type) => {
                                    setReportType(type);
                                    setCurrentPage(1);
                                }}
                            />
                            
                            {/* Right: Action Buttons */}
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <button
                                    onClick={loadReportData}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.6rem 1rem',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '6px',
                                        background: 'white',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        fontWeight: 500
                                    }}
                                    title="Refresh data"
                                >
                                    <RefreshCw size={16} />
                                    <span className="hide-on-mobile">Refresh</span>
                                </button>
                                
                                <button
                                    onClick={exportToExcel}
                                    disabled={sortedData.length === 0}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.6rem 1rem',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '6px',
                                        background: 'white',
                                        fontSize: '0.85rem',
                                        cursor: sortedData.length === 0 ? 'not-allowed' : 'pointer',
                                        opacity: sortedData.length === 0 ? 0.5 : 1,
                                        fontWeight: 500
                                    }}
                                    title="Export to Excel"
                                >
                                    <Download size={16} />
                                    <span className="hide-on-mobile">Export</span>
                                </button>
                                
                                <button
                                    onClick={handlePrint}
                                    disabled={sortedData.length === 0}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.6rem 1rem',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '6px',
                                        background: 'white',
                                        fontSize: '0.85rem',
                                        cursor: sortedData.length === 0 ? 'not-allowed' : 'pointer',
                                        opacity: sortedData.length === 0 ? 0.5 : 1,
                                        fontWeight: 500
                                    }}
                                    title="Print"
                                >
                                    <Printer size={16} />
                                </button>
                            </div>
                        </div>
                        
                        {/* Compact Search Bar */}
                        <div style={{ 
                            background: 'white', 
                            borderRadius: '8px', 
                            padding: '0.75rem 1rem',
                            border: '1px solid var(--color-border)',
                            display: 'flex',
                            gap: '0.75rem',
                            alignItems: 'center'
                        }}>
                            <div style={{ 
                                flex: '1 1 auto',
                                maxWidth: '400px',
                                position: 'relative'
                            }}>
                                <Search 
                                    size={16} 
                                    style={{ 
                                        position: 'absolute', 
                                        left: '10px', 
                                        top: '50%', 
                                        transform: 'translateY(-50%)',
                                        color: 'var(--color-text-light)'
                                    }} 
                                />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                        transition: 'border-color 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--color-accent-blue)'}
                                    onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        style={{
                                            position: 'absolute',
                                            right: '8px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            color: 'var(--color-text-light)'
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        {/* Summary Cards */}
                        <SummaryCards metrics={summaryMetrics} reportType={reportType} />
                        
                        {/* Data Table */}
                        <div style={{ 
                            background: 'white', 
                            borderRadius: '8px', 
                            border: '1px solid var(--color-border)',
                            overflow: 'hidden'
                        }}>
                            <DataTable
                                data={paginatedData}
                                columns={reportConfigs[reportType]?.columns || []}
                                sortConfig={sortConfig}
                                onSort={handleSort}
                            />
                            
                            {totalPages > 1 && (
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                />
                            )}
                        </div>
                    </div>
                )}
                
                {/* Spin animation */}
                <style>{`
                    @keyframes spin { 
                        0% { transform: rotate(0deg); } 
                        100% { transform: rotate(360deg); } 
                    }
                `}</style>
            </div>
            
            {/* Right Sidebar Filters */}
            <RightSidebarFilters
                filters={filters}
                onFilterChange={(newFilters) => {
                    setFilters(newFilters);
                    setCurrentPage(1);
                }}
                reportType={reportType}
                currentCompanyId={currentCompanyId}
            />
        </div>
    );
}
