import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { orderAPI, transportAPI } from '@/utils/api';
import { Package, Truck, CheckCircle, Clock, MapPin, AlertTriangle, X } from 'lucide-react';

const OrderManagement = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [showShipModal, setShowShipModal] = useState(false);
    const [fleet, setFleet] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await orderAPI.getAll();
            setOrders(res.data);
        } catch (error) {
            console.error('Failed to fetch orders', error);
        }
    };

    const fetchFleet = async () => {
        try {
            const res = await transportAPI.getFleet();
            setFleet(res.data.filter((v: any) => v.status === 'idle'));
        } catch (error) {
            console.error('Failed to fetch fleet', error);
        }
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            await orderAPI.updateStatus(id, status);
            fetchOrders();
            if (selectedOrder?._id === id) {
                setSelectedOrder({ ...selectedOrder, status });
            }
        } catch (error) {
            console.error('Failed to update status', error);
        }
    };

    const openShipModal = async (order: any) => {
        setSelectedOrder(order);
        await fetchFleet();
        setShowShipModal(true);
    };

    const assignVehicle = async (vehicleId: string) => {
        if (!selectedOrder) return;
        setLoading(true);
        try {
            await transportAPI.assignVehicle({
                vehicleId,
                orderId: selectedOrder._id
            });
            setShowShipModal(false);
            fetchOrders();
            alert('Vehicle assigned successfully!');
        } catch (error) {
            console.error('Failed to assign vehicle', error);
            alert('Failed to assign vehicle');
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
                                {orders.map((order) => (
                                    <div
                                        key={order._id}
                                        onClick={() => setSelectedOrder(order)}
                                        className={`p-4 rounded-lg cursor-pointer transition-all ${selectedOrder?._id === order._id
                                            ? 'bg-hydrogen-500/20 border border-hydrogen-500'
                                            : 'bg-white/5 hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-mono text-xs text-gray-500">#{order._id.slice(-6)}</span>
                                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </div>
                                        <h3 className="font-bold">{order.product?.name}</h3>
                                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-2">
                                            <span>{order.product?.quantity} kg</span>
                                            <span>${order.totalAmount?.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Order Details */}
                    <div className="lg:col-span-2">
                        {selectedOrder ? (
                            <div className="card-glass p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold mb-1">Order #{selectedOrder._id.slice(-6)}</h2>
                                        <p className="text-gray-600 dark:text-gray-400">
                                            Placed on {new Date(selectedOrder.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex space-x-3">
                                        {selectedOrder.status === 'pending' && (
                                            <button
                                                onClick={() => handleStatusUpdate(selectedOrder._id, 'confirmed')}
                                                className="btn-primary flex items-center space-x-2"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                <span>Approve Order</span>
                                            </button>
                                        )}
                                        {selectedOrder.status === 'confirmed' && (
                                            <button
                                                onClick={() => openShipModal(selectedOrder)}
                                                className="btn-primary flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
                                            >
                                                <Truck className="w-4 h-4" />
                                                <span>Ship Order</span>
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
                                                <span className="font-medium">{selectedOrder.product?.name}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">Purity</span>
                                                <span className="font-medium">{selectedOrder.product?.purity}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">Quantity</span>
                                                <span className="font-medium">{selectedOrder.product?.quantity} kg</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">Total Amount</span>
                                                <span className="font-medium text-green-500">${selectedOrder.totalAmount?.toFixed(2)}</span>
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
                                                        {selectedOrder.deliveryAddress?.street},<br />
                                                        {selectedOrder.deliveryAddress?.city}, {selectedOrder.deliveryAddress?.state} - {selectedOrder.deliveryAddress?.zipCode}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start space-x-2">
                                                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-1" />
                                                <div>
                                                    <p className="font-medium">Safety Contact</p>
                                                    <p className="text-gray-500">{selectedOrder.deliveryAddress?.safetyContact || 'N/A'}</p>
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
                                            <span className="font-mono">{selectedOrder.certificate?.tokenId}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">Carbon Intensity</span>
                                            <span className="font-medium">{selectedOrder.certificate?.carbonIntensity} kgCO2/kg</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">Energy Mix</span>
                                            <span className="font-medium">
                                                Solar: {selectedOrder.certificate?.energyMix?.solar}% |
                                                Wind: {selectedOrder.certificate?.energyMix?.wind}%
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

            {/* Ship Modal */}
            {showShipModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-lg w-full m-4 border border-gray-200 dark:border-gray-800 shadow-2xl"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Assign Vehicle</h2>
                            <button onClick={() => setShowShipModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto">
                            {fleet.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">No available vehicles found.</p>
                            ) : (
                                fleet.map((vehicle) => (
                                    <div
                                        key={vehicle._id}
                                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex justify-between items-center group"
                                        onClick={() => assignVehicle(vehicle._id)}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                                <Truck className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold">{vehicle.registration}</h4>
                                                <p className="text-xs text-gray-500">{vehicle.driver} • {vehicle.capacity}kg Capacity</p>
                                            </div>
                                        </div>
                                        <button className="px-3 py-1 bg-hydrogen-500 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                            Assign
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default OrderManagement;
