import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Factory, Zap, DollarSign, Battery, Sun, Wind, Droplet, TrendingUp, Activity, MapPin, AlertCircle } from 'lucide-react';

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
    weather?: any;
    energy_output?: any;
    mlPredictions?: {
        profit_prediction?: any;
        weather?: any;
        energy_output?: any;
        safety_status?: any;
    };
    profit_prediction?: any;
    safety_status?: any;
}

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [plants, setPlants] = useState<PlantData[]>([]);
    const [lastUpdate, setLastUpdate] = useState<string>('');
    const [totalStats, setTotalStats] = useState({
        totalProduction: 0,
        avgLcoh: 0,
        totalProfit: 0,
        activePlants: 0
    });

    // Fetch comprehensive plant data with ML predictions
    const fetchPlantPredictions = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/plants/with-ml');
            const data = await response.json();

            if (data.success && data.plants) {
                setPlants(data.plants);

                // Use aggregate stats from backend
                setTotalStats({
                    totalProduction: data.stats.totalCapacity * 1000, // Convert TPD to kg/day
                    avgLcoh: data.stats.avgLcoh,
                    totalProfit: data.plants.reduce((sum: number, p: PlantData) =>
                        sum + (p.mlPredictions?.profit_prediction?.daily_profit || 0), 0),
                    activePlants: data.stats.activePlants
                });

                setLastUpdate(new Date().toLocaleTimeString());
                setLoading(false);
            }
        } catch (error) {
            console.error('Error fetching plant data:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlantPredictions();
        const interval = setInterval(fetchPlantPredictions, 30000); // Update every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-hydrogen-500 mx-auto mb-4" />
                    <p className="text-gray-600">Loading plant network...</p>
                </div>
            </div>
        );
    }

    const getLocationString = (location: any) => {
        if (typeof location === 'object' && location?.city) {
            return `${location.city}, ${location.state || ''}`;
        }
        return location || 'Unknown';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 section-padding">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-7xl mx-auto"
            >
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold gradient-text mb-2">H2-OptiPlant Network</h1>
                        <p className="text-gray-600 dark:text-gray-400">6 Plants • Real-time ML Predictions • India-wide Coverage</p>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Activity className="w-4 h-4 animate-pulse text-green-500" />
                        <span>Updated: {lastUpdate}</span>
                    </div>
                </div>

                {/* Total Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="card-glass p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Zap className="w-8 h-8 text-hydrogen-500" />
                        </div>
                        <h3 className="text-2xl font-bold">{totalStats.totalProduction.toFixed(0)} kg/day</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total H₂ Capacity</p>
                    </div>
                    <div className="card-glass p-6">
                        <div className="flex items-center justify-between mb-2">
                            <DollarSign className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-2xl font-bold">${totalStats.avgLcoh.toFixed(2)}/kg</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Average LCOH</p>
                    </div>
                    <div className="card-glass p-6">
                        <div className="flex items-center justify-between mb-2">
                            <TrendingUp className="w-8 h-8 text-blue-500" />
                        </div>
                        <h3 className="text-2xl font-bold">${totalStats.totalProfit.toLocaleString()}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">ML Daily Profit</p>
                    </div>
                    <div className="card-glass p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Factory className="w-8 h-8 text-purple-500" />
                        </div>
                        <h3 className="text-2xl font-bold">{totalStats.activePlants}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Active Plants</p>
                    </div>
                </div>

                {/* Per-Plant Cards */}
                <div className="space-y-6">
                    {plants.map((plant, idx) => (
                        <motion.div
                            key={plant.plant_id || plant._id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="card-glass p-6"
                        >
                            {/* Plant Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-hydrogen-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
                                        <Factory className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {plant.plant_name || plant.name}
                                        </h2>
                                        <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            <div className="flex items-center">
                                                <MapPin className="w-3.5 h-3.5 mr-1" />
                                                <span>{getLocationString(plant.location)}</span>
                                            </div>
                                            {plant.capacity && (
                                                <>
                                                    <span>•</span>
                                                    <div className="flex items-center text-green-600 dark:text-green-400 font-medium">
                                                        <Battery className="w-3.5 h-3.5 mr-1" />
                                                        {plant.capacity} TPD
                                                    </div>
                                                </>
                                            )}
                                            {plant.efficiency && (
                                                <>
                                                    <span>•</span>
                                                    <div className="flex items-center text-purple-600 dark:text-purple-400 font-medium">
                                                        <TrendingUp className="w-3.5 h-3.5 mr-1" />
                                                        {(plant.efficiency * 100).toFixed(0)}% Efficient
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold gradient-text">${plant.lcoh.toFixed(2)}/kg</div>
                                    <div className="text-xs text-gray-500 mt-1">LCOH</div>
                                </div>
                            </div>

                            {/* Energy Mix Visualization */}
                            {plant.energyMix && (
                                <div className="bg-gradient-to-r from-yellow-50 via-cyan-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 p-4 rounded-xl mb-6 border border-gray-200 dark:border-gray-600">
                                    <h3 className="font-bold mb-3 flex items-center text-gray-900 dark:text-white">
                                        <Zap className="w-4 h-4 mr-2 text-green-500" />
                                        Renewable Energy Mix
                                    </h3>
                                    <div className="space-y-3">
                                        {plant.energyMix.solar > 0 && (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2 w-24">
                                                    <Sun className="w-4 h-4 text-yellow-500" />
                                                    <span className="text-sm font-medium">Solar</span>
                                                </div>
                                                <div className="flex items-center space-x-3 flex-1">
                                                    <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all duration-500"
                                                            style={{ width: `${plant.energyMix.solar}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-bold w-12 text-right text-yellow-600 dark:text-yellow-400">
                                                        {plant.energyMix.solar}%
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        {plant.energyMix.wind > 0 && (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2 w-24">
                                                    <Wind className="w-4 h-4 text-cyan-500" />
                                                    <span className="text-sm font-medium">Wind</span>
                                                </div>
                                                <div className="flex items-center space-x-3 flex-1">
                                                    <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 transition-all duration-500"
                                                            style={{ width: `${plant.energyMix.wind}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-bold w-12 text-right text-cyan-600 dark:text-cyan-400">
                                                        {plant.energyMix.wind}%
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        {plant.energyMix.hydro > 0 && (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2 w-24">
                                                    <Droplet className="w-4 h-4 text-blue-500" />
                                                    <span className="text-sm font-medium">Hydro</span>
                                                </div>
                                                <div className="flex items-center space-x-3 flex-1">
                                                    <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
                                                            style={{ width: `${plant.energyMix.hydro}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-bold w-12 text-right text-blue-600 dark:text-blue-400">
                                                        {plant.energyMix.hydro}%
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ML Predictions & Live Data Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* ML Predictions */}
                                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-5 rounded-xl border border-purple-200 dark:border-purple-900">
                                    <h3 className="font-bold mb-4 flex items-center text-gray-900 dark:text-white">
                                        <TrendingUp className="w-5 h-5 mr-2 text-purple-500" />
                                        ML Profit Predictions
                                    </h3>
                                    <div className="space-y-3 text-sm">
                                        {plant.mlPredictions?.profit_prediction || plant.profit_prediction ? (
                                            <>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-400">H₂ Production:</span>
                                                    <span className="font-bold text-gray-900 dark:text-white">
                                                        {(plant.mlPredictions?.profit_prediction?.h2_production_kg || plant.profit_prediction?.h2_production_kg || 0).toFixed(0)} kg
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-400">Daily Profit:</span>
                                                    <span className="font-bold text-green-600 dark:text-green-400">
                                                        ${(plant.mlPredictions?.profit_prediction?.daily_profit || plant.profit_prediction?.daily_profit || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-400">Monthly Profit:</span>
                                                    <span className="font-bold text-gray-900 dark:text-white">
                                                        ${(plant.mlPredictions?.profit_prediction?.monthly_profit || plant.profit_prediction?.monthly_profit || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-400">Profit Margin:</span>
                                                    <span className="font-bold text-purple-600 dark:text-purple-400">
                                                        {plant.mlPredictions?.profit_prediction?.profit_margin || plant.profit_prediction?.profit_margin || 0}%
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center text-gray-500 py-6">
                                                <Activity className="w-10 h-10 mx-auto mb-2 animate-pulse" />
                                                <p className="text-xs">Computing ML predictions...</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Safety Status */}
                                <div className={`p-5 rounded-xl border-2 ${(plant.mlPredictions?.safety_status?.status || plant.safety_status?.status) === 'optimal'
                                        ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700'
                                        : 'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700'
                                    }`}>
                                    <h3 className="font-bold mb-4 flex items-center text-gray-900 dark:text-white">
                                        <AlertCircle className={`w-5 h-5 mr-2 ${(plant.mlPredictions?.safety_status?.status || plant.safety_status?.status) === 'optimal'
                                                ? 'text-green-600'
                                                : 'text-yellow-600'
                                            }`} />
                                        Safety & Monitoring
                                    </h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600 dark:text-gray-400">Status:</span>
                                            <span className="font-bold capitalize text-gray-900 dark:text-white">
                                                {plant.mlPredictions?.safety_status?.status || plant.safety_status?.status || 'Monitoring'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600 dark:text-gray-400">Anomaly Score:</span>
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {(plant.mlPredictions?.safety_status?.anomaly_score || plant.safety_status?.anomaly_score || 0).toFixed(3)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600 dark:text-gray-400">AI Confidence:</span>
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {((plant.mlPredictions?.safety_status?.confidence || plant.safety_status?.confidence || 0) * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Footer Info */}
                <div className="mt-10 card-glass p-6 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        🤖 Powered by Advanced ML: Profit Optimization (Deep Learning) • Safety Monitoring (Physics-Informed NN) • Real-time Analytics
                    </p>
                    <p className="text-xs text-gray-500">
                        Network Capacity: {totalStats.totalProduction.toFixed(0)} kg/day H₂ • Auto-updates every 30s • All 6 plants operational
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Dashboard;
