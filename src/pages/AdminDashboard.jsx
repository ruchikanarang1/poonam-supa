import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
    getProducts, addProduct, updateProduct, deleteProduct, 
    getOrders, uploadImage, addBulkProducts, getGlobalUnits
} from '../lib/db';
import { Trash2, Edit3, Plus, UploadCloud, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import TeamManagement from '../components/admin/TeamManagement';
import FormBuilder from '../components/admin/FormBuilder';
import Reconciliation from '../components/admin/Reconciliation';
import TicketBuilder from '../components/admin/TicketBuilder';
import TicketReviews from '../components/admin/TicketReviews';
import SupplierManager from '../components/admin/SupplierManager';
import TransportManager from '../components/admin/TransportManager';
import AdminOverview from '../components/admin/AdminOverview';
import BrandRegistryManager from '../components/admin/BrandRegistryManager';
import MigrationTool from '../components/admin/MigrationTool';
import { X, Check } from 'lucide-react';

export default function AdminDashboard() {
    const { isAdmin, isSuperAdmin, currentCompanyId, loginForAdminExport } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'overview';
    const setActiveTab = (tab) => setSearchParams({ tab });

    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const isProcessingRef = useRef(false);
    const [units, setUnits] = useState([]);
    const [newUnit, setNewUnit] = useState('');

    // Product Form State
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ 
        name: '', 
        brand: '', 
        category: '', 
        description: '', 
        dimensions: '', 
        price: '', 
        sizes: '', 
        imageUrl: null 
    });
    const [imageFile, setImageFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");

    // Multi-select State
    const [selectedIds, setSelectedIds] = useState(new Set());

    useEffect(() => {
        if (isAdmin && currentCompanyId) fetchData();
    }, [isAdmin, currentCompanyId]);

    const fetchData = async () => {
        if (!currentCompanyId && !isSuperAdmin) return;
        
        // Start loading
        setLoading(true);
        
        // Safety timeout: if loading takes > 6 seconds, force it off
        const loadTimeout = setTimeout(() => {
            setLoading(false);
        }, 6000);

        try {
            // Fetch everything independently so one failure doesn't block others
            const pPromise = getProducts(currentCompanyId).catch(e => (console.error("Products Load Error:", e), []));
            const oPromise = getOrders(currentCompanyId).catch(e => (console.error("Orders Load Error:", e), []));
            const uPromise = getGlobalUnits(currentCompanyId).catch(e => (console.error("Units Load Error:", e), []));

            const [pData, oData, uData] = await Promise.all([pPromise, oPromise, uPromise]);
            
            setProducts(pData || []);
            setOrders(oData || []);
            setUnits(uData || []);
        } catch (err) {
            console.error("Global Fetch Error:", err);
        } finally {
            clearTimeout(loadTimeout);
            setLoading(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="container" style={{ padding: 'var(--spacing-xl) 0', textAlign: 'center' }}>
                <h2 style={{ color: 'red' }}>Access Denied</h2>
                <p>You do not have administrator privileges to view this page.</p>
            </div>
        );
    }

    const resizeImageToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7)); // compress to 70% quality to fit in Firestore
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleProductSubmit = async (e) => {
        e.preventDefault();
        
        if (!currentCompanyId) {
            alert("No active company found. Please reload or select an organization.");
            return;
        }

        setUploading(true);
        setUploadStatus("Starting...");
        isProcessingRef.current = true;
        
        // Safety timeout: stop processing if it takes > 20 seconds
        setTimeout(() => {
            if (isProcessingRef.current) {
                isProcessingRef.current = false;
                setUploading(false);
                setUploadStatus("");
                alert("The request timed out. Please ensure you've run the SQL optimization script in Supabase.");
            }
        }, 20000);

        try {
            let imageUrl = null;
            if (imageFile) {
                setUploadStatus("Resizing & Optimizing Image...");
                imageUrl = await resizeImageToBase64(imageFile);
            }

            setUploadStatus("Preparing Data...");
            const pPrice = formData.price ? Number(formData.price) : null;
            const dataToSave = {
                name: (formData.name || '').trim(),
                brand: (formData.brand || '').trim(),
                category: (formData.category || 'Uncategorized').trim(),
                description: (formData.description || '').trim(),
                dimensions: (formData.dimensions || '').trim(),
                price: pPrice,
                sizes: formData.sizes ? formData.sizes.split(',').map(s => s.trim()).filter(s => s) : []
            };

            if (imageUrl) {
                dataToSave.imageUrl = imageUrl;
            } else if (editingId && formData.imageUrl) {
                dataToSave.imageUrl = formData.imageUrl;
            }

            setUploadStatus("Connecting to Database...");
            let result;
            if (editingId) {
                result = await updateProduct(currentCompanyId, editingId, dataToSave);
            } else {
                result = await addProduct(currentCompanyId, dataToSave);
            }

            if (!result) {
                throw new Error("Database check failed. Ensure RLS policies are up to date.");
            }

            setUploadStatus("Finalizing...");
            
            isProcessingRef.current = false;
            resetForm();
            fetchData();
        } catch (e) {
            isProcessingRef.current = false;
            console.error(e);
            alert('Error saving product: ' + (e.message || 'Unknown network error'));
        } finally {
            isProcessingRef.current = false;
            setUploadStatus("");
            setUploading(false);
        }
    };

    const handleBulkUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!window.confirm("Are you sure you want to bulk upload this file?")) return;

        setUploading(true);
        isProcessingRef.current = true;

        // Safety timeout for bulk upload
        setTimeout(() => {
            if (isProcessingRef.current) {
                isProcessingRef.current = false;
                setUploading(false);
                alert("Bulk import timed out. Try with a smaller file or check your internet.");
            }
        }, 10000);

        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const data = event.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert sheet to array of arrays
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                // Assume first row is header limit
                const dataRows = rows.slice(1);

                const newProducts = dataRows.map(cols => {
                    return {
                        name: cols[0] ? String(cols[0]).trim() : '',
                        category: cols[1] ? String(cols[1]).trim() : 'Uncategorized',
                        description: cols[2] ? String(cols[2]).trim() : '',
                        dimensions: cols[3] ? String(cols[3]).trim() : '',
                        price: cols[4] ? Number(String(cols[4]).trim()) : null,
                        brand: cols[5] ? String(cols[5]).trim() : '',
                        sizes: cols[6] ? String(cols[6]).split(',').map(s => s.trim()).filter(s => s) : []
                    };
                }).filter(p => p.name);

                if (newProducts.length === 0) {
                    isProcessingRef.current = false;
                    setUploading(false);
                    alert("No valid products found. Ensure the first column (Name) is filled.");
                    return;
                }

                await addBulkProducts(currentCompanyId, newProducts);
                isProcessingRef.current = false;
                alert(`Successfully imported ${newProducts.length} products!`);
                fetchData();
            } catch (err) {
                isProcessingRef.current = false;
                console.error("Bulk upload failed", err);
                alert("Bulk upload failed. Ensure the file format is a valid Excel or CSV.");
            } finally {
                isProcessingRef.current = false;
                setUploading(false);
                if (e.target) e.target.value = null; // reset file input
            }
        };

        reader.readAsBinaryString(file);
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ name: '', brand: '', category: '', description: '', dimensions: '', price: '', sizes: '', imageUrl: null });
        setImageFile(null);
    };

    const handleEdit = (product) => {
        setEditingId(product.id);
        setFormData({
            name: product.name || '',
            brand: product.brand || '',
            category: product.category || 'Uncategorized',
            description: product.description || '',
            dimensions: product.dimensions || '',
            price: product.price || '',
            sizes: product.sizes ? product.sizes.join(', ') : '',
            imageUrl: product.imageUrl || null
        });
        setImageFile(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await deleteProduct(currentCompanyId, id);
                fetchData();
            } catch (e) {
                console.error(e);
                alert('Error deleting product');
            }
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (window.confirm(`Are you sure you want to delete ${selectedIds.size} products?`)) {
            try {
                const deletePromises = Array.from(selectedIds).map(id => deleteProduct(currentCompanyId, id));
                await Promise.all(deletePromises);
                setSelectedIds(new Set());
                fetchData();
            } catch (e) {
                console.error(e);
                alert('Error deleting products');
            }
        }
    };

    const handleOpenGoogleSheets = async () => {
        if (products.length === 0) return alert("Inventory is empty");

        // 0. Open a blank tab synchronously to prevent popup blockers
        let newTab = window.open('about:blank', '_blank');
        if (newTab) {
            newTab.document.write("<h3 style='font-family:sans-serif; text-align:center; margin-top:50px;'>Building your Google Sheet... Please wait.</h3>");
        }

        try {
            setUploading(true);
            const token = await loginForAdminExport();
            if (!token) throw new Error("Could not retrieve Google access token");

            // 1. Create Spreadsheet
            const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    properties: { title: `Poonam Steel Inventory - ${new Date().toLocaleDateString()}` }
                })
            });

            const createData = await createRes.json();

            if (!createRes.ok) {
                if (newTab && !newTab.closed) newTab.close();
                if (createData.error && createData.error.message.includes('Google Sheets API has not been used')) {
                    const urlMatch = createData.error.message.match(/https:\/\/console\.developers\.google\.com[^\s]*/);
                    const enableUrl = urlMatch ? urlMatch[0] : 'https://console.cloud.google.com/apis/library/sheets.googleapis.com';
                    window.open(enableUrl, '_blank');
                    alert(`ACTION REQUIRED:\n\nYou must click the Google Cloud window that just opened to ENABLE the free Google Sheets API for your Firebase project.\n\nOnce you click "Enable" on that page, return here and click Open in Google Sheets again.`);
                    return;
                }
                throw new Error(createData.error?.message || "Failed to create spreadsheet");
            }

            const sid = createData.spreadsheetId;
            const surl = createData.spreadsheetUrl;

            // 2. Populate Data
            const values = [
                ["Name", "Category", "Description", "Dimensions", "Price", "Image Saved"],
                ...products.map(p => [
                    p.name || '',
                    p.category || '',
                    p.description || '',
                    p.dimensions || '',
                    p.price || 'Request Quote',
                    p.imageUrl ? 'Yes' : 'No'
                ])
            ];

            const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/A1:F${values.length}?valueInputOption=USER_ENTERED`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    range: `A1:F${values.length}`,
                    majorDimension: "ROWS",
                    values: values
                })
            });

            if (!updateRes.ok) {
                throw new Error("Failed to populate spreadsheet data right now.");
            }

            // 3. Populate pre-opened tab!
            if (newTab && !newTab.closed) {
                newTab.location.href = surl;
            } else {
                prompt("Spreadsheet created! Your browser blocked the redirect, so please copy/paste this link:", surl);
            }

        } catch (err) {
            console.error(err);
            if (newTab && !newTab.closed) newTab.close();
            alert("Error exporting to Google Sheets: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(new Set(products.map(p => p.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const toggleSelect = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    return (
        <div className="container" style={{ padding: 'var(--spacing-xl) 0' }}>
            <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <h1 style={{ color: 'var(--color-accent-blue)' }}>System Administration</h1>
                
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {['overview', 'products', 'orders', 'team', 'suppliers', 'transports', 'brand_registry', 'units', 'forms', 'reconciliation', 'migration'].map(t => (
                        (t !== 'migration' || isSuperAdmin) && (
                            <button key={t} onClick={() => setActiveTab(t)} className={`btn ${activeTab === t ? 'btn-primary' : 'btn-outline'}`} style={{ fontSize: '0.65rem', padding: '0.3rem 0.5rem' }}>
                                {t.replace('_', ' ').toUpperCase()}
                            </button>
                        )
                    ))}
                </div>

                {/* Bulk & Sync Controls */}
                {activeTab === 'products' && (
                    <div className="full-width-on-mobile" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button 
                            className="btn btn-outline" 
                            onClick={fetchData} 
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
                            title="Force refresh data from database"
                        >
                            <Download size={18} /> Force Sync
                        </button>
                        <input
                            type="file"
                            accept=".csv, .xlsx, .xls"
                            id="csvUpload"
                            style={{ display: 'none' }}
                            onChange={handleBulkUpload}
                        />
                        <label htmlFor="csvUpload" className="btn btn-secondary full-width-on-mobile" style={{ display: 'flex', gap: '0.5rem', cursor: 'pointer' }}>
                            <UploadCloud size={18} /> Bulk Import
                        </label>
                    </div>
                )}
            </div>



            {loading || uploading ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div className="spinner" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid var(--color-primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
                    <p style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem' }}>
                        {uploadStatus || (uploading ? "Uploading to secure database..." : "Syncing your latest inventory...")}
                    </p>
                    <button 
                        className="btn btn-outline" 
                        onClick={() => { setLoading(false); setUploading(false); }}
                        style={{ fontSize: '0.8rem' }}
                    >
                        Skip & Force Dashboard Access
                    </button>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            ) : (
                <>
                    {activeTab === 'products' && (
                        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 2fr', gap: 'var(--spacing-xl)' }}>

                            <div className="card" style={{ height: 'fit-content' }}>
                                <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-accent-blue)' }}>
                                    {editingId ? 'Edit Product' : 'Add New Product'}
                                </h3>
                                <form onSubmit={handleProductSubmit}>
                                    <div className="input-group">
                                        <label>Product Name *</label>
                                        <input className="input-field" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="input-group">
                                            <label>Brand</label>
                                            <input className="input-field" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} placeholder="e.g. Tata Steel" />
                                        </div>
                                        <div className="input-group">
                                            <label>Category *</label>
                                            <input className="input-field" required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label>Available Sizes (comma separated)</label>
                                        <input className="input-field" value={formData.sizes} onChange={e => setFormData({ ...formData, sizes: e.target.value })} placeholder="e.g. 10mm, 12mm, 16mm" />
                                    </div>
                                    <div className="input-group">
                                        <label>Description</label>
                                        <textarea className="input-field" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows="3"></textarea>
                                    </div>
                                    <div className="input-group">
                                        <label>Dimensions</label>
                                        <input className="input-field" value={formData.dimensions} onChange={e => setFormData({ ...formData, dimensions: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Price (₹/kg) - Optional</label>
                                        <input type="number" className="input-field" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Product Image</label>
                                        <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} />
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingId ? 'Update' : 'Add'}</button>
                                        {editingId && (
                                            <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel</button>
                                        )}
                                    </div>
                                </form>
                            </div>

                            <div className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                    <h3 style={{ color: 'var(--color-accent-blue)' }}>Current Inventory</h3>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {selectedIds.size > 0 && (
                                            <button onClick={handleDeleteSelected} className="btn btn-outline" style={{ borderColor: '#ff4444', color: '#ff4444', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>
                                                Delete Selected ({selectedIds.size})
                                            </button>
                                        )}
                                        <button onClick={handleOpenGoogleSheets} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#0f9d58', color: 'white', border: 'none' }}>
                                            <Download size={16} /> Open in Google Sheets
                                        </button>
                                    </div>
                                </div>
                                <div className="table-container">
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                                <th style={{ padding: '0.5rem', width: '30px' }}>
                                                    <input type="checkbox" onChange={handleSelectAll} checked={products.length > 0 && selectedIds.size === products.length} />
                                                </th>
                                                <th style={{ padding: '0.5rem' }}>Image</th>
                                                <th style={{ padding: '0.5rem' }}>Name</th>
                                                <th style={{ padding: '0.5rem' }}>Category</th>
                                                <th style={{ padding: '0.5rem' }}>Price</th>
                                                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {products.map(p => (
                                                <tr key={p.id} style={{ borderBottom: '1px solid var(--color-secondary)' }}>
                                                    <td style={{ padding: '0.75rem 0.5rem' }}>
                                                        <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} />
                                                    </td>
                                                    <td style={{ padding: '0.75rem 0.5rem' }}>
                                                        {p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} /> : <div style={{ width: '40px', height: '40px', backgroundColor: '#eee', borderRadius: '4px' }}></div>}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 0.5rem' }}>{p.name} <br /><small style={{ color: 'var(--color-text-light)' }}>{p.dimensions}</small></td>
                                                    <td style={{ padding: '0.75rem 0.5rem' }}>{p.category}</td>
                                                    <td style={{ padding: '0.75rem 0.5rem' }}>{p.price ? `₹${p.price}` : 'N/A'}</td>
                                                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                        <button onClick={() => handleEdit(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent-blue)' }}><Edit3 size={18} /></button>
                                                        <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4444' }}><Trash2 size={18} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {products.length === 0 && <tr><td colSpan="6" style={{ padding: '1rem', textAlign: 'center' }}>No products available.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div className="card">
                            <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-accent-blue)' }}>Submitted Orders</h3>
                            {orders.length === 0 ? <p>No orders submitted yet.</p> : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                    {orders.map(order => (
                                        <div key={order.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 'var(--spacing-md)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                                                <strong>Reference: {order.employeeReference}</strong>
                                                <span style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>{new Date(order.createdAt).toLocaleString()}</span>
                                            </div>
                                            <div style={{ marginBottom: 'var(--spacing-sm)', fontSize: '0.9rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                <div><strong>Name:</strong> {order.userName || 'N/A'}</div>
                                                <div><strong>Email:</strong> {order.userEmail}</div>
                                                <div><strong>Business:</strong> {order.businessName || 'N/A'}</div>
                                                <div><strong>Location:</strong> {order.location || 'N/A'}</div>
                                                <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}><strong>Status:</strong> <span style={{ color: 'var(--color-accent-orange)', textTransform: 'uppercase', fontWeight: 'bold' }}>{order.status}</span></div>
                                            </div>
                                            <h5 style={{ marginTop: 'var(--spacing-sm)', marginBottom: '0.25rem', borderBottom: '1px solid var(--color-secondary)' }}>Items Requested:</h5>
                                            <ul style={{ paddingLeft: '1rem', listStyle: 'circle', fontSize: '0.9rem', color: 'var(--color-text-light)' }}>
                                                {order.items?.map((item, idx) => (
                                                    <li key={idx} style={{ marginBottom: '0.25rem' }}>
                                                        {item.quantity}x {item.name} ({item.dimensions})
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'units' && (
                        <div className="card" style={{ maxWidth: '400px' }}>
                            <h3 style={{ marginBottom: '1rem', color: 'var(--color-accent-blue)' }}>Global Units</h3>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                <input className="input-field" placeholder="e.g. Tons, Meters" value={newUnit} onChange={e => setNewUnit(e.target.value)} />
                                <button className="btn btn-primary" onClick={async () => {
                                    if (!newUnit.trim()) return;
                                    const next = [...units, newUnit.trim()];
                                    await (await import('../lib/db')).saveGlobalUnits(currentCompanyId, next);
                                    setUnits(next);
                                    setNewUnit('');
                                }}>Add</button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {units.map(u => (
                                    <div key={u} style={{ background: '#f1f3f5', padding: '0.4rem 0.8rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                                        {u}
                                        <X size={14} style={{ cursor: 'pointer', color: '#ff4444' }} onClick={async () => {
                                            const next = units.filter(item => item !== u);
                                            await (await import('../lib/db')).saveGlobalUnits(currentCompanyId, next);
                                            setUnits(next);
                                        }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'brand_registry' && <BrandRegistryManager />}
                    {activeTab === 'overview' && <AdminOverview />}
                    {activeTab === 'team' && <TeamManagement />}
                    {activeTab === 'forms' && <FormBuilder />}
                    {activeTab === 'reconciliation' && <Reconciliation />}
                    {activeTab === 'ticket_builder' && <TicketBuilder />}
                    {activeTab === 'ticket_reviews' && <TicketReviews />}
                    {activeTab === 'suppliers' && <SupplierManager />}
                    {activeTab === 'transports' && <TransportManager />}
                    {activeTab === 'migration' && isSuperAdmin && <MigrationTool />}
                </>
            )}
        </div>
    );
}
