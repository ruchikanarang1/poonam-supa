import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
    getFormConfig, addLogisticsEntry, getPurchaseOrders, 
    linkEntryToPurchaseOrder, getLogisticsEntries, updateLogisticsEntry,
    getSuppliers, getTransports, saveSupplier, saveTransport, getTransportWithStations,
    getCompanyEmployees
} from '../lib/db';
import { Truck, FileText, Plus, Calendar, Trash2, CheckCircle, AlertCircle, Send, MapPin, UserPlus, Save, LayoutGrid, Clock } from 'lucide-react';
import GenericAutocomplete from '../components/GenericAutocomplete';
import QuickAddModal from '../components/QuickAddModal';
import { calculateDeliveryStatus, getAvgDeliveryDays } from '../lib/deliveryTracking';

export default function LogisticsPortal({ type, title }) {
    const { currentUser, userData, isAdmin, currentCompanyId } = useAuth();
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' or 'pending'
    const [expandedEntryId, setExpandedEntryId] = useState(null);
    
    // Quick Add Modals
    const [showVendorModal, setShowVendorModal] = useState(false);
    const [showTransportModal, setShowTransportModal] = useState(false);
    const [quickAddInitialValue, setQuickAddInitialValue] = useState('');
    
    // Form State
    const [formData, setFormData] = useState({
        lr_number: '', date: '', time: '', vendor_name: '', transport_company: '', location: '', linkedPoId: '',
        opened: false, booking_date: '', booking_station: '' // Add booking_station field
    });
    const [dynamicData, setDynamicData] = useState({});
    const [lots, setLots] = useState([{ id: Date.now(), lot_size: '', received: '', lotVendor: '', showVendor: false }]);
    
    // Data State
    const [allEntries, setAllEntries] = useState([]);
    const [openPOs, setOpenPOs] = useState([]);
    const [todayDateStr, setTodayDateStr] = useState('');
    const [todayDayStr, setTodayDayStr] = useState('');
    
    // Transport booking stations state
    const [selectedTransport, setSelectedTransport] = useState(null);
    const [bookingStations, setBookingStations] = useState([]);
    const [selectedStationInfo, setSelectedStationInfo] = useState(null); // Store selected station details
    
    // Follow-up modal state
    const [showFollowUpModal, setShowFollowUpModal] = useState(false);
    const [selectedBillForFollowUp, setSelectedBillForFollowUp] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [companyEmployees, setCompanyEmployees] = useState([]);

    const roles = userData?.roles || [];
    const hasAccess = isAdmin || roles.includes(type);

    useEffect(() => {
        if (!hasAccess) {
            setLoading(false);
            return;
        }

        if (!currentCompanyId) {
            setLoading(false);
            return;
        }

        loadInitialData();
        loadEmployees();
        const now = new Date();
        setTodayDateStr(now.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }));
        setTodayDayStr(now.toLocaleDateString('en-US', { weekday: 'long' }));
    }, [type, hasAccess, currentCompanyId]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [config, entriesData, pos] = await Promise.all([
                getFormConfig(currentCompanyId, type),
                getLogisticsEntries(currentCompanyId, type),
                getPurchaseOrders(currentCompanyId)
            ]);

            setFields(config);
            setAllEntries(entriesData);
            setOpenPOs(pos.filter(p => p.status !== 'received'));

            // Initial Fixed Data
            const now = new Date();
            setFormData({
                lr_number: '',
                date: now.toISOString().split('T')[0],
                time: now.toTimeString().split(' ')[0].substring(0, 5),
                vendor_name: '',
                transport_company: '',
                location: '',
                linkedPoId: '',
                opened: false,
                booking_date: now.toISOString().split('T')[0] // Task 3.3: Initialize booking_date
            });

            const initialDynamic = {};
            config.forEach(f => {
                const fixedIds = ['lr_number', 'date', 'time', 'vendor_name', 'transport_company', 'location'];
                if (!fixedIds.includes(f.id)) initialDynamic[f.id] = '';
            });
            setDynamicData(initialDynamic);

        } catch (err) {
            console.error('Failed to load initial data', err);
            alert(`Error loading data: ${err.message}. Please check your connection and try again.`);
        } finally {
            setLoading(false);
        }
    };

    const addLot = () => setLots([...lots, { id: Date.now() + Math.random(), lot_size: '', received: '', lotVendor: '', showVendor: false }]);
    const removeLot = (id) => lots.length > 1 && setLots(lots.filter(l => l.id !== id));
    const updateLot = (id, updates) => setLots(lots.map(l => l.id === id ? { ...l, ...updates } : l));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        try {
            // Check if there's an existing entry with the same LR number
            const existingEntry = allEntries.find(entry => entry.lr_number === formData.lr_number);
            
            let processedLots = lots.map(({ id, showVendor, ...rest }) => {
                const lotSize = parseFloat(rest.lot_size) || 0;
                const received = parseFloat(rest.received) || 0;
                const pending = lotSize - received;
                return { ...rest, pending };
            });

            // If there's an existing entry, accumulate received quantities
            if (existingEntry && existingEntry.lots) {
                processedLots = processedLots.map(newLot => {
                    const existingLot = existingEntry.lots.find(l => l.lot_size === newLot.lot_size);
                    if (existingLot) {
                        const totalReceived = (parseFloat(existingLot.received) || 0) + (parseFloat(newLot.received) || 0);
                        const lotSize = parseFloat(newLot.lot_size) || 0;
                        const pending = lotSize - totalReceived;
                        return { ...newLot, received: totalReceived, pending };
                    }
                    return newLot;
                });
            }

            // Determine if entry is pending (any lot has pending > 0)
            const isPending = type === 'transport' && processedLots.some(l => (parseFloat(l.pending) || 0) > 0);
            const selectedPo = openPOs.find(p => p.id === formData.linkedPoId);
            
            const entryData = {
                ...formData, 
                ...dynamicData, 
                type, 
                status: isPending ? 'pending' : 'resolved',
                linkedPoNumber: selectedPo ? selectedPo.poNumber : '',
                submittedBy: currentUser?.uid || 'guest', 
                submittedByName: userData?.displayName || 'Guest'
            };
            
            if (type === 'transport') entryData.lots = processedLots;
            
            // Task 4.2 & 4.3: Calculate delivery status for bills entry
            if (type === 'bills' && formData.booking_date && formData.transport_company && formData.booking_station) {
                console.log('=== DELIVERY STATUS CALCULATION ===');
                console.log('Booking Date:', formData.booking_date);
                console.log('Transport Company:', formData.transport_company);
                console.log('Booking Station:', formData.booking_station);
                
                try {
                    const transport = await getTransportWithStations(currentCompanyId, formData.transport_company);
                    console.log('Transport data:', transport);
                    console.log('Transport booking_stations:', transport?.booking_stations);
                    
                    const bookingStation = formData.booking_station;
                    const avgDeliveryDays = getAvgDeliveryDays(transport?.booking_stations, bookingStation);
                    console.log('Avg Delivery Days:', avgDeliveryDays);
                    
                    if (avgDeliveryDays) {
                        const { days_elapsed, delivery_status } = calculateDeliveryStatus(
                            formData.booking_date,
                            new Date(),
                            avgDeliveryDays
                        );
                        console.log('Days Elapsed:', days_elapsed);
                        console.log('Delivery Status:', delivery_status);
                        
                        entryData.booking_station = bookingStation;
                        entryData.days_elapsed = days_elapsed;
                        entryData.delivery_status = delivery_status;
                        
                        // Task 3.7: Mark overdue entries for pending tab
                        if (delivery_status === 'Overdue') {
                            entryData.status = 'pending';
                        }
                    } else {
                        console.warn('No avg delivery days found for station:', bookingStation);
                        entryData.booking_station = bookingStation;
                        entryData.delivery_status = 'Unknown';
                    }
                } catch (err) {
                    console.error('Failed to calculate delivery status:', err);
                    entryData.delivery_status = 'Unknown';
                }
            } else {
                console.log('=== SKIPPING DELIVERY STATUS CALCULATION ===');
                console.log('Type:', type);
                console.log('Booking Date:', formData.booking_date);
                console.log('Transport Company:', formData.transport_company);
                console.log('Booking Station:', formData.booking_station);
            }
            
            // If updating existing entry, update it; otherwise create new
            if (existingEntry) {
                await updateLogisticsEntry(currentCompanyId, type, existingEntry.id, entryData);
            } else {
                const docRef = await addLogisticsEntry(currentCompanyId, type, entryData);
                if (formData.linkedPoId && docRef?.id) await linkEntryToPurchaseOrder(currentCompanyId, formData.linkedPoId, type, docRef.id);
            }
            
            // Auto-resolve overdue bills when transport entry is added
            if (type === 'transport' && formData.lr_number) {
                try {
                    // Find any bills with the same LR number that are pending/overdue
                    const billsData = await getLogisticsEntries(currentCompanyId, 'bills');
                    const matchingBill = billsData.find(bill => 
                        bill.lr_number === formData.lr_number && 
                        bill.status === 'pending' &&
                        bill.delivery_status === 'Overdue'
                    );
                    
                    if (matchingBill) {
                        console.log('Auto-resolving overdue bill:', matchingBill.id);
                        await updateLogisticsEntry(currentCompanyId, 'bills', matchingBill.id, { 
                            status: 'resolved',
                            resolvedAt: new Date().toISOString(),
                            resolvedBy: 'transport_entry'
                        });
                    }
                } catch (err) {
                    console.error('Failed to auto-resolve bill:', err);
                    // Don't fail the whole operation if auto-resolve fails
                }
            }
            
            alert(`${title} Recorded!`);
            loadInitialData();
            setLots([{ id: Date.now(), lot_size: '', received: '', lotVendor: '', showVendor: false }]);
        } catch (err) { console.error(err); alert("Error: " + err.message); }
        finally { setSubmitting(false); }
    };

    const handleReconcile = async (entry) => {
        if (!isAdmin || !window.confirm("Resolve backlog?")) return;
        try {
            await updateLogisticsEntry(currentCompanyId, type, entry.id, { status: 'resolved', reconciledAt: new Date().toISOString() });
            loadInitialData();
        } catch (err) { console.error(err); }
    };
    
    const loadEmployees = async () => {
        try {
            const employees = await getCompanyEmployees(currentCompanyId);
            setCompanyEmployees(employees);
        } catch (err) {
            console.error('Failed to load employees:', err);
        }
    };
    
    const handleAssignFollowUp = async (entry) => {
        setSelectedBillForFollowUp(entry);
        setSelectedEmployee('');
        
        // Fetch transport details to get phone number
        try {
            const transport = await getTransportWithStations(currentCompanyId, entry.transport_company);
            setSelectedBillForFollowUp({ ...entry, transport_phone: transport?.contact || 'N/A' });
        } catch (err) {
            console.error('Failed to fetch transport details:', err);
            setSelectedBillForFollowUp({ ...entry, transport_phone: 'N/A' });
        }
        
        setShowFollowUpModal(true);
    };
    
    const handleSendWhatsApp = () => {
        if (!selectedEmployee) {
            alert('Please select an employee');
            return;
        }
        
        const employee = companyEmployees.find(e => e.uid === selectedEmployee);
        if (!employee || !employee.phone_number) {
            alert('Selected employee does not have a phone number');
            return;
        }
        
        const bill = selectedBillForFollowUp;
        const message = `🚨 *OVERDUE DELIVERY FOLLOW-UP*\n\n` +
            `*LR Number:* ${bill.lr_number}\n` +
            `*Vendor:* ${bill.vendor_name}\n` +
            `*Transport:* ${bill.transport_company}\n` +
            `*Transport Phone:* ${bill.transport_phone || 'N/A'}\n` +
            `*Booking Station:* ${bill.booking_station || 'N/A'}\n` +
            `*Booking Date:* ${bill.booking_date ? new Date(bill.booking_date).toLocaleDateString() : 'N/A'}\n` +
            `*Days Elapsed:* ${bill.days_elapsed || 'N/A'} days\n` +
            `*Status:* ⚠️ OVERDUE - Needs Follow Up\n\n` +
            `Please contact the transport company and update the delivery status.`;
        
        const phoneNumber = employee.phone_number.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        
        window.open(whatsappUrl, '_blank');
        setShowFollowUpModal(false);
    };

    // Quick Add Handlers
    const handleAddVendor = async (vendorData) => {
        await saveSupplier(currentCompanyId, null, vendorData);
        await loadInitialData(); // Reload to get the new vendor
        setFormData({ ...formData, vendor_name: vendorData.name, location: vendorData.address || formData.location });
    };

    const handleAddTransport = async (transportData) => {
        await saveTransport(currentCompanyId, null, transportData);
        await loadInitialData(); // Reload to get the new transport
        setFormData({ ...formData, transport_company: transportData.name });
    };

    // Handle transport selection - load booking stations
    const handleTransportSelect = async (transport) => {
        console.log('Transport selected:', transport);
        console.log('Transport booking_stations:', transport.booking_stations);
        
        if (!transport) return;
        
        // Always update the form data and load stations, even if same transport
        setFormData(prev => ({ ...prev, transport_company: transport.name, booking_station: '' }));
        setSelectedTransport(transport);
        
        const stations = transport.booking_stations || [];
        console.log('Setting booking stations:', stations);
        setBookingStations(stations);
        
        // Auto-fill fare if there's only one booking station
        if (stations.length === 1) {
            const station = stations[0];
            setFormData(prev => ({ ...prev, booking_station: station.station_name }));
            // Try both 'fare' and 'freight_paid' field names
            setDynamicData(prev => ({ ...prev, fare: station.fare, freight_paid: station.fare }));
        }
    };

    // Handle booking station selection - auto-fill fare
    const handleBookingStationSelect = (stationName) => {
        console.log('Booking station selected:', stationName);
        console.log('Available stations:', bookingStations);
        
        if (!stationName || formData.booking_station === stationName) return; // Prevent re-triggering
        
        setFormData(prev => ({ ...prev, booking_station: stationName }));
        const station = bookingStations.find(s => s.station_name === stationName);
        
        console.log('Found station:', station);
        
        if (station) {
            console.log('Setting fare to:', station.fare);
            console.log('Avg delivery days:', station.avg_delivery_days);
            
            // Store station info for display
            setSelectedStationInfo(station);
            
            // Try both 'fare' and 'freight_paid' field names
            setDynamicData(prev => {
                console.log('Previous dynamicData:', prev);
                const newData = { ...prev, fare: station.fare, freight_paid: station.fare };
                console.log('New dynamicData:', newData);
                return newData;
            });
        } else {
            setSelectedStationInfo(null);
        }
    };

    if (!currentUser) return <div className="container" style={{ padding: '2rem', textAlign: 'center' }}><p>Please log in.</p></div>;
    if (!currentCompanyId) return <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div style={{ background: '#fff', padding: '3rem', borderRadius: '12px', border: '1px solid #e2e8f0', maxWidth: '500px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>No Company Selected</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: 1.6 }}>You need to be part of an active company to access the {title}. Please create a new company using the + button in the top navigation bar, or ask your administrator to invite you.</p>
        </div>
    </div>;
    if (!hasAccess) return <div className="container" style={{ padding: '2rem', textAlign: 'center' }}><h2 style={{ color: 'red' }}>Access Denied</h2></div>;
    if (loading) return <div className="container" style={{ padding: '2rem' }}><p>Loading...</p></div>;

    const todayStr = new Date().toISOString().split('T')[0];
    const filteredEntries = (activeTab === 'ledger' 
        ? allEntries.filter(e => e.createdAt && e.createdAt.startsWith(todayStr))
        : allEntries.filter(e => e.status === 'pending')).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return (
        <div className="container" style={{ padding: '0.25rem 0' }}>
            {/* Theme Style Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ background: 'var(--color-accent-blue)', color: 'white', padding: '0.4rem', borderRadius: '4px' }}>
                        {type === 'transport' ? <Truck size={18} /> : <FileText size={18} />}
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--color-accent-blue)' }}>{title}</h2>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2px' }}>
                            <button onClick={() => setActiveTab('ledger')} className={`portal-tab ${activeTab === 'ledger' ? 'active' : ''}`} style={{ fontSize: '0.7rem', padding: '1px 6px' }}>Ledger</button>
                            <button onClick={() => setActiveTab('pending')} className={`portal-tab ${activeTab === 'pending' ? 'active' : ''}`} style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                                Pending {allEntries.filter(e => e.status === 'pending').length > 0 && <span style={{ background: 'var(--color-accent-orange)', color: 'white', padding: '0px 4px', borderRadius: '4px', marginLeft: '2px' }}>{allEntries.filter(e => e.status === 'pending').length}</span>}
                            </button>
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                    <strong>{todayDayStr}</strong>, {todayDateStr}
                </div>
            </div>

            <div className="portal-container">
                {/* Rearranged & Themed Excel Form */}
                {activeTab === 'ledger' && (
                <div className="saas-excel-container">
                    <form onSubmit={handleSubmit}>
                        <div className={`saas-form-row-scroll ${type === 'bills' ? 'wrap-layout' : ''}`}>
                            {/* Header Row - Task 3.1 & 3.2: Conditional rendering based on type */}
                            <div className={`saas-excel-header ${type === 'bills' ? 'wrap-layout' : ''}`}>
                                <div className="saas-excel-label excel-column-lr">LR Number</div>
                                <div className="saas-excel-label excel-column-flexible">Transport Co</div>
                                {bookingStations.length > 0 && <div className="saas-excel-label excel-column-flexible">Booking Station</div>}
                                <div className="saas-excel-label excel-column-flexible">Vendor / Supplier</div>
                                <div className="saas-excel-label excel-column-location">Location</div>
                                <div className="saas-excel-label excel-column-datetime">Date & Time</div>
                                {type === 'bills' && <div className="saas-excel-label excel-column-datetime">Booking Date</div>}
                                <div className="saas-excel-label excel-column-action" style={{ borderRight: 'none', textAlign: 'center' }}>Save</div>
                            </div>

                            {/* Main Entry Row */}
                            <div className={`saas-excel-data-row ${type === 'bills' ? 'wrap-layout' : ''}`}>
                                <div className="saas-excel-cell excel-column-lr" data-label="LR Number">
                                    <input required className="saas-input-box" placeholder="LR#" value={formData.lr_number} onChange={e => setFormData({...formData, lr_number: e.target.value})} />
                                </div>
                                <div className="saas-excel-cell excel-column-flexible" data-label="Transport Co">
                                    <GenericAutocomplete 
                                        placeholder="Transport Search..." 
                                        fetchData={() => getTransports(currentCompanyId)} 
                                        iconType="truck"
                                        value={formData.transport_company} 
                                        onChange={v => {
                                            // Update the transport company value as user types
                                            setFormData(prev => ({...prev, transport_company: v}));
                                            // Clear booking stations only if user is typing (not selecting)
                                            if (v === '') {
                                                setBookingStations([]);
                                                setFormData(prev => ({...prev, booking_station: ''}));
                                            }
                                        }}
                                        onSelect={handleTransportSelect}
                                        onAddNew={(value) => {
                                            setQuickAddInitialValue(value);
                                            setShowTransportModal(true);
                                        }}
                                        addNewLabel="Add Transport"
                                    />
                                </div>
                                {/* Booking Station Dropdown - shown after transport is selected */}
                                {bookingStations.length > 0 && (
                                    <div className="saas-excel-cell excel-column-flexible" data-label="Booking Station">
                                        <select 
                                            className="saas-input-box" 
                                            value={formData.booking_station} 
                                            onChange={e => handleBookingStationSelect(e.target.value)}
                                            style={{ width: '100%', fontSize: '0.8rem' }}
                                        >
                                            <option value="">Select Station...</option>
                                            {bookingStations.map((station, idx) => (
                                                <option key={idx} value={station.station_name}>
                                                    {station.station_name} (₹{station.fare})
                                                </option>
                                            ))}
                                        </select>
                                        {/* Display avg delivery days info */}
                                        {selectedStationInfo && (
                                            <div style={{ fontSize: '0.7rem', color: '#0369a1', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={12} />
                                                Expected: {selectedStationInfo.avg_delivery_days} days
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="saas-excel-cell excel-column-flexible" data-label="Vendor / Supplier">
                                    <GenericAutocomplete 
                                        placeholder="Vendor Search..." 
                                        fetchData={() => getSuppliers(currentCompanyId)} 
                                        iconType="vendor"
                                        value={formData.vendor_name} onChange={v => setFormData({...formData, vendor_name: v})}
                                        onSelect={s => setFormData({...formData, vendor_name: s.name, location: s.address || formData.location})}
                                        onAddNew={(value) => {
                                            setQuickAddInitialValue(value);
                                            setShowVendorModal(true);
                                        }}
                                        addNewLabel="Add Vendor"
                                    />
                                </div>
                                <div className="saas-excel-cell excel-column-location" data-label="Location">
                                    <input className="saas-input-box" placeholder="Auto-filled..." value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                                </div>
                                <div className="saas-excel-cell excel-column-datetime" data-label="Date & Time">
                                    <div style={{ display: 'flex', gap: '2px', width: '100%' }}>
                                        <input type="date" required className="saas-input-box" style={{ flex: 1.5, fontSize: '0.7rem' }} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                        <input type="time" required className="saas-input-box" style={{ flex: 1, fontSize: '0.7rem' }} value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                                    </div>
                                </div>
                                {/* Task 3.3: Add Booking Date field for bills entry */}
                                {type === 'bills' && (
                                    <div className="saas-excel-cell excel-column-datetime" data-label="Booking Date">
                                        <input type="date" required className="saas-input-box" style={{ fontSize: '0.7rem' }} value={formData.booking_date} onChange={e => setFormData({...formData, booking_date: e.target.value})} />
                                    </div>
                                )}
                                <div className="saas-excel-cell excel-column-action" data-label="Save">
                                    <button type="submit" className="btn btn-primary saas-save-btn" disabled={submitting}>
                                        <Save size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Status & Linking Row - Task 3.2: Hide opened checkbox for bills */}
                            <div className="saas-status-row" style={{ 
                                display: 'flex', background: '#f8fafc', padding: '8px 12px', 
                                borderBottom: '1px solid var(--color-border)', 
                                flexWrap: 'wrap', gap: '2rem', alignItems: 'center' 
                            }}>
                                {/* Opened Status - Hidden for bills entry */}
                                {type !== 'bills' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '2px solid #e2e8f0', paddingRight: '1.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: formData.opened ? 'var(--color-accent-blue)' : '#64748b' }}>
                                            OPENED?
                                        </span>
                                        <input 
                                            type="checkbox" 
                                            checked={formData.opened} 
                                            onChange={e => setFormData({ ...formData, opened: e.target.checked })} 
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                                        />
                                    </div>
                                )}

                                {/* Purchase Order Linking */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff9e6', padding: '4px 12px', borderRadius: '6px', border: '1px solid #ffe58f' }}>
                                    <span className="saas-lot-label-tiny" style={{ color: '#856404', fontWeight: '800' }}>LINK TO PURCHASE ORDER:</span>
                                    {openPOs.length > 0 ? (
                                        <select 
                                            className="saas-input-box" 
                                            style={{ width: '150px', height: '28px', border: '1px solid #ffe58f', borderRadius: '4px', background: 'white', fontWeight: 600, fontSize: '0.75rem' }} 
                                            value={formData.linkedPoId} 
                                            onChange={e => {
                                                const poId = e.target.value;
                                                const selectedPo = openPOs.find(p => p.id === poId);
                                                if (selectedPo) {
                                                    setFormData({
                                                        ...formData,
                                                        linkedPoId: poId,
                                                        vendor_name: selectedPo.vendor || formData.vendor_name,
                                                        location: selectedPo.location || formData.location
                                                    });
                                                } else {
                                                    setFormData({...formData, linkedPoId: poId});
                                                }
                                            }}
                                        >
                                            <option value="">— Select PO —</option>
                                            {openPOs.map(po => <option key={po.id} value={po.id}>{po.poNumber} ({po.vendor || 'No Vendor'})</option>)}
                                        </select>
                                    ) : (
                                        <span style={{ fontSize: '0.7rem', color: '#b8a03a', fontStyle: 'italic' }}>No Open POs Available</span>
                                    )}
                                </div>

                                {/* Dynamic Fields - Hidden for bills entry */}
                                {type !== 'bills' && (
                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                        {fields.map(f => {
                                            const fixedIds = ['lr_number', 'date', 'time', 'vendor_name', 'transport_company', 'location'];
                                            if (fixedIds.includes(f.id)) return null;
                                            return (
                                                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span className="saas-lot-label-tiny" style={{ fontWeight: '700' }}>{f.label.toUpperCase()}:</span>
                                                    <input 
                                                        required={f.required} 
                                                        type={f.type} 
                                                        className="saas-input-box" 
                                                        style={{ width: '110px', height: '28px' }} 
                                                        value={dynamicData[f.id] || ''} 
                                                        onChange={e => setDynamicData(prev => ({...prev, [f.id]: e.target.value}))} 
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Lot Spreadsheet - Task 3.2: Hidden for bills entry */}
                            {type === 'transport' && (
                                <div style={{ background: '#fff' }}>
                                    <div style={{ padding: '4px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f4f5f7', borderBottom: '1px solid var(--color-border)' }}>
                                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--color-accent-blue)', letterSpacing: '0.05em' }}>LOT DETAILS</span>
                                        <button type="button" onClick={addLot} className="btn btn-outline" style={{ padding: '0 8px', fontSize: '0.65rem', height: '20px' }}>+ New Row</button>
                                    </div>
                                    {lots.map(lot => {
                                        const lotSize = parseFloat(lot.lot_size) || 0;
                                        const received = parseFloat(lot.received) || 0;
                                        const pending = lotSize - received;
                                        
                                        return (
                                        <div key={lot.id} className="saas-lot-row">
                                            <div style={{ width: '120px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span className="saas-lot-label-tiny">SIZE:</span>
                                                <input required className="saas-input-box" style={{ height: '26px' }} value={lot.lot_size} onChange={e => updateLot(lot.id, { lot_size: e.target.value })} />
                                            </div>
                                            <div style={{ width: '140px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span className="saas-lot-label-tiny">RECEIVED:</span>
                                                <input required className="saas-input-box" style={{ height: '26px' }} type="number" placeholder="0" value={lot.received} onChange={e => updateLot(lot.id, { received: e.target.value })} />
                                            </div>
                                            <div style={{ width: '120px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span className="saas-lot-label-tiny" style={{ color: pending > 0 ? 'var(--color-accent-orange)' : '#2ecc71' }}>PENDING:</span>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: pending > 0 ? 'var(--color-accent-orange)' : '#2ecc71' }}>{pending.toFixed(2)}</span>
                                            </div>
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <input type="checkbox" style={{ width: '14px', height: '14px' }} checked={lot.showVendor} onChange={e => updateLot(lot.id, { showVendor: e.target.checked })} />
                                                    <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>OTHER VENDOR?</span>
                                                </div>
                                                {lot.showVendor && (
                                                    <div style={{ flex: 1 }}>
                                                        <GenericAutocomplete 
                                                            placeholder="Override supplier..." 
                                                            fetchData={() => getSuppliers(currentCompanyId)}
                                                            value={lot.lotVendor} onChange={v => updateLot(lot.id, { lotVendor: v })}
                                                            onSelect={s => updateLot(lot.id, { lotVendor: s.name })}
                                                            onAddNew={(value) => {
                                                                setQuickAddInitialValue(value);
                                                                setShowVendorModal(true);
                                                            }}
                                                            addNewLabel="Add Vendor"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <button type="button" onClick={() => removeLot(lot.id)} style={{ border: 'none', background: 'none', color: '#888', cursor: 'pointer' }} disabled={lots.length === 1}><Trash2 size={14} /></button>
                                        </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Mobile-Only Big Save Button at very bottom of form */}
                            <div className="show-on-mobile" style={{ padding: '1rem', background: 'white', borderBottomLeftRadius: '6px', borderBottomRightRadius: '6px' }}>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '48px', fontSize: '1rem' }} disabled={submitting}>
                                    <Save size={20} style={{ marginRight: '8px' }} /> SAVE ENTRY
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Ledger Table (Below) */}
            <div className="saas-ledger-card">
                <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--color-border)', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--color-accent-blue)' }}>
                        {activeTab === 'ledger' ? "Today's Entries" : "Backlog Tracking"}
                    </h3>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)' }}>{filteredEntries.length} items</div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    
                    {/* Desktop View Table - Task 6.1: Conditional columns based on type */}
                    <div className="hide-on-mobile">
                        <table className="daily-entries-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th className="saas-table-header" style={{ width: '50px' }}>S.No</th>
                                    <th className="saas-table-header" style={{ width: '100px' }}>LR</th>
                                    <th className="saas-table-header">Vendor</th>
                                    <th className="saas-table-header">Transport</th>
                                    {type === 'bills' ? (
                                        <>
                                            <th className="saas-table-header" style={{ width: '120px' }}>Booking Date</th>
                                            <th className="saas-table-header" style={{ width: '100px' }}>Days Elapsed</th>
                                            <th className="saas-table-header" style={{ width: '120px' }}>Status</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="saas-table-header">Lots</th>
                                            <th className="saas-table-header" style={{ width: '100px' }}>Fare</th>
                                            <th className="saas-table-header" style={{ width: '100px' }}>Auto</th>
                                            <th className="saas-table-header" style={{ width: '120px' }}>Remaining</th>
                                        </>
                                    )}
                                    <th className="saas-table-header" style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEntries.length === 0 ? (
                                    <tr><td colSpan={type === 'bills' ? "8" : "9"} style={{ textAlign: 'center', padding: '2rem', color: '#999', fontStyle: 'italic' }}>No records found.</td></tr>
                                ) : (
                                    filteredEntries.map((entry, index) => (
                                        <tr key={entry.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                            <td style={{ padding: '0.5rem 1rem', textAlign: 'center', fontWeight: '600', color: '#64748b' }} data-label="S.No">{index + 1}</td>
                                            <td style={{ padding: '0.5rem 1rem' }} data-label="LR Number">
                                                <div style={{ fontWeight: '700' }}>{entry.lr_number}</div>
                                                {entry.linkedPoNumber && (
                                                    <div style={{ fontSize: '0.65rem', color: '#856404', background: '#fff9e6', padding: '1px 4px', borderRadius: '3px', display: 'inline-block', marginTop: '2px', border: '1px solid #ffe58f' }}>
                                                        🔗 {entry.linkedPoNumber}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '0.5rem 1rem', fontWeight: '600' }} data-label="Vendor">{entry.vendor_name}</td>
                                            <td style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#888' }} data-label="Transport">{entry.transport_company}</td>
                                            {type === 'bills' ? (
                                                <>
                                                    {/* Task 6.2: Booking Date column */}
                                                    <td style={{ padding: '0.5rem 1rem' }} data-label="Booking Date">
                                                        {entry.booking_date ? new Date(entry.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                                    </td>
                                                    {/* Task 6.3: Days Elapsed column */}
                                                    <td style={{ padding: '0.5rem 1rem', textAlign: 'center', fontWeight: '600' }} data-label="Days Elapsed">
                                                        {entry.days_elapsed !== undefined && entry.days_elapsed !== null ? entry.days_elapsed : '—'}
                                                    </td>
                                                    {/* Task 6.4: Status column with color-coded indicators */}
                                                    <td style={{ padding: '0.5rem 1rem' }} data-label="Status">
                                                        {entry.delivery_status === 'On Time' && (
                                                            <span style={{ color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <CheckCircle size={16} /> On Time
                                                            </span>
                                                        )}
                                                        {entry.delivery_status === 'Early' && (
                                                            <span style={{ color: '#3b82f6', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Clock size={16} /> Early
                                                            </span>
                                                        )}
                                                        {entry.delivery_status === 'Overdue' && (
                                                            <span style={{ color: 'var(--color-accent-orange)', fontWeight: '700', background: '#fff7ed', padding: '4px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                <AlertCircle size={16} /> Needs Follow Up
                                                            </span>
                                                        )}
                                                        {(!entry.delivery_status || entry.delivery_status === 'Unknown') && (
                                                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unknown</span>
                                                        )}
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td style={{ padding: '0.5rem 1rem' }} data-label="Lots">
                                                        {(entry.lots || []).map((l, i) => (
                                                            <div key={i} style={{ fontSize: '0.75rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                <span><strong>{l.lot_size}</strong></span>
                                                                <span style={{ color: '#64748b' }}>Rcvd: {l.received || 0}</span>
                                                                {l.lotVendor && <span style={{ color: '#aaa', fontStyle: 'italic' }}>({l.lotVendor})</span>}
                                                            </div>
                                                        ))}
                                                        {!entry.lots?.length && '-'}
                                                    </td>
                                                    <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '600' }} data-label="Fare">
                                                        {entry.metadata?.fare || entry.fare || '-'}
                                                    </td>
                                                    <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '600' }} data-label="Auto">
                                                        {entry.metadata?.auto || entry.auto || '-'}
                                                    </td>
                                                    <td style={{ padding: '0.5rem 1rem' }} data-label="Remaining">
                                                        {(() => {
                                                            const totalPending = (entry.lots || []).reduce((acc, l) => acc + (parseFloat(l.pending) || 0), 0);
                                                            return totalPending > 0 
                                                                ? <span style={{ color: 'var(--color-accent-orange)', fontWeight: 700 }}>{totalPending.toFixed(2)}</span>
                                                                : <span style={{ color: '#2ecc71', fontWeight: 600 }}>✓ Complete</span>;
                                                        })()}
                                                    </td>
                                                </>
                                            )}
                                            <td style={{ padding: '0.5rem 1rem', textAlign: 'right' }} data-label="Actions">
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    {isAdmin && entry.status === 'pending' && (
                                                        <button className="btn btn-primary" style={{ padding: '2px 8px', fontSize: '0.65rem', background: 'var(--color-accent-blue)', border: 'none' }} onClick={() => handleReconcile(entry)}>Resolve</button>
                                                    )}
                                                    {type === 'bills' && entry.delivery_status === 'Overdue' && (
                                                        <button className="btn btn-primary" style={{ padding: '2px 8px', fontSize: '0.65rem', background: 'var(--color-accent-orange)', border: 'none', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handleAssignFollowUp(entry)}>
                                                            <Send size={12} /> Assign Follow Up
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card List View */}
                    <div className="show-on-mobile" style={{ padding: '0.5rem', background: '#f8fafc' }}>
                        {filteredEntries.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#999', fontStyle: 'italic' }}>No records found.</div>
                        ) : (
                            filteredEntries.map(entry => {
                                const isExpanded = expandedEntryId === entry.id;
                                const totalPending = (entry.lots || []).reduce((acc, l) => acc + (parseFloat(l.pending) || 0), 0);
                                return (
                                    <div key={entry.id} style={{ 
                                        background: 'white', borderRadius: '12px', marginBottom: '0.75rem', 
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0',
                                        overflow: 'hidden'
                                    }}>
                                        {/* Slim Summary Row */}
                                        <div 
                                            onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                                            style={{ padding: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1e293b' }}>{entry.vendor_name || 'Unknown Vendor'}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.status === 'pending' ? 'var(--color-accent-orange)' : '#10b981' }}></span>
                                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>{entry.lr_number || 'No LR'} • {entry.transport_company || 'No Transport'}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {totalPending > 0 && <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--color-accent-orange)', background: '#fff7ed', padding: '4px 8px', borderRadius: '12px' }}>{totalPending.toFixed(2)} Pending</span>}
                                                <button style={{ background: 'none', border: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                                        <polyline points="6 9 12 15 18 9"></polyline>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Expanded Details View */}
                                        {isExpanded && (
                                            <div style={{ padding: '0.8rem', borderTop: '1px solid #f1f5f9', background: '#f8fafc', fontSize: '0.85rem' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
                                                    <div><span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Date</span> <strong style={{ color: '#334155' }}>{entry.date} {entry.time}</strong></div>
                                                    <div><span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Location</span> <strong style={{ color: '#334155' }}>{entry.location || '—'}</strong></div>
                                                    {entry.linkedPoNumber && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Linked PO</span> <strong style={{ color: '#b45309' }}>{entry.linkedPoNumber}</strong></div>}
                                                </div>
                                                
                                                {/* Meta/Dynamic Fields */}
                                                {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                                                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                        <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.05em' }}>ADDITIONAL DETAILS</div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                            {Object.entries(entry.metadata).map(([key, val]) => (
                                                                <div key={key}>
                                                                    <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase' }}>
                                                                        {key.replace(/_/g, ' ')}
                                                                    </span>
                                                                    <strong style={{ color: '#334155' }}>{val || '—'}</strong>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {entry.lots && entry.lots.length > 0 && (
                                                    <div style={{ marginTop: '0.75rem', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '0.5rem' }}>
                                                        <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.05em' }}>LOTS INCLUDED</div>
                                                        {entry.lots.map((l, i) => (
                                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < entry.lots.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                                                <div style={{ color: '#334155', fontWeight: '500' }}>
                                                                    <div><strong>{l.lot_size}</strong> {l.lotVendor && <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.75rem' }}>({l.lotVendor})</span>}</div>
                                                                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Received: {l.received || 0}</div>
                                                                </div>
                                                                {(parseFloat(l.pending) || 0) > 0 && <span style={{ color: 'var(--color-accent-orange)', fontWeight: '700', fontSize: '0.8rem' }}>Pending: {l.pending}</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {isAdmin && entry.status === 'pending' && (
                                                    <div style={{ marginTop: '0.75rem' }}>
                                                        <button className="btn btn-primary" style={{ width: '100%', padding: '10px', fontSize: '0.85rem', background: 'var(--color-accent-blue)', border: 'none', fontWeight: '600' }} onClick={() => handleReconcile(entry)}>
                                                            <CheckCircle size={16} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} /> Resolve Backlog
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
                {/* Statistics Footer - Task 7: Conditional stats based on type */}
                <div style={{ 
                    padding: '0.75rem 1.5rem', background: 'linear-gradient(to right, #f8fafc, #ffffff)', 
                    borderTop: '2px solid var(--color-border)', 
                    display: 'flex', gap: '2rem', fontSize: '0.8rem', flexWrap: 'wrap', alignItems: 'center'
                }}>
                    {type === 'bills' ? (
                        <>
                            {/* Task 7.2: Bills entry statistics */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: '#f3f4f6', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                                <span style={{ color: '#374151', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Entries:</span>
                                <strong style={{ color: '#374151', fontSize: '1.1rem' }}>
                                    {filteredEntries.length}
                                </strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                                <span style={{ color: '#166534', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>On Time:</span>
                                <strong style={{ color: '#166534', fontSize: '1.1rem' }}>
                                    {filteredEntries.filter(e => e.delivery_status === 'On Time').length}
                                </strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: '#fff7ed', borderRadius: '6px', border: '1px solid #fed7aa' }}>
                                <span style={{ color: '#c2410c', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Needs Follow Up:</span>
                                <strong style={{ color: '#c2410c', fontSize: '1.1rem' }}>
                                    {filteredEntries.filter(e => e.delivery_status === 'Overdue').length}
                                </strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                                <span style={{ color: '#1e40af', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Early:</span>
                                <strong style={{ color: '#1e40af', fontSize: '1.1rem' }}>
                                    {filteredEntries.filter(e => e.delivery_status === 'Early').length}
                                </strong>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Transport entry statistics */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: '#e0f2fe', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                                <span style={{ color: '#0369a1', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Received:</span>
                                <strong style={{ color: '#0369a1', fontSize: '1.1rem' }}>
                                    {filteredEntries.reduce((acc, entry) => acc + (entry.lots || []).reduce((lAcc, l) => lAcc + (parseFloat(l.received) || 0), 0), 0).toFixed(2)}
                                </strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: '#fff7ed', borderRadius: '6px', border: '1px solid #fed7aa' }}>
                                <span style={{ color: '#c2410c', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Pending:</span>
                                <strong style={{ color: '#c2410c', fontSize: '1.1rem' }}>
                                    {filteredEntries.reduce((acc, entry) => acc + (entry.lots || []).reduce((lAcc, l) => lAcc + (parseFloat(l.pending) || 0), 0), 0).toFixed(2)}
                                </strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                                <span style={{ color: '#166534', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Fare:</span>
                                <strong style={{ color: '#166534', fontSize: '1.1rem' }}>
                                    ₹{filteredEntries.reduce((acc, entry) => acc + (parseFloat(entry.metadata?.fare || entry.fare) || 0), 0).toLocaleString()}
                                </strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fde68a' }}>
                                <span style={{ color: '#92400e', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Auto:</span>
                                <strong style={{ color: '#92400e', fontSize: '1.1rem' }}>
                                    ₹{filteredEntries.reduce((acc, entry) => acc + (parseFloat(entry.metadata?.auto || entry.auto) || 0), 0).toLocaleString()}
                                </strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: '#f3f4f6', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                                <span style={{ color: '#374151', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Entries:</span>
                                <strong style={{ color: '#374151', fontSize: '1.1rem' }}>
                                    {filteredEntries.length}
                                </strong>
                            </div>
                        </>
                    )}
                </div>
            </div>
            </div>

            {/* Quick Add Modals */}
            <QuickAddModal
                isOpen={showVendorModal}
                onClose={() => setShowVendorModal(false)}
                onSave={handleAddVendor}
                title="Add New Vendor"
                initialValues={{ name: quickAddInitialValue }}
                fields={[
                    { name: 'name', label: 'Vendor Name', type: 'text', required: true, placeholder: 'Enter vendor name' },
                    { name: 'contact', label: 'Contact Number', type: 'tel', required: false, placeholder: 'Enter phone number' },
                    { name: 'address', label: 'Address', type: 'textarea', required: false, placeholder: 'Enter full address' },
                    { name: 'gst_no', label: 'GST Number', type: 'text', required: false, placeholder: 'Enter GST number' }
                ]}
            />

            <QuickAddModal
                isOpen={showTransportModal}
                onClose={() => setShowTransportModal(false)}
                onSave={handleAddTransport}
                title="Add New Transport Company"
                initialValues={{ name: quickAddInitialValue }}
                fields={[
                    { name: 'name', label: 'Transport Company Name', type: 'text', required: true, placeholder: 'Enter company name' },
                    { name: 'contact', label: 'Contact Number', type: 'tel', required: false, placeholder: 'Enter phone number' },
                    { name: 'vehicleNumber', label: 'Vehicle Number', type: 'text', required: false, placeholder: 'Enter vehicle number' },
                    { name: 'notes', label: 'Notes', type: 'textarea', required: false, placeholder: 'Additional information' }
                ]}
            />
            
            {/* Follow-Up Assignment Modal */}
            {showFollowUpModal && selectedBillForFollowUp && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
                        <h3 style={{ margin: '0 0 1.5rem', color: 'var(--color-accent-orange)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertCircle size={24} /> Assign Follow-Up for Overdue Delivery
                        </h3>
                        
                        <div style={{ background: '#fff7ed', border: '1px solid var(--color-accent-orange)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
                            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: 'var(--color-accent-blue)' }}>Bill Details</h4>
                            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
                                <div><strong>LR Number:</strong> {selectedBillForFollowUp.lr_number}</div>
                                <div><strong>Vendor:</strong> {selectedBillForFollowUp.vendor_name}</div>
                                <div><strong>Transport:</strong> {selectedBillForFollowUp.transport_company}</div>
                                <div><strong>Transport Phone:</strong> {selectedBillForFollowUp.transport_phone || 'N/A'}</div>
                                <div><strong>Booking Station:</strong> {selectedBillForFollowUp.booking_station || 'N/A'}</div>
                                <div><strong>Booking Date:</strong> {selectedBillForFollowUp.booking_date ? new Date(selectedBillForFollowUp.booking_date).toLocaleDateString() : 'N/A'}</div>
                                <div><strong>Days Elapsed:</strong> <span style={{ color: 'var(--color-accent-orange)', fontWeight: '700' }}>{selectedBillForFollowUp.days_elapsed || 'N/A'} days</span></div>
                                <div><strong>Status:</strong> <span style={{ color: 'var(--color-accent-orange)', fontWeight: '700' }}>⚠️ OVERDUE</span></div>
                            </div>
                        </div>
                        
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                                Select Employee to Assign
                            </label>
                            <select 
                                className="input-field" 
                                value={selectedEmployee} 
                                onChange={e => setSelectedEmployee(e.target.value)}
                                style={{ width: '100%' }}
                            >
                                <option value="">-- Select Employee --</option>
                                {companyEmployees.map(emp => (
                                    <option key={emp.uid} value={emp.uid}>
                                        {emp.display_name || emp.email} {emp.phone_number ? `(${emp.phone_number})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button 
                                className="btn btn-outline" 
                                onClick={() => setShowFollowUpModal(false)}
                                style={{ padding: '0.5rem 1rem' }}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn-primary" 
                                onClick={handleSendWhatsApp}
                                style={{ padding: '0.5rem 1rem', background: '#25D366', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <Send size={16} /> Send via WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
