import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { orderAPI, transportAPI } from '@/utils/api';
import { supabase } from '@/lib/supabase';
import { Package, Truck, CheckCircle, Clock, MapPin } from 'lucide-react';

const OrderManagement = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [fleet, setFleet] = useState<any[]>([]);

    useEffect(() => {
        fetchOrders();
        fetchFleet();

        // Realtime subscription for Orders
        const orderSubscription = supabase
            .channel('public:orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
                console.log('Order update:', payload);
                fetchOrders(); // Refresh list on any change
            })
            .subscribe();

        // Realtime subscription for Fleet (Vehicles)
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
        }
    };

    // Fetch fleet (vehicles) from backend
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

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            await orderAPI.updateStatus(id, status);
            // fetchOrders handled by realtime
            if (selectedOrder?.id === id) {
                setSelectedOrder({ ...selectedOrder, status });
            }
        } catch (error) {
            console.error('Failed to update status', error);
        }
    };

    const handleSmartDispatch = async (order: any) => {
        setLoading(true);
        try {
            // Use the smartDispatch API which calls ML backend
            const res = await transportAPI.smartDispatch(order);

            // Update order status to in-transit
            await orderAPI.updateStatus(order.id, 'in-transit');

            alert(`Smart Dispatch Successful!\n\nOptimized Plant: ${res.data.plant.plant_name}\nAssigned Vehicle: ${res.data.vehicle.registration}\nDriver: ${res.data.vehicle.driver_name || res.data.vehicle.driver}`);

            // Updates handled by realtime
            setSelectedOrder({ ...order, status: 'in-transit' });
        } catch (error: any) {
            console.error('Smart dispatch failed', error);
            alert(`Failed to dispatch order: ${error.message || 'No idle vehicles available'}`);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500/20 text-yellow-500';
            case 'confirmed': return 'bg-blue-500/20 text-blue-500';
            case 'in-transit': return 'bg-purple-500/20 text-purple-500';
            case 'delivered': return 'bg-green-500/20 text-green-500';
            default: return 'bg-gray-500/20 text-gray-500';
        }
    };

    return (
        <div className="max-w-7xl mx-auto section-padding">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-4xl font-bold gradient-text mb-8">Order Management</h1>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Order List */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="card-glass p-4">
                            <h2 className="font-bold mb-4">Active Orders</h2>
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                {orders.length === 0 ? (
                                    <p className="text-gray-400 text-center py-4">No active orders</p>
                                ) : (
                                    orders.map((order) => (
                                        <div
                                            key={order.id}
                                            onClick={() => setSelectedOrder(order)}
                                            className={`p-4 rounded-lg cursor-pointer transition-all ${selectedOrder?.id === order.id
                                                ? 'bg-hydrogen-500/20 border border-hydrogen-500'
                                                : 'bg-white/5 hover:bg-white/10'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-mono text-xs text-gray-500">#{order.id.slice(0, 8)}</span>
                                                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                            <h3 className="font-bold">Hydrogen Order</h3>
                                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-2">
                                                <span>{order.quantity} kg</span>
                                                <span>${order.total_price?.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Fleet Overview */}
                    <div className="lg:col-span-1 mt-8">
                        <h2 className="font-bold mb-4">Current Fleet</h2>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {fleet.length === 0 ? (
                                <p className="text-gray-400">No vehicles available</p>
                            ) : (
                                fleet.map((v) => (
                                    <div
                                        key={v.id}
                                        className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-mono text-sm">{v.registration}</span>
                                            <span
                                                className={`px-2 py-1 rounded ${v.status === 'in-transit'
                                                    ? 'bg-purple-500/20 text-purple-500'
                                                    : v.status === 'idle'
                                                        ? 'bg-green-500/20 text-green-500'
                                                        : 'bg-gray-500/20 text-gray-500'
                                                    }`}
                                            >
                                                {v.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Driver: {v.driver} | Load: {v.current_load || 0} kg
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Order Details */}
                    <div className="lg:col-span-2">
                        {selectedOrder ? (
                            <div className="card-glass p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold mb-1">Order #{selectedOrder.id.slice(0, 8)}</h2>
                                        <p className="text-gray-600 dark:text-gray-400">
                                            Placed on {new Date(selectedOrder.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex space-x-3">
                                        {selectedOrder.status === 'pending' && (
                                            <button
                                                onClick={() => handleStatusUpdate(selectedOrder.id, 'confirmed')}
                                                className="btn-primary flex items-center space-x-2"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                <span>Approve Order</span>
                                            </button>
                                        )}
                                        {selectedOrder.status === 'confirmed' && (
                                            <button
                                                onClick={() => handleSmartDispatch(selectedOrder)}
                                                disabled={loading}
                                                className="btn-primary flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                                            >
                                                {loading ? (
                                                    <span className="animate-spin">⌛</span>
                                                ) : (
                                                    <Truck className="w-4 h-4" />
                                                )}
                                                <span>Smart Dispatch</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-8">
                                    {/* Product Details */}
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-lg border-b border-gray-200 dark:border-gray-700 pb-2">
                                            Product Details
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-500 block">Product</span>
                                                <span className="font-medium">Green Hydrogen</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">Purity</span>
                                                <span className="font-medium">99.9%</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">Quantity</span>
                                                <span className="font-medium">{selectedOrder.quantity} kg</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">Total Amount</span>
                                                <span className="font-medium text-green-500">${selectedOrder.total_price?.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Delivery Details */}
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-lg border-b border-gray-200 dark:border-gray-700 pb-2">
                                            Delivery & Safety
                                        </h3>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex items-start space-x-2">
                                                <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                                                <div>
                                                    <p className="font-medium">Delivery Address</p>
                                                    <p className="text-gray-500">
                                                        {selectedOrder.delivery_address || 'No address provided'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start space-x-2">
                                                <Clock className="w-4 h-4 text-gray-400 mt-1" />
                                                <div>
                                                    <p className="font-medium">Est. Delivery</p>
                                                    <p className="text-gray-500">
                                                        {selectedOrder.delivery_date ? new Date(selectedOrder.delivery_date).toLocaleDateString() : 'Pending'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Blockchain Certificate */}
                                <div className="mt-8 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                                    <h3 className="font-bold text-green-500 mb-2 flex items-center">
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Blockchain Certificate
                                    </h3>
                                    <div className="grid grid-cols-3 gap-4 text-xs">
                                        <div>
                                            <span className="text-gray-500 block">Token ID</span>
                                            <span className="font-mono">{selectedOrder.certificate?.tokenId || 'Pending Generation'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">Carbon Intensity</span>
                                            <span className="font-medium">0.8 kgCO2/kg</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">Energy Mix</span>
                                            <span className="font-medium">
                                                Solar: 60% | Wind: 30%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="card-glass p-12 flex flex-col items-center justify-center text-gray-500 h-full">
                                <Package className="w-16 h-16 mb-4 opacity-50" />
                                <p>Select an order to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

        </div>
    );
};

export default OrderManagement;
