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
        return products.map(p => ({ ...p, createdAt: p.created_at || p.createdAt }));
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
        return entries.map(entry => ({
            ...entry,
            // Map goods (database) to lots (frontend)
            lots: entry.goods || entry.lots || [],
            // Map created_at (database) to createdAt (frontend)
            createdAt: entry.created_at || entry.createdAt
        }));
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
        'amount', 'category', 'payment_mode'
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
    handle(await supabase.from(`logistics_${type}`).update(updates).eq('id', id).eq('company_id', companyId));
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
    if (id) {
        handle(await supabase.from('transports').update(data).eq('id', id).eq('company_id', companyId));
    } else {
        handle(await supabase.from('transports').insert({
            ...data,
            company_id: companyId,
            created_at: new Date().toISOString()
        }));
    }
};

export const deleteTransport = async (companyId, id) => {
    handle(await supabase.from('transports').delete().eq('id', id).eq('company_id', companyId));
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
