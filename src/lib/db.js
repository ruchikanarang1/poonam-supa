import { supabase } from './supabase';

// Helper: throw on supabase error
const handle = ({ data, error }, context = "") => {
    if (error) {
        console.error(`[DB ERROR] ${context}:`, error);
        throw new Error(`Database operation failed: ${context} - ${error.message || JSON.stringify(error)}`);
    }
    return data;
};

// ==== Products ==== //
export const getProducts = async (companyId) => {
    if (!companyId) return [];
    try {
        const { data, error } = await supabase.from('products').select('*').eq('company_id', companyId);
        const products = handle({ data, error }, "getProducts") || [];
        // Map database fields to frontend expectations
        return products.map(p => ({ 
            ...p, 
            createdAt: p.created_at || p.createdAt,
            imageUrl: p.image_url || p.imageUrl // Map snake_case to camelCase
        }));
    } catch (e) {
        console.error("Network Error in getProducts:", e);
        return [];
    }
};

export const addProduct = async (companyId, productData) => {
    const { data, error } = await supabase.from('products').insert({ ...productData, company_id: companyId }).select().single();
    return handle({ data, error }, "addProduct");
};

export const updateProduct = async (companyId, id, productData) => {
    const { data, error } = await supabase.from('products').update(productData).eq('id', id).eq('company_id', companyId).select().single();
    return handle({ data, error }, "updateProduct");
};

export const deleteProduct = async (companyId, id) => {
    const { error } = await supabase.from('products').delete().eq('id', id).eq('company_id', companyId);
    return handle({ error }, "deleteProduct");
};

export const addBulkProducts = async (companyId, products) => {
    const rows = products.map(p => ({ ...p, company_id: companyId }));
    const { data, error } = await supabase.from('products').insert(rows);
    return handle({ data, error }, "addBulkProducts");
};

export const uploadImage = async (file) => {
    if (!file) return null;
    const fileName = `${Date.now()}_${file.name}`;
    handle(await supabase.storage.from('product-images').upload(fileName, file));
    const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return data.publicUrl;
};

// ==== Orders ==== //
export const createOrder = async (companyId, orderData) => {
    const data = handle(await supabase.from('orders').insert({
        ...orderData,
        company_id: companyId,
        created_at: new Date().toISOString()
    }).select().single());
    return data;
};

export const getOrders = async (companyId) => {
    if (!companyId) return [];
    try {
        const { data, error } = await supabase.from('orders').select('*').eq('company_id', companyId);
        const orders = handle({ data, error }, "getOrders") || [];
        return orders.map(o => ({ ...o, createdAt: o.created_at || o.createdAt }));
    } catch (e) {
        console.error("Network Error in getOrders:", e);
        return [];
    }
};

// ==== Users & Roles ==== //
export const getUsers = async () => {
    const data = handle(await supabase.from('profiles').select('*'));
    return (data || []).map(u => ({ ...u, uid: u.id }));
};

export const updateUserRoles = async (userId, rolesArray) => {
    handle(await supabase.from('profiles').update({ roles: rolesArray }).eq('id', userId));
};

export const getUserByEmail = async (email) => {
    const data = handle(await supabase.from('profiles').select('*').eq('email', email.trim().toLowerCase()));
    if (data && data.length > 0) return { ...data[0], uid: data[0].id };
    return null;
};

// ==== Dynamic Form Configs ==== //
export const getFormConfig = async (companyId, formType) => {
    const data = handle(await supabase
        .from('form_configs')
        .select('fields')
        .eq('company_id', companyId)
        .eq('form_type', formType)
        .maybeSingle()
    );
    return data?.fields || [];
};

export const saveFormConfig = async (companyId, formType, fieldsArray) => {
    handle(await supabase.from('form_configs').upsert({
        company_id: companyId,
        form_type: formType,
        fields: fieldsArray
    }, { onConflict: 'company_id,form_type' }));
};

