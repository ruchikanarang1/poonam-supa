import React, { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export function useCart() {
    return useContext(CartContext);
}

export function CartProvider({ children }) {
    const { currentCompanyId } = useAuth();
    const [cartItems, setCartItems] = useState([]);

    // Clear cart on company switch to avoid crossing orders
    React.useEffect(() => {
        setCartItems([]);
    }, [currentCompanyId]);

    const addToCart = (product, quantity, size = null) => {
        setCartItems(prev => {
            const existing = prev.find(item => item.id === product.id && item.selectedSize === size);
            if (existing) {
                return prev.map(item =>
                    (item.id === product.id && item.selectedSize === size)
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prev, { ...product, quantity, selectedSize: size }];
        });
    };
    
    const removeFromCart = (productId, size = null) => {
        setCartItems(prev => prev.filter(item => !(item.id === productId && item.selectedSize === size)));
    };
    
    const updateQuantity = (productId, quantity, size = null) => {
        setCartItems(prev => prev.map(item =>
            (item.id === productId && item.selectedSize === size) ? { ...item, quantity } : item
        ));
    };

    const clearCart = () => setCartItems([]);

    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    const value = {
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}
