import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
    getProducts, addProduct, updateProduct, deleteProduct, 
    getOrders, uploadImage, addBulkProducts, getGlobalUnits,
    getGlobalCategories, saveGlobalCategories, saveGlobalUnits,
    getVendorBrandRegistry
} from '../lib/db';
import { Trash2, Edit3, Plus, UploadCloud, Download, AlertCircle } from 'lucide-react';
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
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState('');
    const [brands, setBrands] = useState([]);

    // Product Form State
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ 
        name: '', 
        brand: '', 
        category: '', 
        description: '', 
        price: '', 
        sizes: '',  // Keep for backward compatibility
        imageUrl: null 
    });
    const [sizeVariants, setSizeVariants] = useState([{ id: Date.now(), size: '', weight: '', dimensions: '' }]);
    const [imageFile, setImageFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");
    const [categoryInput, setCategoryInput] = useState('');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [brandInput, setBrandInput] = useState('');
    const [showBrandDropdown, setShowBrandDropdown] = useState(false);

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
            const cPromise = getGlobalCategories(currentCompanyId).catch(e => (console.error("Categories Load Error:", e), []));
            const bPromise = getVendorBrandRegistry(currentCompanyId).catch(e => (console.error("Brands Load Error:", e), []));

            const [pData, oData, uData, cData, bData] = await Promise.all([pPromise, oPromise, uPromise, cPromise, bPromise]);
            
            setProducts(pData || []);
            setOrders(oData || []);
            setUnits(uData || []);
            setCategories(cData || []);
            
            // Extract unique brand names from vendor-brand registry
            const uniqueBrands = [...new Set((bData || []).map(b => b.brand_name).filter(b => b))].sort();
            setBrands(uniqueBrands);
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

        console.log('[Product Submit] Starting...');
        setUploading(true);
        setUploadStatus("Starting...");

        try {
            let imageUrl = null;
            if (imageFile) {
                console.log('[Product Submit] Processing image...');
                setUploadStatus("Processing image...");
                imageUrl = await resizeImageToBase64(imageFile);
                console.log('[Product Submit] Image processed');
            }

            console.log('[Product Submit] Preparing data...');
            setUploadStatus("Saving product...");
            const pPrice = formData.price ? Number(formData.price) : null;
            
            // Prepare size variants - filter out empty ones
            const cleanedSizeVariants = sizeVariants
                .filter(v => v.size.trim())
                .map(({ id, ...rest }) => rest); // Remove the id field
            
            const dataToSave = {
                name: (formData.name || '').trim(),
                brand: (formData.brand || '').trim(),
                category: (formData.category || 'Uncategorized').trim(),
                description: (formData.description || '').trim(),
                price: pPrice,
                size_variants: cleanedSizeVariants,
                sizes: cleanedSizeVariants.map(v => v.size)
            };

            if (imageUrl) {
                dataToSave.image_url = imageUrl;
            } else if (editingId && formData.imageUrl) {
                dataToSave.image_url = formData.imageUrl;
            }

            console.log('[Product Submit] Data to save:', dataToSave);
            console.log('[Product Submit] Company ID:', currentCompanyId);
            console.log('[Product Submit] Calling database...');

            let result;
            const startTime = Date.now();
            if (editingId) {
                result = await updateProduct(currentCompanyId, editingId, dataToSave);
            } else {
                result = await addProduct(currentCompanyId, dataToSave);
            }
            const endTime = Date.now();
            console.log(`[Product Submit] Database call completed in ${endTime - startTime}ms`);

            if (!result) {
                throw new Error("Failed to save product. Check console for details.");
            }

            console.log('[Product Submit] Success! Result:', result);
            
            // Auto-save new category if it doesn't exist
            const categoryToSave = dataToSave.category.trim();
            if (categoryToSave && !categories.includes(categoryToSave)) {
                console.log('[Product Submit] Adding new category:', categoryToSave);
                const updatedCategories = [...categories, categoryToSave].sort();
                await saveGlobalCategories(currentCompanyId, updatedCategories);
                setCategories(updatedCategories);
            }
            
            resetForm();
            await fetchData();
            alert(editingId ? 'Product updated successfully!' : 'Product added successfully!');
        } catch (e) {
            console.error('[Product Submit] ERROR:', e);
            let errorMsg = 'Error saving product: ';
            
            if (e.message.includes('size_variants')) {
                errorMsg += 'The size_variants column is missing. Please run the SQL migration.';
            } else if (e.message.includes('is_dead_stock')) {
                errorMsg += 'The is_dead_stock column is missing. Please run the SQL migration.';
            } else if (e.message.includes('policy')) {
                errorMsg += 'Permission denied. RLS policies may need optimization. Check OPTIMIZE_RLS_POLICIES.sql';
            } else {
                errorMsg += e.message || 'Unknown error';
            }
            
            alert(errorMsg);
        } finally {
            setUploadStatus("");
            setUploading(false);
        }
    };

    const handleBulkUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!window.confirm("Are you sure you want to bulk upload this file?")) return;

        setUploading(true);

        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const data = event.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
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
                    setUploading(false);
                    alert("No valid products found. Ensure the first column (Name) is filled.");
                    return;
                }

                await addBulkProducts(currentCompanyId, newProducts);
                alert(`Successfully imported ${newProducts.length} products!`);
                await fetchData();
            } catch (err) {
                console.error("Bulk upload failed", err);
                alert("Bulk upload failed: " + (err.message || "Unknown error"));
            } finally {
                setUploading(false);
                if (e.target) e.target.value = null;
            }
        };

        reader.readAsBinaryString(file);
    };

    // Size variant helpers
    const addSizeVariant = () => {
        setSizeVariants([...sizeVariants, { id: Date.now(), size: '', weight: '', dimensions: '' }]);
    };

    const removeSizeVariant = (id) => {
        if (sizeVariants.length > 1) {
            setSizeVariants(sizeVariants.filter(v => v.id !== id));
        }
    };

    const updateSizeVariant = (id, field, value) => {
        setSizeVariants(sizeVariants.map(v => v.id === id ? { ...v, [field]: value } : v));
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ name: '', brand: '', category: '', description: '', price: '', sizes: '', imageUrl: null });
        setSizeVariants([{ id: Date.now(), size: '', weight: '', dimensions: '' }]);
        setImageFile(null);
        setCategoryInput('');
        setShowCategoryDropdown(false);
        setBrandInput('');
        setShowBrandDropdown(false);
    };

    const handleCategoryInputChange = (value) => {
        setCategoryInput(value);
        setFormData({ ...formData, category: value });
        setShowCategoryDropdown(value.length > 0);
    };

    const handleCategorySelect = (category) => {
        setCategoryInput(category);
        setFormData({ ...formData, category });
        setShowCategoryDropdown(false);
    };

    const handleBrandInputChange = (value) => {
        setBrandInput(value);
        setFormData({ ...formData, brand: value });
        setShowBrandDropdown(value.length > 0);
    };

    const handleBrandSelect = (brand) => {
        setBrandInput(brand);
        setFormData({ ...formData, brand });
        setShowBrandDropdown(false);
    };

    const filteredCategories = categories.filter(cat => 
        cat.toLowerCase().includes(categoryInput.toLowerCase())
    );

    const filteredBrands = brands.filter(brand => 
        brand.toLowerCase().includes(brandInput.toLowerCase())
    );

    const handleEdit = (product) => {
        setEditingId(product.id);
        setFormData({
            name: product.name || '',
            brand: product.brand || '',
            category: product.category || 'Uncategorized',
            description: product.description || '',
            price: product.price || '',
            sizes: product.sizes ? product.sizes.join(', ') : '',
            imageUrl: product.imageUrl || null
        });
        
        setCategoryInput(product.category || 'Uncategorized');
        setBrandInput(product.brand || '');
        
        // Load size variants if they exist, otherwise create from old sizes format
        if (product.size_variants && product.size_variants.length > 0) {
            setSizeVariants(product.size_variants.map((v, idx) => ({ ...v, id: Date.now() + idx })));
        } else if (product.sizes && product.sizes.length > 0) {
            // Migrate old format to new
            setSizeVariants(product.sizes.map((size, idx) => ({
                id: Date.now() + idx,
                size: size,
                weight: '',
                dimensions: product.dimensions || ''
            })));
        } else {
            setSizeVariants([{ id: Date.now(), size: '', weight: '', dimensions: '' }]);
        }
        
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

    const handleMarkAsDeadStock = async () => {
        if (selectedIds.size === 0) return;
        if (window.confirm(`Mark ${selectedIds.size} product(s) as dead stock? This will flag them for clearance.`)) {
            try {
                const updatePromises = Array.from(selectedIds).map(id => 
                    updateProduct(currentCompanyId, id, { is_dead_stock: true })
                );
                await Promise.all(updatePromises);
                setSelectedIds(new Set());
                fetchData();
                alert(`${selectedIds.size} product(s) marked as dead stock successfully!`);
            } catch (e) {
                console.error(e);
                alert('Error marking products as dead stock');
            }
        }
    };

    const handleRemoveFromDeadStock = async () => {
        if (selectedIds.size === 0) return;
        if (window.confirm(`Remove ${selectedIds.size} product(s) from dead stock?`)) {
            try {
                const updatePromises = Array.from(selectedIds).map(id => 
                    updateProduct(currentCompanyId, id, { is_dead_stock: false })
                );
                await Promise.all(updatePromises);
                setSelectedIds(new Set());
                fetchData();
                alert(`${selectedIds.size} product(s) removed from dead stock successfully!`);
            } catch (e) {
                console.error(e);
                alert('Error removing products from dead stock');
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
        <div className="container" style={{ padding: 'var(--spacing-md) 0' }}>
            <div className="stack-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                <h2 style={{ color: 'var(--color-accent-blue)', margin: 0, fontSize: '1.5rem' }}>System Administration</h2>
                
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {['units', 'forms', 'reconciliation'].map(t => (
                        <button key={t} onClick={() => setActiveTab(t)} className={`btn ${activeTab === t ? 'btn-primary' : 'btn-outline'}`} style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}>
                            {t.replace('_', ' ').toUpperCase()}
                        </button>
                    ))}
                    {isSuperAdmin && (
                        <button onClick={() => setActiveTab('migration')} className={`btn ${activeTab === 'migration' ? 'btn-primary' : 'btn-outline'}`} style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}>
                            MIGRATION
                        </button>
                    )}
                </div>

                {/* Bulk Import Control */}
                {activeTab === 'products' && (
                    <div className="full-width-on-mobile" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                            type="file"
                            accept=".csv, .xlsx, .xls"
                            id="csvUpload"
                            style={{ display: 'none' }}
                            onChange={handleBulkUpload}
                        />
                        <label htmlFor="csvUpload" className="btn btn-secondary full-width-on-mobile" style={{ display: 'flex', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', padding: '0.4rem 0.7rem' }}>
                            <UploadCloud size={16} /> Bulk Import
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
                                            <div style={{ position: 'relative' }}>
                                                <input 
                                                    className="input-field" 
                                                    value={brandInput} 
                                                    onChange={e => handleBrandInputChange(e.target.value)}
                                                    onFocus={() => setShowBrandDropdown(brandInput.length > 0)}
                                                    onBlur={() => setTimeout(() => setShowBrandDropdown(false), 200)}
                                                    placeholder="e.g. Tata Steel"
                                                />
                                                {showBrandDropdown && (
                                                    <div style={{ 
                                                        position: 'absolute', 
                                                        top: '100%', 
                                                        left: 0, 
                                                        right: 0, 
                                                        background: 'white', 
                                                        border: '1px solid #e2e8f0', 
                                                        borderRadius: '4px', 
                                                        maxHeight: '200px', 
                                                        overflowY: 'auto', 
                                                        zIndex: 1000,
                                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                                    }}>
                                                        {filteredBrands.length > 0 ? (
                                                            filteredBrands.map(brand => (
                                                                <div 
                                                                    key={brand}
                                                                    onClick={() => handleBrandSelect(brand)}
                                                                    style={{ 
                                                                        padding: '0.5rem', 
                                                                        cursor: 'pointer',
                                                                        borderBottom: '1px solid #f1f3f5'
                                                                    }}
                                                                    onMouseEnter={e => e.target.style.background = '#f8fafc'}
                                                                    onMouseLeave={e => e.target.style.background = 'white'}
                                                                >
                                                                    {brand}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                                                                Type to add "{brandInput}" as new brand
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="input-group">
                                            <label>Category *</label>
                                            <div style={{ position: 'relative' }}>
                                                <input 
                                                    className="input-field" 
                                                    required 
                                                    value={categoryInput} 
                                                    onChange={e => handleCategoryInputChange(e.target.value)}
                                                    onFocus={() => setShowCategoryDropdown(categoryInput.length > 0)}
                                                    onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                                                    placeholder="Type to search or add new"
                                                />
                                                {showCategoryDropdown && (
                                                    <div style={{ 
                                                        position: 'absolute', 
                                                        top: '100%', 
                                                        left: 0, 
                                                        right: 0, 
                                                        background: 'white', 
                                                        border: '1px solid #e2e8f0', 
                                                        borderRadius: '4px', 
                                                        maxHeight: '200px', 
                                                        overflowY: 'auto', 
                                                        zIndex: 1000,
                                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                                    }}>
                                                        {filteredCategories.length > 0 ? (
                                                            filteredCategories.map(cat => (
                                                                <div 
                                                                    key={cat}
                                                                    onClick={() => handleCategorySelect(cat)}
                                                                    style={{ 
                                                                        padding: '0.5rem', 
                                                                        cursor: 'pointer',
                                                                        borderBottom: '1px solid #f1f3f5'
                                                                    }}
                                                                    onMouseEnter={e => e.target.style.background = '#f8fafc'}
                                                                    onMouseLeave={e => e.target.style.background = 'white'}
                                                                >
                                                                    {cat}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                                                                Press Enter to add "{categoryInput}" as new category
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Size Variants Section */}
                                    <div className="input-group">
                                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <span>Size Variants</span>
                                            <button type="button" onClick={addSizeVariant} className="btn btn-outline" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}>
                                                + Add
                                            </button>
                                        </label>
                                        <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                            {sizeVariants.map((variant, idx) => (
                                                <div key={variant.id} style={{ display: 'grid', gridTemplateColumns: '80px 80px 1fr 30px', gap: '0.4rem', marginBottom: idx < sizeVariants.length - 1 ? '0.4rem' : '0', alignItems: 'center' }}>
                                                    <input 
                                                        className="input-field" 
                                                        placeholder="10mm" 
                                                        value={variant.size} 
                                                        onChange={e => updateSizeVariant(variant.id, 'size', e.target.value)}
                                                        style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                                                    />
                                                    <input 
                                                        className="input-field" 
                                                        placeholder="5kg/m" 
                                                        value={variant.weight} 
                                                        onChange={e => updateSizeVariant(variant.id, 'weight', e.target.value)}
                                                        style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                                                    />
                                                    <input 
                                                        className="input-field" 
                                                        placeholder="10x10x10" 
                                                        value={variant.dimensions} 
                                                        onChange={e => updateSizeVariant(variant.id, 'dimensions', e.target.value)}
                                                        style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                                                    />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeSizeVariant(variant.id)}
                                                        disabled={sizeVariants.length === 1}
                                                        style={{ 
                                                            background: 'none', 
                                                            border: 'none', 
                                                            cursor: sizeVariants.length === 1 ? 'not-allowed' : 'pointer', 
                                                            color: sizeVariants.length === 1 ? '#ccc' : '#ff4444',
                                                            padding: '0.2rem'
                                                        }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                            <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.3rem', display: 'grid', gridTemplateColumns: '80px 80px 1fr 30px', gap: '0.4rem' }}>
                                                <span>Size</span>
                                                <span>Weight</span>
                                                <span>Dimensions</span>
                                                <span></span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="input-group">
                                        <label>Description</label>
                                        <textarea className="input-field" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows="3"></textarea>
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
                                        {selectedIds.size > 0 && (() => {
                                            // Check if any selected products are dead stock
                                            const selectedProducts = products.filter(p => selectedIds.has(p.id));
                                            const hasDeadStock = selectedProducts.some(p => p.is_dead_stock);
                                            const hasNonDeadStock = selectedProducts.some(p => !p.is_dead_stock);
                                            
                                            return (
                                                <>
                                                    {hasNonDeadStock && (
                                                        <button 
                                                            onClick={handleMarkAsDeadStock} 
                                                            className="btn btn-outline" 
                                                            style={{ borderColor: '#f59e0b', color: '#f59e0b', padding: '0.25rem 0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                                            title="Mark selected products as dead stock"
                                                        >
                                                            <AlertCircle size={16} /> Mark Dead Stock ({selectedIds.size})
                                                        </button>
                                                    )}
                                                    {hasDeadStock && (
                                                        <button 
                                                            onClick={handleRemoveFromDeadStock} 
                                                            className="btn btn-outline" 
                                                            style={{ borderColor: '#10b981', color: '#10b981', padding: '0.25rem 0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                                            title="Remove selected products from dead stock"
                                                        >
                                                            <Check size={16} /> Remove Dead Stock ({selectedIds.size})
                                                        </button>
                                                    )}
                                                    <button onClick={handleDeleteSelected} className="btn btn-outline" style={{ borderColor: '#ff4444', color: '#ff4444', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>
                                                        Delete Selected ({selectedIds.size})
                                                    </button>
                                                </>
                                            );
                                        })()}
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
                                                <tr key={p.id} style={{ borderBottom: '1px solid var(--color-secondary)', background: p.is_dead_stock ? '#fef3c7' : 'transparent' }}>
                                                    <td style={{ padding: '0.75rem 0.5rem' }}>
                                                        <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} />
                                                    </td>
                                                    <td style={{ padding: '0.75rem 0.5rem' }}>
                                                        {p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} /> : <div style={{ width: '40px', height: '40px', backgroundColor: '#eee', borderRadius: '4px' }}></div>}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 0.5rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div>
                                                                {p.name}
                                                                {p.size_variants && p.size_variants.length > 0 && (
                                                                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                                                        {p.size_variants.map(v => v.size).join(', ')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {p.is_dead_stock && (
                                                                <span style={{ fontSize: '0.65rem', background: '#f59e0b', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                                                    DEAD STOCK
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
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
                                                <strong>Order #{order.id?.slice(0, 8)}</strong>
                                                <span style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>{new Date(order.created_at || order.createdAt).toLocaleString()}</span>
                                            </div>
                                            <div style={{ marginBottom: 'var(--spacing-sm)', fontSize: '0.9rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                <div><strong>Name:</strong> {order.customer_name || order.userName || 'N/A'}</div>
                                                <div><strong>Phone:</strong> {order.customer_phone || 'N/A'}</div>
                                                <div><strong>Email:</strong> {order.customer_email || order.userEmail || 'N/A'}</div>
                                                <div><strong>Notes:</strong> {order.notes || 'N/A'}</div>
                                                <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}><strong>Status:</strong> <span style={{ color: 'var(--color-accent-orange)', textTransform: 'uppercase', fontWeight: 'bold' }}>{order.status}</span></div>
                                            </div>
                                            <h5 style={{ marginTop: 'var(--spacing-sm)', marginBottom: '0.25rem', borderBottom: '1px solid var(--color-secondary)' }}>Items Requested:</h5>
                                            <ul style={{ paddingLeft: '1rem', listStyle: 'circle', fontSize: '0.9rem', color: 'var(--color-text-light)' }}>
                                                {order.items?.map((item, idx) => (
                                                    <li key={idx} style={{ marginBottom: '0.25rem' }}>
                                                        {item.quantity}x {item.name || item.product_name}{item.unit ? ` (${item.unit})` : ''}
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
                        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                            <div className="card">
                                <h3 style={{ marginBottom: '1rem', color: 'var(--color-accent-blue)' }}>Global Units</h3>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                    <input className="input-field" placeholder="e.g. Tons, Meters" value={newUnit} onChange={e => setNewUnit(e.target.value)} />
                                    <button className="btn btn-primary" onClick={async () => {
                                        if (!newUnit.trim()) return;
                                        try {
                                            const next = [...units, newUnit.trim()];
                                            console.log('[Units] Adding unit:', newUnit.trim());
                                            await saveGlobalUnits(currentCompanyId, next);
                                            setUnits(next);
                                            setNewUnit('');
                                            console.log('[Units] Unit added successfully');
                                        } catch (e) {
                                            console.error('[Units] Error adding unit:', e);
                                            alert('Error adding unit: ' + e.message);
                                        }
                                    }}>Add</button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {units.map(u => (
                                        <div key={u} style={{ background: '#f1f3f5', padding: '0.4rem 0.8rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                                            {u}
                                            <X size={14} style={{ cursor: 'pointer', color: '#ff4444' }} onClick={async () => {
                                                try {
                                                    console.log('[Units] Removing unit:', u);
                                                    const next = units.filter(item => item !== u);
                                                    await saveGlobalUnits(currentCompanyId, next);
                                                    setUnits(next);
                                                    console.log('[Units] Unit removed successfully');
                                                } catch (e) {
                                                    console.error('[Units] Error removing unit:', e);
                                                    alert('Error removing unit: ' + e.message);
                                                }
                                            }} />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="card">
                                <h3 style={{ marginBottom: '1rem', color: 'var(--color-accent-blue)' }}>Product Categories</h3>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                    <input className="input-field" placeholder="e.g. TMT Bars, Angles" value={newCategory} onChange={e => setNewCategory(e.target.value)} />
                                    <button className="btn btn-primary" onClick={async () => {
                                        if (!newCategory.trim()) return;
                                        if (categories.includes(newCategory.trim())) {
                                            alert('Category already exists!');
                                            return;
                                        }
                                        try {
                                            const next = [...categories, newCategory.trim()].sort();
                                            console.log('[Categories] Adding category:', newCategory.trim());
                                            await saveGlobalCategories(currentCompanyId, next);
                                            setCategories(next);
                                            setNewCategory('');
                                            console.log('[Categories] Category added successfully');
                                        } catch (e) {
                                            console.error('[Categories] Error adding category:', e);
                                            alert('Error adding category: ' + e.message);
                                        }
                                    }}>Add</button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {categories.map(cat => (
                                        <div key={cat} style={{ background: '#e0f2fe', padding: '0.4rem 0.8rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                                            {cat}
                                            <X size={14} style={{ cursor: 'pointer', color: '#ff4444' }} onClick={async () => {
                                                try {
                                                    console.log('[Categories] Removing category:', cat);
                                                    const next = categories.filter(item => item !== cat);
                                                    await saveGlobalCategories(currentCompanyId, next);
                                                    setCategories(next);
                                                    console.log('[Categories] Category removed successfully');
                                                } catch (e) {
                                                    console.error('[Categories] Error removing category:', e);
                                                    alert('Error removing category: ' + e.message);
                                                }
                                            }} />
                                        </div>
                                    ))}
                                </div>
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
