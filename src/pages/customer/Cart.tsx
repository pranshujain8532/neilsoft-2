import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, ShoppingBag, ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Cart = () => {
    const navigate = useNavigate();
    const [cart, setCart] = useState<any[]>([]);
    const [total, setTotal] = useState(0);

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

    const handleCheckout = () => {
        if (cart.length === 0) return;

        // Create new order
        const newOrder = {
            id: `ORD-${Date.now()}`,
            date: new Date().toISOString(),
            items: cart,
            total: total,
            status: 'Processing',
            certificateId: `BLK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
        };

        // Save to order history
        const existingOrders = JSON.parse(localStorage.getItem('hydrogen_orders') || '[]');
        localStorage.setItem('hydrogen_orders', JSON.stringify([newOrder, ...existingOrders]));

        // Clear cart
        localStorage.removeItem('hydrogen_cart');
        setCart([]);
        setTotal(0);

        // Navigate to orders
        alert('Order placed successfully! Blockchain certificate generated.');
        navigate('/orders');
    };

    return (
        <div className="max-w-7xl mx-auto section-padding">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-4xl font-bold gradient-text mb-8">Shopping Cart</h1>

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
                        {/* Cart Items */}
                        <div className="lg:col-span-2 space-y-4">
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

                                <button
                                    onClick={handleCheckout}
                                    className="w-full btn-primary py-3 flex items-center justify-center space-x-2"
                                >
                                    <span>Proceed to Checkout</span>
                                    <ArrowRight className="w-5 h-5" />
                                </button>

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
