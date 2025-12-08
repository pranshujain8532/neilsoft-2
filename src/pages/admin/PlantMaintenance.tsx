import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wrench, AlertTriangle, ChevronDown, ChevronUp, Activity,
    Thermometer, Gauge, Clock, Sun, Wind, Droplets, Power,
    ShieldCheck, ShieldAlert, TrendingUp, Zap, RefreshCcw
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Types
interface Equipment {
    id: string;
    plant_id: string;
    equipment_type: string;
    name: string;
    status: 'operational' | 'maintenance' | 'offline' | 'warning';
    temperature: number;
    pressure: number;
    uptime_hours: number;
    health_score: number;
    max_temperature: number;
    max_pressure: number;
    max_uptime_hours: number;
    latest_reading?: {
        temperature: number;
        pressure: number;
        uptime_hours: number;
        recorded_at: string;
    };
}

interface EnergySource {
    id: string;
    plant_id: string;
    source_type: 'solar_panel' | 'hydro_turbine' | 'windmill';
    name: string;
    condition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    efficiency_percent: number;
    is_operational: boolean;
}

interface MaintenancePrediction {
    equipment_id: string;
    equipment_type: string;
    time_to_failure_hours: number;
    failure_probability: number;
    confidence: number;
    predicted_failure_date: string;
    recommended_action: string;
}

interface ShutdownPrediction {
    plant_id: string;
    shutdown_probability: number;
    predicted_shutdown_date: string;
    non_operational_percent: number;
    should_auto_shutdown: boolean;
    risk_factors: string[];
}

interface PreventionRecommendation {
    id: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    equipment_id?: string;
    equipment_type?: string;
    action: string;
    estimated_impact: string;
    estimated_cost?: string;
}

interface SensorChartData {
    temperature: { time: string; value: number }[];
    pressure: { time: string; value: number }[];
    power: { time: string; value: number }[];
}

interface Plant {
    id: string;
    name: string;
    location: string;
    status: string;
}

const ML_API_URL = (import.meta as any).env?.VITE_ML_API_URL || 'http://localhost:5001';