// ==== Logistics Entries ==== //
export const getLogisticsEntries = async (companyId, type) => {
    if (!companyId) return [];
    try {
        const { data, error } = await supabase.from(`logistics_${type}`).select('*').eq('company_id', companyId);
        const entries = handle({ data, error }, `getLogisticsEntries:${type}`) || [];
        
        // Map database fields to frontend expectations
        return entries.map(entry => {
            let lots = entry.goods || entry.lots || [];
            
            // Migrate old data format: convert isShort/backlogQty to received/pending
            lots = lots.map(lot => {
                if (lot.received !== undefined && lot.pending !== undefined) {
                    // New format, return as-is
                    return lot;
                }
                
                // Old format migration
                const lotSize = parseFloat(lot.lot_size) || 0;
                if (lot.isShort && lot.backlogQty) {
                    // Old format: had isShort and backlogQty
                    const backlog = parseFloat(lot.backlogQty) || 0;
                    const received = lotSize - backlog;
                    return {
                        ...lot,
                        received: received,
                        pending: backlog
                    };
                } else {
                    // Old format: no shortage, all received
                    return {
                        ...lot,
                        received: lotSize,
                        pending: 0
                    };
                }
            });
            
            return {
                ...entry,
                lots: lots,
                createdAt: entry.created_at || entry.createdAt
            };
        });
    } catch (e) {
        console.error(`Network error on logistics_${type}:`, e);
        return [];
    }
};

export const addLogisticsEntry = async (companyId, type, entryData) => {
    // Define standard columns for partitioning
    const standardColumns = [
        'date', 'time', 'lr_number', 'transport_company', 'vendor_name', 
        'location', 'vehicle_no', 'driver_name', 'from_loc', 'to_loc', 
        'opened', 'status', 'notes', 'po_id', 'bill_no', 'vendor', 
        'amount', 'category', 'payment_mode',
        // Delivery tracking columns
        'booking_date', 'booking_station', 'delivery_status', 'days_elapsed'
    ];

    const cleanData = {};
    const metadata = {};

    // Special handling: map 'lots' to 'goods' column
    if (entryData.lots) {
        cleanData.goods = entryData.lots;
    }

    // Partition data into top-level columns vs metadata bucket
    Object.keys(entryData).forEach(key => {
        if (key === 'lots') {
            // Already handled above
            return;
        }
        if (standardColumns.includes(key)) {
            cleanData[key] = entryData[key];
        } else {
            metadata[key] = entryData[key];
        }
    });

    const result = handle(await supabase.from(`logistics_${type}`).insert({
        ...cleanData,
        metadata,
        company_id: companyId,
        created_at: new Date().toISOString()
    }).select().single());
    
    return result;
};

export const deleteLogisticsEntry = async (companyId, type, id) => {
    handle(await supabase.from(`logistics_${type}`).delete().eq('id', id).eq('company_id', companyId));
};

export const updateLogisticsEntry = async (companyId, type, id, updates) => {
    const standardColumns = [
        'date', 'time', 'lr_number', 'transport_company', 'vendor_name', 
        'location', 'vehicle_no', 'driver_name', 'from_loc', 'to_loc', 
        'opened', 'status', 'notes', 'po_id', 'bill_no', 'vendor', 
        'amount', 'category', 'payment_mode',
        // Delivery tracking columns
        'booking_date', 'booking_station', 'delivery_status', 'days_elapsed'
    ];

    const cleanData = {};
    const metadata = {};

    // Special handling: map 'lots' to 'goods' column
    if (updates.lots) {
        cleanData.goods = updates.lots;
    }

    // Partition data into top-level columns vs metadata bucket
    Object.keys(updates).forEach(key => {
        if (key === 'lots') {
            // Already handled above
            return;
        }
        if (standardColumns.includes(key)) {
            cleanData[key] = updates[key];
        } else {
            metadata[key] = updates[key];
        }
    });

    // If there's metadata, include it
    const finalUpdates = Object.keys(metadata).length > 0 
        ? { ...cleanData, metadata }
        : cleanData;

    handle(await supabase.from(`logistics_${type}`).update(finalUpdates).eq('id', id).eq('company_id', companyId));
};

