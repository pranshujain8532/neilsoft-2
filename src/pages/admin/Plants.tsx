import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Wrench, XCircle, MapPin, TrendingUp, Zap, Sun, Wind, Droplets,
    ThermometerSun, Cloud, X, History, DollarSign, Leaf, Clock, ChevronRight,
    RefreshCw, Gauge
} from 'lucide-react';
import { plantAPI, productionHistoryAPI, mlApi } from '@/utils/api';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface Plant {
    id: string;
    name: string;
    location: any;
    capacity: number;
    current_production?: number;
    status: string;
    efficiency?: number;
    created_at?: string;
    latitude?: number;
    longitude?: number;
    capacity_mw?: number;
    efficiency_percent?: number;
    lcoh?: number;
    renewable_percentage?: number;
    pipeline_available?: boolean;
}

interface ProductionRecord {
    id: string;
    timestamp: string;
    production_kg: number;
    efficiency_percent?: number;
    lcoh?: number;
    energy_generated_mw?: number;
    weather_snapshot?: any;
}

interface WeatherData {
    temperature: number;
    description: string;
    humidity: number;
    wind_speed: number;
    cloud_cover?: number;
    solar_irradiance?: number;
    source?: string;
}

interface MLPrediction {
    energy_output?: any;
    profit_prediction?: any;
    safety_status?: any;
}

