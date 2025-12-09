import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    ShoppingCart, Leaf, Zap, Shield, Check, Star,
    Award, TrendingDown, Package, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ChatbotWidget from '@/components/ChatbotWidget';

const Shop = () => {
    const navigate = useNavigate();
    const [cart, setCart] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [addedProduct, setAddedProduct] = useState<string | null>(null);

    useEffect(() => {
        const staticProducts = [
            {
                id: '1',
                name: 'Green Hydrogen - Industrial',
                purity: '99.9%',
                price: 2.80,
                unit: 'per kg',
                minOrder: 100,
                description: 'High-purity hydrogen ideal for industrial manufacturing and chemical processes',
                carbonIntensity: 0.5,
                source: 'Solar + Wind',
                available: true,
                popular: false,
                savings: 15
            },
            {
                id: '2',
                name: 'Green Hydrogen - Premium',
                purity: '99.999%',
                price: 4.20,
                unit: 'per kg',
                minOrder: 50,
                description: 'Ultra-pure hydrogen for fuel cells, electronics, and aerospace applications',
                carbonIntensity: 0.3,
                source: '100% Solar',
                available: true,
                popular: true,
                savings: 20
            },
            {
                id: '3',
                name: 'Bulk Contract (Monthly)',
                purity: '99.9%',
                price: 2.50,
                unit: 'per kg',
                minOrder: 500,
                description: 'Long-term supply contract with guaranteed delivery and discounted rates',
                carbonIntensity: 0.6,
                source: 'Mixed Renewable',
                available: true,
                popular: false,
                savings: 25
            },
        ];

        setProducts(staticProducts);

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

        setAddedProduct(product.id);
        setTimeout(() => setAddedProduct(null), 2000);
    };

    const cartItemCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute top-1/2 -left-40 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto p-6 lg:p-8">
                {/* Hero Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                                    <Leaf className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-emerald-200 to-emerald-400 bg-clip-text text-transparent">
                                        Green Hydrogen
                                    </h1>
                                    <p className="text-emerald-400/80 text-sm font-medium">Marketplace</p>
                                </div>
                            </div>
                            <p className="text-gray-400 text-lg max-w-xl mt-2">
                                Certified renewable hydrogen with blockchain-verified certificates of origin
                            </p>
                        </div>

                        {/* Cart Button */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/cart')}
                            className="relative flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
                        >
                            <ShoppingCart className="w-5 h-5" />
                            <span>Cart ({cartItemCount})</span>
                            {cartItemCount > 0 && (
                                <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                                    {cartItemCount}
                                </span>
                            )}
                        </motion.button>
                    </div>
                </motion.div>

                {/* Products Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {products.map((product, idx) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ y: -4 }}
                            className={`relative bg-slate-800/40 backdrop-blur-xl rounded-2xl p-6 border transition-all ${product.popular
                                    ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                                    : 'border-slate-700/50 hover:border-emerald-500/30'
                                }`}
                        >
                            {/* Popular Badge */}
                            {product.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                                    <Star className="w-3 h-3" fill="white" />
                                    MOST POPULAR
                                </div>
                            )}

                            {/* Header */}
                            <div className="flex items-start justify-between mb-4 mt-2">
                                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                                    <Zap className="w-6 h-6 text-emerald-400" />
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${product.available
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    }`}>
                                    {product.available ? 'In Stock' : 'Limited'}
                                </span>
                            </div>

                            {/* Product Info */}
                            <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
                            <p className="text-sm text-gray-400 mb-4 line-clamp-2">{product.description}</p>

                            {/* Specs Grid */}
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Purity</span>
                                    <span className="font-medium text-white">{product.purity}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Energy Source</span>
                                    <span className="font-medium text-emerald-400">{product.source}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Carbon Intensity</span>
                                    <span className="font-medium text-green-400">{product.carbonIntensity} kgCO₂eq/kg</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Min. Order</span>
                                    <span className="font-medium text-white">{product.minOrder} kg</span>
                                </div>
                            </div>

                            {/* Price Section */}
                            <div className="border-t border-slate-700/50 pt-4 mb-4">
                                <div className="flex items-baseline justify-between">
                                    <div>
                                        <span className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                                            ${product.price.toFixed(2)}
                                        </span>
                                        <span className="text-sm text-gray-500 ml-1">{product.unit}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-emerald-400">
                                        <TrendingDown className="w-3 h-3" />
                                        <span>Save {product.savings}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Add to Cart Button */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => addToCart(product)}
                                disabled={!product.available}
                                className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${addedProduct === product.id
                                        ? 'bg-emerald-600 text-white'
                                        : product.available
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-lg hover:shadow-emerald-500/25'
                                            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                {addedProduct === product.id ? (
                                    <>
                                        <Check className="w-5 h-5" />
                                        Added to Cart!
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart className="w-5 h-5" />
                                        {product.available ? 'Add to Cart' : 'Out of Stock'}
                                    </>
                                )}
                            </motion.button>
                        </motion.div>
                    ))}
                </div>

                {/* Features Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid md:grid-cols-3 gap-6 mb-8"
                >
                    <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                            <Leaf className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h3 className="font-bold text-white mb-2">100% Renewable</h3>
                        <p className="text-sm text-gray-400">
                            All hydrogen produced from solar, wind, and hydro energy
                        </p>
                    </div>

                    <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                            <Shield className="w-8 h-8 text-purple-400" />
                        </div>
                        <h3 className="font-bold text-white mb-2">Blockchain Certified</h3>
                        <p className="text-sm text-gray-400">
                            Every order comes with a verifiable certificate of origin
                        </p>
                    </div>

                    <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center">
                            <Award className="w-8 h-8 text-blue-400" />
                        </div>
                        <h3 className="font-bold text-white mb-2">AI Assistant</h3>
                        <p className="text-sm text-gray-400">
                            Get instant help from our hydrogen expert chatbot
                        </p>
                    </div>
                </motion.div>

                {/* CTA Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 backdrop-blur-xl rounded-2xl p-8 border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-6"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30">
                            <Package className="w-10 h-10 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Need a Custom Quote?</h3>
                            <p className="text-gray-400">Contact us for bulk orders and enterprise pricing</p>
                        </div>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02, x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                    >
                        Get Quote
                        <ArrowRight className="w-5 h-5" />
                    </motion.button>
                </motion.div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-12 text-center text-gray-500 text-sm"
                >
                    <p>H₂-OptiPlant • Green Hydrogen Marketplace • Smart India Hackathon 2024</p>
                </motion.div>
            </div>

            {/* Chatbot Widget */}
            <ChatbotWidget />
        </div>
    );
};

export default Shop;
