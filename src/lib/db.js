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
    writeBatch
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
