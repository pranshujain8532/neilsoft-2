import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Sun, Wind, Droplets, Battery, BatteryCharging, Zap,
    ArrowDown, RefreshCcw, AlertTriangle,
    TrendingUp, Activity, Settings, AlertCircle, Trash2
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// Types
interface ProductionData {
    id: string;
    energy_kwh: number;
    capacity_kwh: number;
    efficiency: number;
    time: string;
}

interface BatteryStatus {
    capacity_kwh: number;
    current_charge_kwh: number;
    charge_percent: number;
    is_charging: boolean;
    is_discharging: boolean;
    charging_from: string | null;
    health_percent: number;
    cycles_used: number;
}

interface WaterRecyclingData {
    hydrogen_kg: number;
    water_consumed: number;
    water_recovered: number;
    recovery_efficiency: number;
    water_for_hydro: number;
    time: string;
}

interface EnergyBalance {
    production: {
        solar_kwh: number;
        wind_kwh: number;
        hydro_kwh: number;
        total_kwh: number;
    };
    excess: {
        solar_kwh: number;
        wind_kwh: number;
        total_excess_kwh: number;
    };
    water_recycling: {
        hydrogen_produced_kg: number;
        water_consumed_liters: number;
        water_recovered_liters: number;
        water_for_hydro_liters: number;
        hydro_potential_kwh: number;
        recovery_efficiency_percent: number;
    };
    recommendations: Array<{
        priority: string;
        action: string;
        details: string;
    }>;
}



interface Plant {
    id: string;
    name: string;
}



interface SourceBreakdown {
    source_type: string;
    total_kwh: number;
    percentage: number;
}

interface OverflowData {
    total_overflow_kwh: number;
    by_source: Array<{ source_type: string; overflow_kwh: number }>;
}

// Real-time energy from backend (time-aware, weather-based)
interface RealtimeEnergy {
    solar: {
        power_kw: number;
        status: string;
        reason: string;
        sun_info: {
            is_daylight: boolean;
            sunrise: string;
            sunset: string;
            sun_elevation: number;
        };
        efficiency_percent: number;
    };
    wind: {
        power_kw: number;
        status: string;
        reason: string;
        wind_speed_ms: number;
        efficiency_percent: number;
    };
    hydro: {
        power_kw: number;
        status: string;
        reason: string;
        efficiency_percent: number;
    };
    total_power_kw: number;
    total_capacity_kw: number;
    utilization_percent: number;
    dominant_source: string;
}

interface WeatherData {
    temperature: number;
    wind_speed: number;
    cloud_cover: number;
    solar_irradiance: number;
    description?: string;
    humidity?: number;
}

interface CarbonSavings {
    co2_saved_kg: number;
    trees_equivalent: number;
    car_km_equivalent: number;
}

interface EfficiencyGrade {
    grade: string;
    score: number;
    breakdown: {
        utilization: number;
        waste_reduction: number;
        battery_usage: number;
    };
}

// Grid routing types
interface GridRoutingData {
    is_overflow: boolean;
    overflow_kw: number;
    production_kw: number;
    total_capacity_kw: number;
    battery_percent: number;
    recommended_action: {
        action: string;
        reason: string;
        priority: number;
    };
    nearest_grid_point?: {
        name: string;
        distance_km: number;
    };
    export_24h?: Array<{ time: string; export_kwh: number }>;
    import_export_summary?: {
        import: { kwh: number; cost: number };
        export: { kwh: number; revenue: number };
    };
}

const ML_API_URL = (import.meta as any).env?.VITE_ML_API_URL || 'http://localhost:5001';

// Helper to format large kWh values
const formatEnergy = (kwh: number | undefined | null): string => {
    const val = kwh ?? 0;
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)} GWh`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)} MWh`;
    return `${val.toFixed(1)} kWh`;
};

// Format power in kW
const formatPower = (kw: number | undefined | null): string => {
    const val = kw ?? 0;
    if (val >= 1000) return `${(val / 1000).toFixed(1)} MW`;
    return `${val.toFixed(1)} kW`;
};

