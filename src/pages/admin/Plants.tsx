import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Wind, Droplets, MapPin, Activity, Wrench, XCircle, TrendingUp, Zap } from 'lucide-react';
import { plantAPI } from '@/utils/api';

interface Plant {
    _id: string;
    name: string;
    location: {
        city: string;
        state: string;
        coordinates: {
            lat: number;
            lng: number;
        };
    };
    capacity: number;
    currentProduction: number;
    status: string;
    energySources: {
        solar: { installed: number; current: number };
        wind: { installed: number; current: number };
        hydro: { installed: number; current: number };
    };
    totalEnergyCapacity: number;
    currentEnergyMix: {
        solar: number;
        wind: number;
        hydro: number;
    };
    lcoh: number;
}

const Plants = () => {
    const [plants, setPlants] = useState<Plant[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlants();
    }, []);

    const fetchPlants = async () => {
        try {
            const response = await plantAPI.getAll();
            setPlants(response.data);
        } catch (error) {
            console.error('Error fetching plants:', error);
            // Fallback mock data
            setPlants([
                {
                    _id: '1',
                    name: 'Gujarat Solar Plant',
                    location: { city: 'Ahmedabad', state: 'Gujarat', coordinates: { lat: 23.0225, lng: 72.5714 } },
                    capacity: 50,
                    currentProduction: 42,
                    status: 'active',
                    energySources: {
                        solar: { installed: 25, current: 22 },
                        wind: { installed: 10, current: 8 },
                        hydro: { installed: 0, current: 0 }
                    },
                    totalEnergyCapacity: 35,
                    currentEnergyMix: { solar: 73, wind: 27, hydro: 0 },
                    lcoh: 1.8
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active':
                return <Activity className="w-5 h-5 text-green-500" />;
            case 'maintenance':
                return <Wrench className="w-5 h-5 text-yellow-500" />;
            default:
                return <XCircle className="w-5 h-5 text-red-500" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            active: 'bg-green-500/20 text-green-500 border-green-500',
            maintenance: 'bg-yellow-500/20 text-yellow-500 border-yellow-500',
            offline: 'bg-red-500/20 text-red-500 border-red-500'
        };
        return styles[status as keyof typeof styles] || styles.offline;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-hydrogen-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading plants...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="section-padding">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold gradient-text mb-2">Hydrogen Production Plants</h1>
                    <p className="text-gray-600 dark:text-gray-300">
                        Manage and monitor our network of {plants.length} green hydrogen production facilities
                    </p>
                </div>

                {/* Plant Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plants.map((plant, index) => (
                        <motion.div
                            key={plant._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="card-glass p-6 hover:scale-105 transition-transform cursor-pointer"
                        >
                            {/* Plant Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                                        {plant.name}
                                    </h3>
                                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                        <MapPin className="w-4 h-4 mr-1" />
                                        {plant.location.city}, {plant.location.state}
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full border text-xs font-medium flex items-center gap-1 ${getStatusBadge(plant.status)}`}>
                                    {getStatusIcon(plant.status)}
                                    {plant.status}
                                </div>
                            </div>

                            {/* Production Stats */}
                            <div className="mb-4">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-600 dark:text-gray-300">Production</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {plant.currentProduction}/{plant.capacity} TPD
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-hydrogen-500 to-green-500"
                                        style={{ width: `${(plant.currentProduction / plant.capacity) * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Energy Mix */}
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Energy Mix</p>
                                <div className="flex gap-3">
                                    {plant.currentEnergyMix.solar > 0 && (
                                        <div className="flex items-center gap-1 text-sm">
                                            <Sun className="w-4 h-4 text-yellow-500" />
                                            <span className="text-gray-900 dark:text-white">{plant.currentEnergyMix.solar}%</span>
                                        </div>
                                    )}
                                    {plant.currentEnergyMix.wind > 0 && (
                                        <div className="flex items-center gap-1 text-sm">
                                            <Wind className="w-4 h-4 text-blue-500" />
                                            <span className="text-gray-900 dark:text-white">{plant.currentEnergyMix.wind}%</span>
                                        </div>
                                    )}
                                    {plant.currentEnergyMix.hydro > 0 && (
                                        <div className="flex items-center gap-1 text-sm">
                                            <Droplets className="w-4 h-4 text-cyan-500" />
                                            <span className="text-gray-900 dark:text-white">{plant.currentEnergyMix.hydro}%</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Key Metrics */}
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">LCOH</p>
                                    <p className="text-lg font-bold text-hydrogen-500">${plant.lcoh}/kg</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Capacity</p>
                                    <p className="text-lg font-bold text-green-500 flex items-center gap-1">
                                        <Zap className="w-4 h-4" />
                                        {plant.totalEnergyCapacity} MW
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Plants;
