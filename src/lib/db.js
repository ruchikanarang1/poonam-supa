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

// ==== Products ==== //
export const getProducts = async () => {
    const q = query(collection(db, 'products'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addProduct = async (productData) => {
    return await addDoc(collection(db, 'products'), productData);
};

export const updateProduct = async (id, productData) => {
    const ref = doc(db, 'products', id);
    return await updateDoc(ref, productData);
};

export const deleteProduct = async (id) => {
    const ref = doc(db, 'products', id);
    return await deleteDoc(ref);
};

export const addBulkProducts = async (products) => {
    const batch = writeBatch(db);
    products.forEach((prod) => {
        const docRef = doc(collection(db, 'products'));
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
export const createOrder = async (orderData) => {
    // orderData expects: { userId, employeeReference, cartItems, status: 'pending', createdAt }
    return await addDoc(collection(db, 'orders'), {
        ...orderData,
        createdAt: new Date().toISOString()
    });
};

export const getOrders = async () => {
    const snap = await getDocs(collection(db, 'orders'));
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
export const getFormConfig = async (formType) => {
    const docSnap = await getDoc(doc(db, 'formConfigs', formType));
    if (docSnap.exists()) {
        return docSnap.data().fields || [];
    }
    return [];
};

export const saveFormConfig = async (formType, fieldsArray) => {
    const configRef = doc(db, 'formConfigs', formType);
    return await setDoc(configRef, { fields: fieldsArray }, { merge: true });
};

// ==== Phase 2: Logistics Entries ==== //
export const getLogisticsEntries = async (type) => { // type: 'transport' or 'bills'
    const snap = await getDocs(collection(db, `logistics_${type}`));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addLogisticsEntry = async (type, data) => {
    return await addDoc(collection(db, `logistics_${type}`), {
        ...data,
        createdAt: new Date().toISOString()
    });
};

export const deleteLogisticsEntry = async (type, id) => {
    const ref = doc(db, `logistics_${type}`, id);
    return await deleteDoc(ref);
};

// ==== Phase 3: Ticketing System ==== //
export const getTicketCategories = async () => {
    const snap = await getDocs(collection(db, 'ticketCategories'));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const saveTicketCategory = async (id, data) => {
    // data expects: { name: 'Goods Shortage', fields: [...] }
    if (id) {
        return await updateDoc(doc(db, 'ticketCategories', id), data);
    } else {
        return await addDoc(collection(db, 'ticketCategories'), data);
    }
};

export const deleteTicketCategory = async (id) => {
    return await deleteDoc(doc(db, 'ticketCategories', id));
};

export const getTickets = async () => {
    const snap = await getDocs(collection(db, 'tickets'));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addTicket = async (ticketData) => {
    // ticketData expects: { categoryId, categoryName, formData, submittedBy, submittedByName, status: 'pending', reconciled: false }
    return await addDoc(collection(db, 'tickets'), {
        ...ticketData,
        createdAt: new Date().toISOString()
    });
};

export const updateTicketStatus = async (ticketId, updates) => {
    // updates: { status: 'approved' } or { reconciled: true }
    const ref = doc(db, 'tickets', ticketId);
    return await updateDoc(ref, updates);
};

// ==== Phase 4: Suppliers ==== //
export const getSuppliers = async () => {
    const snap = await getDocs(collection(db, 'suppliers'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const saveSupplier = async (id, data) => {
    // data: { name, phone, address?, gst? }
    if (id) {
        return await updateDoc(doc(db, 'suppliers', id), data);
    } else {
        return await addDoc(collection(db, 'suppliers'), { ...data, createdAt: new Date().toISOString() });
    }
};

export const deleteSupplier = async (id) => deleteDoc(doc(db, 'suppliers', id));

// ==== Phase 4: Purchase Orders ==== //
export const getPurchaseOrders = async () => {
    const snap = await getDocs(collection(db, 'purchaseOrders'));
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return orders;
};

export const addPurchaseOrder = async (poData) => {
    // Auto-generate a PO number: PO-YYYYMMDD-XXX
    const today = new Date();
    const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const rand = Math.floor(100 + Math.random() * 900);
    const poNumber = `PO-${datePart}-${rand}`;

    return await addDoc(collection(db, 'purchaseOrders'), {
        ...poData,
        poNumber,
        status: 'pending',   // pending | partial | received
        transportEntryId: null,
        billEntryId: null,
        createdAt: new Date().toISOString()
    });
};

export const updatePurchaseOrder = async (poId, updates) => {
    return await updateDoc(doc(db, 'purchaseOrders', poId), updates);
};

// Called from LogisticsPortal after saving a transport/bill entry linked to a PO
export const linkEntryToPurchaseOrder = async (poId, type, entryId) => {
    const poRef = doc(db, 'purchaseOrders', poId);
    const poSnap = await getDoc(poRef);
    if (!poSnap.exists()) return;

    const po = poSnap.data();
    const update = type === 'transport'
        ? { transportEntryId: entryId }
        : { billEntryId: entryId };

    // Determine new status
    const hasTransport = type === 'transport' ? true : !!po.transportEntryId;
    const hasBill = type === 'bills' ? true : !!po.billEntryId;
    const newStatus = hasTransport && hasBill ? 'received' : 'partial';

    return await updateDoc(poRef, { ...update, status: newStatus });
};
