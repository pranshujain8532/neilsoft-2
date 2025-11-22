import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, TruckIcon, Clock, AlertCircle } from 'lucide-react';

const Transport = () => {
    const [fleet] = useState(getMockFleet());
    const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

    function getMockFleet() {
        return [
            {
                id: '1',
                registration: 'GJ-01-AB-1234',
                capacity: 500,
                currentLoad: 420,
                status: 'in-transit',
                driver: 'Rajesh Kumar',
                origin: 'Gujarat Plant',
                destination: 'Mumbai Refinery',
                eta: '2h 15m',
                location: { lat: 23.0225, lng: 72.5714 },
                progress: 65,
            },
            {
                id: '2',
                registration: 'TN-09-CD-5678',
                capacity: 750,
                currentLoad: 750,
                status: 'in-transit',
                driver: 'Murugan S',
                origin: 'Tamil Nadu Plant',
                destination: 'Chennai Harbor',
                eta: '45m',
                location: { lat: 11.0168, lng: 76.9558 },
                progress: 85,
            },
            {
                id: '3',
                registration: 'KA-03-EF-9012',
                capacity: 600,
                currentLoad: 0,
                status: 'loading',
                driver: 'Kumar Swamy',
                origin: 'Karnataka Plant',
                destination: 'Karnataka Plant',
                eta: 'N/A',
                location: { lat: 12.2958, lng: 76.6394 },
                progress: 0,
            },
            {
                id: '4',
                registration: 'MH-12-GH-3456',
                capacity: 500,
                currentLoad: 500,
                status: 'idle',
                driver: 'Anil Patil',
                origin: 'Mumbai Station',
                destination: 'Mumbai Station',
                eta: 'N/A',
                location: { lat: 19.0760, lng: 72.8777 },
                progress: 100,
            },
        ];
    }

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
    const totalLoad = fleet.reduce((sum, v) => sum + v.currentLoad, 0);

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
                                    if (selectedVehicle.status === 'in-transit') {
                                        return `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${encodeURIComponent(selectedVehicle.origin)}&destination=${encodeURIComponent(selectedVehicle.destination)}&mode=driving`;
                                    }
                                    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${selectedVehicle.location.lat},${selectedVehicle.location.lng}&zoom=15&maptype=satellite`;
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
                            {fleet.map((vehicle) => (
                                <motion.div
                                    key={vehicle.id}
                                    whileHover={{ scale: 1.02 }}
                                    onClick={() => setSelectedVehicle(vehicle)}
                                    className={`p-4 rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition-all ${selectedVehicle?.id === vehicle.id ? 'ring-2 ring-hydrogen-500' : ''
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
                                            <span className="font-medium">{vehicle.origin}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Destination:</span>
                                            <span className="font-medium">{vehicle.destination}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Load:</span>
                                            <span className="font-medium">
                                                {vehicle.currentLoad}/{vehicle.capacity} kg ({((vehicle.currentLoad / vehicle.capacity) * 100).toFixed(0)}%)
                                            </span>
                                        </div>
                                        {vehicle.status === 'in-transit' && (
                                            <div className="flex items-center justify-between text-hydrogen-500">
                                                <div className="flex items-center space-x-1">
                                                    <Clock className="w-4 h-4" />
                                                    <span>ETA:</span>
                                                </div>
                                                <span className="font-bold">{vehicle.eta}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress bar for in-transit vehicles */}
                                    {vehicle.status === 'in-transit' && (
                                        <div className="mt-3">
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="text-gray-500">Progress</span>
                                                <span className="font-medium">{vehicle.progress}%</span>
                                            </div>
                                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-hydrogen-500"
                                                    style={{ width: `${vehicle.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
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
                            <span className="font-medium">GJ-01-AB-1234:</span> Minor delay due to traffic congestion on NH-48. New ETA: 2h 25m
                        </div>
                        <div className="p-3 bg-green-500/10 rounded-lg text-sm">
                            <span className="font-medium">TN-09-CD-5678:</span> On schedule. Expected arrival in 45 minutes.
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Transport;