export const getLogisticsEntriesInRange = async (companyId, type, startDate, endDate) => {
    const data = handle(await supabase
        .from(`logistics_${type}`)
        .select('*')
        .eq('company_id', companyId)
        .gte('date', startDate)
        .lte('date', endDate)
    );
    return data || [];
};

// ==== Ticketing System ==== //
export const getTicketCategories = async (companyId) => {
    const data = handle(await supabase.from('ticket_categories').select('*').eq('company_id', companyId));
    return data || [];
};

export const saveTicketCategory = async (companyId, id, data) => {
    if (id) {
        handle(await supabase.from('ticket_categories').update(data).eq('id', id).eq('company_id', companyId));
    } else {
        handle(await supabase.from('ticket_categories').insert({ ...data, company_id: companyId }));
    }
};

export const deleteTicketCategory = async (companyId, id) => {
    handle(await supabase.from('ticket_categories').delete().eq('id', id).eq('company_id', companyId));
};

export const getTickets = async (companyId) => {
    const data = handle(await supabase.from('tickets').select('*').eq('company_id', companyId));
    return (data || []).map(t => ({ ...t, createdAt: t.created_at || t.createdAt }));
};

export const addTicket = async (companyId, ticketData) => {
    const result = handle(await supabase.from('tickets').insert({
        ...ticketData,
        company_id: companyId,
        created_at: new Date().toISOString()
    }).select().single());
    return result;
};

export const updateTicketStatus = async (companyId, ticketId, updates) => {
    handle(await supabase.from('tickets').update(updates).eq('id', ticketId).eq('company_id', companyId));
};

// ==== Suppliers ==== //
export const getSuppliers = async (companyId) => {
    const data = handle(await supabase.from('suppliers').select('*').eq('company_id', companyId));
    return data || [];
};

export const saveSupplier = async (companyId, id, data) => {
    if (id) {
        handle(await supabase.from('suppliers').update(data).eq('id', id).eq('company_id', companyId));
    } else {
        handle(await supabase.from('suppliers').insert({
            ...data,
            company_id: companyId,
            created_at: new Date().toISOString()
        }));
    }
};

export const deleteSupplier = async (companyId, id) => {
    handle(await supabase.from('suppliers').delete().eq('id', id).eq('company_id', companyId));
};

export const updateSupplierBrands = async (companyId, id, brandsArray) => {
    handle(await supabase.from('suppliers').update({ brands: brandsArray }).eq('id', id).eq('company_id', companyId));
};

// ==== Units & Configs ==== //
export const getGlobalUnits = async (companyId) => {
    if (!companyId) return ['kg', 'MT', 'pieces', 'bundles', 'coils'];
    try {
        const { data, error } = await supabase
            .from('configs')
            .select('value')
            .eq('company_id', companyId)
            .eq('key', 'units')
            .maybeSingle();

        const result = handle({ data, error }, "getGlobalUnits");
        return result?.value?.list || ['kg', 'MT', 'pieces', 'bundles', 'coils'];
    } catch (e) {
        console.error("Network Error in getGlobalUnits:", e);
        return ['kg', 'MT', 'pieces', 'bundles', 'coils'];
    }
};

export const saveGlobalUnits = async (companyId, unitsArray) => {
    handle(await supabase.from('configs').upsert({
        company_id: companyId,
        key: 'units',
        value: { list: unitsArray }
    }, { onConflict: 'company_id,key' }));
};

// ==== Categories Management ==== //
export const getGlobalCategories = async (companyId) => {
    if (!companyId) return ['TMT Bars', 'Angles', 'Channels', 'Beams', 'Plates', 'Sheets'];
    try {
        const { data, error } = await supabase
            .from('configs')
            .select('value')
            .eq('company_id', companyId)
            .eq('key', 'categories')
            .maybeSingle();

        const result = handle({ data, error }, "getGlobalCategories");
        return result?.value?.list || ['TMT Bars', 'Angles', 'Channels', 'Beams', 'Plates', 'Sheets'];
    } catch (e) {
        console.error("Network Error in getGlobalCategories:", e);
        return ['TMT Bars', 'Angles', 'Channels', 'Beams', 'Plates', 'Sheets'];
    }
};

