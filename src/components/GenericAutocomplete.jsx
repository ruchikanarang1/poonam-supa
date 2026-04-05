import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Truck, Landmark, Plus } from 'lucide-react';

export default function GenericAutocomplete({ 
    value, 
    onChange, 
    onSelect, 
    fetchData, 
    items, // New prop for static/pre-filtered data
    placeholder = "Search...", 
    iconType = 'search',
    onAddNew, // New prop: callback when "+ Add New" is clicked
    addNewLabel = "Add New" // Customizable label for add button
}) {
    const [data, setData] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const load = async () => {
            let result = [];
            if (items) {
                result = items;
            } else if (fetchData) {
                result = await fetchData();
            }
            
            setData(result);
            // Trigger an initial filter of the new data against current value
            const query = value || "";
            const matches = result.filter(item => 
                (item.name && item.name.toLowerCase().includes(query.toLowerCase())) || 
                (item.address && item.address.toLowerCase().includes(query.toLowerCase()))
            );
            setFiltered(matches);
        };
        load();
    }, [fetchData, items, value]); 

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e) => {
        const query = e.target.value;
        onChange(query);
        
        const matches = data.filter(item => 
            (item.name && item.name.toLowerCase().includes(query.toLowerCase())) || 
            (item.address && item.address.toLowerCase().includes(query.toLowerCase()))
        );
        setFiltered(matches);
        setShowDropdown(true);
    };

    const handleSelect = (item) => {
        onSelect(item);
        setShowDropdown(false);
    };

    const handleAddNew = () => {
        setShowDropdown(false);
        if (onAddNew) {
            onAddNew(value); // Pass the current typed value to the callback
        }
    };

    const handleKeyDown = (e) => {
        // Close dropdown on Tab or Escape
        if (e.key === 'Tab' || e.key === 'Escape') {
            setShowDropdown(false);
        }
        // Allow Tab to move to next field
        if (e.key === 'Tab') {
            // Don't prevent default - let tab work naturally
            setShowDropdown(false);
        }
    };

    const Icon = iconType === 'truck' ? Truck : (iconType === 'vendor' ? Landmark : Search);

    // Show dropdown if there are matches OR if onAddNew is provided (to show "+ Add New" option)
    const shouldShowDropdown = showDropdown && (filtered.length > 0 || (onAddNew && value.trim().length > 0));

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
            <div style={{ position: 'relative' }}>
                <input
                    className="input-field"
                    style={{ padding: '0.4rem 0.4rem 0.4rem 2rem', fontSize: '0.85rem', width: '100%' }}
                    placeholder={placeholder}
                    value={value}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => { 
                        // Show all matching current data on focus
                        const matches = data.filter(item => 
                            (item.name && item.name.toLowerCase().includes(value.toLowerCase())) || 
                            (item.address && item.address.toLowerCase().includes(value.toLowerCase()))
                        );
                        setFiltered(matches);
                        setShowDropdown(true); 
                    }}
                />
                <Icon size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
            </div>

            {shouldShowDropdown && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: 'var(--shadow-md)',
                    zIndex: 1000,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginTop: '2px'
                }}>
                    {filtered.map(item => (
                        <div
                            key={item.id}
                            onClick={() => handleSelect(item)}
                            style={{
                                padding: '0.5rem 1rem',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f0f0f0',
                                transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.background = '#f8fbfc'}
                            onMouseOut={(e) => e.target.style.background = 'white'}
                        >
                            <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{item.name}</div>
                            {item.address && (
                                <div style={{ fontSize: '0.7rem', color: '#666', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                    <MapPin size={10} /> {item.address}
                                </div>
                            )}
                            {item.vehicleNumber && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-accent-orange)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                    <Truck size={10} /> {item.vehicleNumber}
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {/* "+ Add New" option */}
                    {onAddNew && value.trim().length > 0 && (
                        <div
                            onClick={handleAddNew}
                            style={{
                                padding: '0.5rem 1rem',
                                cursor: 'pointer',
                                background: '#f0f9ff',
                                borderTop: filtered.length > 0 ? '2px solid var(--color-accent-blue)' : 'none',
                                color: 'var(--color-accent-blue)',
                                fontWeight: '600',
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#dbeafe'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#f0f9ff'}
                        >
                            <Plus size={16} /> {addNewLabel} "{value}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
