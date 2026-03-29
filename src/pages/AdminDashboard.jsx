import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getProducts, addProduct, updateProduct, deleteProduct, getOrders, uploadImage, addBulkProducts } from '../lib/db';
import { Trash2, Edit3, Plus, UploadCloud, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import TeamManagement from '../components/admin/TeamManagement';
import FormBuilder from '../components/admin/FormBuilder';
import Reconciliation from '../components/admin/Reconciliation';
import TicketBuilder from '../components/admin/TicketBuilder';
import TicketReviews from '../components/admin/TicketReviews';
import SupplierManager from '../components/admin/SupplierManager';
import AdminOverview from '../components/admin/AdminOverview';

export default function AdminDashboard() {
    const { isAdmin, loginForAdminExport } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'overview';
    const setActiveTab = (tab) => setSearchParams({ tab });

    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Product Form State
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', category: '', description: '', dimensions: '', price: '', imageUrl: null });
    const [imageFile, setImageFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Multi-select State
    const [selectedIds, setSelectedIds] = useState(new Set());

    useEffect(() => {
        if (isAdmin) fetchData();
    }, [isAdmin]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pData, oData] = await Promise.all([getProducts(), getOrders()]);
            setProducts(pData);
            setOrders(oData);
        } catch (err) {
            console.error(err);
        } finally {
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
        setUploading(true);
        try {
            let imageUrl = null;
            if (imageFile) {
                imageUrl = await resizeImageToBase64(imageFile);
            }

            const pPrice = formData.price ? Number(formData.price) : null;
            const dataToSave = {
                name: formData.name || '',
                category: formData.category || 'Uncategorized',
                description: formData.description || '',
                dimensions: formData.dimensions || '',
                price: pPrice
            };

            // Retain old image url if editing and no new image was selected
            if (imageUrl) {
                dataToSave.imageUrl = imageUrl;
            } else if (editingId && formData.imageUrl) {
                dataToSave.imageUrl = formData.imageUrl;
            }

            if (editingId) {
                await updateProduct(editingId, dataToSave);
            } else {
                await addProduct(dataToSave);
            }
            resetForm();
            fetchData();
        } catch (e) {
            console.error(e);
            alert('Error saving product');
        } finally {
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
                        price: cols[4] ? Number(String(cols[4]).trim()) : null
                    };
                }).filter(p => p.name);

                if (newProducts.length === 0) {
                    alert("No valid products found. Ensure Name column is filled.");
                    return;
                }

                await addBulkProducts(newProducts);
                alert(`Successfully imported ${newProducts.length} products!`);
                fetchData();
            } catch (err) {
                console.error("Bulk upload failed", err);
                alert("Bulk upload failed. Ensure the file format is a valid Excel or CSV.");
            } finally {
                setUploading(false);
                e.target.value = null; // reset file input
            }
        };

        reader.readAsBinaryString(file);
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ name: '', category: '', description: '', dimensions: '', price: '', imageUrl: null });
        setImageFile(null);
    };

    const handleEdit = (product) => {
        setEditingId(product.id);
        setFormData({
            name: product.name || '',
            category: product.category || 'Uncategorized',
            description: product.description || '',
            dimensions: product.dimensions || '',
            price: product.price || '',
            imageUrl: product.imageUrl || null
        });
        setImageFile(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await deleteProduct(id);
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
                const deletePromises = Array.from(selectedIds).map(id => deleteProduct(id));
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <h1 style={{ color: 'var(--color-accent-blue)' }}>System Administration</h1>

                {/* Bulk Upload Button */}
                {activeTab === 'products' && (
                    <div>
                        <input
                            type="file"
                            accept=".csv, .xlsx, .xls"
                            id="csvUpload"
                            style={{ display: 'none' }}
                            onChange={handleBulkUpload}
                        />
                        <label htmlFor="csvUpload" className="btn btn-secondary" style={{ display: 'flex', gap: '0.5rem', cursor: 'pointer' }}>
                            <UploadCloud size={18} /> Bulk Import Excel / CSV
                        </label>
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginTop: '0.25rem', textAlign: 'right' }}>
                            Format: name,category,description,dimensions,price
                        </p>
                    </div>
                )}
            </div>



            {loading || uploading ? <p>{uploading ? "Processing..." : "Loading data..."}</p> : (
                <>
                    {activeTab === 'products' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--spacing-xl)' }}>

                            <div className="card" style={{ height: 'fit-content' }}>
                                <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-accent-blue)' }}>
                                    {editingId ? 'Edit Product' : 'Add New Product'}
                                </h3>
                                <form onSubmit={handleProductSubmit}>
                                    <div className="input-group">
                                        <label>Product Name *</label>
                                        <input className="input-field" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Category *</label>
                                        <input className="input-field" required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
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
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
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

                    {activeTab === 'overview' && <AdminOverview />}
                    {activeTab === 'team' && <TeamManagement />}
                    {activeTab === 'forms' && <FormBuilder />}
                    {activeTab === 'reconciliation' && <Reconciliation />}
                    {activeTab === 'ticket_builder' && <TicketBuilder />}
                    {activeTab === 'ticket_reviews' && <TicketReviews />}
                    {activeTab === 'suppliers' && <SupplierManager />}
                </>
            )}
        </div>
    );
}