export const saveGlobalCategories = async (companyId, categoriesArray) => {
    handle(await supabase.from('configs').upsert({
        company_id: companyId,
        key: 'categories',
        value: { list: categoriesArray }
    }, { onConflict: 'company_id,key' }));
};

// ==== Goods Check-In ==== //
export const getGoodsCheckInEntries = async (companyId) => {
    const data = handle(await supabase.from('goods_check_in').select('*').eq('company_id', companyId));
    return (data || []).map(g => ({ ...g, createdAt: g.created_at || g.createdAt }));
};

export const addGoodsCheckInEntry = async (companyId, data) => {
    const result = handle(await supabase.from('goods_check_in').insert({
        ...data,
        company_id: companyId,
        created_at: new Date().toISOString()
    }).select().single());
    return result;
};

export const updateGoodsCheckInEntry = async (companyId, id, updates) => {
    handle(await supabase.from('goods_check_in').update(updates).eq('id', id).eq('company_id', companyId));
};

// ==== Vendor-Brand Registry ==== //
export const getVendorBrandRegistry = async (companyId) => {
    const data = handle(await supabase.from('vendor_brand_registry').select('*').eq('company_id', companyId));
    return data || [];
};

export const saveVendorBrandEntry = async (companyId, id, data) => {
    if (id) {
        handle(await supabase.from('vendor_brand_registry').update(data).eq('id', id).eq('company_id', companyId));
    } else {
        handle(await supabase.from('vendor_brand_registry').insert({
            ...data,
            company_id: companyId,
            created_at: new Date().toISOString()
        }));
    }
};

export const deleteVendorBrandEntry = async (companyId, id) => {
    handle(await supabase.from('vendor_brand_registry').delete().eq('id', id).eq('company_id', companyId));
};

// ==== Transports ==== //
export const getTransports = async (companyId) => {
    const data = handle(await supabase.from('transports').select('*').eq('company_id', companyId));
    return data || [];
};

export const saveTransport = async (companyId, id, data) => {
    // Map form fields to database fields
    const transportData = {
        name: data.name,
        contact: data.phone || data.contact,
        vehicle_nos: data.vehicleNumber ? [data.vehicleNumber] : (data.vehicle_nos || []),
        notes: data.notes || '',
        booking_stations: data.booking_stations || []
    };

    if (id) {
        handle(await supabase.from('transports').update(transportData).eq('id', id).eq('company_id', companyId));
    } else {
        handle(await supabase.from('transports').insert({
            ...transportData,
            company_id: companyId,
            created_at: new Date().toISOString()
        }));
    }
};

export const deleteTransport = async (companyId, id) => {
    handle(await supabase.from('transports').delete().eq('id', id).eq('company_id', companyId));
};

// Task 1.3: Get transport with booking stations
export const getTransportWithStations = async (companyId, transportName) => {
    const { data, error } = await supabase
        .from('transports')
        .select('*')
        .eq('company_id', companyId)
        .eq('name', transportName)
        .order('created_at', { ascending: false })
        .limit(1);
    
    if (error) {
        console.error(`[DB ERROR] getTransportWithStations:`, error);
        throw new Error(`Database operation failed: getTransportWithStations - ${error.message || JSON.stringify(error)}`);
    }
    
    // Return first result or null if no results
    return data && data.length > 0 ? data[0] : null;
};

// Task 1.4: Update transport booking stations
export const updateTransportStations = async (companyId, transportId, stations) => {
    const { data, error } = await supabase
        .from('transports')
        .update({ booking_stations: stations })
        .eq('id', transportId)
        .eq('company_id', companyId)
        .select()
        .single();
    return handle({ data, error }, 'updateTransportStations');
};

// Task 1.5: Get bills with delivery tracking
export const getBillsWithTracking = async (companyId) => {
    const { data, error } = await supabase
        .from('logistics_bills')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
    
    const bills = handle({ data, error }, 'getBillsWithTracking') || [];
    
    // Return bills with tracking fields (calculation will be done in UI layer)
    return bills.map(bill => ({
        ...bill,
        createdAt: bill.created_at || bill.createdAt
    }));
};