const RenewableEnergy = () => {
    const [plants, setPlants] = useState<Plant[]>([]);
    const [selectedPlantId, setSelectedPlantId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Data states
    const [solarData, setSolarData] = useState<ProductionData[]>([]);
    const [windData, setWindData] = useState<ProductionData[]>([]);
    const [hydroData, setHydroData] = useState<ProductionData[]>([]);
    const [battery, setBattery] = useState<BatteryStatus | null>(null);
    const [waterHistory, setWaterHistory] = useState<WaterRecyclingData[]>([]);
    const [energyBalance, setEnergyBalance] = useState<EnergyBalance | null>(null);
    const [totals, setTotals] = useState<any>({});


    const [sourceBreakdown, setSourceBreakdown] = useState<SourceBreakdown[]>([]);
    const [overflowData, setOverflowData] = useState<OverflowData | null>(null);

    // Real-time states (weather-based, time-aware)
    const [realtimeEnergy, setRealtimeEnergy] = useState<RealtimeEnergy | null>(null);
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [carbonSavings, setCarbonSavings] = useState<CarbonSavings | null>(null);
    const [efficiencyGrade, setEfficiencyGrade] = useState<EfficiencyGrade | null>(null);
    const [isNight, setIsNight] = useState(false);
    const [gridRouting, setGridRouting] = useState<GridRoutingData | null>(null);

    // Fetch plants
    useEffect(() => {
        const fetchPlants = async () => {
            try {
                const { supabase } = await import('@/lib/supabase');
                const { data, error } = await supabase
                    .from('plants')
                    .select('id, name')
                    .order('name');

                if (error) throw error;
                if (data && data.length > 0) {
                    setPlants(data);
                    setSelectedPlantId(data[0].id);
                }
            } catch (err) {
                console.error('Failed to fetch plants:', err);
            }
        };
        fetchPlants();
    }, []);

    // Fetch dashboard data
    useEffect(() => {
        if (!selectedPlantId) return;
        fetchAllData();
    }, [selectedPlantId]);

    const fetchAllData = async () => {
        if (!selectedPlantId) return;

        setLoading(true);
        setError(null);

        try {
            // Fetch dashboard data from single endpoint
            const dashboardRes = await fetch(`${ML_API_URL}/renewable-energy/dashboard/${selectedPlantId}?hours=24`);

            if (!dashboardRes.ok) {
                throw new Error(`API error: ${dashboardRes.status}`);
            }

            const data = await dashboardRes.json();

            // Set production data
            if (data.production?.production) {
                setSolarData(data.production.production.solar || []);
                setWindData(data.production.production.wind || []);
                setHydroData(data.production.production.hydro || []);
                setTotals(data.production.totals || {});
            }

            // Set battery status
            if (data.battery) {
                setBattery(data.battery);
            }

            // Set water recycling
            if (data.water_recycling?.history) {
                setWaterHistory(data.water_recycling.history);
            }

            // Set energy balance
            if (data.energy_balance) {
                setEnergyBalance(data.energy_balance);
            }

            // Set REAL-TIME energy data (time-aware, weather-based)
            if (data.realtime) {
                setRealtimeEnergy(data.realtime);


            }

            // Set weather data
            if (data.weather) {
                setWeather(data.weather);
            }

            // Set carbon savings
            if (data.carbon_savings) {
                setCarbonSavings(data.carbon_savings);
            }

            // Set efficiency grade
            if (data.efficiency_grade) {
                setEfficiencyGrade(data.efficiency_grade);
            }

            // Set night/day status
            if (data.is_night !== undefined) {
                setIsNight(data.is_night);
            }

            // Fetch Smart Surplus Management data for overflow/source breakdown
            try {
                const surplusRes = await fetch(`${ML_API_URL}/smart-surplus/dashboard/${selectedPlantId}`);
                if (surplusRes.ok) {
                    const surplusData = await surplusRes.json();
                    if (surplusData.dashboard) {
                        setSourceBreakdown(surplusData.dashboard.source_breakdown || []);
                        setOverflowData(surplusData.dashboard.overflow || { total_overflow_kwh: 0, by_source: [] });
                    }
                }
            } catch (surplusErr) {
                console.warn('Surplus data not available:', surplusErr);
            }

            // Fetch Grid Routing data (live overflow, grid export)
            try {
                const routingRes = await fetch(`${ML_API_URL}/surplus-routing/dashboard/${selectedPlantId}`);
                if (routingRes.ok) {
                    const routingData = await routingRes.json();
                    if (routingData.success) {
                        setGridRouting({
                            is_overflow: routingData.overflow_status?.is_overflow || false,
                            overflow_kw: routingData.live_overflow_kw || 0,
                            production_kw: routingData.overflow_status?.production_kw || 0,
                            total_capacity_kw: routingData.overflow_status?.total_capacity_kw || 0,
                            battery_percent: routingData.overflow_status?.battery_percent || 0,
                            recommended_action: routingData.recommended_action || { action: 'none', reason: '', priority: 0 },
                            nearest_grid_point: routingData.nearest_grid_point,
                            export_24h: routingData.export_24h_chart,
                            import_export_summary: routingData.import_export_summary
                        });
                    }
                }
            } catch (routingErr) {
                console.warn('Grid routing data not available:', routingErr);
            }

        } catch (err: any) {
            console.error('Failed to fetch renewable data:', err);
            setError(err.message || 'Failed to load renewable energy data');
        } finally {
            setLoading(false);
        }
    };

    const handleOptimize = async () => {
        try {
            const res = await fetch(`${ML_API_URL}/renewable-energy/optimize/${selectedPlantId}`, {
                method: 'POST'
            });

            if (res.ok) {
                fetchAllData(); // Refresh data
            }
        } catch (err) {
            console.error('Optimization failed:', err);
        }
    };

    const formatTime = (timeStr: string) => {
        try {
            return new Date(timeStr).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return timeStr;
        }
    };

    // Prepare chart data
    const prepareChartData = () => {
        // Combine solar, wind, hydro data for comparison chart
        const maxLen = Math.max(solarData.length, windData.length, hydroData.length);
        const combined = [];

        for (let i = 0; i < maxLen; i++) {
            combined.push({
                time: formatTime(solarData[i]?.time || windData[i]?.time || hydroData[i]?.time || ''),
                solar: solarData[i]?.energy_kwh || 0,
                wind: windData[i]?.energy_kwh || 0,
                hydro: hydroData[i]?.energy_kwh || 0
            });
        }

        // Return only 12 data points (every 2 hours) for cleaner chart
        const sampled = [];
        const step = Math.max(1, Math.floor(combined.length / 12));
        for (let i = 0; i < combined.length; i += step) {
            sampled.push(combined[i]);
        }
        return sampled.slice(-12);
    };

    const prepareWaterChart = () => {
        // Sample every few points and scale down
        const sampled = [];
        const step = Math.max(1, Math.floor(waterHistory.length / 8));
        for (let i = 0; i < waterHistory.length; i += step) {
            const w = waterHistory[i];
            sampled.push({
                time: formatTime(w.time),
                consumed: w.water_consumed / 100,
                recovered: w.water_recovered / 100,
                forHydro: w.water_for_hydro / 100
            });
        }
        return sampled.slice(-8);
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return 'text-red-400 bg-red-500/20';
            case 'high': return 'text-orange-400 bg-orange-500/20';
            case 'medium': return 'text-yellow-400 bg-yellow-500/20';
            case 'low': return 'text-blue-400 bg-blue-500/20';
            default: return 'text-gray-400 bg-gray-500/20';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <RefreshCcw className="w-12 h-12 animate-spin text-hydrogen-500 mx-auto mb-4" />
                    <p className="text-gray-400">Loading renewable energy data...</p>
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
                            <Zap className="w-8 h-8 text-yellow-400" />
                            Renewable Energy Dashboard
                        </h1>
                        <p className="text-gray-400 mt-1">
                            Solar, Wind & Hydro production with battery storage and water recycling
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <select
                            value={selectedPlantId}
                            onChange={(e) => setSelectedPlantId(e.target.value)}
                            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        >
                            {plants.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>

                        <button
                            onClick={handleOptimize}
                            className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                            <Settings className="w-4 h-4" />
                            Optimize
                        </button>

                        <button
                            onClick={fetchAllData}
                            className="px-4 py-2 bg-hydrogen-500 rounded-lg hover:bg-hydrogen-600 transition-colors flex items-center gap-2"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>
                </motion.div>

                {/* Real-Time Weather & Carbon Savings Bar */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                    {/* Weather Display */}
                    {weather && (
                        <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 rounded-xl p-4 border border-blue-500/20">
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">{weather.description?.includes('cloud') ? '☁️' : weather.description?.includes('rain') ? '🌧️' : '☀️'}</div>
                                <div>
                                    <p className="text-white font-semibold">{weather.temperature?.toFixed(1)}°C</p>
                                    <p className="text-gray-400 text-xs capitalize">{weather.description || 'Clear'}</p>
                                </div>
                                <div className="ml-auto text-right">
                                    <p className="text-blue-400 text-sm">{weather.wind_speed?.toFixed(1)} m/s wind</p>
                                    <p className="text-gray-400 text-xs">{weather.humidity}% humidity</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Carbon Savings */}
                    {carbonSavings && (
                        <div className="bg-gradient-to-r from-emerald-900/30 to-green-900/30 rounded-xl p-4 border border-green-500/20">
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">🌱</div>
                                <div>
                                    <p className="text-green-400 font-bold text-lg">{carbonSavings.co2_saved_kg?.toFixed(1)} kg CO₂</p>
                                    <p className="text-gray-400 text-xs">Carbon saved today</p>
                                </div>
                                <div className="ml-auto text-right">
                                    <p className="text-green-400 text-sm">🌳 {carbonSavings.trees_equivalent?.toFixed(0)} trees</p>
                                    <p className="text-gray-400 text-xs">equivalent planted</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 24h Total from DB */}
                    <div className="bg-gradient-to-r from-purple-900/30 to-violet-900/30 rounded-xl p-4 border border-purple-500/20">
                        <div className="flex items-center gap-3">
                            <div className="text-3xl">⚡</div>
                            <div>
                                <p className="text-purple-400 font-bold text-lg">{formatEnergy(totals.total_generated_kwh || 0)}</p>
                                <p className="text-gray-400 text-xs">24h Total Generated</p>
                            </div>
                            <div className="ml-auto text-right">
                                <p className="text-yellow-400 text-sm">{formatEnergy(totals.solar_total_kwh || 0)} Solar</p>
                                <p className="text-blue-400 text-xs">{formatEnergy(totals.wind_total_kwh || 0)} Wind</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Summary Cards - Now using REAL-TIME data */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Solar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`bg-gradient-to-br ${isNight ? 'from-gray-900/50 to-gray-800/50 border-gray-600/30' : 'from-yellow-900/30 to-orange-900/30 border-yellow-500/30'} border rounded-xl p-4`}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <Sun className={`w-8 h-8 ${isNight ? 'text-gray-500' : 'text-yellow-400'}`} />
                            <div>
                                <h3 className="text-white font-medium">Solar Energy</h3>
                                <p className="text-xs text-gray-400">
                                    {realtimeEnergy?.solar?.status === 'night'
                                        ? `Night - Sunrise ${realtimeEnergy?.solar?.sun_info?.sunrise || '6:00'}`
                                        : 'Real-time production'
                                    }
                                </p>
                            </div>
                        </div>
                        <p className={`text-2xl font-bold ${isNight ? 'text-gray-500' : 'text-yellow-400'}`}>
                            {formatPower(realtimeEnergy?.solar?.power_kw || 0)}
                        </p>
                        {realtimeEnergy?.solar?.reason && (
                            <p className={`text-xs mt-1 ${isNight ? 'text-gray-500' : 'text-yellow-400/70'}`}>
                                {realtimeEnergy.solar.reason}
                            </p>
                        )}
                    </motion.div>

                    {/* Wind */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-500/30 rounded-xl p-4"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <Wind className="w-8 h-8 text-blue-400" />
                            <div>
                                <h3 className="text-white font-medium">Wind Energy</h3>
                                <p className="text-xs text-gray-400">
                                    {realtimeEnergy?.wind?.wind_speed_ms
                                        ? `${realtimeEnergy.wind.wind_speed_ms.toFixed(1)} m/s`
                                        : 'Real-time production'
                                    }
                                </p>
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-blue-400">
                            {formatPower(realtimeEnergy?.wind?.power_kw || 0)}
                        </p>
                        {realtimeEnergy?.wind?.reason && (
                            <p className="text-xs text-blue-400/70 mt-1">
                                {realtimeEnergy.wind.reason}
                            </p>
                        )}
                    </motion.div>

                    {/* Hydro */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gradient-to-br from-cyan-900/30 to-teal-900/30 border border-cyan-500/30 rounded-xl p-4"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <Droplets className="w-8 h-8 text-cyan-400" />
                            <div>
                                <h3 className="text-white font-medium">Hydro Energy</h3>
                                <p className="text-xs text-gray-400">From recycled water</p>
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-cyan-400">
                            {formatPower(realtimeEnergy?.hydro?.power_kw || 0)}
                        </p>
                        {realtimeEnergy?.hydro?.reason && (
                            <p className="text-xs text-cyan-400/70 mt-1">
                                {realtimeEnergy.hydro.reason}
                            </p>
                        )}
                    </motion.div>

                    {/* Total + Efficiency Grade */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-xl p-4"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="w-8 h-8 text-green-400" />
                                <div>
                                    <h3 className="text-white font-medium">Total Power</h3>
                                    <p className="text-xs text-gray-400">All sources</p>
                                </div>
                            </div>
                            {efficiencyGrade && (
                                <div className={`text-2xl font-bold ${efficiencyGrade.grade.startsWith('A') ? 'text-green-400' :
                                    efficiencyGrade.grade.startsWith('B') ? 'text-blue-400' :
                                        efficiencyGrade.grade.startsWith('C') ? 'text-yellow-400' : 'text-red-400'
                                    }`}>
                                    {efficiencyGrade.grade}
                                </div>
                            )}
                        </div>
                        <p className="text-2xl font-bold text-green-400">
                            {formatPower(realtimeEnergy?.total_power_kw || 0)}
                        </p>
                        <p className="text-xs text-green-400/70 mt-1">
                            {realtimeEnergy?.utilization_percent?.toFixed(0) || 0}% utilization
                        </p>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Production Charts */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Production Comparison Chart */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6"
                        >
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                                <Activity className="w-5 h-5 text-hydrogen-400" />
                                Energy Production Comparison (24h)
                            </h3>

                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={prepareChartData()}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="time" stroke="#6B7280" fontSize={10} />
                                    <YAxis stroke="#6B7280" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                                        labelStyle={{ color: '#9CA3AF' }}
                                    />
                                    <Legend />
                                    <Area type="monotone" dataKey="solar" stackId="1" stroke="#FBBF24" fill="#FBBF24" fillOpacity={0.6} name="Solar" />
                                    <Area type="monotone" dataKey="wind" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} name="Wind" />
                                    <Area type="monotone" dataKey="hydro" stackId="1" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.6} name="Hydro" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </motion.div>

                        {/* Water Recycling Chart */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6"
                        >
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                                <Droplets className="w-5 h-5 text-cyan-400" />
                                Water Recycling (24h)
                            </h3>

                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={prepareWaterChart()}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="time" stroke="#6B7280" fontSize={10} />
                                    <YAxis stroke="#6B7280" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                                        labelStyle={{ color: '#9CA3AF' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="consumed" fill="#EF4444" name="Consumed (L)" />
                                    <Bar dataKey="recovered" fill="#10B981" name="Recovered (L)" />
                                    <Bar dataKey="forHydro" fill="#06B6D4" name="For Hydro (L)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </motion.div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Battery Status */}
                        {battery && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6"
                            >
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                                    {battery.is_charging ? (
                                        <BatteryCharging className="w-5 h-5 text-green-400" />
                                    ) : (
                                        <Battery className="w-5 h-5 text-yellow-400" />
                                    )}
                                    Battery Storage (40% Capacity)
                                </h3>

                                {/* Battery visualization */}
                                <div className="relative h-8 bg-gray-700 rounded-full overflow-hidden mb-4">
                                    <div
                                        className={`h-full transition-all duration-500 ${battery.charge_percent > 60 ? 'bg-green-500' :
                                            battery.charge_percent > 30 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}
                                        style={{ width: `${battery.charge_percent}%` }}
                                    />
                                    <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                                        {((battery?.charge_percent) ?? 0).toFixed(1)}%
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-400">Current Charge</p>
                                        <p className="text-white font-medium">
                                            {formatEnergy(battery.current_charge_kwh)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">Capacity</p>
                                        <p className="text-white font-medium">
                                            {formatEnergy(battery.capacity_kwh)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">Health</p>
                                        <p className={`font-medium ${battery.health_percent > 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                                            {battery.health_percent}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">Cycles Used</p>
                                        <p className="text-white font-medium">{battery.cycles_used}</p>
                                    </div>
                                </div>

                                {battery.is_charging && battery.charging_from && (
                                    <div className="mt-4 pt-4 border-t border-gray-700 flex items-center gap-2">
                                        <ArrowDown className="w-4 h-4 text-green-400 animate-bounce" />
                                        <span className="text-green-400 text-sm">
                                            Charging from {battery.charging_from}
                                        </span>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Smart Surplus Management */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 }}
                            className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-xl p-6"
                        >
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                                <AlertCircle className="w-5 h-5 text-purple-400" />
                                Smart Surplus Management
                            </h3>

                            {/* Live Overflow Formula Calculation */}
                            {(() => {
                                // Calculate real values
                                const production = realtimeEnergy?.total_power_kw || 0;
                                const plantCapacity = realtimeEnergy?.total_capacity_kw || 100;
                                const batteryCapacity = battery?.capacity_kwh || 100;
                                const batteryLevel = battery?.charge_percent || 0;
                                const overflowThreshold = plantCapacity + batteryCapacity;
                                const isOverflow = production > overflowThreshold && batteryLevel >= 85;
                                const overflowAmount = Math.max(0, production - overflowThreshold);

                                return (
                                    <div className="space-y-4">
                                        {/* Overflow Formula Visualization */}
                                        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                                            <p className="text-xs text-gray-400 mb-2">Overflow Detection Formula:</p>
                                            <div className="flex items-center justify-center gap-2 text-sm font-mono">
                                                <span className={`px-2 py-1 rounded ${production > 0 ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                                                    {production.toFixed(1)} kW
                                                </span>
                                                <span className="text-gray-500">&gt;</span>
                                                <span className="text-gray-400">(</span>
                                                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">{plantCapacity} kW</span>
                                                <span className="text-gray-500">+</span>
                                                <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded">{batteryCapacity} kWh</span>
                                                <span className="text-gray-400">)</span>
                                            </div>
                                            <p className="text-xs text-center text-gray-500 mt-2">
                                                Production &gt; (Plant Capacity + Battery Capacity)
                                            </p>
                                        </div>

                                        {/* Status Indicator */}
                                        <div className={`p-3 rounded-lg border ${isOverflow ? 'bg-red-500/20 border-red-500/40' : 'bg-green-500/20 border-green-500/40'}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {isOverflow ? (
                                                        <AlertTriangle className="w-5 h-5 text-red-400" />
                                                    ) : (
                                                        <TrendingUp className="w-5 h-5 text-green-400" />
                                                    )}
                                                    <span className={isOverflow ? 'text-red-400 font-medium' : 'text-green-400 font-medium'}>
                                                        {isOverflow ? `OVERFLOW: ${overflowAmount.toFixed(1)} kW` : 'System Normal'}
                                                    </span>
                                                </div>
                                                <span className={`text-xs ${batteryLevel >= 85 ? 'text-yellow-400' : 'text-gray-400'}`}>
                                                    Battery: {batteryLevel.toFixed(0)}% {batteryLevel >= 85 ? '(High)' : ''}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Priority Actions */}
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className={`p-2 rounded border ${isOverflow ? 'bg-orange-500/20 border-orange-500/30' : 'bg-gray-700/30 border-gray-600'}`}>
                                                <p className="text-gray-400">Priority 1</p>
                                                <p className={`font-medium ${isOverflow ? 'text-orange-400' : 'text-gray-500'}`}>
                                                    🚛 Truck Loading
                                                </p>
                                            </div>
                                            <div className={`p-2 rounded border ${isOverflow && batteryLevel >= 85 ? 'bg-purple-500/20 border-purple-500/30' : 'bg-gray-700/30 border-gray-600'}`}>
                                                <p className="text-gray-400">Priority 2</p>
                                                <p className={`font-medium ${isOverflow ? 'text-purple-400' : 'text-gray-500'}`}>
                                                    ⚡ Grid Export
                                                </p>
                                            </div>
                                        </div>

                                        {/* Current Status Message */}
                                        {!isOverflow && (
                                            <p className="text-xs text-center text-gray-500">
                                                {production === 0
                                                    ? '☀️ Night time - Solar panels inactive. Wind below cut-in speed.'
                                                    : `Production ${production.toFixed(1)} kW is within ${overflowThreshold} kW threshold`}
                                            </p>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Overflow Warning */}
                            {overflowData && overflowData.total_overflow_kwh > 0 && (
                                <div className="mt-4 p-3 bg-red-500/20 rounded-lg border border-red-500/30">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Trash2 className="w-4 h-4 text-red-400" />
                                        <span className="text-red-400 font-medium">Energy Overflow (24h)</span>
                                    </div>
                                    <p className="text-red-300 text-lg font-bold">
                                        {formatEnergy(overflowData.total_overflow_kwh)}
                                    </p>
                                    <div className="mt-2 space-y-1">
                                        {overflowData.by_source.map((src, i) => (
                                            <div key={i} className="flex justify-between text-xs">
                                                <span className="text-gray-400 capitalize">{src.source_type} Overflow</span>
                                                <span className="text-red-400">{formatEnergy(src.overflow_kwh)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Source Breakdown */}
                            {sourceBreakdown.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-700">
                                    <p className="text-gray-400 text-xs mb-2">Battery Charging Sources (24h)</p>
                                    <div className="space-y-2">
                                        {sourceBreakdown.map((src, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all ${src.source_type === 'solar' ? 'bg-yellow-500' :
                                                            src.source_type === 'wind' ? 'bg-blue-500' : 'bg-cyan-500'
                                                            }`}
                                                        style={{ width: `${src.percentage}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-400 w-20 capitalize">
                                                    {src.source_type}: {src.percentage.toFixed(0)}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>

                        {/* Grid Routing - Live Overflow & Export */}
                        {gridRouting && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.15 }}
                                className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 backdrop-blur-sm rounded-xl border border-purple-500/30 p-6"
                            >
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                                    <Zap className="w-5 h-5 text-purple-400" />
                                    Grid Routing System
                                </h3>

                                {/* Live Overflow Counter */}
                                <div className={`p-4 rounded-lg mb-4 ${gridRouting.is_overflow ? 'bg-red-500/20 border border-red-500/30' : 'bg-green-500/20 border border-green-500/30'}`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-gray-400">Live Overflow Status</p>
                                            <p className={`text-2xl font-bold ${gridRouting.is_overflow ? 'text-red-400' : 'text-green-400'}`}>
                                                {gridRouting.is_overflow ? `${formatPower(gridRouting.overflow_kw)} Overflow!` : 'Normal'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-400">Battery</p>
                                            <p className="text-lg font-bold text-white">{gridRouting.battery_percent.toFixed(0)}%</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Recommended Action */}
                                {gridRouting.recommended_action && gridRouting.recommended_action.action !== 'none' && (
                                    <div className="p-3 bg-yellow-500/20 rounded-lg border border-yellow-500/30 mb-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                                            <span className="text-yellow-400 font-medium capitalize">
                                                Recommended: {gridRouting.recommended_action.action.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-300">{gridRouting.recommended_action.reason}</p>
                                    </div>
                                )}

                                {/* Nearest Grid Point */}
                                {gridRouting.nearest_grid_point && (
                                    <div className="p-3 bg-gray-700/30 rounded-lg mb-4">
                                        <p className="text-xs text-gray-400">Nearest Grid Point</p>
                                        <p className="text-white font-medium">{gridRouting.nearest_grid_point.name}</p>
                                        <p className="text-xs text-gray-400">{gridRouting.nearest_grid_point.distance_km} km away</p>
                                    </div>
                                )}

                                {/* Import/Export Summary */}
                                {gridRouting.import_export_summary && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                                            <p className="text-xs text-gray-400">Grid Import</p>
                                            <p className="text-red-400 font-bold">{formatEnergy(gridRouting.import_export_summary.import?.kwh || 0)}</p>
                                            <p className="text-xs text-gray-500">₹{(gridRouting.import_export_summary.import?.cost || 0).toFixed(0)} spent</p>
                                        </div>
                                        <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                                            <p className="text-xs text-gray-400">Grid Export</p>
                                            <p className="text-green-400 font-bold">{formatEnergy(gridRouting.import_export_summary.export?.kwh || 0)}</p>
                                            <p className="text-xs text-gray-500">₹{(gridRouting.import_export_summary.export?.revenue || 0).toFixed(0)} earned</p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Recommendations */}
                        {energyBalance?.recommendations && energyBalance.recommendations.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6"
                            >
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                                    <Settings className="w-5 h-5 text-hydrogen-400" />
                                    Energy Recommendations
                                </h3>

                                <div className="space-y-3">
                                    {energyBalance.recommendations.map((rec, i) => (
                                        <div
                                            key={i}
                                            className={`p-3 rounded-lg ${getPriorityColor(rec.priority)}`}
                                        >
                                            <p className="text-white text-sm font-medium">{rec.action}</p>
                                            <p className="text-xs opacity-80 mt-1">{rec.details}</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}


                    </div>
                </div>
            </div>
        </div>
    );
};

export default RenewableEnergy;