const PlantMaintenance = () => {
    const [plants, setPlants] = useState<Plant[]>([]);
    const [selectedPlantId, setSelectedPlantId] = useState<string>('');
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [energySources, setEnergySources] = useState<EnergySource[]>([]);
    const [maintenancePredictions, setMaintenancePredictions] = useState<MaintenancePrediction[]>([]);
    const [shutdownPrediction, setShutdownPrediction] = useState<ShutdownPrediction | null>(null);
    const [preventionRecommendations, setPreventionRecommendations] = useState<PreventionRecommendation[]>([]);
    const [expandedEquipment, setExpandedEquipment] = useState<string | null>(null);
    const [sensorData, setSensorData] = useState<{ [key: string]: SensorChartData }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch plants from Supabase
    useEffect(() => {
        const fetchPlants = async () => {
            try {
                const { supabase } = await import('@/lib/supabase');
                const { data, error } = await supabase
                    .from('plants')
                    .select('id, name, location, status')
                    .order('name');

                if (error) throw error;

                if (data && data.length > 0) {
                    setPlants(data);
                    setSelectedPlantId(data[0].id);
                } else {
                    // Use mock plant if none exist
                    setPlants([{ id: 'mock-plant-1', name: 'Gujarat Solar H2 Plant', location: 'Gujarat, India', status: 'operational' }]);
                    setSelectedPlantId('mock-plant-1');
                }
            } catch (err) {
                console.error('Failed to fetch plants:', err);
                // Use mock plant on error
                setPlants([{ id: 'mock-plant-1', name: 'Gujarat Solar H2 Plant', location: 'Gujarat, India', status: 'operational' }]);
                setSelectedPlantId('mock-plant-1');
            }
        };

        fetchPlants();
    }, []);

    // Fetch all data when plant changes
    useEffect(() => {
        if (!selectedPlantId) return;
        fetchAllData();
    }, [selectedPlantId]);

    const fetchAllData = async () => {
        if (!selectedPlantId) return;

        setLoading(true);
        setError(null);

        try {
            // Fetch equipment
            const equipmentRes = await fetch(`${ML_API_URL}/plant-maintenance/equipment/${selectedPlantId}`);
            const equipmentData = await equipmentRes.json();
            setEquipment(equipmentData.equipment || []);

            // Fetch energy sources
            const energyRes = await fetch(`${ML_API_URL}/plant-maintenance/energy-sources/${selectedPlantId}`);
            const energyData = await energyRes.json();
            setEnergySources(energyData.energy_sources || []);

            // Fetch all predictions
            const predictionsRes = await fetch(`${ML_API_URL}/plant-maintenance/predictions/${selectedPlantId}`);
            const predictionsData = await predictionsRes.json();

            setMaintenancePredictions(predictionsData.maintenance_predictions || []);
            setShutdownPrediction(predictionsData.shutdown_prediction || null);
            setPreventionRecommendations(predictionsData.prevention_recommendations || []);

        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError('Failed to load plant maintenance data. Please check that the ML service is running.');
        } finally {
            setLoading(false);
        }
    };

    const fetchSensorData = async (equipmentId: string) => {
        try {
            const res = await fetch(`${ML_API_URL}/plant-maintenance/equipment/${equipmentId}/sensor-data?hours=48`);
            const data = await res.json();
            setSensorData(prev => ({
                ...prev,
                [equipmentId]: data.data
            }));
        } catch (err) {
            console.error('Failed to fetch sensor data:', err);
        }
    };

    const toggleEquipmentStatus = async (equipmentId: string, newStatus: string) => {
        try {
            await fetch(`${ML_API_URL}/plant-maintenance/equipment/${equipmentId}/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            // Refresh equipment list
            fetchAllData();
        } catch (err) {
            console.error('Failed to toggle equipment:', err);
        }
    };

    const updateEnergySourceCondition = async (sourceId: string, condition: string) => {
        try {
            await fetch(`${ML_API_URL}/plant-maintenance/energy-sources/${sourceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ condition })
            });

            // Refresh energy sources
            fetchAllData();
        } catch (err) {
            console.error('Failed to update energy source:', err);
        }
    };

    const handleExpandEquipment = (equipmentId: string) => {
        if (expandedEquipment === equipmentId) {
            setExpandedEquipment(null);
        } else {
            setExpandedEquipment(equipmentId);
            if (!sensorData[equipmentId]) {
                fetchSensorData(equipmentId);
            }
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'operational': return 'text-green-400 bg-green-500/20';
            case 'maintenance': return 'text-yellow-400 bg-yellow-500/20';
            case 'warning': return 'text-orange-400 bg-orange-500/20';
            case 'offline': return 'text-red-400 bg-red-500/20';
            default: return 'text-gray-400 bg-gray-500/20';
        }
    };

    const getConditionColor = (condition: string) => {
        switch (condition) {
            case 'excellent': return 'text-green-400';
            case 'good': return 'text-blue-400';
            case 'fair': return 'text-yellow-400';
            case 'poor': return 'text-orange-400';
            case 'critical': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return 'border-red-500 bg-red-500/10';
            case 'high': return 'border-orange-500 bg-orange-500/10';
            case 'medium': return 'border-yellow-500 bg-yellow-500/10';
            case 'low': return 'border-blue-500 bg-blue-500/10';
            default: return 'border-gray-500 bg-gray-500/10';
        }
    };

    const getEnergySourceIcon = (type: string) => {
        switch (type) {
            case 'solar_panel': return <Sun className="w-5 h-5 text-yellow-400" />;
            case 'windmill': return <Wind className="w-5 h-5 text-blue-400" />;
            case 'hydro_turbine': return <Droplets className="w-5 h-5 text-cyan-400" />;
            default: return <Zap className="w-5 h-5 text-green-400" />;
        }
    };

    const getPredictionForEquipment = (equipmentId: string) => {
        return maintenancePredictions.find(p => p.equipment_id === equipmentId);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <RefreshCcw className="w-12 h-12 animate-spin text-hydrogen-500 mx-auto mb-4" />
                    <p className="text-gray-400">Loading plant maintenance data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center max-w-md">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={fetchAllData}
                        className="px-4 py-2 bg-hydrogen-500 rounded-lg hover:bg-hydrogen-600 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between"
                >
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Wrench className="w-8 h-8 text-hydrogen-400" />
                            Plant Maintenance Dashboard
                        </h1>
                        <p className="text-gray-400 mt-1">Monitor equipment health, predict failures, and prevent shutdowns</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <select
                            value={selectedPlantId}
                            onChange={(e) => setSelectedPlantId(e.target.value)}
                            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-hydrogen-500"
                        >
                            {plants.map(plant => (
                                <option key={plant.id} value={plant.id}>{plant.name}</option>
                            ))}
                        </select>

                        <button
                            onClick={fetchAllData}
                            className="px-4 py-2 bg-hydrogen-500 rounded-lg hover:bg-hydrogen-600 transition-colors flex items-center gap-2"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>
                </motion.div>

                {/* Shutdown Prediction Banner */}
                {shutdownPrediction && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`p-6 rounded-xl border ${shutdownPrediction.should_auto_shutdown
                            ? 'bg-red-900/30 border-red-500'
                            : shutdownPrediction.shutdown_probability > 0.5
                                ? 'bg-orange-900/30 border-orange-500'
                                : 'bg-green-900/30 border-green-500'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {shutdownPrediction.should_auto_shutdown ? (
                                    <ShieldAlert className="w-10 h-10 text-red-400" />
                                ) : (
                                    <ShieldCheck className="w-10 h-10 text-green-400" />
                                )}
                                <div>
                                    <h3 className="text-lg font-semibold text-white">
                                        {shutdownPrediction.should_auto_shutdown
                                            ? 'Auto-Shutdown Triggered!'
                                            : 'Plant Status Normal'}
                                    </h3>
                                    <p className="text-gray-400">
                                        Predicted shutdown: {new Date(shutdownPrediction.predicted_shutdown_date).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-6 text-center">
                                <div>
                                    <p className="text-2xl font-bold text-white">
                                        {shutdownPrediction.non_operational_percent.toFixed(0)}%
                                    </p>
                                    <p className="text-xs text-gray-400">Non-Operational</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Equipment Section - Takes 2 columns */}
                    <div className="lg:col-span-2 space-y-4">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <Activity className="w-5 h-5 text-hydrogen-400" />
                            Production Equipment
                        </h2>

                        <div className="space-y-4">
                            {equipment.map((eq) => {
                                const prediction = getPredictionForEquipment(eq.id);
                                const isExpanded = expandedEquipment === eq.id;

                                return (
                                    <motion.div
                                        key={eq.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden"
                                    >
                                        {/* Equipment Header */}
                                        <div
                                            className="p-4 cursor-pointer hover:bg-gray-700/30 transition-colors"
                                            onClick={() => handleExpandEquipment(eq.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(eq.status)}`}>
                                                        {eq.status.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-white">{eq.name}</h3>
                                                        <p className="text-sm text-gray-400 capitalize">{eq.equipment_type.replace('_', ' ')}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    {/* Current Readings */}
                                                    <div className="flex gap-4 text-sm">
                                                        <div className="flex items-center gap-1">
                                                            <Thermometer className="w-4 h-4 text-red-400" />
                                                            <span className="text-white">{eq.temperature.toFixed(1)}°C</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Gauge className="w-4 h-4 text-blue-400" />
                                                            <span className="text-white">{eq.pressure.toFixed(1)} bar</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="w-4 h-4 text-green-400" />
                                                            <span className="text-white">{eq.uptime_hours}h</span>
                                                        </div>
                                                    </div>

                                                    {/* Health Score */}
                                                    <div className="text-center">
                                                        <p className={`text-xl font-bold ${eq.health_score > 70 ? 'text-green-400' : eq.health_score > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                            {eq.health_score}%
                                                        </p>
                                                        <p className="text-xs text-gray-400">Health</p>
                                                    </div>

                                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                                </div>
                                            </div>

                                            {/* ML Prediction Preview */}
                                            {prediction && (
                                                <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <TrendingUp className="w-4 h-4 text-hydrogen-400" />
                                                        <span className="text-gray-400">Next maintenance in:</span>
                                                        <span className="text-white font-medium">
                                                            {Math.round(prediction.time_to_failure_hours)} hours
                                                        </span>
                                                    </div>
                                                    <div className={`px-2 py-1 rounded text-xs ${prediction.failure_probability > 0.7 ? 'bg-red-500/20 text-red-400' :
                                                        prediction.failure_probability > 0.4 ? 'bg-yellow-500/20 text-yellow-400' :
                                                            'bg-green-500/20 text-green-400'
                                                        }`}>
                                                        {(prediction.failure_probability * 100).toFixed(0)}% failure risk
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Expanded Section */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="border-t border-gray-700 p-4 space-y-4"
                                                >
                                                    {/* Sensor Charts */}
                                                    {sensorData[eq.id] && (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                                                <h4 className="text-sm font-medium text-gray-400 mb-2">Temperature (48h)</h4>
                                                                <ResponsiveContainer width="100%" height={150}>
                                                                    <LineChart data={sensorData[eq.id].temperature.slice(-24)}>
                                                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                                                        <XAxis dataKey="time" tick={false} stroke="#6B7280" />
                                                                        <YAxis stroke="#6B7280" />
                                                                        <Tooltip
                                                                            contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                                                                            labelStyle={{ color: '#9CA3AF' }}
                                                                        />
                                                                        <Line type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={2} dot={false} />
                                                                    </LineChart>
                                                                </ResponsiveContainer>
                                                            </div>

                                                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                                                <h4 className="text-sm font-medium text-gray-400 mb-2">Pressure (48h)</h4>
                                                                <ResponsiveContainer width="100%" height={150}>
                                                                    <LineChart data={sensorData[eq.id].pressure.slice(-24)}>
                                                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                                                        <XAxis dataKey="time" tick={false} stroke="#6B7280" />
                                                                        <YAxis stroke="#6B7280" />
                                                                        <Tooltip
                                                                            contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                                                                            labelStyle={{ color: '#9CA3AF' }}
                                                                        />
                                                                        <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={false} />
                                                                    </LineChart>
                                                                </ResponsiveContainer>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* ML Prediction Details */}
                                                    {prediction && (
                                                        <div className="bg-gray-900/50 p-4 rounded-lg">
                                                            <h4 className="text-sm font-medium text-gray-400 mb-3">ML Prediction Details</h4>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                                <div>
                                                                    <p className="text-gray-500">Time to Failure</p>
                                                                    <p className="text-white font-medium">{Math.round(prediction.time_to_failure_hours)} hours</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-gray-500">Failure Probability</p>
                                                                    <p className="text-white font-medium">{(prediction.failure_probability * 100).toFixed(1)}%</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-gray-500">Confidence</p>
                                                                    <p className="text-white font-medium">{(prediction.confidence * 100).toFixed(1)}%</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-gray-500">Predicted Date</p>
                                                                    <p className="text-white font-medium">{new Date(prediction.predicted_failure_date).toLocaleDateString()}</p>
                                                                </div>
                                                            </div>
                                                            <div className="mt-3 pt-3 border-t border-gray-700">
                                                                <p className="text-gray-500 text-sm">Recommended Action</p>
                                                                <p className="text-hydrogen-400">{prediction.recommended_action}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Threshold Settings */}
                                                    <div className="bg-gray-900/50 p-4 rounded-lg">
                                                        <h4 className="text-sm font-medium text-gray-400 mb-3">Auto-Shutdown Thresholds</h4>
                                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                                            <div>
                                                                <p className="text-gray-500">Max Temperature</p>
                                                                <p className="text-white">{eq.max_temperature}°C</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-gray-500">Max Pressure</p>
                                                                <p className="text-white">{eq.max_pressure} bar</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-gray-500">Max Uptime</p>
                                                                <p className="text-white">{eq.max_uptime_hours} hours</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleEquipmentStatus(eq.id, eq.status === 'operational' ? 'offline' : 'operational');
                                                            }}
                                                            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${eq.status === 'operational'
                                                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                                                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                                } transition-colors`}
                                                        >
                                                            <Power className="w-4 h-4" />
                                                            {eq.status === 'operational' ? 'Take Offline' : 'Bring Online'}
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Column - Energy Sources & Recommendations */}
                    <div className="space-y-6">
                        {/* Energy Sources */}
                        <div>
                            <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                                <Zap className="w-5 h-5 text-yellow-400" />
                                Energy Sources
                            </h2>

                            <div className="space-y-3">
                                {energySources.map((source) => (
                                    <motion.div
                                        key={source.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {getEnergySourceIcon(source.source_type)}
                                                <div>
                                                    <h3 className="text-white font-medium">{source.name}</h3>
                                                    <p className={`text-sm ${getConditionColor(source.condition)}`}>
                                                        {source.condition.charAt(0).toUpperCase() + source.condition.slice(1)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-bold text-white">{source.efficiency_percent}%</p>
                                                <p className="text-xs text-gray-400">Efficiency</p>
                                            </div>
                                        </div>

                                        {/* Condition Selector */}
                                        <div className="mt-3 pt-3 border-t border-gray-700">
                                            <select
                                                value={source.condition}
                                                onChange={(e) => updateEnergySourceCondition(source.id, e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-hydrogen-500"
                                            >
                                                <option value="excellent">Excellent</option>
                                                <option value="good">Good</option>
                                                <option value="fair">Fair</option>
                                                <option value="poor">Poor</option>
                                                <option value="critical">Critical</option>
                                            </select>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Prevention Recommendations */}
                        <div>
                            <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                                <ShieldCheck className="w-5 h-5 text-green-400" />
                                Prevention Recommendations
                            </h2>

                            <div className="space-y-3">
                                {preventionRecommendations.slice(0, 5).map((rec, index) => (
                                    <motion.div
                                        key={rec.id || index}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border-l-4 p-4 ${getPriorityColor(rec.priority)}`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="text-sm text-white">{rec.action}</p>
                                                <p className="text-xs text-gray-400 mt-1">{rec.estimated_impact}</p>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded capitalize ${rec.priority === 'critical' ? 'bg-red-500/30 text-red-400' :
                                                rec.priority === 'high' ? 'bg-orange-500/30 text-orange-400' :
                                                    rec.priority === 'medium' ? 'bg-yellow-500/30 text-yellow-400' :
                                                        'bg-blue-500/30 text-blue-400'
                                                }`}>
                                                {rec.priority}
                                            </span>
                                        </div>
                                        {rec.estimated_cost && (
                                            <p className="text-xs text-gray-500 mt-2">Est. cost: {rec.estimated_cost}</p>
                                        )}
                                    </motion.div>
                                ))}

                                {preventionRecommendations.length === 0 && (
                                    <div className="text-center py-8 text-gray-400">
                                        <ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>No recommendations at this time</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlantMaintenance;