// ==== Purchase Orders ==== //
export const getPurchaseOrders = async (companyId) => {
    const data = handle(await supabase
        .from('purchase_orders')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
    );
    return (data || []).map(po => ({ ...po, createdAt: po.created_at || po.createdAt }));
};

export const addPurchaseOrder = async (companyId, poData) => {
    const today = new Date();
    const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const rand = Math.floor(100 + Math.random() * 900);
    const poNumber = `PO-${datePart}-${rand}`;

    const result = handle(await supabase.from('purchase_orders').insert({
        ...poData,
        company_id: companyId,
        po_number: poNumber,
        status: 'pending',
        transport_entry_id: null,
        bill_entry_id: null,
        created_at: new Date().toISOString()
    }).select().single());
    return result;
};

export const updatePurchaseOrder = async (companyId, poId, updates) => {
    handle(await supabase.from('purchase_orders').update(updates).eq('id', poId).eq('company_id', companyId));
};

// ==== Purchase Orders Linking ==== //
export const linkEntryToPurchaseOrder = async (companyId, poId, type, entryId) => {
    const data = handle(await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', poId)
        .eq('company_id', companyId)
        .single()
    );
    if (!data) return;

    const update = type === 'transport'
        ? { transport_entry_id: entryId }
        : { bill_entry_id: entryId };

    const hasTransport = type === 'transport' ? true : !!data.transport_entry_id;
    const hasBill = type === 'bills' ? true : !!data.bill_entry_id;
    const newStatus = hasTransport && hasBill ? 'received' : 'partial';

    handle(await supabase.from('purchase_orders').update({ ...update, status: newStatus }).eq('id', poId));
};

// ==== Companies Management ==== //
export const createCompany = async (ownerId, name, location = '') => {
    try {
        console.log("[DB] createCompany: Step 1 (Inserting company)...");
        const { data: compData, error: insError } = await supabase.from('companies').insert({
            name,
            location,
            owner_id: ownerId,
            admin_ids: [ownerId],
            employee_ids: [ownerId],
            roles: { [ownerId]: ['admin'] },
            created_at: new Date().toISOString()
        }).select().single();

        if (insError) {
            console.error("[DB] createCompany Insert Error:", insError);
            throw insError;
        }
        
        console.log("[DB] createCompany: Step 1 Success. Company ID:", compData.id);
        
        console.log("[DB] createCompany: Step 2 (Updating profile)...");
        const { error: updError } = await supabase.from('profiles')
            .update({ active_company_id: compData.id })
            .eq('id', ownerId);

        if (updError) {
            console.error("[DB] createCompany Profile Update Error:", updError);
            throw updError;
        }

        console.log("[DB] createCompany: Step 2 Success.");
        return compData.id;
    } catch (e) {
        console.error("[DB] createCompany Catch Block:", e);
        throw e;
    }
};

export const getCompanyEmployees = async (companyId) => {
    const compData = handle(await supabase.from('companies').select('*').eq('id', companyId).single());
    if (!compData) return [];

    const employeeIds = compData.employee_ids || [];
    const rolesMap = compData.roles || {};

    if (employeeIds.length === 0) return [];

    const users = handle(await supabase.from('profiles').select('*').in('id', employeeIds));
    return (users || []).map(u => ({
        ...u,
        uid: u.id,
        roles: rolesMap[u.id] || []
    }));
};

export const updateCompanyEmployeeRoles = async (companyId, employeeId, roles) => {
    const compData = handle(await supabase.from('companies').select('*').eq('id', companyId).single());
    const updatedRoles = { ...(compData.roles || {}), [employeeId]: roles };
    let adminIds = compData.admin_ids || [];

    if (roles.includes('admin') && !adminIds.includes(employeeId)) {
        adminIds = [...adminIds, employeeId];
    } else if (!roles.includes('admin') && adminIds.includes(employeeId)) {
        adminIds = adminIds.filter(id => id !== employeeId);
    }

    handle(await supabase.from('companies').update({ roles: updatedRoles, admin_ids: adminIds }).eq('id', companyId));
};

