import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Wrench, XCircle, MapPin, TrendingUp, Zap, Sun, Wind, Droplets,
    ThermometerSun, Cloud, X, History, DollarSign, Leaf, Clock, ChevronRight,
    RefreshCw, Gauge, Plus, Loader2, CheckCircle, AlertTriangle, Info, Sparkles,
    Fuel, Power, Flame, Check, Square, CheckSquare
} from 'lucide-react';
import { plantAPI, productionHistoryAPI, mlApi } from '@/utils/api';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// Site Feasibility Types
interface SiteEvaluation {
    success: boolean;
    location: { latitude: number; longitude: number; name?: string };
    evaluations: {
        solar: EnergyEvaluation;
        wind: WindEvaluation;
        hydro: EnergyEvaluation;
        biomass_msw?: EnergyEvaluation;
        grid_wheeling?: EnergyEvaluation;
        geothermal?: EnergyEvaluation;
    };
    scores: {
        solar: number;
        wind: number;
        hydro: number;
        biomass_msw?: number;
        grid_wheeling?: number;
        geothermal?: number;
    };
    overall_score: number;
    zone?: {
        level: string;
        message: string;
        primary_scores_below_40: boolean;
    };
    feasibility_matrix?: Record<string, { score: number; grade: string; data: any }>;
    recommendation: {
        type: string;
        title: string;
        electrolysis: string;
        primary_reason: string;
        detailed_reasons: DetailedReason[];
        viable_sources: string[];
        fallback_triggered?: boolean;
        fallback_reason?: string;
    };
}

interface EnergyEvaluation {
    score: number;
    grade: string;
    reasoning: string;
    conditions: { metric: string; value: string; status: string }[];
}

interface WindEvaluation extends EnergyEvaluation {
    wind_speed_10m: number;
    wind_speed_80m: number;
    hellman_calculation: {
        formula: string;
        v1: number;
        z1: number;
        z2: number;
        alpha: number;
        power_factor: number;
        v2: number;
    };
}

