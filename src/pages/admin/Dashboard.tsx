import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Factory, Zap, DollarSign, Sun, Wind, Droplet, TrendingUp, Activity, MapPin, AlertCircle, Maximize2 } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import PlantDetailModal from '../../components/PlantDetailModal';

interface PlantData {
    plant_id: string;
    plant_name: string;
    location: string | { city?: string; state?: string };
    coordinates?: { lat: number; lng: number };
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
    const [selectPlant, setSelectedPlant] = useState<PlantData | null>(null);
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
        const interval = setInterval(fetchPlantPredictions, 30000); // 30s updates
        return () => clearInterval(interval);
    }, []);

    // Filter Top 3 Profitable Plants
    const topPlants = [...plants]
        .sort((a, b) => (b.profit_prediction?.daily_profit || 0) - (a.profit_prediction?.daily_profit || 0))
        .slice(0, 3);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 border-4 border-hydrogen-500/30 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-hydrogen-500 border-t-transparent rounded-full animate-spin"></div>
                        <Activity className="absolute inset-0 m-auto w-8 h-8 text-hydrogen-400 animate-pulse" />
                    </div>
                    <p className="text-gray-400 text-lg">Loading ML predictions...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 lg:p-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-7xl mx-auto"
            >
                {/* Header */}
                <div className="mb-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-hydrogen-500/20 to-hydrogen-600/10 border border-hydrogen-500/30">
                            <Activity className="w-8 h-8 text-hydrogen-400" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-hydrogen-200 to-hydrogen-400 bg-clip-text text-transparent">
                                Multi-Plant Dashboard
                            </h1>
                            <p className="text-gray-400 mt-1">
                                Real-time ML predictions from all hydrogen plants
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-400 bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-700/50">
                        <Activity className="w-4 h-4 animate-pulse text-emerald-400" />
                        <span>Updated: {lastUpdate}</span>
                    </div>
                </div>

                {/* Total Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-hydrogen-500 to-hydrogen-600">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white">{totalStats.totalProduction.toFixed(0)} <span className="text-sm font-normal text-gray-400">kg/day</span></h3>
                                <p className="text-gray-500 text-xs uppercase tracking-wider">Total Production</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600">
                                <DollarSign className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white">${totalStats.avgLcoh.toFixed(2)}<span className="text-sm font-normal text-gray-400">/kg</span></h3>
                                <p className="text-gray-500 text-xs uppercase tracking-wider">Average LCOH</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                                <TrendingUp className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white">${totalStats.totalProfit.toLocaleString()}</h3>
                                <p className="text-gray-500 text-xs uppercase tracking-wider">Total Daily Profit</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                                <Factory className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white">{totalStats.activePlants}</h3>
                                <p className="text-gray-500 text-xs uppercase tracking-wider">Active Plants</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Per-Plant Cards (Top 3) */}
                <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-200 font-medium">Displaying Top 3 Most Profitable Plants</span>
                </div>

                <div className="space-y-6">
                    {topPlants.map((plant, idx) => (
                        <motion.div
                            key={plant.plant_id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ scale: 1.01 }}
                            onClick={() => setSelectedPlant(plant)}
                            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 cursor-pointer hover:border-hydrogen-500/50 transition-all group"
                        >
                            {/* Plant Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-hydrogen-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-hydrogen-500/20 group-hover:shadow-hydrogen-500/40 transition-shadow">
                                        <Factory className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white group-hover:text-hydrogen-300 transition-colors">{plant.plant_name}</h2>
                                        <div className="flex items-center text-sm text-gray-400">
                                            <MapPin className="w-3.5 h-3.5 mr-1 text-gray-500" />
                                            {typeof plant.location === 'object'
                                                ? `${plant.location?.city || ''}, ${plant.location?.state || 'India'}`
                                                : plant.location || 'India'
                                            }
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="px-3 py-1 rounded-full bg-gray-700/50 text-xs text-gray-400 flex items-center gap-1 group-hover:bg-hydrogen-900/30 group-hover:text-hydrogen-300">
                                        <Maximize2 className="w-3 h-3" />
                                        Click for Details
                                    </div>
                                    <div className="text-right bg-gray-900/50 px-4 py-2 rounded-xl border border-gray-700/30">
                                        <div className="text-2xl font-bold text-emerald-400">${(plant.lcoh || 0).toFixed(2)}<span className="text-sm text-gray-500 ml-1">/kg</span></div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wider">LCOH</div>
                                    </div>
                                </div>
                            </div>

                            {/* Weather & Energy Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                                {/* Weather */}
                                <div className="bg-gray-900/40 p-5 rounded-xl border border-gray-700/30">
                                    <h3 className="font-bold mb-4 flex items-center text-white">
                                        <Activity className="w-4 h-4 mr-2 text-blue-400" />
                                        Live Weather
                                    </h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between items-center py-1 border-b border-gray-800">
                                            <span className="text-gray-400">Temperature</span>
                                            <span className="font-mono text-white">{plant.weather?.temperature?.toFixed(1)}°C</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-gray-800">
                                            <span className="text-gray-400">Solar Irradiance</span>
                                            <span className="font-mono text-amber-400">{plant.weather?.solar_irradiance?.toFixed(0)} W/m²</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-gray-800">
                                            <span className="text-gray-400">Wind Speed</span>
                                            <span className="font-mono text-cyan-400">{plant.weather?.wind_speed?.toFixed(1)} m/s</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-gray-400">Humidity</span>
                                            <span className="font-mono text-blue-300">{plant.weather?.humidity}%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Energy Output */}
                                <div className="bg-gray-900/40 p-5 rounded-xl border border-gray-700/30">
                                    <h3 className="font-bold mb-4 flex items-center text-white">
                                        <Zap className="w-4 h-4 mr-2 text-emerald-400" />
                                        Energy Output
                                    </h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between items-center py-1 border-b border-gray-800">
                                            <span className="flex items-center text-gray-400">
                                                <Sun className="w-3.5 h-3.5 mr-2 text-amber-500" />
                                                Solar
                                            </span>
                                            <span className="font-mono text-white">{plant.energy_output?.solar} MW</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-gray-800">
                                            <span className="flex items-center text-gray-400">
                                                <Wind className="w-3.5 h-3.5 mr-2 text-cyan-500" />
                                                Wind
                                            </span>
                                            <span className="font-mono text-white">{plant.energy_output?.wind} MW</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-gray-800">
                                            <span className="flex items-center text-gray-400">
                                                <Droplet className="w-3.5 h-3.5 mr-2 text-blue-500" />
                                                Hydro
                                            </span>
                                            <span className="font-mono text-white">{plant.energy_output?.hydro} MW</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2">
                                            <span className="text-gray-300 font-medium">Total Output</span>
                                            <span className="font-bold text-emerald-400 text-lg">{plant.energy_output?.total} MW</span>
                                        </div>
                                    </div>
                                </div>

                                {/* ML Predictions */}
                                <div className="bg-gray-900/40 p-5 rounded-xl border border-gray-700/30">
                                    <h3 className="font-bold mb-4 flex items-center text-white">
                                        <TrendingUp className="w-4 h-4 mr-2 text-purple-400" />
                                        ML Predictions
                                    </h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between items-center py-1 border-b border-gray-800">
                                            <span className="text-gray-400">H₂ Production</span>
                                            <span className="font-mono text-white">{plant.profit_prediction?.h2_production_kg?.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-gray-800">
                                            <span className="text-gray-400">Daily Profit</span>
                                            <span className={`font-mono font-bold ${(plant.profit_prediction?.daily_profit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                ${plant.profit_prediction?.daily_profit?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-gray-800">
                                            <span className="text-gray-400">O₂ Produced</span>
                                            <span className="font-mono text-white">{plant.profit_prediction?.breakdown?.oxygen_produced_kg?.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-gray-400">Model Type</span>
                                            <span className="font-medium text-purple-400 text-xs px-2 py-0.5 bg-purple-500/10 rounded-full border border-purple-500/20">
                                                {plant.profit_prediction?.model_type || 'Physics-Based'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Next Day Forecast */}
                            {plant.forecast && plant.next_day_prediction && (
                                <div className="mb-6 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 p-5 rounded-xl border border-indigo-500/20">
                                    <h3 className="font-bold mb-4 flex items-center text-indigo-300">
                                        <TrendingUp className="w-4 h-4 mr-2" />
                                        Next Day Forecast (Tomorrow)
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                                        <div>
                                            <div className="text-gray-500 text-xs mb-1">Condition</div>
                                            <div className="font-bold text-white">{plant.forecast.description}</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-500 text-xs mb-1">Temp (Max/Min)</div>
                                            <div className="font-bold text-white">{plant.forecast.max_temp}° / {plant.forecast.min_temp}°</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-500 text-xs mb-1">Wind Speed</div>
                                            <div className="font-bold text-white">{plant.forecast.wind_speed} km/h</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-500 text-xs mb-1">Predicted Output</div>
                                            <div className="font-bold text-emerald-400 text-lg">{plant.next_day_prediction.total} MW</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Profitability Suggestions */}
                            <div className="bg-gradient-to-r from-emerald-900/10 to-teal-900/10 p-4 rounded-xl border border-emerald-500/20">
                                <h3 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    Suggestions to Improve Profitability
                                </h3>
                                <div className="space-y-2">
                                    {/* Dynamic Suggestions Logic */}
                                    {((plant.profit_prediction?.efficiency_data?.electrolyzer_efficiency || 70) < 65) && (
                                        <div className="flex items-start gap-2 text-sm text-gray-300">
                                            <span className="text-emerald-500 mt-1">●</span>
                                            <span>Schedule electrolyzer maintenance to improve efficiency (currently {plant.profit_prediction?.efficiency_data?.electrolyzer_efficiency?.toFixed(1)}%).</span>
                                        </div>
                                    )}
                                    {((plant.energy_output?.wind || 0) < 2 && (plant.weather?.wind_speed || 0) > 5) && (
                                        <div className="flex items-start gap-2 text-sm text-gray-300">
                                            <span className="text-emerald-500 mt-1">●</span>
                                            <span>Inspect wind turbines; output is low relative to wind speed.</span>
                                        </div>
                                    )}
                                    <div className="flex items-start gap-2 text-sm text-gray-300">
                                        <span className="text-emerald-500 mt-1">●</span>
                                        <span>Optimize shift scheduling to align with peak solar hours (11 AM - 3 PM).</span>
                                    </div>
                                    <div className="flex items-start gap-2 text-sm text-gray-300">
                                        <span className="text-emerald-500 mt-1">●</span>
                                        <span>Negotiate bulk operator rates for water supply to reduce recurring costs.</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Plant Locations Map */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 my-8">
                    <h3 className="text-xl font-bold mb-6 flex items-center text-white">
                        <MapPin className="w-5 h-5 mr-2 text-hydrogen-400" />
                        Live Plant Network
                    </h3>
                    <div className="w-full h-[400px] rounded-xl overflow-hidden relative border border-gray-700/50">
                        <APIProvider apiKey="AIzaSyDyaStNd9U3Q0BF4tDi-URy8ez19VpN57U">
                            <Map
                                defaultCenter={{ lat: 20.5937, lng: 78.9629 }}
                                defaultZoom={5}
                                mapId="DEMO_MAP_ID"
                                disableDefaultUI={true}
                                style={{ width: '100%', height: '100%' }}
                                colorScheme="DARK"
                            >
                                {plants.map(plant => (
                                    plant.coordinates && (
                                        <AdvancedMarker
                                            key={plant.plant_id}
                                            position={{ lat: plant.coordinates.lat, lng: plant.coordinates.lng }}
                                            onClick={() => setSelectedPlant(plant)}
                                        >
                                            <Pin
                                                background={plant.safety_status?.status === 'optimal' ? '#10B981' : '#F59E0B'}
                                                borderColor={'#ffffff'}
                                                glyphColor={'#ffffff'}
                                            />
                                        </AdvancedMarker>
                                    )
                                ))}
                            </Map>
                        </APIProvider>

                        {/* Overlay Plant Legend */}
                        <div className="absolute top-4 right-4 bg-gray-900/90 p-4 rounded-xl border border-gray-700/50 backdrop-blur-md text-xs shadow-xl pointer-events-none">
                            <div className="font-bold mb-3 text-white">Network Status</div>
                            <div className="space-y-2">
                                <div className="flex items-center text-gray-300">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                    Optimal Operation
                                </div>
                                <div className="flex items-center text-gray-300">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 mr-2 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
                                    Maintenance Required
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}

            </motion.div>

            {/* Detailed Plant Modal */}
            <PlantDetailModal
                plant={selectPlant}
                onClose={() => setSelectedPlant(null)}
            />
        </div>
    );
};

export default Dashboard;
