import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
    Package, Truck, CheckCircle, Clock, MapPin, X, DollarSign,
    ShoppingCart, ArrowRight, RefreshCw, Loader2, ChevronRight,
    Zap, TrendingUp, AlertCircle, User, Phone
} from 'lucide-react';
import { SmartDispatchModal } from '@/components/transport';
import { orderAPI, transportAPI } from '@/utils/api';

interface Order {
    id: string;
    customer_id?: string;
    customer_name?: string;
    quantity: number;
    status: string;
    delivery_address?: string;
    total_price?: number;
    created_at?: string;
    delivery_date?: string;
    transport_method?: string;
    assigned_plant_name?: string;
    ai_explanation?: string;
    transport_cost_inr?: number;
    transport_co2_kg?: number;
    estimated_delivery_time?: string;
}

interface Vehicle {
    id: string;
    registration: string;
    status: string;
    driver_name?: string;
    current_load?: number;
    capacity?: number;
}

const OrderManagement = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [fleet, setFleet] = useState<Vehicle[]>([]);
    const [showDispatchModal, setShowDispatchModal] = useState(false);
    const [dispatchOrder, setDispatchOrder] = useState<Order | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Stats
    const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        inTransit: orders.filter(o => o.status === 'in-transit').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
    };

    useEffect(() => {
        fetchOrders();
        fetchFleet();

        const orderSubscription = supabase
            .channel('public:orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                fetchOrders();
            })
            .subscribe();

        const fleetSubscription = supabase
            .channel('public:vehicles')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
                fetchFleet();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(orderSubscription);
            supabase.removeChannel(fleetSubscription);
        };
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await orderAPI.getAll();
            if (res.data) {
                setOrders(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch orders', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFleet = async () => {
        try {
            const res = await transportAPI.getFleet();
            if (res.data) {
                setFleet(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch fleet', err);
        }
    };

    const refreshData = async () => {
        setRefreshing(true);
        await Promise.all([fetchOrders(), fetchFleet()]);
        setRefreshing(false);
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            await orderAPI.updateStatus(id, status);
            if (selectedOrder?.id === id) {
                setSelectedOrder({ ...selectedOrder, status });
            }
        } catch (error) {
            console.error('Failed to update status', error);
        }
    };

    const handleSmartDispatch = (order: Order) => {
        setDispatchOrder(order);
        setShowDispatchModal(true);
    };

    const handleDispatchConfirm = async (order: Order, option: any, plantName: string) => {
        try {
            await supabase.from('orders').update({
                status: 'in-transit',
                transport_method: option.mode,
                selected_transport_option: option.recommendation,
                assigned_plant_name: plantName,
                origin_location: plantName,
                transport_recommendations: JSON.stringify([option]),
                transport_co2_kg: option.co2_kg,
                transport_cost_inr: option.total_cost_inr,
                estimated_delivery_time: option.eta
            }).eq('id', order.id);

            if (option.mode !== 'pipeline') {
                const { data: vehicles } = await supabase
                    .from('vehicles')
                    .select('*')
                    .eq('status', 'idle')
                    .limit(1);

                if (vehicles && vehicles.length > 0) {
                    const vehicle = vehicles[0];
                    await supabase.from('vehicles').update({
                        current_order: order.id,
                        status: 'in-transit',
                        current_route: `${plantName} to ${order.delivery_address || 'Destination'}`
                    }).eq('id', vehicle.id);
                }
            }

            setShowDispatchModal(false);
            setDispatchOrder(null);

            if (selectedOrder?.id === order.id) {
                setSelectedOrder({ ...order, status: 'in-transit', transport_method: option.mode });
            }

            const costUSD = (option.total_cost_inr * 0.012).toFixed(2);
            alert(`Dispatch Confirmed!\n\n${option.mode_name}\nETA: ${option.eta}\nCost: $${costUSD}\nCO2: ${option.co2_kg} kg`);
        } catch (error: any) {
            console.error('Dispatch failed', error);
            alert(`Failed to dispatch: ${error.message}`);
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'pending':
                return { bg: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/30', text: 'text-amber-400', icon: Clock };
            case 'confirmed':
                return { bg: 'from-blue-500/20 to-blue-500/5', border: 'border-blue-500/30', text: 'text-blue-400', icon: CheckCircle };
            case 'in-transit':
                return { bg: 'from-purple-500/20 to-purple-500/5', border: 'border-purple-500/30', text: 'text-purple-400', icon: Truck };
            case 'delivered':
                return { bg: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: CheckCircle };
            default:
                return { bg: 'from-gray-500/20 to-gray-500/5', border: 'border-gray-500/30', text: 'text-gray-400', icon: Package };
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 border-4 border-hydrogen-500/30 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-hydrogen-500 border-t-transparent rounded-full animate-spin"></div>
                        <Package className="absolute inset-0 m-auto w-8 h-8 text-hydrogen-400 animate-pulse" />
                    </div>
                    <p className="text-gray-400 text-lg">Loading orders...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-hydrogen-500/20 to-hydrogen-600/10 border border-hydrogen-500/30">
                                <ShoppingCart className="w-8 h-8 text-hydrogen-400" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-hydrogen-200 to-hydrogen-400 bg-clip-text text-transparent">
                                    Order Management
                                </h1>
                                <p className="text-gray-400 mt-1">
                                    Manage and dispatch {orders.length} orders across the network
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={refreshData}
                            disabled={refreshing}
                            className="p-2 rounded-full hover:bg-gray-700/50 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-5 h-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Stats Bar */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        {[
                            { label: 'Total Orders', value: stats.total, icon: Package, color: 'text-blue-400', gradient: 'from-blue-500 to-blue-600' },
                            { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-400', gradient: 'from-amber-500 to-amber-600' },
                            { label: 'In Transit', value: stats.inTransit, icon: Truck, color: 'text-purple-400', gradient: 'from-purple-500 to-purple-600' },
                            { label: 'Delivered', value: stats.delivered, icon: CheckCircle, color: 'text-emerald-400', gradient: 'from-emerald-500 to-emerald-600' },
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.gradient}`}>
                                        <stat.icon className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs uppercase tracking-wider">{stat.label}</p>
                                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Orders Grid */}
                    <div className="lg:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {orders.length === 0 ? (
                                <div className="col-span-2 bg-gray-800/30 rounded-2xl p-12 text-center border border-gray-700/30">
                                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                                    <h3 className="text-xl font-bold text-white mb-2">No Orders Yet</h3>
                                    <p className="text-gray-500">Orders will appear here when customers place them</p>
                                </div>
                            ) : (
                                orders.map((order, index) => {
                                    const styles = getStatusStyles(order.status);
                                    const StatusIcon = styles.icon;
                                    return (
                                        <motion.div
                                            key={order.id}
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            whileHover={{ scale: 1.02, y: -5 }}
                                            onClick={() => setSelectedOrder(order)}
                                            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${styles.bg} 
                                                        backdrop-blur-sm border ${styles.border} cursor-pointer group transition-all duration-300
                                                        hover:shadow-xl hover:shadow-hydrogen-500/10 ${selectedOrder?.id === order.id ? 'ring-2 ring-hydrogen-500' : ''}`}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-hydrogen-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                            <div className="relative p-5">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <span className="font-mono text-xs text-gray-500">#{order.id.slice(0, 8)}</span>
                                                        <h3 className="text-lg font-bold text-white mt-1">Green Hydrogen</h3>
                                                    </div>
                                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${styles.text} bg-gray-900/50 border ${styles.border}`}>
                                                        <StatusIcon className="w-3.5 h-3.5" />
                                                        <span className="capitalize">{order.status}</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 text-sm">
                                                    <div className="flex items-center text-gray-400">
                                                        <User className="w-3.5 h-3.5 mr-2 text-gray-500" />
                                                        <span>{order.customer_name || 'Customer'}</span>
                                                    </div>
                                                    {order.delivery_address && (
                                                        <div className="flex items-center text-gray-400">
                                                            <MapPin className="w-3.5 h-3.5 mr-2 text-gray-500" />
                                                            <span className="truncate">{order.delivery_address.slice(0, 30)}...</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-700/50">
                                                    <div>
                                                        <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                                                            <Package className="w-3 h-3" />
                                                            Quantity
                                                        </div>
                                                        <p className="text-lg font-bold text-hydrogen-400">{order.quantity} kg</p>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                                                            <DollarSign className="w-3 h-3" />
                                                            Total
                                                        </div>
                                                        <p className="text-lg font-bold text-emerald-400">${order.total_price?.toFixed(2) || 'N/A'}</p>
                                                    </div>
                                                </div>

                                                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ChevronRight className="w-5 h-5 text-hydrogen-400" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Sidebar - Order Details & Fleet */}
                    <div className="space-y-6">
                        {/* Order Details */}
                        <AnimatePresence mode="wait">
                            {selectedOrder ? (
                                <motion.div
                                    key={selectedOrder.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden"
                                >
                                    <div className="p-5 border-b border-gray-700/50 flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-white">Order Details</h3>
                                        <button onClick={() => setSelectedOrder(null)} className="p-1.5 rounded-lg hover:bg-gray-700/50">
                                            <X className="w-4 h-4 text-gray-400" />
                                        </button>
                                    </div>

                                    <div className="p-5 space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-gray-900/50 rounded-xl p-3">
                                                <p className="text-gray-500 text-xs mb-1">Order ID</p>
                                                <p className="text-white font-mono text-sm">#{selectedOrder.id.slice(0, 8)}</p>
                                            </div>
                                            <div className="bg-gray-900/50 rounded-xl p-3">
                                                <p className="text-gray-500 text-xs mb-1">Quantity</p>
                                                <p className="text-hydrogen-400 font-bold">{selectedOrder.quantity} kg</p>
                                            </div>
                                            <div className="bg-gray-900/50 rounded-xl p-3">
                                                <p className="text-gray-500 text-xs mb-1">Total</p>
                                                <p className="text-emerald-400 font-bold">${selectedOrder.total_price?.toFixed(2)}</p>
                                            </div>
                                            <div className="bg-gray-900/50 rounded-xl p-3">
                                                <p className="text-gray-500 text-xs mb-1">Status</p>
                                                <p className={`font-bold capitalize ${getStatusStyles(selectedOrder.status).text}`}>
                                                    {selectedOrder.status}
                                                </p>
                                            </div>
                                        </div>

                                        {selectedOrder.delivery_address && (
                                            <div className="bg-gray-900/50 rounded-xl p-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <MapPin className="w-3.5 h-3.5 text-gray-500" />
                                                    <p className="text-gray-500 text-xs">Delivery Address</p>
                                                </div>
                                                <p className="text-white text-sm">{selectedOrder.delivery_address}</p>
                                            </div>
                                        )}

                                        {selectedOrder.ai_explanation && (
                                            <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Zap className="w-4 h-4 text-blue-400" />
                                                    <p className="text-blue-400 text-sm font-medium">AI Recommendation</p>
                                                </div>
                                                <p className="text-gray-300 text-sm">{selectedOrder.ai_explanation}</p>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="pt-4 space-y-2">
                                            {selectedOrder.status === 'pending' && (
                                                <button
                                                    onClick={() => handleStatusUpdate(selectedOrder.id, 'confirmed')}
                                                    className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/30 transition-all"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                    Approve Order
                                                </button>
                                            )}
                                            {selectedOrder.status === 'confirmed' && (
                                                <button
                                                    onClick={() => handleSmartDispatch(selectedOrder)}
                                                    className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/30 transition-all"
                                                >
                                                    <Truck className="w-4 h-4" />
                                                    Smart Dispatch
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-gray-800/30 rounded-2xl border border-gray-700/30 p-8 text-center"
                                >
                                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                                    <p className="text-gray-500">Select an order to view details</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Fleet Overview */}
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50">
                            <div className="p-5 border-b border-gray-700/50">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-cyan-400" />
                                    Available Fleet
                                </h3>
                            </div>
                            <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
                                {fleet.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4">No vehicles available</p>
                                ) : (
                                    fleet.filter(v => v.status === 'idle').slice(0, 5).map((v) => (
                                        <div
                                            key={v.id}
                                            className="p-3 rounded-xl bg-gray-900/50 border border-gray-700/30 flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-emerald-500/20">
                                                    <Truck className="w-4 h-4 text-emerald-400" />
                                                </div>
                                                <div>
                                                    <p className="text-white font-mono text-sm">{v.registration}</p>
                                                    <p className="text-gray-500 text-xs">{v.driver_name || 'No Driver'}</p>
                                                </div>
                                            </div>
                                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                                                {v.status}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Smart Dispatch Modal */}
            <SmartDispatchModal
                isOpen={showDispatchModal}
                onClose={() => {
                    setShowDispatchModal(false);
                    setDispatchOrder(null);
                }}
                order={dispatchOrder}
                onDispatchConfirm={handleDispatchConfirm}
            />
        </div>
    );
};

export default OrderManagement;
