import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Clock, CheckCircle, FileText, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '@/utils/api';
import { supabase } from '@/lib/supabase';

const OrderHistory = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();

        // Realtime subscription
        const subscription = supabase
            .channel('public:orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                fetchOrders();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const fetchOrders = async () => {
        try {
            // RLS policies will ensure users only see their own orders
            const response = await orderAPI.getAll();
            if (response.data) {
                setOrders(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
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
                <h1 className="text-4xl font-bold gradient-text mb-8">Order History</h1>

                {orders.length === 0 ? (
                    <div className="card-glass p-12 text-center">
                        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">No orders yet</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Start your green hydrogen journey today.
                        </p>
                        <button onClick={() => navigate('/shop')} className="btn-primary">
                            Browse Shop
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map((order) => (
                            <motion.div
                                key={order.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="card-glass p-6 hover:border-hydrogen-500/50 transition-colors"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start space-x-4">
                                        <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-500">
                                            <Package className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">Order #{order.id.slice(0, 8)}</h3>
                                            <div className="flex items-center text-sm text-gray-500 space-x-4">
                                                <span className="flex items-center">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    {new Date(order.created_at).toLocaleDateString()}
                                                </span>
                                                <span className={`flex items-center ${order.status === 'delivered' ? 'text-green-500' : 'text-blue-500'}`}>
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    {order.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-8 flex-1">
                                        <div>
                                            <div className="text-sm text-gray-500">Quantity</div>
                                            <div className="font-bold">{order.quantity} kg</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-500">Total Amount</div>
                                            <div className="font-bold text-xl gradient-text">
                                                ${order.total_price?.toFixed(2)}
                                            </div>
                                        </div>
                                        <button className="p-2 hover:bg-white/10 rounded-full transition-colors" onClick={() => navigate(`/order/${order.id}`)}>
                                            <ChevronRight className="w-5 h-5 text-gray-400" />
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                    <div className="flex items-center text-xs text-gray-500 font-mono">
                                        <FileText className="w-3 h-3 mr-2" />
                                        Certificate: {order.certificate?.tokenId || 'Pending'}
                                    </div>
                                    <button className="text-sm text-hydrogen-500 hover:underline">
                                        View Certificate
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default OrderHistory;