const Plants = () => {
    const [plants, setPlants] = useState<Plant[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
    const [plantHistory, setPlantHistory] = useState<ProductionRecord[]>([]);
    const [plantWeather, setPlantWeather] = useState<WeatherData | null>(null);
    const [_mlPrediction, setMlPrediction] = useState<MLPrediction | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchPlants();
    }, []);

    const fetchPlants = async () => {
        try {
            const response = await plantAPI.getAll();
            if (response.data) {
                // Filter to unique plants by name (remove duplicates)
                const uniquePlants = response.data.reduce((acc: Plant[], p: any) => {
                    if (!acc.find(existing => existing.name === p.name)) {
                        acc.push({
                            ...p,
                            capacity: p.capacity_mw || p.capacity,
                            efficiency: p.efficiency_percent || p.efficiency,
                            location: typeof p.location === 'string' ? JSON.parse(p.location) : p.location
                        });
                    }
                    return acc;
                }, []);
                setPlants(uniquePlants);
            }
        } catch (error) {
            console.error('Error fetching plants:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlantDetails = useCallback(async (plant: Plant) => {
        setSelectedPlant(plant);
        setLoadingDetails(true);
        setPlantHistory([]);
        setPlantWeather(null);
        setMlPrediction(null);

        try {
            // Fetch production history - only show records with actual production
            const historyRes = await productionHistoryAPI.getByPlant(plant.id, 50);
            if (historyRes.data) {
                // Filter out records with 0 or null production
                const validRecords = historyRes.data.filter((r: ProductionRecord) =>
                    r.production_kg && r.production_kg > 0
                );
                setPlantHistory(validRecords.slice(0, 20));
            }

            // Fetch REAL weather for plant location
            if (plant.latitude && plant.longitude) {
                try {
                    const weatherRes = await mlApi.get(`/api/weather/coords?lat=${plant.latitude}&lon=${plant.longitude}`);
                    if (weatherRes.data && !weatherRes.data.error) {
                        setPlantWeather(weatherRes.data);
                    }
                } catch (e) {
                    console.log('Weather API not available:', e);
                }

                // Fetch ML predictions for this plant
                try {
                    const mlRes = await mlApi.get(`/api/plants/${plant.id}/predictions`);
                    if (mlRes.data) {
                        setMlPrediction(mlRes.data);
                    }
                } catch (e) {
                    console.log('ML predictions not available');
                }
            }
        } catch (error) {
            console.error('Error fetching plant details:', error);
        } finally {
            setLoadingDetails(false);
        }
    }, []);

    const refreshData = async () => {
        if (!selectedPlant) return;
        setRefreshing(true);
        await fetchPlantDetails(selectedPlant);
        setRefreshing(false);
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active':
            case 'operational':
                return <Activity className="w-5 h-5 text-emerald-400" />;
            case 'maintenance':
                return <Wrench className="w-5 h-5 text-amber-400" />;
            default:
                return <XCircle className="w-5 h-5 text-rose-400" />;
        }
    };

    const getStatusGradient = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active':
            case 'operational':
                return 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30';
            case 'maintenance':
                return 'from-amber-500/20 to-amber-500/5 border-amber-500/30';
            default:
                return 'from-rose-500/20 to-rose-500/5 border-rose-500/30';
        }
    };

    const getPlantTypeIcon = (name: string) => {
        if (name.toLowerCase().includes('solar')) return <Sun className="w-8 h-8 text-amber-400" />;
        if (name.toLowerCase().includes('wind')) return <Wind className="w-8 h-8 text-cyan-400" />;
        if (name.toLowerCase().includes('hydro')) return <Droplets className="w-8 h-8 text-blue-400" />;
        return <Zap className="w-8 h-8 text-hydrogen-400" />;
    };

    const formatChartData = (history: ProductionRecord[]) => {
        return history.slice().reverse().map((record, _index) => ({
            name: new Date(record.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            date: new Date(record.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            production: record.production_kg,
            efficiency: record.efficiency_percent || 0,
            energy: record.energy_generated_mw || 0,
            lcoh: record.lcoh || 0
        }));
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl">
                    <p className="text-gray-400 text-xs mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            <span className="font-medium">{entry.name}:</span> {entry.value.toFixed(1)} {entry.name === 'Production' ? 'kg' : entry.name === 'Energy' ? 'MW' : '%'}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 border-4 border-hydrogen-500/30 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-hydrogen-500 border-t-transparent rounded-full animate-spin"></div>
                        <Zap className="absolute inset-0 m-auto w-8 h-8 text-hydrogen-400 animate-pulse" />
                    </div>
                    <p className="text-gray-400 text-lg">Loading hydrogen plants...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-hydrogen-500/20 to-hydrogen-600/10 border border-hydrogen-500/30">
                            <Zap className="w-8 h-8 text-hydrogen-400" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-hydrogen-200 to-hydrogen-400 bg-clip-text text-transparent">
                                Green Hydrogen Plants
                            </h1>
                            <p className="text-gray-400 mt-1">
                                Real-time monitoring of {plants.length} production facilities across India
                            </p>
                        </div>
                    </div>

                    {/* Stats Bar */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        {[
                            { label: 'Total Plants', value: plants.length, icon: MapPin, color: 'text-blue-400' },
                            { label: 'Operational', value: plants.filter(p => ['active', 'operational'].includes(p.status.toLowerCase())).length, icon: Activity, color: 'text-emerald-400' },
                            { label: 'Total Capacity', value: `${plants.reduce((sum, p) => sum + (p.capacity_mw || 0), 0)} MW`, icon: Zap, color: 'text-amber-400' },
                            { label: 'Avg Efficiency', value: `${Math.round(plants.reduce((sum, p) => sum + (p.efficiency || 0), 0) / plants.length)}%`, icon: TrendingUp, color: 'text-hydrogen-400' },
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50"
                            >
                                <div className="flex items-center gap-3">
                                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                    <div>
                                        <p className="text-gray-500 text-xs uppercase tracking-wider">{stat.label}</p>
                                        <p className="text-xl font-bold text-white">{stat.value}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Plant Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plants.map((plant, index) => (
                        <motion.div
                            key={plant.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ scale: 1.02, y: -5 }}
                            onClick={() => fetchPlantDetails(plant)}
                            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${getStatusGradient(plant.status)} 
                                        backdrop-blur-sm border cursor-pointer group transition-all duration-300
                                        hover:shadow-xl hover:shadow-hydrogen-500/10`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-hydrogen-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="relative p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                                        {getPlantTypeIcon(plant.name)}
                                    </div>
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
                                                    ${plant.status.toLowerCase() === 'operational' || plant.status.toLowerCase() === 'active'
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            : plant.status.toLowerCase() === 'maintenance'
                                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                                        {getStatusIcon(plant.status)}
                                        <span className="capitalize">{plant.status}</span>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-hydrogen-300 transition-colors">
                                    {plant.name}
                                </h3>
                                <div className="flex items-center text-gray-400 text-sm mb-4">
                                    <MapPin className="w-4 h-4 mr-1.5" />
                                    <span>
                                        {plant.location?.city || plant.name.split(' ')[0]}, {plant.location?.state || 'India'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-700/50">
                                    <div>
                                        <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                            <Zap className="w-3.5 h-3.5" />
                                            Capacity
                                        </div>
                                        <p className="text-lg font-bold text-hydrogen-400">{plant.capacity_mw || plant.capacity} MW</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                            <TrendingUp className="w-3.5 h-3.5" />
                                            Efficiency
                                        </div>
                                        <p className="text-lg font-bold text-emerald-400">{plant.efficiency || plant.efficiency_percent || 0}%</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                            <DollarSign className="w-3.5 h-3.5" />
                                            LCOH
                                        </div>
                                        <p className="text-lg font-bold text-amber-400">${plant.lcoh || 2.0}/kg</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                            <Leaf className="w-3.5 h-3.5" />
                                            Renewable
                                        </div>
                                        <p className="text-lg font-bold text-green-400">{plant.renewable_percentage || 0}%</p>
                                    </div>
                                </div>

                                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ChevronRight className="w-6 h-6 text-hydrogen-400" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Plant Details Modal */}
                <AnimatePresence>
                    {selectedPlant && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => setSelectedPlant(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl border border-gray-700/50 
                                           w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Modal Header */}
                                <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 p-6 flex justify-between items-start z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-gradient-to-br from-hydrogen-500/20 to-hydrogen-600/10 border border-hydrogen-500/30">
                                            {getPlantTypeIcon(selectedPlant.name)}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">{selectedPlant.name}</h2>
                                            <div className="flex items-center text-gray-400 text-sm mt-1">
                                                <MapPin className="w-4 h-4 mr-1.5" />
                                                {selectedPlant.location?.city}, {selectedPlant.location?.state || 'India'}
                                                <span className="mx-2">•</span>
                                                <span className="text-hydrogen-400">
                                                    {selectedPlant.latitude?.toFixed(2)}°N, {selectedPlant.longitude?.toFixed(2)}°E
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={refreshData}
                                            disabled={refreshing}
                                            className="p-2 rounded-full hover:bg-gray-700/50 transition-colors disabled:opacity-50"
                                        >
                                            <RefreshCw className={`w-5 h-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                                        </button>
                                        <button
                                            onClick={() => setSelectedPlant(null)}
                                            className="p-2 rounded-full hover:bg-gray-700/50 transition-colors"
                                        >
                                            <X className="w-6 h-6 text-gray-400" />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Key Metrics Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { label: 'Capacity', value: `${selectedPlant.capacity_mw || selectedPlant.capacity} MW`, icon: Zap, color: 'from-hydrogen-500 to-hydrogen-600' },
                                            { label: 'Efficiency', value: `${selectedPlant.efficiency || selectedPlant.efficiency_percent}%`, icon: TrendingUp, color: 'from-emerald-500 to-emerald-600' },
                                            { label: 'LCOH', value: `$${selectedPlant.lcoh || 2.0}/kg`, icon: DollarSign, color: 'from-amber-500 to-amber-600' },
                                            { label: 'Renewable', value: `${selectedPlant.renewable_percentage || 0}%`, icon: Leaf, color: 'from-green-500 to-green-600' },
                                        ].map((metric) => (
                                            <div key={metric.label} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${metric.color} flex items-center justify-center mb-3`}>
                                                    <metric.icon className="w-5 h-5 text-white" />
                                                </div>
                                                <p className="text-gray-500 text-xs uppercase tracking-wider">{metric.label}</p>
                                                <p className="text-2xl font-bold text-white">{metric.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Real-Time Weather Section */}
                                    <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-xl p-5 border border-blue-500/20">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <Cloud className="w-5 h-5 text-blue-400" />
                                                <h3 className="text-lg font-semibold text-white">Current Weather</h3>
                                            </div>
                                            {plantWeather?.source && (
                                                <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded-full">
                                                    {plantWeather.source}
                                                </span>
                                            )}
                                        </div>
                                        {loadingDetails ? (
                                            <div className="flex items-center justify-center py-8">
                                                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        ) : plantWeather ? (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="text-center p-3 bg-gray-800/30 rounded-lg">
                                                    <ThermometerSun className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                                                    <p className="text-2xl font-bold text-white">{plantWeather.temperature?.toFixed(1)}°C</p>
                                                    <p className="text-gray-400 text-sm">Temperature</p>
                                                </div>
                                                <div className="text-center p-3 bg-gray-800/30 rounded-lg">
                                                    <Wind className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                                                    <p className="text-2xl font-bold text-white">{plantWeather.wind_speed?.toFixed(1)} m/s</p>
                                                    <p className="text-gray-400 text-sm">Wind Speed</p>
                                                </div>
                                                <div className="text-center p-3 bg-gray-800/30 rounded-lg">
                                                    <Droplets className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                                                    <p className="text-2xl font-bold text-white">{plantWeather.humidity}%</p>
                                                    <p className="text-gray-400 text-sm">Humidity</p>
                                                </div>
                                                <div className="text-center p-3 bg-gray-800/30 rounded-lg">
                                                    <Sun className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                                                    <p className="text-2xl font-bold text-white">{plantWeather.solar_irradiance?.toFixed(0) || 0} W/m²</p>
                                                    <p className="text-gray-400 text-sm">Solar Irradiance</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-gray-500">
                                                <Cloud className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                                <p>Weather data unavailable. ML service may be initializing.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Production History Chart */}
                                    <div className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
                                        <div className="flex items-center gap-2 mb-4">
                                            <History className="w-5 h-5 text-hydrogen-400" />
                                            <h3 className="text-lg font-semibold text-white">Production History</h3>
                                            {plantHistory.length > 0 && (
                                                <span className="text-xs text-gray-500 ml-auto">
                                                    Last {plantHistory.length} records
                                                </span>
                                            )}
                                        </div>

                                        {loadingDetails ? (
                                            <div className="flex items-center justify-center py-12">
                                                <div className="w-8 h-8 border-2 border-hydrogen-500 border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        ) : plantHistory.length > 0 ? (
                                            <div className="space-y-6">
                                                {/* Production Chart */}
                                                <div className="h-64">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={formatChartData(plantHistory)}>
                                                            <defs>
                                                                <linearGradient id="productionGradient" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                                                                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                                                                </linearGradient>
                                                                <linearGradient id="efficiencyGradient" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                                            <XAxis
                                                                dataKey="name"
                                                                stroke="#6b7280"
                                                                fontSize={12}
                                                                tickLine={false}
                                                            />
                                                            <YAxis
                                                                stroke="#6b7280"
                                                                fontSize={12}
                                                                tickLine={false}
                                                                axisLine={false}
                                                            />
                                                            <Tooltip content={<CustomTooltip />} />
                                                            <Legend
                                                                wrapperStyle={{ paddingTop: '20px' }}
                                                                formatter={(value) => <span className="text-gray-400 text-sm">{value}</span>}
                                                            />
                                                            <Area
                                                                type="monotone"
                                                                dataKey="production"
                                                                name="Production"
                                                                stroke="#38bdf8"
                                                                strokeWidth={2}
                                                                fill="url(#productionGradient)"
                                                                animationDuration={1500}
                                                            />
                                                            <Area
                                                                type="monotone"
                                                                dataKey="efficiency"
                                                                name="Efficiency"
                                                                stroke="#10b981"
                                                                strokeWidth={2}
                                                                fill="url(#efficiencyGradient)"
                                                                animationDuration={1500}
                                                            />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>

                                                {/* Recent Records List */}
                                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                                    {plantHistory.slice(0, 5).map((record) => (
                                                        <div
                                                            key={record.id}
                                                            className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30 flex items-center justify-between"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 rounded-lg bg-hydrogen-500/20">
                                                                    <Clock className="w-4 h-4 text-hydrogen-400" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-white text-sm font-medium">
                                                                        {new Date(record.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-lg font-bold text-hydrogen-400">{record.production_kg} kg</p>
                                                                <p className="text-gray-500 text-xs">
                                                                    {record.efficiency_percent?.toFixed(1) || '-'}% | ${record.lcoh?.toFixed(2) || '-'}/kg
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 text-gray-500">
                                                <Gauge className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                                <p className="text-lg">No production history available yet.</p>
                                                <p className="text-sm mt-2">Data will appear as the plant generates hydrogen.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Pipeline Status */}
                                    {selectedPlant.pipeline_available && (
                                        <div className="bg-gradient-to-r from-hydrogen-900/30 to-blue-900/30 rounded-xl p-4 border border-hydrogen-500/20 flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-hydrogen-500/20">
                                                <Activity className="w-5 h-5 text-hydrogen-400" />
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">Pipeline Connected</p>
                                                <p className="text-gray-400 text-sm">This plant supports direct hydrogen pipeline delivery for long distances.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Plants;
