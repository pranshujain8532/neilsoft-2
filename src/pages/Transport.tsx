import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

import { MapPin, TruckIcon, Clock, AlertCircle } from 'lucide-react';
import { transportAPI } from '@/utils/api';
import { supabase } from '@/lib/supabase';
import RouteSimulator from '@/components/RouteSimulator';
const Transport = () => {
    const [fleet, setFleet] = useState<any[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
    const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

    // Refresh ETA for selected vehicle
    useEffect(() => {
        if (!selectedVehicle || selectedVehicle.status !== 'in-transit') return;

        const updateETA = async () => {
            const origin = selectedVehicle.origin || selectedVehicle.depot_name || 'Unknown';
            const destination = selectedVehicle.destination || selectedVehicle.current_route?.split(' to ')[1] || 'Unknown';

            if (origin !== 'Unknown' && destination !== 'Unknown') {
                const eta = await calculateETA(origin, destination);
                if (eta.duration !== 'Unknown') {
                    setSelectedVehicle((prev: any) => ({ ...prev, eta: eta.duration }));
                }
            }
        };

        updateETA(); // Run immediately
        const interval = setInterval(updateETA, 60000); // 1 minute

        return () => clearInterval(interval);
    }, [selectedVehicle]);

    useEffect(() => {
        fetchFleet();

        // Connect to WebSocket
        import('@/websocket').then(({ connect, subscribeFleet, unsubscribeFleet }) => {
            connect();
            setTimeout(subscribeFleet, 500); // Wait for connection

            const handleMessage = (e: any) => {
                const msg = e.detail;
                if (msg.event === 'maintenance:alert') {
                    console.log('Maintenance Alert:', msg.alert);
                    // Show toast or alert
                    const alertDiv = document.createElement('div');
                    alertDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-bounce';
                    alertDiv.innerHTML = `<strong>⚠️ Maintenance Alert</strong><br/>Vehicle ${msg.vehicleId} needs attention!`;
                    document.body.appendChild(alertDiv);
                    setTimeout(() => alertDiv.remove(), 5000);
                }
            };

            window.addEventListener('ws:message', handleMessage);

            return () => {
                unsubscribeFleet();
                window.removeEventListener('ws:message', handleMessage);
            };
        });

        const channel = supabase
            .channel('public:vehicles')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'vehicles' },
                (payload) => {
                    console.log('Change received!', payload);
                    fetchFleet(); // Refresh full list to ensure consistency
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchFleet = async () => {
        try {
            const res = await transportAPI.getFleet();
            if (res.data) {
                // Ensure vehicles have necessary props
                const vehicles = res.data.map((v: any) => ({
                    ...v,
                    origin: v.origin || 'Gujarat Solar Plant', // Default if missing
                    destination: v.destination
                }));
                setFleet(vehicles);
            }
        } catch (error) {
            console.error('Failed to fetch fleet', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'in-transit':
                return 'bg-hydrogen-500/20 text-hydrogen-500';
            case 'loading':
                return 'bg-yellow-500/20 text-yellow-500';
            case 'idle':
                return 'bg-gray-500/20 text-gray-500';
            default:
                return 'bg-green-500/20 text-green-500';
        }
    };

    const inTransit = fleet.filter((v) => v.status === 'in-transit').length;
    const totalCapacity = fleet.reduce((sum, v) => sum + (v.capacity || 0), 0);
    const totalLoad = fleet.reduce((sum, v) => sum + (v.current_load || 0), 0);

    return (
        <div className="max-w-7xl mx-auto section-padding overflow-x-hidden">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold gradient-text">Transport & Logistics</h1>
                    <div className="flex gap-3">

                        <button
                            onClick={() => setIsSimulatorOpen(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 flex items-center gap-2"
                        >
                            <MapPin className="w-4 h-4" />
                            Route Simulator
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="card-glass p-6">
                        <h3 className="text-sm text-gray-600 dark:text-gray-300 mb-2">Total Fleet</h3>
                        <p className="text-3xl font-bold">{fleet.length}</p>
                    </div>
                    <div className="card-glass p-6">
                        <h3 className="text-sm text-gray-600 dark:text-gray-300 mb-2">In Transit</h3>
                        <p className="text-3xl font-bold text-hydrogen-500">{inTransit}</p>
                    </div>
                    <div className="card-glass p-6">
                        <h3 className="text-sm text-gray-600 dark:text-gray-300 mb-2">Fleet Capacity</h3>
                        <p className="text-3xl font-bold text-green-500">{totalCapacity} kg</p>
                    </div>
                    <div className="card-glass p-6">
                        <h3 className="text-sm text-gray-600 dark:text-gray-300 mb-2">Current Load</h3>
                        <p className="text-3xl font-bold text-yellow-500">{totalLoad} kg</p>
                    </div>
                </div>

                {/* Map Placeholder & Fleet List */}
                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Map */}
                    <div className="card-glass p-6">
                        <h3 className="text-xl font-bold mb-4 flex justify-between items-center">
                            <span>Fleet Tracking Map</span>
                            {selectedVehicle && (
                                <span className="text-sm font-normal text-hydrogen-500 bg-hydrogen-500/10 px-3 py-1 rounded-full">
                                    Tracking: {selectedVehicle.registration}
                                </span>
                            )}
                        </h3>
                        <div className="w-full h-[400px] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden relative">
                            <iframe
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                loading="lazy"
                                allowFullScreen
                                referrerPolicy="no-referrer-when-downgrade"
                                src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyDyaStNd9U3Q0BF4tDi-URy8ez19VpN57U&origin=${selectedVehicle?.origin || 'Ahmedabad,Gujarat'}&destination=${selectedVehicle?.destination || 'Mumbai,Maharashtra'}&zoom=6&mode=driving`}
                            ></iframe>

                            {/* Overlay Fleet Markers (Simulated Visuals) */}
                            <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-black/80 p-4 rounded-lg backdrop-blur-sm text-xs max-w-xs">
                                <div className="font-bold mb-2">Live Updates</div>
                                <div className="space-y-2">
                                    {fleet.filter(v => v.status === 'in-transit').slice(0, 3).map(v => (
                                        <div key={v.id} className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                                                {v.registration}
                                            </div>
                                            <span className="text-gray-500">{v.current_route || 'En Route'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fleet List */}
                    <div className="space-y-4">
                        {fleet.map((vehicle) => (
                            <motion.div
                                key={vehicle.id}
                                whileHover={{ scale: 1.02 }}
                                onClick={() => setSelectedVehicle(vehicle)}
                                className={`card-glass p-4 cursor-pointer transition-all ${selectedVehicle?.id === vehicle.id ? 'border-hydrogen-500 ring-1 ring-hydrogen-500' : ''
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-lg ${getStatusColor(vehicle.status)}`}>
                                            <TruckIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">{vehicle.registration}</h3>
                                            <p className="text-sm text-gray-500">{vehicle.driver_name || 'No Driver Assigned'}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(vehicle.status)}`}>
                                        {vehicle.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                                        <MapPin className="w-4 h-4 mr-2" />
                                        {vehicle.origin || 'Depot'} → {vehicle.destination || 'Unknown'}
                                    </div>
                                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                                        <Clock className="w-4 h-4 mr-2" />
                                        ETA: {vehicle.eta || (vehicle.status === 'in-transit' ? 'Calculating...' : '-')}
                                    </div>
                                </div>

                                {vehicle.status === 'in-transit' && (
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span>Load: {vehicle.current_load} kg</span>
                                            <span>{Math.round((vehicle.current_load / vehicle.capacity) * 100)}% Capacity</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                                className="bg-hydrogen-500 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${(vehicle.current_load / vehicle.capacity) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.div>
            <RouteSimulator isOpen={isSimulatorOpen} onClose={() => setIsSimulatorOpen(false)} />

        </div>
    );
};

export default Transport;
