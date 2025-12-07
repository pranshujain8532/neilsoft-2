import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, TruckIcon, Clock, Package,
    RefreshCw, Navigation,
    X, DollarSign, Route, Leaf, ChevronRight, ArrowRight, User, Calendar
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import RouteSimulator from '@/components/RouteSimulator';

// ============ TYPES ============
interface FleetStats {
    total: number;
    in_transit: number;
}

interface Vehicle {
    id: string;
    registration: string;
    capacity: number;
    status: string;
    current_load?: number;
    current_order?: string;
    current_route?: string;
}

interface ActiveDelivery {
    id: string;
    order_id: string;
    customer_name: string;
    quantity: number;
    origin: string;
    destination: string;
    transport_method: string;
    eta?: string;
    status: string;
    transport_cost_inr?: number;
    transport_co2_kg?: number;
    assigned_plant_name?: string;
    delivery_address?: string;
    created_at?: string;
    total_price?: number;
}

// INR to USD conversion
const INR_TO_USD = 0.012;

// ============ MAIN COMPONENT ============
const Transport = () => {
    const [fleet, setFleet] = useState<Vehicle[]>([]);
    const [fleetStats, setFleetStats] = useState<FleetStats>({ total: 5, in_transit: 0 });
    const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<ActiveDelivery | null>(null);
    const [mapRoute, setMapRoute] = useState<{ origin: string, destination: string } | null>(null);
    const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

    // ============ DATA FETCHING FROM SUPABASE ============
    const fetchFleetData = useCallback(async () => {
        try {
            console.log('[Transport] Fetching vehicles from Supabase...');
            const { data: vehicles, error } = await supabase.from('vehicles').select('*');

            if (error) {
                console.error('[Transport] Supabase error:', error);
                throw error;
            }

            const vehicleList = vehicles || [];
            console.log('[Transport] Fetched', vehicleList.length, 'vehicles');
            setFleet(vehicleList);
            // Hardcoded total = 5, don't overwrite from DB
            // setFleetStats(prev => ({ ...prev, total: vehicleList.length }));
        } catch (error) {
            console.error('[Transport] Failed to fetch fleet:', error);
        }
    }, []);

    const fetchActiveDeliveries = useCallback(async () => {
        try {
            const { data: orders, error } = await supabase
                .from('orders')
                .select('*')
                .eq('status', 'in-transit')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const deliveries: ActiveDelivery[] = (orders || []).map((o: any) => ({
                id: o.id,
                order_id: o.id,
                customer_name: o.customer_name,
                quantity: o.quantity,
                origin: o.assigned_plant_name || 'Gujarat Solar H2 Plant',
                destination: o.delivery_address || 'Customer Location',
                transport_method: o.transport_method,
                eta: o.estimated_delivery_time,
                status: o.status,
                transport_cost_inr: o.transport_cost_inr,
                transport_co2_kg: o.transport_co2_kg,
                assigned_plant_name: o.assigned_plant_name,
                delivery_address: o.delivery_address,
                created_at: o.created_at,
                total_price: o.total_price
            }));

            setActiveDeliveries(deliveries);
            setFleetStats(prev => ({ ...prev, in_transit: deliveries.length }));
        } catch (error) {
            console.error('Failed to fetch active deliveries:', error);
        }
    }, []);

    useEffect(() => {
        fetchFleetData();
        fetchActiveDeliveries();

        const vehicleChannel = supabase
            .channel('vehicles-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, fetchFleetData)
            .subscribe();

        const orderChannel = supabase
            .channel('orders-transport-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchActiveDeliveries)
            .subscribe();

        return () => {
            supabase.removeChannel(vehicleChannel);
            supabase.removeChannel(orderChannel);
        };
    }, [fetchFleetData, fetchActiveDeliveries]);

    // Map uses mapRoute state which persists until another delivery is clicked
    const mapOrigin = mapRoute?.origin || 'Ahmedabad, Gujarat';
    const mapDestination = mapRoute?.destination || 'Mumbai, Maharashtra';

    // ============ RENDER ============
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="max-w-7xl mx-auto px-6 py-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

                    {/* Header */}
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30">
                                <TruckIcon className="w-8 h-8 text-cyan-400" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                                    Transport & Logistics
                                </h1>
                                <p className="text-gray-400 mt-1">Real-time fleet tracking and delivery monitoring</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                onClick={() => { fetchFleetData(); fetchActiveDeliveries(); }}
                                className="p-2.5 bg-gray-800/50 text-gray-400 rounded-xl hover:bg-gray-700/50 border border-gray-700/50"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                onClick={() => setIsSimulatorOpen(true)}
                                className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-purple-500/20"
                            >
                                <Navigation className="w-4 h-4" />
                                Route Simulator
                            </motion.button>
                        </div>
                    </div>

                    {/* Stats Grid - Just 2 stats */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 backdrop-blur-sm border border-cyan-500/20 p-6"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                            <div className="relative flex items-center gap-4">
                                <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/30">
                                    <TruckIcon className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <p className="text-cyan-300/70 text-sm font-medium uppercase tracking-wider">Total Fleet</p>
                                    <p className="text-5xl font-bold text-white mt-1">{fleetStats.total}</p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-sm border border-purple-500/20 p-6"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                            <div className="relative flex items-center gap-4">
                                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30">
                                    <Package className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <p className="text-purple-300/70 text-sm font-medium uppercase tracking-wider">In Transit</p>
                                    <p className="text-5xl font-bold text-white mt-1">{fleetStats.in_transit}</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Main Content */}
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Left: Active Deliveries */}
                        <div className="glass-card p-5">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Route className="w-5 h-5 text-purple-400" />
                                    Active Deliveries
                                </h3>
                                <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium border border-purple-500/30">
                                    {activeDeliveries.length}
                                </span>
                            </div>

                            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                                {activeDeliveries.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <TruckIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                        <p className="text-lg">No active deliveries</p>
                                        <p className="text-sm mt-2">Dispatch orders from Order Management</p>
                                    </div>
                                ) : (
                                    activeDeliveries.map((delivery, index) => (
                                        <motion.div
                                            key={delivery.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            whileHover={{ scale: 1.02, x: 5 }}
                                            className="p-4 rounded-xl cursor-pointer transition-all border bg-gradient-to-r from-gray-800/50 to-gray-800/30 border-gray-700/30 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 group"
                                            onClick={() => {
                                                setSelectedOrder(delivery);
                                                setMapRoute({ origin: delivery.origin, destination: delivery.destination });
                                            }}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <span className="text-white font-bold">#{delivery.order_id.slice(0, 8)}</span>
                                                    <p className="text-gray-400 text-sm mt-0.5 flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {delivery.customer_name}
                                                    </p>
                                                </div>
                                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30">
                                                    In Transit
                                                </span>
                                            </div>

                                            <div className="space-y-1.5 text-sm">
                                                <div className="flex items-center text-gray-400">
                                                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                                                    <span className="truncate">{delivery.origin?.slice(0, 28)}</span>
                                                </div>
                                                <div className="flex items-center text-gray-400">
                                                    <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                                                    <span className="truncate">{delivery.destination?.slice(0, 28)}</span>
                                                </div>
                                            </div>

                                            <div className="mt-3 pt-3 border-t border-gray-700/50 flex justify-between items-center">
                                                <div className="flex gap-4 text-xs">
                                                    <span className="text-cyan-400 font-semibold">{delivery.quantity} kg</span>
                                                    <span className="text-amber-400">{delivery.eta || 'ETA calculating'}</span>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Right: Map */}
                        <div className="lg:col-span-2 glass-card p-5">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-cyan-400" />
                                    Live Tracking
                                </h3>
                                {selectedOrder && (
                                    <span className="text-sm text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                                        Order #{selectedOrder.order_id.slice(0, 8)}
                                    </span>
                                )}
                            </div>
                            <div className="w-full h-[500px] bg-gray-800/50 rounded-xl overflow-hidden">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    allowFullScreen
                                    referrerPolicy="no-referrer-when-downgrade"
                                    src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyDyaStNd9U3Q0BF4tDi-URy8ez19VpN57U&origin=${encodeURIComponent(mapOrigin)}&destination=${encodeURIComponent(mapDestination)}&zoom=6&mode=driving`}
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* ============ BEAUTIFUL POPUP MODAL ============ */}
            <AnimatePresence>
                {selectedOrder && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedOrder(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 50 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl border border-gray-700/50 w-full max-w-2xl shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="relative p-6 border-b border-gray-700/50 bg-gradient-to-r from-purple-500/10 via-transparent to-cyan-500/10">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-cyan-500/5" />
                                <div className="relative flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30">
                                            <Package className="w-7 h-7 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">Order #{selectedOrder.order_id.slice(0, 8)}</h2>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-300 border border-purple-500/30">
                                                    In Transit
                                                </span>
                                                <span className="text-gray-500 text-sm flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleDateString() : 'Today'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedOrder(null)}
                                        className="p-2 rounded-full hover:bg-gray-700/50 transition-colors"
                                    >
                                        <X className="w-6 h-6 text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 space-y-6">
                                {/* Customer Info */}
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
                                    <div className="p-2 rounded-lg bg-blue-500/20">
                                        <User className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs">Customer</p>
                                        <p className="text-white font-semibold">{selectedOrder.customer_name}</p>
                                    </div>
                                </div>

                                {/* Route */}
                                <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
                                            <div className="w-0.5 h-8 bg-gradient-to-b from-green-500 to-red-500" />
                                            <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <p className="text-gray-500 text-xs">From</p>
                                                <p className="text-white font-medium">{selectedOrder.origin}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs">To</p>
                                                <p className="text-white font-medium">{selectedOrder.destination}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Key Metrics */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Package className="w-4 h-4 text-cyan-400" />
                                            <span className="text-xs text-gray-500">Quantity</span>
                                        </div>
                                        <p className="text-2xl font-bold text-white">{selectedOrder.quantity} <span className="text-sm text-gray-400">kg</span></p>
                                    </div>

                                    <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <DollarSign className="w-4 h-4 text-green-400" />
                                            <span className="text-xs text-gray-500">Transport Cost</span>
                                        </div>
                                        <p className="text-2xl font-bold text-green-400">
                                            ${selectedOrder.transport_cost_inr ? (selectedOrder.transport_cost_inr * INR_TO_USD).toFixed(0) : 'N/A'}
                                        </p>
                                    </div>

                                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Clock className="w-4 h-4 text-amber-400" />
                                            <span className="text-xs text-gray-500">ETA</span>
                                        </div>
                                        <p className="text-xl font-bold text-amber-400">{selectedOrder.eta || 'Calculating'}</p>
                                    </div>

                                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Leaf className="w-4 h-4 text-emerald-400" />
                                            <span className="text-xs text-gray-500">CO₂ Emissions</span>
                                        </div>
                                        <p className="text-2xl font-bold text-emerald-400">{selectedOrder.transport_co2_kg?.toFixed(1) || '0'} <span className="text-sm text-gray-400">kg</span></p>
                                    </div>
                                </div>

                                {/* Transport Method */}
                                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-purple-500/20">
                                            <TruckIcon className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs">Transport Method</p>
                                            <p className="text-white font-semibold capitalize">{selectedOrder.transport_method || 'Truck'}</p>
                                        </div>
                                    </div>
                                    {selectedOrder.total_price && (
                                        <div className="text-right">
                                            <p className="text-gray-500 text-xs">Order Value</p>
                                            <p className="text-xl font-bold text-white">${(selectedOrder.total_price).toFixed(2)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-700/50 bg-gray-900/50">
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all"
                                >
                                    Close Details
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <RouteSimulator isOpen={isSimulatorOpen} onClose={() => setIsSimulatorOpen(false)} />

            <style>{`
                .glass-card {
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 2px;
                }
            `}</style>
        </div>
    );
};

export default Transport;