export const addCompanyEmployee = async (companyId, employeeId) => {
    const compData = handle(await supabase.from('companies').select('employee_ids').eq('id', companyId).single());
    const employeeIds = compData?.employee_ids || [];

    if (!employeeIds.includes(employeeId)) {
        handle(await supabase.from('companies').update({
            employee_ids: [...employeeIds, employeeId]
        }).eq('id', companyId));
    }
    
    // Also approve them globally so they bypass the AccessPending screen
    await supabase.from('profiles').update({ status: 'approved' }).eq('id', employeeId);
};

// Update employee profile details
export const updateEmployeeProfile = async (employeeId, profileData) => {
    const { data, error} = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', employeeId)
        .select()
        .single();
    return handle({ data, error }, 'updateEmployeeProfile');
};

// ==== Reports & Analytics Functions ==== //

// Get Transport Entries with Filters
export const getTransportEntriesFiltered = async (companyId, filters = {}) => {
    if (!companyId) return [];
    
    let query = supabase
        .from('logistics_transport')
        .select('*')
        .eq('company_id', companyId);
    
    // Apply date range filter
    if (filters.dateRange?.start) {
        query = query.gte('date', filters.dateRange.start);
    }
    if (filters.dateRange?.end) {
        query = query.lte('date', filters.dateRange.end);
    }
    
    // Apply vendor filter
    if (filters.vendors?.length > 0) {
        query = query.in('vendor_name', filters.vendors);
    }
    
    // Apply transport company filter
    if (filters.transportCompanies?.length > 0) {
        query = query.in('transport_company', filters.transportCompanies);
    }
    
    // Apply status filter
    if (filters.statuses?.length > 0) {
        query = query.in('status', filters.statuses);
    }
    
    query = query.order('date', { ascending: false });
    
    const { data, error } = await query;
    const entries = handle({ data, error }, 'getTransportEntriesFiltered') || [];
    
    return entries.map(entry => ({
        ...entry,
        lots: entry.goods || entry.lots || [],
        createdAt: entry.created_at || entry.createdAt
    }));
};

// Get Bills Entries with Filters
export const getBillsEntriesFiltered = async (companyId, filters = {}) => {
    if (!companyId) return [];
    
    let query = supabase
        .from('logistics_bills')
        .select('*')
        .eq('company_id', companyId);
    
    // Apply date range filter
    if (filters.dateRange?.start) {
        query = query.gte('date', filters.dateRange.start);
    }
    if (filters.dateRange?.end) {
        query = query.lte('date', filters.dateRange.end);
    }
    
    // Apply vendor filter
    if (filters.vendors?.length > 0) {
        query = query.in('vendor_name', filters.vendors);
    }
    
    // Apply transport company filter
    if (filters.transportCompanies?.length > 0) {
        query = query.in('transport_company', filters.transportCompanies);
    }
    
    // Apply category filter (from metadata)
    if (filters.categories?.length > 0) {
        // Note: This requires metadata filtering which may need custom logic
        // For now, we'll fetch all and filter in memory
    }
    
    query = query.order('date', { ascending: false });
    
    const { data, error } = await query;
    const entries = handle({ data, error }, 'getBillsEntriesFiltered') || [];
    
    return entries.map(entry => ({
        ...entry,
        createdAt: entry.created_at || entry.createdAt
    }));
};

// Get Inventory Report
export const getInventoryReport = async (companyId, filters = {}) => {
    if (!companyId) return [];
    
    let query = supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId);
    
    // Apply brand filter
    if (filters.brands?.length > 0) {
        query = query.in('brand', filters.brands);
    }
    
    // Apply category filter
    if (filters.categories?.length > 0) {
        query = query.in('category', filters.categories);
    }
    
    const { data, error } = await query;
    const products = handle({ data, error }, 'getInventoryReport') || [];
    
    return products.map(p => ({
        ...p,
        product_name: p.name,
        stock_quantity: p.stock || 0,
        createdAt: p.created_at || p.createdAt
    }));
};

