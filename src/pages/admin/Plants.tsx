import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Wrench, XCircle, MapPin, TrendingUp, Zap } from 'lucide-react';
import { plantAPI } from '@/utils/api';

interface Plant {
    id: string;
    name: string;
    location: {
        city?: string;
        state?: string;
        coordinates?: {
            lat: number;
            lng: number;
        };
    };
    capacity: number;
    current_production?: number;
    status: string;
    efficiency?: number;
    created_at?: string;
    latitude?: number;
    longitude?: number;
    capacity_mw?: number;
    efficiency_percent?: number;
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
            if (response.data) {
                // Map DB fields to UI fields if necessary
                const mappedPlants = response.data.map((p: any) => ({
                    ...p,
                    capacity: p.capacity_mw || p.capacity,
                    efficiency: p.efficiency_percent || p.efficiency,
                    location: {
                        city: p.name.split(' ')[0], // Simple inference
                        state: 'India',
                        coordinates: {
                            lat: p.latitude || 23.0,
                            lng: p.longitude || 72.0
                        }
                    }
                }));
                setPlants(mappedPlants);
            }
        } catch (error) {
            console.error('Error fetching plants:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active':
            case 'operational':
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
            operational: 'bg-green-500/20 text-green-500 border-green-500',
            maintenance: 'bg-yellow-500/20 text-yellow-500 border-yellow-500',
            offline: 'bg-red-500/20 text-red-500 border-red-500'
        };
        return styles[status.toLowerCase() as keyof typeof styles] || styles.offline;
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
                            key={plant.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="card-glass p-6 hover:border-hydrogen-500 transition-colors"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold mb-1">{plant.name}</h3>
                                    <div className="flex items-center text-sm text-gray-500">
                                        <MapPin className="w-4 h-4 mr-1" />
                                        <span>{plant.location.city}, {plant.location.state}</span>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(plant.status)} flex items-center gap-2`}>
                                    {getStatusIcon(plant.status)}
                                    {plant.status}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-500">Production</span>
                                        <span className="font-medium">{plant.current_production || 0}/{plant.capacity} TPD</span>
                                    </div>
                                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-hydrogen-500"
                                            style={{ width: `${((plant.current_production || 0) / plant.capacity) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Efficiency</p>
                                        <div className="flex items-center">
                                            <TrendingUp className="w-4 h-4 text-blue-500 mr-1" />
                                            <p className="text-xl font-bold text-blue-500">{plant.efficiency || 0}%</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Capacity</p>
                                        <div className="flex items-center">
                                            <Zap className="w-4 h-4 text-green-500 mr-1" />
                                            <p className="text-xl font-bold text-green-500">{plant.capacity} TPD</p>
                                        </div>
                                    </div>
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
