import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Leaf } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ChatbotWidget from '@/components/ChatbotWidget';

const Shop = () => {
    const navigate = useNavigate();
    const [cart, setCart] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    // Load products (real-time if API available, otherwise use static)
    useEffect(() => {
        const staticProducts = [
            {
                id: '1',
                name: 'Green Hydrogen - Industrial Grade',
                purity: '99.9%',
                price: 2.80,
                unit: 'per kg',
                minOrder: 100,
                description: 'High-purity hydrogen for industrial applications',
                carbonIntensity: 0.5,
                source: 'Solar + Wind',
                available: true
            },
            {
                id: '2',
                name: 'Green Hydrogen - Premium',
                purity: '99.999%',
                price: 4.20,
                unit: 'per kg',
                minOrder: 50,
                description: 'Ultra-pure hydrogen for fuel cells and electronics',
                carbonIntensity: 0.3,
                source: '100% Solar',
                available: true
            },
            {
                id: '3',
                name: 'Bulk Contract (Monthly)',
                purity: '99.9%',
                price: 2.50,
                unit: 'per kg',
                minOrder: 500,
                description: 'Long-term supply contract with discounted rates',
                carbonIntensity: 0.6,
                source: 'Mixed Renewable',
                available: true
            },
        ];

        setProducts(staticProducts);

        // Load cart from localStorage
        const savedCart = localStorage.getItem('hydrogen_cart');
        if (savedCart) {
            setCart(JSON.parse(savedCart));
        }
    }, []);

    const addToCart = (product: any) => {
        const existingItem = cart.find(item => item.id === product.id);
        let newCart;

        if (existingItem) {
            newCart = cart.map(item =>
                item.id === product.id
                    ? { ...item, quantity: (item.quantity || 1) + 1 }
                    : item
            );
        } else {
            newCart = [...cart, { ...product, quantity: 1 }];
        }

        setCart(newCart);
        localStorage.setItem('hydrogen_cart', JSON.stringify(newCart));

        // Show success message
        const message = existingItem
            ? `Increased quantity of ${product.name}`
            : `${product.name} added to cart!`;
        alert(message);
    };

    return (
        <div className="max-w-7xl mx-auto section-padding">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold gradient-text mb-2">Green Hydrogen Marketplace</h1>
                        <p className="text-gray-600 dark:text-gray-300">Certified renewable hydrogen for your business</p>
                    </div>
                    <button
                        onClick={() => navigate('/cart')}
                        className="btn-primary flex items-center space-x-2 relative"
                    >
                        <ShoppingCart className="w-5 h-5" />
                        <span>Cart ({cart.reduce((sum, item) => sum + (item.quantity || 1), 0)})</span>
                        {cart.length > 0 && (
                            <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                {cart.reduce((sum, item) => sum + (item.quantity || 1), 0)}
                            </span>
                        )}
                    </button>
                </div>

                {/* Products Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                    {products.map((product) => (
                        <motion.div
                            key={product.id}
                            whileHover={{ scale: 1.03 }}
                            className="card-glass p-6"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-hydrogen-500 to-green-500 rounded-lg flex items-center justify-center">
                                    <Leaf className="w-6 h-6 text-white" />
                                </div>
                                <span className="px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-xs font-medium">
                                    {product.available ? 'In Stock' : 'Limited'}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold mb-2">{product.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{product.description}</p>

                            <div className="space-y-2 mb-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Purity:</span>
                                    <span className="font-medium">{product.purity}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Energy Source:</span>
                                    <span className="font-medium">{product.source}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Carbon Intensity:</span>
                                    <span className="font-medium text-green-500">{product.carbonIntensity} kgCO₂eq/kg</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Min. Order:</span>
                                    <span className="font-medium">{product.minOrder} kg</span>
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-4 mb-4">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-3xl font-bold gradient-text">${product.price.toFixed(2)}</span>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{product.unit}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => addToCart(product)}
                                className="w-full btn-primary"
                                disabled={!product.available}
                            >
                                {product.available ? 'Add to Cart' : 'Out of Stock'}
                            </button>
                        </motion.div>
                    ))}
                </div>

                {/* Features - keeping existing */}
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="card-glass p-6 text-center">
                        <div className="w-16 h-16 bg-hydrogen-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Leaf className="w-8 h-8 text-hydrogen-500" />
                        </div>
                        <h3 className="font-bold mb-2">100% Renewable</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            All hydrogen produced from solar, wind, and hydro energy
                        </p>
                    </div>

                    <div className="card-glass p-6 text-center">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShoppingCart className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="font-bold mb-2">Blockchain Certified</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Every order comes with a verifiable certificate of origin
                        </p>
                    </div>

                    <div className="card-glass p-6 text-center">
                        <div className="w-16 h-16 bg-hydrogen-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-hydrogen-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </div>
                        <h3 className="font-bold mb-2">AI Assistant</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Get instant help from our hydrogen expert chatbot
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Chatbot Widget */}
            <ChatbotWidget />
        </div>
    );
};

export default Shop;