// Get Vendor Performance Metrics
export const getVendorPerformanceMetrics = async (companyId, filters = {}) => {
    if (!companyId) return [];
    
    try {
        // Fetch bills and transport entries
        const [bills, transports, brands] = await Promise.all([
            getBillsEntriesFiltered(companyId, filters),
            getTransportEntriesFiltered(companyId, filters),
            getVendorBrandRegistry(companyId)
        ]);
        
        // Aggregate by vendor
        const vendorMap = {};
        
        bills.forEach(bill => {
            const vendor = bill.vendor_name;
            if (!vendor) return;
            
            if (!vendorMap[vendor]) {
                vendorMap[vendor] = {
                    vendor_name: vendor,
                    total_purchase_amount: 0,
                    total_orders: 0,
                    brands_supplied: new Set(),
                    delivery_times: [],
                    on_time_count: 0,
                    total_deliveries: 0
                };
            }
            
            vendorMap[vendor].total_orders++;
            
            // Add delivery tracking data
            if (bill.days_elapsed !== undefined) {
                vendorMap[vendor].delivery_times.push(bill.days_elapsed);
                vendorMap[vendor].total_deliveries++;
                
                if (bill.delivery_status === 'On Time' || bill.delivery_status === 'Early') {
                    vendorMap[vendor].on_time_count++;
                }
            }
        });
        
        // Add brands from registry
        brands.forEach(entry => {
            const vendor = entry.vendor_name;
            if (vendorMap[vendor] && entry.brand_name) {
                vendorMap[vendor].brands_supplied.add(entry.brand_name);
            }
        });
        
        // Convert to array and calculate metrics
        return Object.values(vendorMap).map(vendor => ({
            ...vendor,
            brands_supplied: Array.from(vendor.brands_supplied),
            avg_delivery_time: vendor.delivery_times.length > 0
                ? (vendor.delivery_times.reduce((a, b) => a + b, 0) / vendor.delivery_times.length).toFixed(1)
                : 0,
            on_time_percentage: vendor.total_deliveries > 0
                ? ((vendor.on_time_count / vendor.total_deliveries) * 100).toFixed(1)
                : 0
        })).sort((a, b) => b.total_purchase_amount - a.total_purchase_amount);
        
    } catch (error) {
        console.error('Error in getVendorPerformanceMetrics:', error);
        return [];
    }
};

// Get Brand Analysis Metrics
export const getBrandAnalysisMetrics = async (companyId, filters = {}) => {
    if (!companyId) return [];
    
    try {
        const [bills, brands] = await Promise.all([
            getBillsEntriesFiltered(companyId, filters),
            getVendorBrandRegistry(companyId)
        ]);
        
        // Aggregate by brand
        const brandMap = {};
        
        brands.forEach(entry => {
            const brand = entry.brand_name;
            if (!brand) return;
            
            if (!brandMap[brand]) {
                brandMap[brand] = {
                    brand_name: brand,
                    total_amount: 0,
                    entry_count: 0,
                    vendors: new Set()
                };
            }
            
            brandMap[brand].entry_count++;
            if (entry.vendor_name) {
                brandMap[brand].vendors.add(entry.vendor_name);
            }
        });
        
        // Convert to array
        return Object.values(brandMap).map(brand => ({
            ...brand,
            vendors: Array.from(brand.vendors),
            avg_amount_per_entry: brand.entry_count > 0
                ? (brand.total_amount / brand.entry_count).toFixed(2)
                : 0
        })).sort((a, b) => b.entry_count - a.entry_count);
        
    } catch (error) {
        console.error('Error in getBrandAnalysisMetrics:', error);
        return [];
    }
};

