import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, TruckIcon, Clock, AlertCircle } from 'lucide-react';
import { transportAPI } from '@/utils/api';

const Transport = () => {
    const [fleet, setFleet] = useState<any[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

    useEffect(() => {
        fetchFleet();
        // Poll for updates every 30 seconds
        const interval = setInterval(fetchFleet, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchFleet = async () => {
        try {
            const res = await transportAPI.getFleet();
            setFleet(res.data);
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
    const totalCapacity = fleet.reduce((sum, v) => sum + v.capacity, 0);
    const totalLoad = fleet.reduce((sum, v) => sum + (v.currentLoad || 0), 0);

    return (
        <div className="max-w-7xl mx-auto section-padding">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-4xl font-bold gradient-text mb-8">Transport & Logistics</h1>

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
                        <div className="h-96 rounded-lg bg-gray-200 dark:bg-gray-800 overflow-hidden relative">
                            <iframe
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                loading="lazy"
                                allowFullScreen
                                referrerPolicy="no-referrer-when-downgrade"
                                src={(() => {
                                    const apiKey = 'AIzaSyDyaStNd9U3Q0BF4tDi-URy8ez19VpN57U';
                                    if (!selectedVehicle) {
                                        return `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=20.5937,78.9629&zoom=5&maptype=satellite`;
                                    }
                                    if (selectedVehicle.status === 'in-transit' && selectedVehicle.destination) {
                                        return `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${encodeURIComponent(selectedVehicle.origin || 'Mumbai')}&destination=${encodeURIComponent(selectedVehicle.destination)}&mode=driving`;
                                    }
                                    const lat = selectedVehicle.location?.lat || 20.5937;
                                    const lng = selectedVehicle.location?.lng || 78.9629;
                                    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${lat},${lng}&zoom=15&maptype=satellite`;
                                })()}
                            ></iframe>

                            {!selectedVehicle && (
                                <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-black/80 p-3 rounded-lg backdrop-blur-sm text-xs max-w-xs">
                                    <p className="font-bold mb-1">Interactive Fleet Map</p>
                                    <p>Select a vehicle from the list to view its live route or current location.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Fleet List */}
                    <div className="card-glass p-6">
                        <h3 className="text-xl font-bold mb-4">Fleet Status</h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {fleet.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No vehicles found in fleet.</p>
                            ) : (
                                fleet.map((vehicle) => (
                                    <motion.div
                                        key={vehicle._id}
                                        whileHover={{ scale: 1.02 }}
                                        onClick={() => setSelectedVehicle(vehicle)}
                                        className={`p-4 rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition-all ${selectedVehicle?._id === vehicle._id ? 'ring-2 ring-hydrogen-500' : ''
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center space-x-2">
                                                <TruckIcon className="w-5 h-5 text-hydrogen-500" />
                                                <div>
                                                    <h4 className="font-bold">{vehicle.registration}</h4>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">{vehicle.driver}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vehicle.status)}`}>
                                                {vehicle.status}
                                            </span>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">Origin:</span>
                                                <span className="font-medium">{vehicle.origin || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">Destination:</span>
                                                <span className="font-medium">{vehicle.destination || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">Load:</span>
                                                <span className="font-medium">
                                                    {vehicle.currentLoad || 0}/{vehicle.capacity} kg
                                                </span>
                                            </div>
                                            {vehicle.status === 'in-transit' && (
                                                <div className="flex items-center justify-between text-hydrogen-500">
                                                    <div className="flex items-center space-x-1">
                                                        <Clock className="w-4 h-4" />
                                                        <span>ETA:</span>
                                                    </div>
                                                    <span className="font-bold">{vehicle.eta || 'Calculating...'}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Progress bar for in-transit vehicles */}
                                        {vehicle.status === 'in-transit' && (
                                            <div className="mt-3">
                                                <div className="flex items-center justify-between text-xs mb-1">
                                                    <span className="text-gray-500">Progress</span>
                                                    <span className="font-medium">{vehicle.progress || 0}%</span>
                                                </div>
                                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-hydrogen-500"
                                                        style={{ width: `${vehicle.progress || 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Alerts */}
                <div className="mt-8 card-glass p-6">
                    <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                        <span>Recent Alerts & Delays</span>
                    </h3>
                    <div className="space-y-2">
                        <div className="p-3 bg-yellow-500/10 rounded-lg text-sm">
                            <span className="font-medium">System:</span> Real-time fleet tracking active.
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Transport;
