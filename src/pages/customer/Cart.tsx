import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, ShoppingBag, ArrowRight, CheckCircle, MapPin, ShieldAlert, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '@/utils/api';

const Cart = () => {
    const navigate = useNavigate();
    const [cart, setCart] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'cart' | 'address'>('cart');

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
            // Create order via API - match Supabase schema
            const totalQuantity = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);
            const totalAmount = total * 1.05 + 50;

            // Format delivery address as text
            const deliveryAddressText = `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`;

            const orderData = {
                customer_id: user.id, // Use user.id from Supabase auth
                quantity: totalQuantity,
                status: 'pending',
                delivery_address: deliveryAddressText,
                total_price: totalAmount,
                delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
            };

            await orderAPI.create(orderData);

            // Clear cart
            localStorage.removeItem('hydrogen_cart');
            setCart([]);
            setTotal(0);

            alert('Order placed successfully! Admin will review shortly.');
            navigate('/orders');
        } catch (error: any) {
            console.error('Checkout failed:', error);
            alert(`Failed to place order: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto section-padding">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-4xl font-bold gradient-text mb-8">
                    {step === 'cart' ? 'Shopping Cart' : 'Delivery Details'}
                </h1>

                {cart.length === 0 ? (
                    <div className="card-glass p-12 text-center">
                        <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Looks like you haven't added any hydrogen products yet.
                        </p>
                        <button onClick={() => navigate('/shop')} className="btn-primary">
                            Browse Products
                        </button>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Left Column */}
                        <div className="lg:col-span-2 space-y-6">
                            {step === 'cart' ? (
                                // Cart Items List
                                <div className="space-y-4">
                                    {cart.map((item) => (
                                        <div key={item.id} className="card-glass p-6 flex items-center justify-between">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-16 h-16 bg-gradient-to-br from-hydrogen-500 to-green-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                                                    H₂
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg">{item.name}</h3>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        Purity: {item.purity}
                                                    </p>
                                                    <div className="text-green-500 font-bold mt-1">
                                                        ${item.price.toFixed(2)} / kg
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-6">
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)}
                                                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="font-bold w-8 text-center">{item.quantity || 1}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                                                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <div className="text-right min-w-[80px]">
                                                    <div className="font-bold text-lg">
                                                        ${(item.price * (item.quantity || 1)).toFixed(2)}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="text-red-500 hover:text-red-600 p-2"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                // Address Form
                                <div className="card-glass p-8">
                                    <h3 className="text-xl font-bold mb-6 flex items-center">
                                        <MapPin className="w-5 h-5 mr-2 text-hydrogen-500" />
                                        Delivery Address
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium mb-2">Street Address</label>
                                            <input
                                                type="text"
                                                className="input-field w-full"
                                                placeholder="Industrial Area, Sector 4"
                                                value={address.street}
                                                onChange={(e) => setAddress({ ...address, street: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">City</label>
                                            <input
                                                type="text"
                                                className="input-field w-full"
                                                placeholder="Mumbai"
                                                value={address.city}
                                                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">State</label>
                                            <input
                                                type="text"
                                                className="input-field w-full"
                                                placeholder="Maharashtra"
                                                value={address.state}
                                                onChange={(e) => setAddress({ ...address, state: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Zip Code</label>
                                            <input
                                                type="text"
                                                className="input-field w-full"
                                                placeholder="400001"
                                                value={address.zipCode}
                                                onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Country</label>
                                            <input
                                                type="text"
                                                className="input-field w-full"
                                                value={address.country}
                                                disabled
                                            />
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold mb-6 flex items-center">
                                        <ShieldAlert className="w-5 h-5 mr-2 text-yellow-500" />
                                        Safety & Access
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Safety Officer Contact</label>
                                            <input
                                                type="text"
                                                className="input-field w-full"
                                                placeholder="+91 98765 43210"
                                                value={address.safetyContact}
                                                onChange={(e) => setAddress({ ...address, safetyContact: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Site Access Code (if any)</label>
                                            <input
                                                type="text"
                                                className="input-field w-full"
                                                placeholder="GATE-123"
                                                value={address.siteAccessCode}
                                                onChange={(e) => setAddress({ ...address, siteAccessCode: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Order Summary */}
                        <div className="card-glass p-6 h-fit">
                            <h2 className="text-xl font-bold mb-6">Order Summary</h2>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                    <span>Subtotal</span>
                                    <span>${total.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                    <span>Processing Fee</span>
                                    <span>$50.00</span>
                                </div>
                                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                    <span>Tax (5%)</span>
                                    <span>${(total * 0.05).toFixed(2)}</span>
                                </div>
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span>${(total * 1.05 + 50).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    <span>Blockchain Certificate Included</span>
                                </div>

                                {step === 'cart' ? (
                                    <button
                                        onClick={() => setStep('address')}
                                        className="w-full btn-primary py-3 flex items-center justify-center space-x-2"
                                    >
                                        <span>Proceed to Address</span>
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                ) : (
                                    <div className="space-y-3">
                                        <button
                                            onClick={handleCheckout}
                                            disabled={loading || !address.street || !address.city}
                                            className="w-full btn-primary py-3 flex items-center justify-center space-x-2 disabled:opacity-50"
                                        >
                                            {loading ? (
                                                <span>Processing...</span>
                                            ) : (
                                                <>
                                                    <span>Place Order</span>
                                                    <CheckCircle className="w-5 h-5" />
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setStep('cart')}
                                            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                        >
                                            Back to Cart
                                        </button>
                                    </div>
                                )}

                                <p className="text-xs text-center text-gray-500">
                                    Secure transaction powered by Smart Contracts
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default Cart;