interface DetailedReason {
    source: string;
    score: number;
    grade: string;
    summary: string;
    icon: string;
    color: string;
    physics?: any;
}

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

    // Add Plant Wizard State
    const [showAddWizard, setShowAddWizard] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [newPlantCoords, setNewPlantCoords] = useState({ lat: '', lon: '' });
    const [newPlantName, setNewPlantName] = useState('');
    const [newPlantCapacity, setNewPlantCapacity] = useState('');
    const [evaluating, setEvaluating] = useState(false);
    const [siteEvaluation, setSiteEvaluation] = useState<SiteEvaluation | null>(null);
    const [addingPlant, setAddingPlant] = useState(false);

    // 6-Vector Energy Mix Selection State
    const [selectedEnergySources, setSelectedEnergySources] = useState<Set<string>>(new Set());

    // Toggle energy source selection
    const toggleEnergySource = (source: string) => {
        setSelectedEnergySources(prev => {
            const newSet = new Set(prev);
            if (newSet.has(source)) {
                newSet.delete(source);
            } else {
                newSet.add(source);
            }
            return newSet;
        });
    };

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

                {/* Add New Plant Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    onClick={() => { setShowAddWizard(true); setWizardStep(1); setSiteEvaluation(null); }}
                    className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-hydrogen-900/30 to-purple-900/30 border-2 border-dashed border-hydrogen-500/40 cursor-pointer hover:border-hydrogen-500/80 transition-all group"
                >
                    <div className="flex items-center justify-center gap-4">
                        <div className="p-4 rounded-full bg-hydrogen-500/20 group-hover:bg-hydrogen-500/30 transition-colors">
                            <Plus className="w-8 h-8 text-hydrogen-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white group-hover:text-hydrogen-300 transition-colors">
                                Add New Green Hydrogen Plant
                            </h3>
                            <p className="text-gray-400 text-sm mt-1">
                                Evaluate site feasibility using AI + Google Maps + Weather APIs
                            </p>
                        </div>
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
                                        <p className="text-lg font-bold text-amber-400">₹{Math.round((plant.lcoh || 2.0) * 89.9)}/kg</p>
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
                                            { label: 'LCOH', value: `₹${Math.round((selectedPlant.lcoh || 2.0) * 89.9)}/kg`, icon: DollarSign, color: 'from-amber-500 to-amber-600' },
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
                                                                    {record.efficiency_percent?.toFixed(1) || '-'}% | ₹{Math.round((record.lcoh || 0) * 89.9)}/kg
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

                {/* Add Plant Wizard Modal */}
                <AnimatePresence>
                    {showAddWizard && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => setShowAddWizard(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl border border-hydrogen-500/30 
                                           w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-hydrogen-500/10"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Wizard Header */}
                                <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 p-6 flex justify-between items-center z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-gradient-to-br from-hydrogen-500/20 to-purple-600/20 border border-hydrogen-500/30">
                                            <Sparkles className="w-6 h-6 text-hydrogen-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">Add New Green Hydrogen Plant</h2>
                                            <p className="text-gray-400 text-sm">Step {wizardStep} of 3 - Site Feasibility Engine</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowAddWizard(false)}
                                        className="p-2 rounded-full hover:bg-gray-700/50 transition-colors"
                                    >
                                        <X className="w-6 h-6 text-gray-400" />
                                    </button>
                                </div>

                                {/* Step Progress */}
                                <div className="px-6 pt-4">
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3].map((step) => (
                                            <div key={step} className="flex items-center gap-2 flex-1">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                                                    ${wizardStep >= step ? 'bg-hydrogen-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                                    {wizardStep > step ? <CheckCircle className="w-5 h-5" /> : step}
                                                </div>
                                                {step < 3 && (
                                                    <div className={`flex-1 h-1 rounded ${wizardStep > step ? 'bg-hydrogen-500' : 'bg-gray-700'}`} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                                        <span>Location</span>
                                        <span>Evaluation</span>
                                        <span>Confirm</span>
                                    </div>
                                </div>

                                <div className="p-6">
                                    {/* Step 1: Location Input */}
                                    {wizardStep === 1 && (
                                        <motion.div
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="space-y-6"
                                        >
                                            <div className="text-center py-4">
                                                <MapPin className="w-16 h-16 text-hydrogen-400 mx-auto mb-4" />
                                                <h3 className="text-xl font-bold text-white">Enter Plant Location</h3>
                                                <p className="text-gray-400 mt-2">Provide latitude and longitude coordinates for feasibility analysis</p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-2">Latitude</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g., 23.0225"
                                                        value={newPlantCoords.lat}
                                                        onChange={(e) => setNewPlantCoords({ ...newPlantCoords, lat: e.target.value })}
                                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-hydrogen-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-2">Longitude</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g., 72.5714"
                                                        value={newPlantCoords.lon}
                                                        onChange={(e) => setNewPlantCoords({ ...newPlantCoords, lon: e.target.value })}
                                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-hydrogen-500 focus:outline-none"
                                                    />
                                                </div>
                                            </div>

                                            {/* Demo Locations */}
                                            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                                                <p className="text-sm text-gray-400 mb-3">📍 Quick Test Locations:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {[
                                                        { name: 'Jaisalmer (Solar)', lat: '26.92', lon: '70.91' },
                                                        { name: 'Kanyakumari (Wind)', lat: '8.09', lon: '77.54' },
                                                        { name: 'Sardar Sarovar (Hydro)', lat: '21.83', lon: '73.75' },
                                                        { name: 'Ahmedabad', lat: '23.02', lon: '72.57' },
                                                    ].map((loc) => (
                                                        <button
                                                            key={loc.name}
                                                            onClick={() => setNewPlantCoords({ lat: loc.lat, lon: loc.lon })}
                                                            className="px-3 py-1.5 bg-gray-700 hover:bg-hydrogen-500/30 rounded-full text-sm text-gray-300 hover:text-white transition-colors"
                                                        >
                                                            {loc.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <button
                                                onClick={async () => {
                                                    if (!newPlantCoords.lat || !newPlantCoords.lon) return;
                                                    setEvaluating(true);
                                                    try {
                                                        const res = await mlApi.post('/site-feasibility/evaluate', {
                                                            lat: parseFloat(newPlantCoords.lat),
                                                            lon: parseFloat(newPlantCoords.lon)
                                                        });
                                                        if (res.data?.success) {
                                                            setSiteEvaluation(res.data);
                                                            setWizardStep(2);
                                                        }
                                                    } catch (err) {
                                                        console.error('Evaluation failed:', err);
                                                    } finally {
                                                        setEvaluating(false);
                                                    }
                                                }}
                                                disabled={!newPlantCoords.lat || !newPlantCoords.lon || evaluating}
                                                className="w-full py-4 bg-gradient-to-r from-hydrogen-500 to-hydrogen-600 hover:from-hydrogen-400 hover:to-hydrogen-500 
                                                           text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {evaluating ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                        Evaluating Site Feasibility...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-5 h-5" />
                                                        Analyze Location with AI
                                                    </>
                                                )}
                                            </button>
                                        </motion.div>
                                    )}

                                    {/* Step 2: Evaluation Results */}
                                    {wizardStep === 2 && siteEvaluation && (
                                        <motion.div
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="space-y-6"
                                        >
                                            {/* Overall Score */}
                                            <div className="text-center py-4">
                                                <div className="relative w-32 h-32 mx-auto mb-4">
                                                    <svg className="w-full h-full transform -rotate-90">
                                                        <circle cx="64" cy="64" r="56" fill="none" stroke="#374151" strokeWidth="8" />
                                                        <circle
                                                            cx="64" cy="64" r="56" fill="none"
                                                            stroke={siteEvaluation.overall_score >= 70 ? '#10b981' : siteEvaluation.overall_score >= 50 ? '#f59e0b' : '#ef4444'}
                                                            strokeWidth="8"
                                                            strokeLinecap="round"
                                                            strokeDasharray={`${(siteEvaluation.overall_score / 100) * 352} 352`}
                                                        />
                                                    </svg>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <span className="text-3xl font-bold text-white">{siteEvaluation.overall_score.toFixed(0)}</span>
                                                        <span className="text-xs text-gray-400">Overall</span>
                                                    </div>
                                                </div>
                                                <h3 className="text-xl font-bold text-white">{siteEvaluation.recommendation.title}</h3>
                                                <p className="text-hydrogen-400 text-sm mt-1">{siteEvaluation.recommendation.electrolysis}</p>
                                            </div>

                                            {/* 6-VECTOR ENERGY MIX SELECTOR */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-white font-semibold">Select Your Energy Mix:</h4>
                                                    <span className="text-xs text-gray-400">
                                                        {selectedEnergySources.size > 0 ? `${selectedEnergySources.size} source${selectedEnergySources.size > 1 ? 's' : ''} selected` : 'Click to select sources'}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                    {[
                                                        { key: 'solar', icon: Sun, color: 'yellow', label: 'Solar PV', bgClass: 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500', activeClass: 'bg-yellow-500/30 border-yellow-500' },
                                                        { key: 'wind', icon: Wind, color: 'blue', label: 'Wind Power', bgClass: 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500', activeClass: 'bg-blue-500/30 border-blue-500' },
                                                        { key: 'hydro', icon: Droplets, color: 'cyan', label: 'Hydro Power', bgClass: 'bg-cyan-500/10 border-cyan-500/30 hover:border-cyan-500', activeClass: 'bg-cyan-500/30 border-cyan-500' },
                                                        { key: 'biomass_msw', icon: Fuel, color: 'green', label: 'Biomass/MSW', bgClass: 'bg-green-500/10 border-green-500/30 hover:border-green-500', activeClass: 'bg-green-500/30 border-green-500' },
                                                        { key: 'grid_wheeling', icon: Power, color: 'purple', label: 'Grid Wheeling', bgClass: 'bg-purple-500/10 border-purple-500/30 hover:border-purple-500', activeClass: 'bg-purple-500/30 border-purple-500' },
                                                        { key: 'geothermal', icon: Flame, color: 'orange', label: 'Geothermal', bgClass: 'bg-orange-500/10 border-orange-500/30 hover:border-orange-500', activeClass: 'bg-orange-500/30 border-orange-500' }
                                                    ].map((source) => {
                                                        const score = siteEvaluation.scores?.[source.key as keyof typeof siteEvaluation.scores] ?? 0;
                                                        const evalu = siteEvaluation.evaluations?.[source.key as keyof typeof siteEvaluation.evaluations];
                                                        const isSelected = selectedEnergySources.has(source.key);
                                                        const isRecommended = siteEvaluation.recommendation.type === source.key ||
                                                            (siteEvaluation.recommendation.type === 'hybrid' && score >= 60);

                                                        return (
                                                            <button
                                                                key={source.key}
                                                                onClick={() => toggleEnergySource(source.key)}
                                                                className={`
                                                                    relative p-4 rounded-xl border-2 transition-all cursor-pointer text-left
                                                                    ${isSelected ? source.activeClass : source.bgClass}
                                                                `}
                                                            >
                                                                {/* Selection Checkbox */}
                                                                <div className="absolute top-2 right-2">
                                                                    {isSelected ? (
                                                                        <CheckSquare className={`w-5 h-5 text-${source.color}-400`} />
                                                                    ) : (
                                                                        <Square className="w-5 h-5 text-gray-500" />
                                                                    )}
                                                                </div>

                                                                {/* Recommended Badge */}
                                                                {isRecommended && (
                                                                    <span className="absolute -top-2 left-2 text-xs px-2 py-0.5 bg-hydrogen-500 text-white rounded-full">
                                                                        ★ AI Pick
                                                                    </span>
                                                                )}

                                                                <source.icon className={`w-7 h-7 text-${source.color}-400 mb-2`} />
                                                                <p className="text-2xl font-bold text-white">{typeof score === 'number' ? score.toFixed(0) : '0'}</p>
                                                                <p className="text-gray-400 text-sm">{source.label}</p>

                                                                {evalu && (
                                                                    <span className={`text-xs px-2 py-0.5 rounded-full mt-2 inline-block ${evalu.grade === 'Excellent' ? 'bg-green-500/20 text-green-400' :
                                                                        evalu.grade === 'Good' ? 'bg-blue-500/20 text-blue-400' :
                                                                            evalu.grade === 'Fair' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                                'bg-red-500/20 text-red-400'
                                                                        }`}>{evalu.grade}</span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Selected Mix Summary */}
                                                {selectedEnergySources.size > 0 && (
                                                    <div className="p-3 bg-gradient-to-r from-hydrogen-500/10 to-purple-500/10 rounded-xl border border-hydrogen-500/30">
                                                        <p className="text-sm text-gray-300">
                                                            <span className="text-hydrogen-400 font-medium">Selected Mix: </span>
                                                            {Array.from(selectedEnergySources).map(s =>
                                                                s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
                                                            ).join(' + ')}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Primary Reason */}
                                            <div className="p-4 bg-hydrogen-500/10 rounded-xl border border-hydrogen-500/30">
                                                <div className="flex items-start gap-3">
                                                    <Info className="w-5 h-5 text-hydrogen-400 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-white font-medium">Why this recommendation?</p>
                                                        <p className="text-gray-300 text-sm mt-1">{siteEvaluation.recommendation.primary_reason}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Detailed Reasoning */}
                                            <div className="space-y-3">
                                                <h4 className="text-white font-semibold">Detailed Analysis:</h4>
                                                {siteEvaluation.recommendation.detailed_reasons.map((reason, i) => (
                                                    <div key={i} className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-xl">{reason.icon}</span>
                                                            <span className="font-medium text-white">{reason.source}</span>
                                                            <span className={`ml-auto text-sm ${reason.grade === 'Excellent' ? 'text-green-400' :
                                                                reason.grade === 'Good' ? 'text-blue-400' :
                                                                    reason.grade === 'Fair' ? 'text-yellow-400' :
                                                                        'text-red-400'
                                                                }`}>{reason.score.toFixed(0)}/100</span>
                                                        </div>
                                                        <p className="text-gray-400 text-sm">{reason.summary}</p>

                                                        {/* Hellman Power Law Display for Wind */}
                                                        {reason.physics && reason.source === 'Wind' && (
                                                            <div className="mt-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                                                <p className="text-xs text-blue-400 font-mono mb-2">Hellman Power Law Calculation:</p>
                                                                <div className="text-sm text-gray-300 font-mono">
                                                                    <p>v₂ = v₁ × (z₂/z₁)^α</p>
                                                                    <p className="mt-1">
                                                                        <span className="text-cyan-400">{reason.physics.v2?.toFixed(1)} m/s</span>
                                                                        {' = '}
                                                                        <span className="text-gray-400">{reason.physics.v1?.toFixed(1)}</span>
                                                                        {' × '}
                                                                        <span className="text-gray-400">({reason.physics.z2}/{reason.physics.z1})^{reason.physics.alpha}</span>
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        α = {reason.physics.alpha} (open terrain friction coefficient)
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => { setWizardStep(1); setSiteEvaluation(null); }}
                                                    className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
                                                >
                                                    ← Back
                                                </button>
                                                <button
                                                    onClick={() => setWizardStep(3)}
                                                    className="flex-1 py-3 bg-gradient-to-r from-hydrogen-500 to-hydrogen-600 hover:from-hydrogen-400 hover:to-hydrogen-500 text-white font-bold rounded-xl transition-all"
                                                >
                                                    Configure Plant →
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Step 3: Plant Configuration */}
                                    {wizardStep === 3 && siteEvaluation && (
                                        <motion.div
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="space-y-6"
                                        >
                                            <div className="text-center py-4">
                                                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                                                <h3 className="text-xl font-bold text-white">Configure Your Plant</h3>
                                                <p className="text-gray-400 mt-2">Recommended: {siteEvaluation.recommendation.title}</p>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-2">Plant Name</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g., Ahmedabad Solar-PEM Plant"
                                                        value={newPlantName}
                                                        onChange={(e) => setNewPlantName(e.target.value)}
                                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-hydrogen-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-2">Capacity (kW)</label>
                                                    <input
                                                        type="number"
                                                        placeholder="e.g., 1000"
                                                        value={newPlantCapacity}
                                                        onChange={(e) => setNewPlantCapacity(e.target.value)}
                                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-hydrogen-500 focus:outline-none"
                                                    />
                                                </div>
                                            </div>

                                            {/* Summary Card */}
                                            <div className="p-4 bg-gradient-to-r from-hydrogen-500/10 to-purple-500/10 rounded-xl border border-hydrogen-500/30">
                                                <h4 className="text-white font-medium mb-3">Plant Summary:</h4>
                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                    <div><span className="text-gray-400">Location:</span> <span className="text-white">{newPlantCoords.lat}°N, {newPlantCoords.lon}°E</span></div>
                                                    <div><span className="text-gray-400">AI Recommendation:</span> <span className="text-hydrogen-400">{siteEvaluation.recommendation.type}</span></div>

                                                    {/* Selected Energy Mix */}
                                                    <div className="col-span-2 mt-2 p-2 bg-gray-800/50 rounded-lg">
                                                        <span className="text-gray-400">Your Selected Mix: </span>
                                                        {selectedEnergySources.size > 0 ? (
                                                            <span className="text-hydrogen-400 font-medium">
                                                                {Array.from(selectedEnergySources).map(s =>
                                                                    s === 'biomass_msw' ? 'Biomass/MSW' :
                                                                        s === 'grid_wheeling' ? 'Grid Wheeling' :
                                                                            s.charAt(0).toUpperCase() + s.slice(1)
                                                                ).join(' + ')}
                                                            </span>
                                                        ) : (
                                                            <span className="text-yellow-400">(Using AI recommendation)</span>
                                                        )}
                                                    </div>

                                                    {/* 6-Vector Scores */}
                                                    <div className="col-span-2 mt-2 grid grid-cols-3 gap-2">
                                                        <div className={`p-2 rounded ${selectedEnergySources.has('solar') ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-gray-800/50'}`}>
                                                            <span className="text-gray-400 text-xs">Solar</span>
                                                            <p className="text-yellow-400 font-bold">{siteEvaluation.scores?.solar?.toFixed(0) ?? 0}</p>
                                                        </div>
                                                        <div className={`p-2 rounded ${selectedEnergySources.has('wind') ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-gray-800/50'}`}>
                                                            <span className="text-gray-400 text-xs">Wind</span>
                                                            <p className="text-blue-400 font-bold">{siteEvaluation.scores?.wind?.toFixed(0) ?? 0}</p>
                                                        </div>
                                                        <div className={`p-2 rounded ${selectedEnergySources.has('hydro') ? 'bg-cyan-500/20 border border-cyan-500/50' : 'bg-gray-800/50'}`}>
                                                            <span className="text-gray-400 text-xs">Hydro</span>
                                                            <p className="text-cyan-400 font-bold">{siteEvaluation.scores?.hydro?.toFixed(0) ?? 0}</p>
                                                        </div>
                                                        <div className={`p-2 rounded ${selectedEnergySources.has('biomass_msw') ? 'bg-green-500/20 border border-green-500/50' : 'bg-gray-800/50'}`}>
                                                            <span className="text-gray-400 text-xs">Biomass</span>
                                                            <p className="text-green-400 font-bold">{siteEvaluation.scores?.biomass_msw?.toFixed(0) ?? '-'}</p>
                                                        </div>
                                                        <div className={`p-2 rounded ${selectedEnergySources.has('grid_wheeling') ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-gray-800/50'}`}>
                                                            <span className="text-gray-400 text-xs">Grid</span>
                                                            <p className="text-purple-400 font-bold">{siteEvaluation.scores?.grid_wheeling?.toFixed(0) ?? '-'}</p>
                                                        </div>
                                                        <div className={`p-2 rounded ${selectedEnergySources.has('geothermal') ? 'bg-orange-500/20 border border-orange-500/50' : 'bg-gray-800/50'}`}>
                                                            <span className="text-gray-400 text-xs">Geothermal</span>
                                                            <p className="text-orange-400 font-bold">{siteEvaluation.scores?.geothermal?.toFixed(0) ?? '-'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="col-span-2"><span className="text-gray-400">Overall Score:</span> <span className="text-green-400 font-bold">{siteEvaluation.overall_score.toFixed(0)}/100</span></div>
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => setWizardStep(2)}
                                                    className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
                                                >
                                                    ← Back
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (!newPlantName || !newPlantCapacity) return;
                                                        setAddingPlant(true);
                                                        try {
                                                            const res = await mlApi.post('/site-feasibility/add-plant', {
                                                                evaluation: siteEvaluation,
                                                                name: newPlantName,
                                                                capacity_kw: parseFloat(newPlantCapacity)
                                                            });
                                                            if (res.data?.success) {
                                                                setShowAddWizard(false);
                                                                setNewPlantName('');
                                                                setNewPlantCapacity('');
                                                                setNewPlantCoords({ lat: '', lon: '' });
                                                                setSiteEvaluation(null);
                                                                setWizardStep(1);
                                                                fetchPlants(); // Refresh list
                                                            }
                                                        } catch (err) {
                                                            console.error('Failed to add plant:', err);
                                                        } finally {
                                                            setAddingPlant(false);
                                                        }
                                                    }}
                                                    disabled={!newPlantName || !newPlantCapacity || addingPlant}
                                                    className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 
                                                               text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {addingPlant ? (
                                                        <>
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                            Adding Plant...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle className="w-5 h-5" />
                                                            Add Plant to Database
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </motion.div>
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