// Get Financial Summary
export const getFinancialSummary = async (companyId, filters = {}, groupBy = 'vendor') => {
    if (!companyId) return [];
    
    try {
        const bills = await getBillsEntriesFiltered(companyId, filters);
        
        // Aggregate by groupBy parameter
        const groupMap = {};
        
        bills.forEach(bill => {
            let groupKey;
            
            switch (groupBy) {
                case 'vendor':
                    groupKey = bill.vendor_name;
                    break;
                case 'brand':
                    groupKey = bill.metadata?.brand || 'Unknown';
                    break;
                case 'category':
                    groupKey = bill.category || bill.metadata?.category || 'Unknown';
                    break;
                case 'month':
                    groupKey = bill.date ? bill.date.substring(0, 7) : 'Unknown'; // YYYY-MM
                    break;
                default:
                    groupKey = 'All';
            }
            
            if (!groupKey) return;
            
            if (!groupMap[groupKey]) {
                groupMap[groupKey] = {
                    group_name: groupKey,
                    amounts: []
                };
            }
            
            const amount = parseFloat(bill.metadata?.amount || bill.amount || 0);
            groupMap[groupKey].amounts.push(amount);
        });
        
        // Calculate summary metrics
        return Object.values(groupMap).map(group => {
            const amounts = group.amounts;
            const total = amounts.reduce((a, b) => a + b, 0);
            const count = amounts.length;
            
            return {
                group_name: group.group_name,
                total: total.toFixed(2),
                average: count > 0 ? (total / count).toFixed(2) : 0,
                min: count > 0 ? Math.min(...amounts).toFixed(2) : 0,
                max: count > 0 ? Math.max(...amounts).toFixed(2) : 0,
                count
            };
        }).sort((a, b) => parseFloat(b.total) - parseFloat(a.total));
        
    } catch (error) {
        console.error('Error in getFinancialSummary:', error);
        return [];
    }
};

// Get Delivery Tracking Report
export const getDeliveryTrackingReport = async (companyId, filters = {}) => {
    if (!companyId) return [];
    
    try {
        const bills = await getBillsEntriesFiltered(companyId, filters);
        
        // Filter bills with delivery tracking data
        const tracked = bills.filter(bill => 
            bill.booking_date && bill.booking_station && bill.days_elapsed !== undefined
        );
        
        // Calculate metrics
        const onTimeCount = tracked.filter(b => 
            b.delivery_status === 'On Time' || b.delivery_status === 'Early'
        ).length;
        
        const overdueCount = tracked.filter(b => 
            b.delivery_status === 'Overdue'
        ).length;
        
        const totalDays = tracked.reduce((sum, b) => sum + (b.days_elapsed || 0), 0);
        const avgDeliveryTime = tracked.length > 0 ? (totalDays / tracked.length).toFixed(1) : 0;
        const onTimePercentage = tracked.length > 0 ? ((onTimeCount / tracked.length) * 100).toFixed(1) : 0;
        
        return {
            entries: tracked,
            metrics: {
                totalDeliveries: tracked.length,
                onTimePercentage,
                avgDeliveryTime,
                overdueCount
            }
        };
        
    } catch (error) {
        console.error('Error in getDeliveryTrackingReport:', error);
        return { entries: [], metrics: {} };
    }
};

// Get Purchase Orders Report
export const getPurchaseOrdersReport = async (companyId, filters = {}) => {
    if (!companyId) return [];
    
    try {
        let query = supabase
            .from('purchase_orders')
            .select('*')
            .eq('company_id', companyId);
        
        // Apply date range filter
        if (filters.dateRange?.start) {
            query = query.gte('created_at', filters.dateRange.start);
        }
        if (filters.dateRange?.end) {
            query = query.lte('created_at', filters.dateRange.end);
        }
        
        // Apply vendor filter
        if (filters.vendors?.length > 0) {
            query = query.in('vendor_name', filters.vendors);
        }
        
        // Apply status filter
        if (filters.statuses?.length > 0) {
            query = query.in('status', filters.statuses);
        }
        
        query = query.order('created_at', { ascending: false });
        
        const { data, error } = await query;
        const orders = handle({ data, error }, 'getPurchaseOrdersReport') || [];
        
        return orders.map(po => ({
            ...po,
            po_number: po.po_number,
            items_count: po.items?.length || 0,
            total_amount: po.items?.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) || 0,
            createdAt: po.created_at || po.createdAt
        }));
        
    } catch (error) {
        console.error('Error in getPurchaseOrdersReport:', error);
        return [];
    }
};
