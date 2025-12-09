import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Trash2, ShoppingBag, ArrowRight, CheckCircle, MapPin, ShieldAlert,
    Minus, Plus, Zap, Shield, Truck, Leaf, ArrowLeft, Package
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '@/utils/api';

// Generate blockchain certificate at checkout
const generateCertificate = (orderId: string) => {
    const hash = btoa(`${orderId}-${Date.now()}-H2OptiPlant`).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return {
        tokenId: `H2OPT-${hash.substring(0, 16)}`,
        blockchainTxHash: `0x${hash.substring(0, 40)}`,
        carbonIntensity: 0.4 + Math.random() * 0.3,
        energyMix: {
            solar: 50 + Math.floor(Math.random() * 30),
            wind: 20 + Math.floor(Math.random() * 20),
            hydro: 10 + Math.floor(Math.random() * 15)
        }
    };
};

const Cart = () => {
    const navigate = useNavigate();
    const [cart, setCart] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'cart' | 'address'>('cart');
    const [orderSuccess, setOrderSuccess] = useState(false);

    const [address, setAddress] = useState({
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India',
        safetyContact: '',
        siteAccessCode: '',
    });

    useEffect(() => {
        const savedCart = localStorage.getItem('hydrogen_cart');
        if (savedCart) {
            const parsedCart = JSON.parse(savedCart);
            setCart(parsedCart);
            calculateTotal(parsedCart);
        }
    }, []);

    const calculateTotal = (items: any[]) => {
        const sum = items.reduce((acc, item) => acc + (item.price * (item.quantity || 1)), 0);
        setTotal(sum);
    };

    const updateQuantity = (id: string, newQuantity: number) => {
        if (newQuantity < 1) return;
        const newCart = cart.map(item =>
            item.id === id ? { ...item, quantity: newQuantity } : item
        );
        setCart(newCart);
        localStorage.setItem('hydrogen_cart', JSON.stringify(newCart));
        calculateTotal(newCart);
    };

    const removeItem = (id: string) => {
        const newCart = cart.filter(item => item.id !== id);
        setCart(newCart);
        localStorage.setItem('hydrogen_cart', JSON.stringify(newCart));
        calculateTotal(newCart);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        const userStr = localStorage.getItem('user');
        if (!userStr) {
            alert('Please login to place an order');
            navigate('/login');
            return;
        }
        const user = JSON.parse(userStr);

        setLoading(true);

        try {
            const totalQuantity = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);
            const totalAmount = total * 1.05 + 50;
            const deliveryAddressText = `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`;

            // Generate blockchain certificate
            const certificate = generateCertificate(`${user.id}-${Date.now()}`);

            const orderData = {
                customer_id: user.id,
                quantity: totalQuantity,
                status: 'pending',
                delivery_address: deliveryAddressText,
                total_price: totalAmount,
                delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                certificate: certificate
            };

            await orderAPI.create(orderData);

            localStorage.removeItem('hydrogen_cart');
            setCart([]);
            setTotal(0);
            setOrderSuccess(true);

            setTimeout(() => {
                navigate('/orders');
            }, 3000);
        } catch (error: any) {
            console.error('Checkout failed:', error);
            alert(`Failed to place order: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    // Order Success Screen
    if (orderSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.2 }}
                        className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30"
                    >
                        <CheckCircle className="w-14 h-14 text-white" />
                    </motion.div>
                    <h1 className="text-3xl font-bold text-white mb-2">Order Placed Successfully!</h1>
                    <p className="text-gray-400 mb-4">Your blockchain certificate is being generated...</p>
                    <div className="flex items-center justify-center gap-2 text-emerald-400">
                        <Shield className="w-5 h-5" />
                        <span className="font-mono text-sm">Certificate verified on chain</span>
                    </div>
                    <p className="text-gray-500 text-sm mt-6">Redirecting to Order History...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="relative z-10 max-w-6xl mx-auto p-6 lg:p-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                            <ShoppingBag className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-emerald-200 to-emerald-400 bg-clip-text text-transparent">
                                {step === 'cart' ? 'Shopping Cart' : 'Delivery Details'}
                            </h1>
                            <p className="text-emerald-400/80 text-sm font-medium">
                                {step === 'cart' ? 'Review your items' : 'Where should we deliver?'}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {cart.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-12 text-center border border-slate-700/50"
                    >
                        <ShoppingBag className="w-20 h-20 text-gray-500 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold text-white mb-2">Your cart is empty</h2>
                        <p className="text-gray-400 mb-8 max-w-md mx-auto">
                            Browse our selection of certified green hydrogen products.
                        </p>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/shop')}
                            className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
                        >
                            Browse Marketplace
                        </motion.button>
                    </motion.div>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Left Column - Cart Items / Address Form */}
                        <div className="lg:col-span-2 space-y-6">
                            {step === 'cart' ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-4"
                                >
                                    {cart.map((item, idx) => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 hover:border-emerald-500/30 transition-all"
                                        >
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-500/20">
                                                        H₂
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-lg text-white">{item.name}</h3>
                                                        <p className="text-sm text-gray-400">Purity: {item.purity}</p>
                                                        <div className="text-emerald-400 font-bold mt-1">
                                                            ${item.price.toFixed(2)} / kg
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    {/* Quantity Controls */}
                                                    <div className="flex items-center gap-2">
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)}
                                                            className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-colors"
                                                        >
                                                            <Minus className="w-4 h-4" />
                                                        </motion.button>
                                                        <span className="font-bold w-10 text-center text-white text-lg">{item.quantity || 1}</span>
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                                                            className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-colors"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </motion.button>
                                                    </div>

                                                    {/* Subtotal */}
                                                    <div className="text-right min-w-[80px]">
                                                        <div className="font-bold text-xl text-white">
                                                            ${(item.price * (item.quantity || 1)).toFixed(2)}
                                                        </div>
                                                    </div>

                                                    {/* Remove Button */}
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => removeItem(item.id)}
                                                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </motion.button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50"
                                >
                                    {/* Delivery Address Section */}
                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-emerald-400" />
                                        Delivery Address
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Street Address</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                                                placeholder="Industrial Area, Sector 4"
                                                value={address.street}
                                                onChange={(e) => setAddress({ ...address, street: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">City</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                                                placeholder="Mumbai"
                                                value={address.city}
                                                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">State</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                                                placeholder="Maharashtra"
                                                value={address.state}
                                                onChange={(e) => setAddress({ ...address, state: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Zip Code</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                                                placeholder="400001"
                                                value={address.zipCode}
                                                onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Country</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white cursor-not-allowed"
                                                value={address.country}
                                                disabled
                                            />
                                        </div>
                                    </div>

                                    {/* Safety & Access Section */}
                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                        <ShieldAlert className="w-5 h-5 text-amber-400" />
                                        Safety & Access
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Safety Officer Contact</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                                                placeholder="+91 98765 43210"
                                                value={address.safetyContact}
                                                onChange={(e) => setAddress({ ...address, safetyContact: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Site Access Code (if any)</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                                                placeholder="GATE-123"
                                                value={address.siteAccessCode}
                                                onChange={(e) => setAddress({ ...address, siteAccessCode: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Right Column - Order Summary */}
                        <div className="lg:col-span-1">
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 sticky top-24"
                            >
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-emerald-400" />
                                    Order Summary
                                </h2>

                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between text-gray-400">
                                        <span>Subtotal</span>
                                        <span className="text-white">${total.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-400">
                                        <span>Processing Fee</span>
                                        <span className="text-white">$50.00</span>
                                    </div>
                                    <div className="flex justify-between text-gray-400">
                                        <span>Tax (5%)</span>
                                        <span className="text-white">${(total * 0.05).toFixed(2)}</span>
                                    </div>
                                    <div className="border-t border-slate-700 pt-3 flex justify-between">
                                        <span className="font-bold text-white">Total</span>
                                        <span className="font-bold text-2xl bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                                            ${(total * 1.05 + 50).toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {/* Benefits */}
                                <div className="space-y-2 mb-6">
                                    <div className="flex items-center gap-2 text-sm px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
                                        <Shield className="w-4 h-4" />
                                        <span>Blockchain Certificate Included</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400">
                                        <Truck className="w-4 h-4" />
                                        <span>7-Day Delivery Guarantee</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
                                        <Leaf className="w-4 h-4" />
                                        <span>100% Renewable Source</span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-3">
                                    {step === 'cart' ? (
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setStep('address')}
                                            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
                                        >
                                            <span>Proceed to Delivery</span>
                                            <ArrowRight className="w-5 h-5" />
                                        </motion.button>
                                    ) : (
                                        <>
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={handleCheckout}
                                                disabled={loading || !address.street || !address.city}
                                                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {loading ? (
                                                    <>
                                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        <span>Processing...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle className="w-5 h-5" />
                                                        <span>Place Order</span>
                                                    </>
                                                )}
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ x: -2 }}
                                                onClick={() => setStep('cart')}
                                                className="w-full py-3 text-gray-400 hover:text-white flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <ArrowLeft className="w-4 h-4" />
                                                <span>Back to Cart</span>
                                            </motion.button>
                                        </>
                                    )}
                                </div>

                                <p className="text-xs text-center text-gray-500 mt-4">
                                    Secure transaction powered by Smart Contracts
                                </p>
                            </motion.div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-12 text-center text-gray-500 text-sm"
                >
                    <p>H₂-OptiPlant • Secure Checkout • Smart India Hackathon 2024</p>
                </motion.div>
            </div>
        </div>
    );
};

export default Cart;
