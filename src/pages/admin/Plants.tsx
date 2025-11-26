import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Wind, Droplets, MapPin, Activity, Wrench, XCircle, TrendingUp, Zap, Factory, DollarSign, Battery } from 'lucide-react';

interface PlantData {
    _id?: string;
    plant_id?: string;
    plant_name?: string;
    name?: string;
    location?: {
        city?: string;
        state?: string;
        country?: string;
        coordinates?: { lat: number; lng: number };
    } | string;
    status?: string;
    capacity?: number;
    productionCost?: number;
    lcoh: number;
    efficiency?: number;
    energyMix?: {
        solar: number;
        wind: number;
        hydro: number;
    };
    renewableEnergy?: {
        solar: number;
        wind: number;
        hydro: number;
    };
    mlPredictions?: {
        profit_prediction?: any;
    };
}

const Plants = () => {
    const [plants, setPlants] = useState<PlantData[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('lcoh');

    useEffect(() => {
        fetchPlants();
    }, []);

    const fetchPlants = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/plants/with-ml');
            const data = await response.json();
            if (data.success && data.plants) {
                setPlants(data.plants);
            }
        } catch (error) {
            console.error('Error fetching plants:', error);
        } finally {
            setLoading(false);
        }
    };

    const getLocationString = (location: any) => {
        if (typeof location === 'object' && location?.city) {
            return { city: location.city, state: location.state || '' };
        }
        return { city: location || 'Unknown', state: '' };
    };

    const getStatusBadge = (status: string = 'active') => {
        const styles = {
            active: 'bg-green-500/20 text-green-600 border-green-500',
            maintenance: 'bg-yellow-500/20 text-yellow-600 border-yellow-500',
            offline: 'bg-red-500/20 text-red-600 border-red-500'
        };
        return styles[status as keyof typeof styles] || styles.active;
    };

    const getStatusIcon = (status: string = 'active') => {
        switch (status) {
            case 'active':
                return <Activity className="w-4 h-4 text-green-600" />;
            case 'maintenance':
                return <Wrench className="w-4 h-4 text-yellow-600" />;
            default:
                return <XCircle className="w-4 h-4 text-red-600" />;
        }
    };

    const filteredPlants = plants.filter(plant => {
        if (filter === 'all') return true;
        const hasEnergy = plant.energyMix?.[filter as 'solar' | 'wind' | 'hydro'];
        return hasEnergy && hasEnergy > 0;
    });

    const sortedPlants = [...filteredPlants].sort((a, b) => {
        switch (sortBy) {
            case 'lcoh':
                return a.lcoh - b.lcoh;
            case 'capacity':
                return (b.capacity || 0) - (a.capacity || 0);
            case 'efficiency':
                return (b.efficiency || 0) - (a.efficiency || 0);
            default:
                return 0;
        }
    });

    // Calculate network statistics
    const totalCapacity = plants.reduce((sum, p) => sum + (p.capacity || 0), 0);
    const avgEfficiency = plants.length > 0
        ? plants.reduce((sum, p) => sum + (p.efficiency || 0), 0) / plants.length
        : 0;
    const bestLcoh = Math.min(...plants.map(p => p.lcoh));

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-hydrogen-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading plant network...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="section-padding min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold gradient-text mb-2">Production Plants Network</h1>
                    <p className="text-gray-600 dark:text-gray-300">
                        {plants.length} world-class green hydrogen production facilities across India
                    </p>
                </div>

                {/* Network Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="card-glass p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Factory className="w-8 h-8 text-hydrogen-500" />
                            <span className="text-xs text-gray-500">Total Capacity</span>
                        </div>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{totalCapacity} TPD</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Network Production</p>
                    </div>
                    <div className="card-glass p-6">
                        <div className="flex items-center justify-between mb-2">
                            <TrendingUp className="w-8 h-8 text-green-500" />
                            <span className="text-xs text-gray-500">Avg Efficiency</span>
                        </div>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{(avgEfficiency * 100).toFixed(0)}%</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Operational Excellence</p>
                    </div>
                    <div className="card-glass p-6">
                        <div className="flex items-center justify-between mb-2">
                            <DollarSign className="w-8 h-8 text-blue-500" />
                            <span className="text-xs text-gray-500">Best LCOH</span>
                        </div>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">${bestLcoh.toFixed(2)}/kg</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Industry Leading</p>
                    </div>
                </div>

                {/* Filters & Sorting */}
                <div className="flex flex-wrap gap-4 mb-6 items-center">
                    <div className="flex gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 self-center">Energy Source:</span>
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'all'
                                ? 'bg-hydrogen-500 text-white shadow-lg'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('solar')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${filter === 'solar'
                                ? 'bg-yellow-500 text-white shadow-lg'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                                }`}
                        >
                            <Sun className="w-4 h-4" /> Solar
                        </button>
                        <button
                            onClick={() => setFilter('wind')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${filter === 'wind'
                                ? 'bg-cyan-500 text-white shadow-lg'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                                }`}
                        >
                            <Wind className="w-4 h-4" /> Wind
                        </button>
                        <button
                            onClick={() => setFilter('hydro')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${filter === 'hydro'
                                ? 'bg-blue-500 text-white shadow-lg'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                                }`}
                        >
                            <Droplets className="w-4 h-4" /> Hydro
                        </button>
                    </div>

                    <div className="flex gap-2 ml-auto">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 self-center">Sort by:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-none focus:ring-2 focus:ring-hydrogen-500"
                        >
                            <option value="lcoh">LCOH (Low to High)</option>
                            <option value="capacity">Capacity (High to Low)</option>
                            <option value="efficiency">Efficiency (High to Low)</option>
                        </select>
                    </div>
                </div>

                {/* Plant Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedPlants.map((plant, index) => {
                        const loc = getLocationString(plant.location);
                        return (
                            <motion.div
                                key={plant.plant_id || plant._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="card-glass p-6 hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer group"
                            >
                                {/* Plant Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-hydrogen-500 transition-colors">
                                            {plant.plant_name || plant.name}
                                        </h3>
                                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                            <MapPin className="w-4 h-4 mr-1" />
                                            {loc.city}{loc.state && `, ${loc.state}`}
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full border text-xs font-medium flex items-center gap-1 ${getStatusBadge(plant.status)}`}>
                                        {getStatusIcon(plant.status)}
                                        {plant.status || 'active'}
                                    </div>
                                </div>

                                {/* LCOH Badge */}
                                <div className="bg-gradient-to-r from-hydrogen-500 to-green-500 text-white p-4 rounded-xl mb-4 text-center shadow-lg">
                                    <div className="text-3xl font-bold">${plant.lcoh.toFixed(2)}/kg</div>
                                    <div className="text-xs opacity-90 mt-1">Levelized Cost of H₂</div>
                                </div>

                                {/* Capacity & Efficiency */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Battery className="w-4 h-4 text-green-600" />
                                            <span className="text-xs text-gray-600 dark:text-gray-400">Capacity</span>
                                        </div>
                                        <div className="text-2xl font-bold text-green-600">{plant.capacity || 0}</div>
                                        <div className="text-xs text-gray-500">TPD</div>
                                    </div>
                                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                                        <div className="flex items-center gap-2 mb-1">
                                            <TrendingUp className="w-4 h-4 text-purple-600" />
                                            <span className="text-xs text-gray-600 dark:text-gray-400">Efficiency</span>
                                        </div>
                                        <div className="text-2xl font-bold text-purple-600">
                                            {((plant.efficiency || 0) * 100).toFixed(0)}%
                                        </div>
                                        <div className="text-xs text-gray-500">Operational</div>
                                    </div>
                                </div>

                                {/* Energy Mix */}
                                {plant.energyMix && (
                                    <div className="mb-4">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Energy Sources</p>
                                        <div className="space-y-2">
                                            {plant.energyMix.solar > 0 && (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Sun className="w-4 h-4 text-yellow-500" />
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">Solar</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-20 h-2 bg-gray-200 dark:bg-gray-600 rounded-full">
                                                            <div
                                                                className="h-full bg-yellow-500 rounded-full"
                                                                style={{ width: `${plant.energyMix.solar}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm font-bold w-10 text-right text-yellow-600">
                                                            {plant.energyMix.solar}%
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                            {plant.energyMix.wind > 0 && (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Wind className="w-4 h-4 text-cyan-500" />
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">Wind</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-20 h-2 bg-gray-200 dark:bg-gray-600 rounded-full">
                                                            <div
                                                                className="h-full bg-cyan-500 rounded-full"
                                                                style={{ width: `${plant.energyMix.wind}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm font-bold w-10 text-right text-cyan-600">
                                                            {plant.energyMix.wind}%
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                            {plant.energyMix.hydro > 0 && (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Droplets className="w-4 h-4 text-blue-500" />
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">Hydro</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-20 h-2 bg-gray-200 dark:bg-gray-600 rounded-full">
                                                            <div
                                                                className="h-full bg-blue-500 rounded-full"
                                                                style={{ width: `${plant.energyMix.hydro}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm font-bold w-10 text-right text-blue-600">
                                                            {plant.energyMix.hydro}%
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ML Prediction Preview */}
                                {plant.mlPredictions?.profit_prediction && (
                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600 dark:text-gray-400">Daily Profit (ML)</span>
                                            <span className="text-lg font-bold text-green-600">
                                                ${plant.mlPredictions.profit_prediction.daily_profit?.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                {sortedPlants.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500 text-lg">No plants match the selected filter</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Plants;
