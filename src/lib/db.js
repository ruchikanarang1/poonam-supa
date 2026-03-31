import { db, storage } from './firebase';
import {
    collection,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    writeBatch,
    setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Helper for scoped company data
const getScopedCol = (companyId, collName) => {
    if (!companyId) return collection(db, collName); // Fallback to global if no companyId (for migration/debug)
    return collection(db, 'companies', companyId, collName);
};

const getScopedDoc = (companyId, collName, docId) => {
    if (!companyId) return doc(db, collName, docId);
    return doc(db, 'companies', companyId, collName, docId);
};

// ==== Products ==== //
export const getProducts = async (companyId) => {
    const q = query(getScopedCol(companyId, 'products'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addProduct = async (companyId, productData) => {
    return await addDoc(getScopedCol(companyId, 'products'), productData);
};

export const updateProduct = async (companyId, id, productData) => {
    const ref = getScopedDoc(companyId, 'products', id);
    return await updateDoc(ref, productData);
};

export const deleteProduct = async (companyId, id) => {
    const ref = getScopedDoc(companyId, 'products', id);
    return await deleteDoc(ref);
};

export const addBulkProducts = async (companyId, products) => {
    const batch = writeBatch(db);
    products.forEach((prod) => {
        const docRef = doc(getScopedCol(companyId, 'products'));
        batch.set(docRef, prod);
    });
    await batch.commit();
};

export const uploadImage = async (file) => {
    if (!file) return null;
    const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};

// ==== Orders ==== //
export const createOrder = async (companyId, orderData) => {
    return await addDoc(getScopedCol(companyId, 'orders'), {
        ...orderData,
        createdAt: new Date().toISOString()
    });
};

export const getOrders = async (companyId) => {
    const snap = await getDocs(getScopedCol(companyId, 'orders'));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};


// ==== Phase 2: ERP Users & Roles ==== //
export const getUsers = async () => {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(doc => ({ id: doc.uid || doc.id, ...doc.data() }));
};

export const updateUserRoles = async (userId, rolesArray) => {
    const userRef = doc(db, 'users', userId);
    return await updateDoc(userRef, { roles: rolesArray });
};

export const getUserByEmail = async (email) => {
    const q = query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()));
    const snap = await getDocs(q);
    if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
    return null;
};

// ==== Phase 2: Dynamic Form Configs ==== //
export const getFormConfig = async (companyId, formType) => {
    const docSnap = await getDoc(getScopedDoc(companyId, 'formConfigs', formType));
    if (docSnap.exists()) {
        return docSnap.data().fields || [];
    }
    return [];
};

export const saveFormConfig = async (companyId, formType, fieldsArray) => {
    const configRef = getScopedDoc(companyId, 'formConfigs', formType);
    return await setDoc(configRef, { fields: fieldsArray }, { merge: true });
};

// ==== Phase 2: Logistics Entries ==== //
export const getLogisticsEntries = async (companyId, type) => { // type: 'transport' or 'bills'
    const snap = await getDocs(getScopedCol(companyId, `logistics_${type}`));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addLogisticsEntry = async (companyId, type, data) => {
    return await addDoc(getScopedCol(companyId, `logistics_${type}`), {
        ...data,
        createdAt: new Date().toISOString()
    });
};

export const deleteLogisticsEntry = async (companyId, type, id) => {
    const ref = getScopedDoc(companyId, `logistics_${type}`, id);
    return await deleteDoc(ref);
};

export const updateLogisticsEntry = async (companyId, type, id, updates) => {
    const ref = getScopedDoc(companyId, `logistics_${type}`, id);
    return await updateDoc(ref, updates);
};

export const getLogisticsEntriesInRange = async (companyId, type, startDate, endDate) => {
    const col = getScopedCol(companyId, `logistics_${type}`);
    const q = query(
        col,
        where('date', '>=', startDate),
        where('date', '<=', endDate)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};


// ==== Phase 3: Ticketing System ==== //
export const getTicketCategories = async (companyId) => {
    const snap = await getDocs(getScopedCol(companyId, 'ticketCategories'));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const saveTicketCategory = async (companyId, id, data) => {
    if (id) {
        return await updateDoc(getScopedDoc(companyId, 'ticketCategories', id), data);
    } else {
        return await addDoc(getScopedCol(companyId, 'ticketCategories'), data);
    }
};

export const deleteTicketCategory = async (companyId, id) => {
    return await deleteDoc(getScopedDoc(companyId, 'ticketCategories', id));
};

export const getTickets = async (companyId) => {
    const snap = await getDocs(getScopedCol(companyId, 'tickets'));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addTicket = async (companyId, ticketData) => {
    return await addDoc(getScopedCol(companyId, 'tickets'), {
        ...ticketData,
        createdAt: new Date().toISOString()
    });
};

export const updateTicketStatus = async (companyId, ticketId, updates) => {
    const ref = getScopedDoc(companyId, 'tickets', ticketId);
    return await updateDoc(ref, updates);
};

// ==== Phase 4: Suppliers ==== //
export const getSuppliers = async (companyId) => {
    const snap = await getDocs(getScopedCol(companyId, 'suppliers'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const saveSupplier = async (companyId, id, data) => {
    if (id) {
        return await updateDoc(getScopedDoc(companyId, 'suppliers', id), data);
    } else {
        return await addDoc(getScopedCol(companyId, 'suppliers'), { ...data, createdAt: new Date().toISOString() });
    }
};

export const deleteSupplier = async (companyId, id) => deleteDoc(getScopedDoc(companyId, 'suppliers', id));

export const updateSupplierBrands = async (companyId, id, brandsArray) => {
    return await updateDoc(getScopedDoc(companyId, 'suppliers', id), { brands: brandsArray });
};

// ==== Phase 5: Units & Configs ==== //
export const getGlobalUnits = async (companyId) => {
    const docSnap = await getDoc(getScopedDoc(companyId, 'configs', 'units'));
    if (docSnap.exists()) return docSnap.data().list || [];
    return ['kg', 'MT', 'pieces', 'bundles', 'coils'];
};

export const saveGlobalUnits = async (companyId, unitsArray) => {
    return await setDoc(getScopedDoc(companyId, 'configs', 'units'), { list: unitsArray });
};

// ==== Phase 5: Goods Check-In ==== //
export const getGoodsCheckInEntries = async (companyId) => {
    const snap = await getDocs(getScopedCol(companyId, 'goods_check_in'));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addGoodsCheckInEntry = async (companyId, data) => {
    return await addDoc(getScopedCol(companyId, 'goods_check_in'), {
        ...data,
        createdAt: new Date().toISOString()
    });
};

export const updateGoodsCheckInEntry = async (companyId, id, updates) => {
    return await updateDoc(getScopedDoc(companyId, 'goods_check_in', id), updates);
};

// ==== Phase 6: Vendor-Brand Registry ==== //
export const getVendorBrandRegistry = async (companyId) => {
    const snap = await getDocs(getScopedCol(companyId, 'vendor_brand_registry'));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const saveVendorBrandEntry = async (companyId, id, data) => {
    if (id) {
        return await updateDoc(getScopedDoc(companyId, 'vendor_brand_registry', id), data);
    } else {
        return await addDoc(getScopedCol(companyId, 'vendor_brand_registry'), {
            ...data,
            createdAt: new Date().toISOString()
        });
    }
};

export const deleteVendorBrandEntry = async (companyId, id) => {
    return await deleteDoc(getScopedDoc(companyId, 'vendor_brand_registry', id));
};

// ==== Phase 4: Transports ==== //
export const getTransports = async (companyId) => {
    const snap = await getDocs(getScopedCol(companyId, 'transports'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const saveTransport = async (companyId, id, data) => {
    if (id) {
        return await updateDoc(getScopedDoc(companyId, 'transports', id), data);
    } else {
        return await addDoc(getScopedCol(companyId, 'transports'), { ...data, createdAt: new Date().toISOString() });
    }
};

export const deleteTransport = async (companyId, id) => deleteDoc(getScopedDoc(companyId, 'transports', id));


// ==== Phase 4: Purchase Orders ==== //
export const getPurchaseOrders = async (companyId) => {
    const snap = await getDocs(getScopedCol(companyId, 'purchaseOrders'));
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return orders;
};

export const addPurchaseOrder = async (companyId, poData) => {
    const today = new Date();
    const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const rand = Math.floor(100 + Math.random() * 900);
    const poNumber = `PO-${datePart}-${rand}`;

    return await addDoc(getScopedCol(companyId, 'purchaseOrders'), {
        ...poData,
        poNumber,
        status: 'pending',
        transportEntryId: null,
        billEntryId: null,
        createdAt: new Date().toISOString()
    });
};

export const updatePurchaseOrder = async (companyId, poId, updates) => {
    return await updateDoc(getScopedDoc(companyId, 'purchaseOrders', poId), updates);
};

// ==== Purchase Orders Linking ==== //
export const linkEntryToPurchaseOrder = async (companyId, poId, type, entryId) => {
    const poRef = getScopedDoc(companyId, 'purchaseOrders', poId);
    const poSnap = await getDoc(poRef);
    if (!poSnap.exists()) return;

    const po = poSnap.data();
    const update = type === 'transport'
        ? { transportEntryId: entryId }
        : { billEntryId: entryId };

    const hasTransport = type === 'transport' ? true : !!po.transportEntryId;
    const hasBill = type === 'bills' ? true : !!po.billEntryId;
    const newStatus = hasTransport && hasBill ? 'received' : 'partial';

    return await updateDoc(poRef, { ...update, status: newStatus });
};

// ==== Companies Management ==== //
export const createCompany = async (ownerId, name) => {
    const compRef = await addDoc(collection(db, 'companies'), {
        name,
        ownerId,
        adminIds: [ownerId],
        employeeIds: [ownerId],
        roles: {
            [ownerId]: ['admin']
        },
        createdAt: new Date().toISOString()
    });
    
    // Update user's active company
    await updateDoc(doc(db, 'users', ownerId), { 
        activeCompanyId: compRef.id 
    });
    
    return compRef.id;
};

export const getCompanyEmployees = async (companyId) => {
    const compRef = doc(db, 'companies', companyId);
    const compSnap = await getDoc(compRef);
    if (!compSnap.exists()) return [];
    
    const data = compSnap.data();
    const employeeIds = data.employeeIds || [];
    const rolesMap = data.roles || {};
    
    const employees = [];
    for (const uid of employeeIds) {
        const userSnap = await getDoc(doc(db, 'users', uid));
        if (userSnap.exists()) {
            employees.push({
                id: uid,
                ...userSnap.data(),
                roles: rolesMap[uid] || []
            });
        }
    }
    return employees;
};

export const updateCompanyEmployeeRoles = async (companyId, employeeId, roles) => {
    const compRef = doc(db, 'companies', companyId);
    await updateDoc(compRef, {
        [`roles.${employeeId}`]: roles
    });
    
    // If giving admin role, ensure they are in adminIds
    const compSnap = await getDoc(compRef);
    const data = compSnap.data();
    let adminIds = data.adminIds || [];
    
    if (roles.includes('admin') && !adminIds.includes(employeeId)) {
        adminIds.push(employeeId);
        await updateDoc(compRef, { adminIds });
    } else if (!roles.includes('admin') && adminIds.includes(employeeId)) {
        adminIds = adminIds.filter(id => id !== employeeId);
        await updateDoc(compRef, { adminIds });
    }
};

export const addCompanyEmployee = async (companyId, employeeId) => {
    const compRef = doc(db, 'companies', companyId);
    const compSnap = await getDoc(compRef);
    const data = compSnap.data();
    const employeeIds = data.employeeIds || [];
    
    if (!employeeIds.includes(employeeId)) {
        employeeIds.push(employeeId);
        await updateDoc(compRef, { employeeIds });
    }
};
