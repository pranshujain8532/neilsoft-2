import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Factory, Zap, DollarSign, Battery, Sun, Wind, Droplet, TrendingUp, Activity, MapPin, AlertCircle } from 'lucide-react';

interface PlantData {
    plant_id: string;
    plant_name: string;
    location: string;
    weather: any;
    energy_output: any;
    profit_prediction: any;
    safety_status: any;
    lcoh: number;
    forecast?: any;
    next_day_prediction?: any;
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

    // Fetch per-plant ML predictions
    const fetchPlantPredictions = async () => {
        try {
            const response = await fetch('http://localhost:5001/api/plants/predictions');
            const data = await response.json();

            if (data.success && data.plants) {
                setPlants(data.plants);

                // Calculate totals
                const totalH2 = data.plants.reduce((sum: number, p: PlantData) =>
                    sum + (p.profit_prediction?.h2_production_kg || 0), 0);
                const avgLcoh = data.plants.reduce((sum: number, p: PlantData) =>
                    sum + p.lcoh, 0) / data.plants.length;
                const totalProfit = data.plants.reduce((sum: number, p: PlantData) =>
                    sum + (p.profit_prediction?.daily_profit || 0), 0);

                setTotalStats({
                    totalProduction: totalH2,
                    avgLcoh: avgLcoh,
                    totalProfit: totalProfit,
                    activePlants: data.plants.length
                });

                setLastUpdate(new Date().toLocaleTimeString());
                setLoading(false);
            }
        } catch (error) {
            console.error('Error fetching plant predictions:', error);
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
                    <p className="text-gray-600">Loading ML predictions...</p>
                </div>
            </div>
        );
    }

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
                        <h1 className="text-4xl font-bold gradient-text mb-2">Multi-Plant Dashboard</h1>
                        <p className="text-gray-600 dark:text-gray-400">Real-time ML predictions from all hydrogen plants</p>
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
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total H₂ Production</p>
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
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Daily Profit</p>
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
                <div className="space-y-8">
                    {plants.map((plant, idx) => (
                        <motion.div
                            key={plant.plant_id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="card-glass p-6"
                        >
                            {/* Plant Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-hydrogen-500 to-green-500 rounded-lg flex items-center justify-center">
                                        <Factory className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold">{plant.plant_name}</h2>
                                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                            <MapPin className="w-3 h-3 mr-1" />
                                            {plant.location}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold gradient-text">${plant.lcoh.toFixed(2)}/kg</div>
                                    <div className="text-xs text-gray-500">LCOH</div>
                                </div>
                            </div>

                            {/* Weather & Energy Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                                {/* Weather */}
                                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-700 p-4 rounded-lg">
                                    <h3 className="font-bold mb-3 flex items-center">
                                        <Activity className="w-4 h-4 mr-2 text-blue-500" />
                                        Live Weather
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Temperature:</span>
                                            <span className="font-bold">{plant.weather?.temperature?.toFixed(1)}°C</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Solar:</span>
                                            <span className="font-bold text-yellow-600">{plant.weather?.solar_irradiance?.toFixed(0)} W/m²</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Wind:</span>
                                            <span className="font-bold text-cyan-600">{plant.weather?.wind_speed?.toFixed(1)} m/s</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Humidity:</span>
                                            <span className="font-bold">{plant.weather?.humidity}%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Energy Output */}
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 p-4 rounded-lg">
                                    <h3 className="font-bold mb-3 flex items-center">
                                        <Zap className="w-4 h-4 mr-2 text-green-500" />
                                        Energy Output
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="flex items-center text-gray-600 dark:text-gray-400">
                                                <Sun className="w-3 h-3 mr-1 text-yellow-500" />
                                                Solar:
                                            </span>
                                            <span className="font-bold">{plant.energy_output?.solar} MW</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="flex items-center text-gray-600 dark:text-gray-400">
                                                <Wind className="w-3 h-3 mr-1 text-cyan-500" />
                                                Wind:
                                            </span>
                                            <span className="font-bold">{plant.energy_output?.wind} MW</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="flex items-center text-gray-600 dark:text-gray-400">
                                                <Droplet className="w-3 h-3 mr-1 text-blue-500" />
                                                Hydro:
                                            </span>
                                            <span className="font-bold">{plant.energy_output?.hydro} MW</span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-gray-300 dark:border-gray-600">
                                            <span className="text-gray-600 dark:text-gray-400">Total:</span>
                                            <span className="font-bold text-green-600">{plant.energy_output?.total} MW</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Capacity:</span>
                                            <span className="font-bold">{plant.energy_output?.capacity_factor}%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* ML Predictions */}
                                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-4 rounded-lg">
                                    <h3 className="font-bold mb-3 flex items-center">
                                        <TrendingUp className="w-4 h-4 mr-2 text-purple-500" />
                                        ML Predictions
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">H₂ Production:</span>
                                            <span className="font-bold">{plant.profit_prediction?.h2_production_kg?.toFixed(0)} kg</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Daily Profit:</span>
                                            <span className="font-bold text-green-600">${plant.profit_prediction?.daily_profit?.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Monthly:</span>
                                            <span className="font-bold">${plant.profit_prediction?.monthly_profit?.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Margin:</span>
                                            <span className="font-bold">{plant.profit_prediction?.profit_margin}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">ROI:</span>
                                            <span className="font-bold text-purple-600">{plant.profit_prediction?.roi}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">ML Confidence:</span>
                                            <span className="font-bold">{(plant.profit_prediction?.ml_confidence * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Next Day Forecast */}
                            {plant.forecast && plant.next_day_prediction && (
                                <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                    <h3 className="font-bold mb-3 flex items-center text-indigo-700 dark:text-indigo-300">
                                        <TrendingUp className="w-4 h-4 mr-2" />
                                        Next Day Forecast (Tomorrow)
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <div className="text-gray-500 dark:text-gray-400 text-xs">Condition</div>
                                            <div className="font-bold">{plant.forecast.description}</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-500 dark:text-gray-400 text-xs">Temp (Max/Min)</div>
                                            <div className="font-bold">{plant.forecast.max_temp}° / {plant.forecast.min_temp}°</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-500 dark:text-gray-400 text-xs">Wind Speed</div>
                                            <div className="font-bold">{plant.forecast.wind_speed} km/h</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-500 dark:text-gray-400 text-xs">Predicted Output</div>
                                            <div className="font-bold text-green-600">{plant.next_day_prediction.total} MW</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Safety Status */}
                            <div className={`p-4 rounded-lg border-2 ${plant.safety_status?.status === 'optimal'
                                ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700'
                                : 'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700'
                                }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <AlertCircle className={`w-5 h-5 ${plant.safety_status?.status === 'optimal' ? 'text-green-600' : 'text-yellow-600'
                                            }`} />
                                        <div>
                                            <span className="font-bold">Safety Status: </span>
                                            <span className="capitalize">{plant.safety_status?.status}</span>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Anomaly Score: {plant.safety_status?.anomaly_score?.toFixed(3)}
                                        <span className="ml-2">
                                            (Confidence: {(plant.safety_status?.confidence * 100).toFixed(0)}%)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>



                {/* Plant Locations Map */}
                <div className="card-glass p-6 mb-8">
                    <h3 className="text-xl font-bold mb-4 flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-hydrogen-500" />
                        Live Plant Network
                    </h3>
                    <div className="w-full h-[400px] rounded-lg overflow-hidden relative">
                        <iframe
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                            src={`https://www.google.com/maps/embed/v1/view?key=AIzaSyDyaStNd9U3Q0BF4tDi-URy8ez19VpN57U&center=20.5937,78.9629&zoom=5&maptype=satellite`}
                        ></iframe>

                        {/* Overlay Plant Markers (Simulated Visuals) */}
                        <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/80 p-4 rounded-lg backdrop-blur-sm text-xs">
                            <div className="font-bold mb-2">Active Plants</div>
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                                    Gujarat (Solar)
                                </div>
                                <div className="flex items-center">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                                    Maharashtra (Hybrid)
                                </div>
                                <div className="flex items-center">
                                    <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
                                    Tamil Nadu (Wind)
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-8 card-glass p-6 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        🤖 Powered by ML Models: Profit Prediction (LSTM), Safety Monitoring (PINN), Energy Forecasting
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                        Real-time weather data • Location-specific predictions • Auto-updates every 30 seconds
                    </p>
                </div>
            </motion.div >
        </div >
    );
};

export default Dashboard;
