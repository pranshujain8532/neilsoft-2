import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Wind, Droplets, MapPin, Activity, Wrench, XCircle, TrendingUp, Zap, Factory, DollarSign, Battery, Cloud, Thermometer, Info, X } from 'lucide-react';

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
    mlPredictions?: {
        profit_prediction?: any;
        weather?: {
            temperature?: number;
            humidity?: number;
            wind_speed?: number;
            solar_irradiance?: number;
            description?: string;
        };
        safety_status?: any;
    };
}

const Plants = () => {
    const [plants, setPlants] = useState<PlantData[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('lcoh');
    const [selectedPlant, setSelectedPlant] = useState<PlantData | null>(null);

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
        // Ensure values are numbers for sorting
        const getVal = (p: PlantData, key: 'lcoh' | 'capacity' | 'efficiency') => {
            const val = p[key];
            return typeof val === 'number' ? val : 0;
        };

        switch (sortBy) {
            case 'lcoh':
                return getVal(a, 'lcoh') - getVal(b, 'lcoh');
            case 'capacity':
                return getVal(b, 'capacity') - getVal(a, 'capacity');
            case 'efficiency':
                return getVal(b, 'efficiency') - getVal(a, 'efficiency');
            default:
                return 0;
        }
    });

    // Calculate network statistics
    const totalCapacity = plants.reduce((sum, p) => sum + (p.capacity || 0), 0);
    const avgEfficiency = plants.length > 0
        ? plants.reduce((sum, p) => sum + (p.efficiency || 0), 0) / plants.length
        : 0;
    const bestLcoh = plants.length > 0 ? Math.min(...plants.map(p => p.lcoh || 999)) : 0;

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
                        const weather = plant.mlPredictions?.weather;

                        return (
                            <motion.div
                                key={plant.plant_id || plant._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                onClick={() => setSelectedPlant(plant)}
                                className="card-glass p-6 hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden"
                            >
                                {/* Hover Overlay Hint */}
                                <div className="absolute inset-0 bg-hydrogen-500/0 group-hover:bg-hydrogen-500/5 transition-colors duration-300" />

                                {/* Plant Header */}
                                <div className="flex justify-between items-start mb-4 relative z-10">
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

                                {/* Weather Summary on Card */}
                                {weather && (
                                    <div className="flex items-center gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                                        <div className="flex items-center gap-1">
                                            <Thermometer className="w-4 h-4 text-orange-500" />
                                            <span>{weather.temperature?.toFixed(1)}°C</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Wind className="w-4 h-4 text-blue-400" />
                                            <span>{weather.wind_speed?.toFixed(1)} m/s</span>
                                        </div>
                                        {weather.description && (
                                            <div className="flex items-center gap-1 ml-auto capitalize">
                                                <Cloud className="w-4 h-4 text-gray-400" />
                                                <span>{weather.description}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* LCOH Badge */}
                                <div className="bg-gradient-to-r from-hydrogen-500 to-green-500 text-white p-4 rounded-xl mb-4 text-center shadow-lg relative z-10">
                                    <div className="text-3xl font-bold">${plant.lcoh.toFixed(2)}/kg</div>
                                    <div className="text-xs opacity-90 mt-1">Levelized Cost of H₂</div>
                                </div>

                                {/* Capacity & Efficiency */}
                                <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
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
                                    <div className="mb-4 relative z-10">
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
                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700 relative z-10">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600 dark:text-gray-400">Daily Profit (ML)</span>
                                            <span className="text-lg font-bold text-green-600">
                                                ${plant.mlPredictions.profit_prediction.daily_profit?.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg">
                                        <Info className="w-5 h-5 text-hydrogen-500" />
                                    </div>
                                </div>
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

            {/* Plant Detail Modal */}
            <AnimatePresence>
                {selectedPlant && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                        >
                            {/* Modal Header */}
                            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                <div>
                                    <h2 className="text-3xl font-bold gradient-text">
                                        {selectedPlant.plant_name || selectedPlant.name}
                                    </h2>
                                    <div className="flex items-center text-gray-600 dark:text-gray-400 mt-1">
                                        <MapPin className="w-4 h-4 mr-1" />
                                        {getLocationString(selectedPlant.location).city}, {getLocationString(selectedPlant.location).state}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedPlant(null)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6 text-gray-500" />
                                </button>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left Column: Stats & Weather */}
                                <div className="space-y-6">
                                    {/* Key Stats */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                                            <div className="text-sm text-gray-500 mb-1">Capacity</div>
                                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {selectedPlant.capacity} TPD
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                                            <div className="text-sm text-gray-500 mb-1">Efficiency</div>
                                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {((selectedPlant.efficiency || 0) * 100).toFixed(0)}%
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                                            <div className="text-sm text-gray-500 mb-1">LCOH</div>
                                            <div className="text-2xl font-bold text-hydrogen-500">
                                                ${selectedPlant.lcoh.toFixed(2)}/kg
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                                            <div className="text-sm text-gray-500 mb-1">Status</div>
                                            <div className="flex items-center gap-2 font-bold capitalize">
                                                {getStatusIcon(selectedPlant.status)}
                                                {selectedPlant.status || 'Active'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Weather Details */}
                                    {selectedPlant.mlPredictions?.weather && (
                                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800">
                                            <h3 className="text-lg font-bold mb-4 flex items-center text-gray-900 dark:text-white">
                                                <Cloud className="w-5 h-5 mr-2 text-blue-500" />
                                                Live Weather Conditions
                                            </h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm">
                                                        <Thermometer className="w-5 h-5 text-orange-500" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-gray-500">Temperature</div>
                                                        <div className="font-bold">{selectedPlant.mlPredictions.weather.temperature?.toFixed(1)}°C</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm">
                                                        <Wind className="w-5 h-5 text-blue-500" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-gray-500">Wind Speed</div>
                                                        <div className="font-bold">{selectedPlant.mlPredictions.weather.wind_speed?.toFixed(1)} m/s</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm">
                                                        <Sun className="w-5 h-5 text-yellow-500" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-gray-500">Irradiance</div>
                                                        <div className="font-bold">{selectedPlant.mlPredictions.weather.solar_irradiance?.toFixed(0)} W/m²</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm">
                                                        <Droplets className="w-5 h-5 text-cyan-500" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-gray-500">Humidity</div>
                                                        <div className="font-bold">{selectedPlant.mlPredictions.weather.humidity}%</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Column: ML & Energy */}
                                <div className="space-y-6">
                                    {/* ML Predictions */}
                                    <div className="bg-purple-50 dark:bg-purple-900/10 p-6 rounded-xl border border-purple-100 dark:border-purple-800">
                                        <h3 className="text-lg font-bold mb-4 flex items-center text-gray-900 dark:text-white">
                                            <TrendingUp className="w-5 h-5 mr-2 text-purple-500" />
                                            ML Profit Forecast
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                                <span className="text-gray-600 dark:text-gray-400">Daily Profit</span>
                                                <span className="text-xl font-bold text-green-600">
                                                    ${selectedPlant.mlPredictions?.profit_prediction?.daily_profit?.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                                <span className="text-gray-600 dark:text-gray-400">Monthly Projection</span>
                                                <span className="text-xl font-bold text-gray-900 dark:text-white">
                                                    ${selectedPlant.mlPredictions?.profit_prediction?.monthly_profit?.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                                <span className="text-gray-600 dark:text-gray-400">H₂ Production</span>
                                                <span className="text-xl font-bold text-blue-600">
                                                    {selectedPlant.mlPredictions?.profit_prediction?.h2_production_kg?.toFixed(0)} kg
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Energy Mix Detail */}
                                    {selectedPlant.energyMix && (
                                        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                                            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Energy Composition</h3>
                                            <div className="space-y-4">
                                                {selectedPlant.energyMix.solar > 0 && (
                                                    <div>
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span className="flex items-center gap-2">
                                                                <Sun className="w-4 h-4 text-yellow-500" /> Solar
                                                            </span>
                                                            <span className="font-bold">{selectedPlant.energyMix.solar}%</span>
                                                        </div>
                                                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div className="h-full bg-yellow-500" style={{ width: `${selectedPlant.energyMix.solar}%` }} />
                                                        </div>
                                                    </div>
                                                )}
                                                {selectedPlant.energyMix.wind > 0 && (
                                                    <div>
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span className="flex items-center gap-2">
                                                                <Wind className="w-4 h-4 text-cyan-500" /> Wind
                                                            </span>
                                                            <span className="font-bold">{selectedPlant.energyMix.wind}%</span>
                                                        </div>
                                                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div className="h-full bg-cyan-500" style={{ width: `${selectedPlant.energyMix.wind}%` }} />
                                                        </div>
                                                    </div>
                                                )}
                                                {selectedPlant.energyMix.hydro > 0 && (
                                                    <div>
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span className="flex items-center gap-2">
                                                                <Droplets className="w-4 h-4 text-blue-500" /> Hydro
                                                            </span>
                                                            <span className="font-bold">{selectedPlant.energyMix.hydro}%</span>
                                                        </div>
                                                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-500" style={{ width: `${selectedPlant.energyMix.hydro}%` }} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Plants;
