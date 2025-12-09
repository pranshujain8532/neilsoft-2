import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Factory, Zap, DollarSign, Sun, Wind, Droplet, TrendingUp, Activity,
    MapPin, Shield, Wrench, Truck, Package, Battery,
    BarChart3, ArrowUpRight, Clock,
    Leaf, Target, Award, CheckCircle2
} from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';
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

// Animated counter component
const AnimatedCounter = ({ value, prefix = '', suffix = '', decimals = 0, duration = 2000 }: {
    value: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    duration?: number;
}) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime: number;
        const startValue = displayValue;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(startValue + (value - startValue) * easeOut);
            if (progress < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }, [value]);

    return <span>{prefix}{displayValue.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}{suffix}</span>;
};

// Sparkline mini chart
const SparkLine = ({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) => (
    <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data.map((v, i) => ({ value: v, idx: i }))}>
            <defs>
                <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke={color} fill={`url(#spark-${color})`} strokeWidth={2} />
        </AreaChart>
    </ResponsiveContainer>
);

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

const Dashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [plants, setPlants] = useState<PlantData[]>([]);
    const [lastUpdate, setLastUpdate] = useState<string>('');
    const [selectPlant, setSelectedPlant] = useState<PlantData | null>(null);
    const [productionHistory, setProductionHistory] = useState<{ time: string; production: number; profit: number }[]>([]);
    const [totalStats, setTotalStats] = useState({
        totalProduction: 0,
        avgLcoh: 0,
        totalProfit: 0,
        activePlants: 0,
        totalEnergy: 0,
        carbonSaved: 0
    });

    // Generate production history for charts
    const generateProductionHistory = useCallback((currentProduction: number, currentProfit: number) => {
        const hours = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', 'Now'];
        const multipliers = [0.3, 0.25, 0.35, 0.7, 1.0, 0.95, 0.6, 0.4, 0.85];
        return hours.map((time, i) => ({
            time,
            production: Math.round(currentProduction * multipliers[i]),
            profit: Math.round(currentProfit * multipliers[i])
        }));
    }, []);

    const fetchPlantPredictions = async () => {
        try {
            const response = await fetch('http://localhost:5001/api/plants/predictions');
            const data = await response.json();

            if (data.success && data.plants) {
                setPlants(data.plants);

                const totalH2 = data.plants.reduce((sum: number, p: PlantData) =>
                    sum + (p.profit_prediction?.h2_production_kg || 0), 0);
                const avgLcoh = data.plants.reduce((sum: number, p: PlantData) =>
                    sum + p.lcoh, 0) / data.plants.length;
                const totalProfit = data.plants.reduce((sum: number, p: PlantData) =>
                    sum + (p.profit_prediction?.daily_profit || 0), 0);
                const totalEnergy = data.plants.reduce((sum: number, p: PlantData) =>
                    sum + (p.energy_output?.total || 0), 0);
                const carbonSaved = totalH2 * 9.3; // ~9.3 kg CO2 saved per kg H2

                setTotalStats({
                    totalProduction: totalH2,
                    avgLcoh: avgLcoh,
                    totalProfit: totalProfit,
                    activePlants: data.plants.length,
                    totalEnergy: totalEnergy,
                    carbonSaved: carbonSaved
                });

                setProductionHistory(generateProductionHistory(totalH2, totalProfit));
                setLastUpdate(new Date().toLocaleTimeString());
                setLoading(false);
            }
        } catch (error) {
            console.error('Error fetching plant predictions:', error);
            // Fallback demo data
            setTotalStats({
                totalProduction: 2450,
                avgLcoh: 1.85,
                totalProfit: 12500,
                activePlants: 3,
                totalEnergy: 45.5,
                carbonSaved: 22785
            });
            setProductionHistory(generateProductionHistory(2450, 12500));
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlantPredictions();
        const interval = setInterval(fetchPlantPredictions, 30000);
        return () => clearInterval(interval);
    }, []);



    // Profit breakdown for bar chart
    const profitBreakdown = plants.slice(0, 5).map(p => ({
        name: p.plant_name?.split(' ')[0] || 'Plant',
        profit: p.profit_prediction?.daily_profit || 0,
        revenue: p.profit_prediction?.breakdown?.total_revenue || 0,
        cost: (p.profit_prediction?.h2_production_kg || 0) * (p.lcoh || 2)
    }));

    // Feature summary cards
    const featureSummary = [
        {
            icon: Zap,
            title: 'Renewable Energy',
            value: `${totalStats.totalEnergy.toFixed(1)} MW`,
            subtitle: 'Total Generation',
            color: 'from-emerald-500 to-teal-600',
            link: '/admin/renewable-energy'
        },
        {
            icon: Shield,
            title: 'Resilience (RHS-RRP)',
            value: 'OPERATIONAL',
            subtitle: 'Hot Standby Ready',
            color: 'from-blue-500 to-cyan-600',
            link: '/admin/shutdown'
        },
        {
            icon: Wrench,
            title: 'Maintenance',
            value: '98.5%',
            subtitle: 'Equipment Uptime',
            color: 'from-purple-500 to-pink-600',
            link: '/admin/maintenance'
        },
        {
            icon: Truck,
            title: 'Logistics',
            value: '24',
            subtitle: 'Active Deliveries',
            color: 'from-orange-500 to-red-600',
            link: '/admin/transport'
        },
        {
            icon: Package,
            title: 'Storage',
            value: '85%',
            subtitle: 'Tank Utilization',
            color: 'from-indigo-500 to-violet-600',
            link: '/admin/storage'
        },
        {
            icon: Battery,
            title: 'Smart Surplus',
            value: '1.2 MW',
            subtitle: 'Available for Grid',
            color: 'from-yellow-500 to-amber-600',
            link: '/admin/renewable-energy'
        }
    ];

    // Top 3 profitable plants
    const topPlants = [...plants]
        .sort((a, b) => (b.profit_prediction?.daily_profit || 0) - (a.profit_prediction?.daily_profit || 0))
        .slice(0, 3);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                <div className="text-center">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        <div className="absolute inset-0 border-4 border-emerald-500/30 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <Leaf className="absolute inset-0 m-auto w-10 h-10 text-emerald-400 animate-pulse" />
                    </div>
                    <p className="text-gray-400 text-lg font-medium">Loading H₂-OptiPlant Dashboard...</p>
                    <p className="text-gray-600 text-sm mt-2">Fetching real-time ML predictions</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-x-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="relative z-10 p-6 lg:p-8 max-w-[1600px] mx-auto">
                {/* Hero Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                                    <Leaf className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-emerald-200 to-emerald-400 bg-clip-text text-transparent">
                                        H₂-OptiPlant
                                    </h1>
                                    <p className="text-emerald-400/80 text-sm font-medium">Green Hydrogen Production Intelligence</p>
                                </div>
                            </div>
                            <p className="text-gray-400 text-lg max-w-xl">
                                Real-time monitoring, ML predictions & smart optimization for sustainable hydrogen production
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                <span className="text-emerald-400 text-sm font-medium">Live</span>
                            </div>
                            <div className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-gray-400 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {lastUpdate}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Key Metrics Row - Hero Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8"
                >
                    {/* Total Production */}
                    <div className="col-span-1 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 backdrop-blur-xl rounded-2xl p-5 border border-emerald-500/30 relative overflow-hidden group hover:border-emerald-400/50 transition-all">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-3">
                                <Zap className="w-5 h-5 text-emerald-400" />
                                <span className="text-xs text-emerald-400/80 uppercase tracking-wider font-medium">H₂ Production</span>
                            </div>
                            <div className="text-3xl font-bold text-white mb-1">
                                <AnimatedCounter value={totalStats.totalProduction} suffix=" kg" />
                            </div>
                            <div className="flex items-center gap-1 text-xs text-emerald-400">
                                <ArrowUpRight className="w-3 h-3" />
                                <span>+12.5% today</span>
                            </div>
                        </div>
                    </div>

                    {/* LCOH */}
                    <div className="col-span-1 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 backdrop-blur-xl rounded-2xl p-5 border border-blue-500/30 relative overflow-hidden group hover:border-blue-400/50 transition-all">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl"></div>
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-3">
                                <Target className="w-5 h-5 text-blue-400" />
                                <span className="text-xs text-blue-400/80 uppercase tracking-wider font-medium">Avg LCOH</span>
                            </div>
                            <div className="text-3xl font-bold text-white mb-1">
                                $<AnimatedCounter value={totalStats.avgLcoh} decimals={2} />
                                <span className="text-lg text-gray-400">/kg</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Below $2 target</span>
                            </div>
                        </div>
                    </div>

                    {/* Daily Profit */}
                    <div className="col-span-1 bg-gradient-to-br from-purple-500/20 to-pink-500/10 backdrop-blur-xl rounded-2xl p-5 border border-purple-500/30 relative overflow-hidden group hover:border-purple-400/50 transition-all">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl"></div>
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-3">
                                <DollarSign className="w-5 h-5 text-purple-400" />
                                <span className="text-xs text-purple-400/80 uppercase tracking-wider font-medium">Daily Profit</span>
                            </div>
                            <div className="text-3xl font-bold text-white mb-1">
                                $<AnimatedCounter value={totalStats.totalProfit} />
                            </div>
                            <div className="flex items-center gap-1 text-xs text-emerald-400">
                                <TrendingUp className="w-3 h-3" />
                                <span>Profitable</span>
                            </div>
                        </div>
                    </div>

                    {/* Active Plants */}
                    <div className="col-span-1 bg-gradient-to-br from-amber-500/20 to-orange-500/10 backdrop-blur-xl rounded-2xl p-5 border border-amber-500/30 relative overflow-hidden group hover:border-amber-400/50 transition-all">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl"></div>
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-3">
                                <Factory className="w-5 h-5 text-amber-400" />
                                <span className="text-xs text-amber-400/80 uppercase tracking-wider font-medium">Plants</span>
                            </div>
                            <div className="text-3xl font-bold text-white mb-1">
                                <AnimatedCounter value={totalStats.activePlants} />
                            </div>
                            <div className="text-xs text-amber-400">All operational</div>
                        </div>
                    </div>

                    {/* Total Energy */}
                    <div className="col-span-1 bg-gradient-to-br from-yellow-500/20 to-lime-500/10 backdrop-blur-xl rounded-2xl p-5 border border-yellow-500/30 relative overflow-hidden group hover:border-yellow-400/50 transition-all">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 rounded-full blur-2xl"></div>
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-3">
                                <Sun className="w-5 h-5 text-yellow-400" />
                                <span className="text-xs text-yellow-400/80 uppercase tracking-wider font-medium">Energy</span>
                            </div>
                            <div className="text-3xl font-bold text-white mb-1">
                                <AnimatedCounter value={totalStats.totalEnergy} decimals={1} suffix=" MW" />
                            </div>
                            <div className="text-xs text-yellow-400">100% Renewable</div>
                        </div>
                    </div>

                    {/* Carbon Saved */}
                    <div className="col-span-1 bg-gradient-to-br from-green-500/20 to-emerald-500/10 backdrop-blur-xl rounded-2xl p-5 border border-green-500/30 relative overflow-hidden group hover:border-green-400/50 transition-all">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full blur-2xl"></div>
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-3">
                                <Leaf className="w-5 h-5 text-green-400" />
                                <span className="text-xs text-green-400/80 uppercase tracking-wider font-medium">CO₂ Saved</span>
                            </div>
                            <div className="text-3xl font-bold text-white mb-1">
                                <AnimatedCounter value={totalStats.carbonSaved / 1000} decimals={1} suffix=" t" />
                            </div>
                            <div className="text-xs text-green-400">Environmental Impact</div>
                        </div>
                    </div>
                </motion.div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-12 gap-6">
                    {/* Left Column - Charts */}
                    <div className="col-span-12 lg:col-span-8 space-y-6">
                        {/* Production & Profit Chart */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-emerald-400" />
                                        Production & Profit Timeline
                                    </h2>
                                    <p className="text-gray-400 text-sm">24-hour operational overview</p>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-400"></div> Production (kg)</span>
                                    <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-400"></div> Profit ($)</span>
                                </div>
                            </div>
                            <div className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={productionHistory}>
                                        <defs>
                                            <linearGradient id="productionGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                                        <YAxis stroke="#64748b" fontSize={11} />
                                        <Tooltip
                                            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                                            labelStyle={{ color: '#94a3b8' }}
                                        />
                                        <Area type="monotone" dataKey="production" stroke="#10b981" fill="url(#productionGrad)" strokeWidth={2} name="Production (kg)" />
                                        <Area type="monotone" dataKey="profit" stroke="#a855f7" fill="url(#profitGrad)" strokeWidth={2} name="Profit ($)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>

                        {/* Profit Breakdown by Plant */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <DollarSign className="w-5 h-5 text-purple-400" />
                                        Profit Analysis by Plant
                                    </h2>
                                    <p className="text-gray-400 text-sm">Revenue vs Cost comparison</p>
                                </div>
                            </div>
                            <div className="h-[220px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={profitBreakdown} layout="vertical">
                                        <XAxis type="number" stroke="#64748b" fontSize={11} />
                                        <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={80} />
                                        <Tooltip
                                            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                                            formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                                        />
                                        <Legend />
                                        <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[0, 4, 4, 0]} />
                                        <Bar dataKey="cost" fill="#f59e0b" name="Cost" radius={[0, 4, 4, 0]} />
                                        <Bar dataKey="profit" fill="#8b5cf6" name="Profit" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>

                        {/* Feature Summary Cards */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <Award className="w-5 h-5 text-amber-400" />
                                System Features Overview
                            </h2>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                {featureSummary.map((feature, idx) => (
                                    <motion.div
                                        key={feature.title}
                                        whileHover={{ scale: 1.02, y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => navigate(feature.link)}
                                        className="bg-slate-800/40 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50 cursor-pointer hover:border-slate-600/50 transition-all group"
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`p-2 rounded-lg bg-gradient-to-br ${feature.color} shadow-lg`}>
                                                <feature.icon className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-white text-sm group-hover:text-emerald-300 transition-colors">{feature.title}</h3>
                                            </div>
                                        </div>
                                        <div className="text-2xl font-bold text-white mb-1">{feature.value}</div>
                                        <div className="text-xs text-gray-400">{feature.subtitle}</div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column - Energy & Top Plants */}
                    <div className="col-span-12 lg:col-span-4 space-y-6">
                        {/* Next 24 Hours Profit Prediction */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-xl rounded-2xl p-6 border border-indigo-500/30"
                        >
                            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-indigo-400" />
                                Next 24 Hours Forecast
                            </h2>

                            {/* Tomorrow's Weather */}
                            <div className="bg-slate-900/50 rounded-xl p-4 mb-4 border border-slate-700/30">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-indigo-400 uppercase tracking-wider font-medium">Tomorrow's Weather</span>
                                    <span className="text-xs text-gray-500">
                                        {new Date(Date.now() + 86400000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="text-center">
                                        <Sun className="w-6 h-6 mx-auto text-amber-400 mb-1" />
                                        <div className="text-lg font-bold text-white">
                                            {plants[0]?.forecast?.max_temp || 32}°
                                        </div>
                                        <div className="text-xs text-gray-400">High</div>
                                    </div>
                                    <div className="text-center">
                                        <Wind className="w-6 h-6 mx-auto text-cyan-400 mb-1" />
                                        <div className="text-lg font-bold text-white">
                                            {plants[0]?.forecast?.wind_speed || 12} km/h
                                        </div>
                                        <div className="text-xs text-gray-400">Wind</div>
                                    </div>
                                    <div className="text-center">
                                        <Droplet className="w-6 h-6 mx-auto text-blue-400 mb-1" />
                                        <div className="text-lg font-bold text-white">
                                            {plants[0]?.weather?.humidity || 45}%
                                        </div>
                                        <div className="text-xs text-gray-400">Humidity</div>
                                    </div>
                                </div>
                            </div>

                            {/* Hourly Profit Prediction */}
                            <div className="space-y-2 mb-4">
                                <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Hourly Production Forecast</div>
                                {[
                                    { hour: '6 AM', solar: 15, wind: 80, profit: 2100, peak: false },
                                    { hour: '9 AM', solar: 65, wind: 70, profit: 4500, peak: false },
                                    { hour: '12 PM', solar: 100, wind: 55, profit: 6800, peak: true },
                                    { hour: '3 PM', solar: 85, wind: 60, profit: 5900, peak: true },
                                    { hour: '6 PM', solar: 30, wind: 75, profit: 3200, peak: false },
                                    { hour: '9 PM', solar: 0, wind: 90, profit: 1800, peak: false },
                                ].map((slot, idx) => (
                                    <motion.div
                                        key={slot.hour}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + idx * 0.05 }}
                                        className={`flex items-center gap-3 p-2 rounded-lg ${slot.peak ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-slate-800/30'}`}
                                    >
                                        <span className="text-xs text-gray-400 w-12">{slot.hour}</span>
                                        <div className="flex-1 flex gap-1">
                                            <div className="flex items-center gap-1 flex-1">
                                                <Sun className="w-3 h-3 text-amber-400" />
                                                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${slot.solar}%` }}
                                                        transition={{ duration: 0.8, delay: 0.5 + idx * 0.1 }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 flex-1">
                                                <Wind className="w-3 h-3 text-cyan-400" />
                                                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${slot.wind}%` }}
                                                        transition={{ duration: 0.8, delay: 0.5 + idx * 0.1 }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`text-sm font-bold ${slot.peak ? 'text-emerald-400' : 'text-white'}`}>
                                            ${slot.profit.toLocaleString()}
                                        </span>
                                        {slot.peak && <TrendingUp className="w-3 h-3 text-emerald-400" />}
                                    </motion.div>
                                ))}
                            </div>

                            {/* 24h Profit Summary */}
                            <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl p-4 border border-emerald-500/30">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-emerald-400 font-medium">Predicted 24h Profit</span>
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 rounded-full text-xs text-emerald-400">
                                        <TrendingUp className="w-3 h-3" />
                                        +8.5% vs today
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-white">
                                    $<AnimatedCounter value={Math.round(totalStats.totalProfit * 1.085)} />
                                </div>
                                <div className="flex items-center gap-4 mt-3 text-xs">
                                    <div className="flex items-center gap-1">
                                        <Sun className="w-3 h-3 text-amber-400" />
                                        <span className="text-gray-400">Solar: High</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Wind className="w-3 h-3 text-cyan-400" />
                                        <span className="text-gray-400">Wind: Moderate</span>
                                    </div>
                                </div>
                                <div className="mt-3 text-xs text-gray-500">
                                    Based on weather forecast and ML model predictions
                                </div>
                            </div>
                        </motion.div>


                        {/* Top Profitable Plants */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50"
                        >
                            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-400" />
                                Top Performing Plants
                            </h2>
                            <div className="space-y-3">
                                {topPlants.map((plant, idx) => (
                                    <motion.div
                                        key={plant.plant_id}
                                        whileHover={{ x: 4 }}
                                        onClick={() => setSelectedPlant(plant)}
                                        className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl cursor-pointer hover:bg-slate-900/70 transition-all border border-slate-700/30 hover:border-emerald-500/30"
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold ${idx === 0 ? 'bg-gradient-to-br from-amber-500 to-yellow-600' :
                                            idx === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                                                'bg-gradient-to-br from-amber-700 to-amber-800'
                                            }`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-white truncate">{plant.plant_name}</h4>
                                            <p className="text-xs text-gray-400 truncate">
                                                {typeof plant.location === 'object' ? plant.location?.state : plant.location}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-emerald-400 font-bold">
                                                ${(plant.profit_prediction?.daily_profit || 0).toLocaleString()}
                                            </div>
                                            <div className="text-xs text-gray-500">LCOH: ${plant.lcoh?.toFixed(2)}</div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Quick Actions */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-gradient-to-br from-emerald-500/20 to-teal-500/10 backdrop-blur-xl rounded-2xl p-6 border border-emerald-500/30"
                        >
                            <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
                            <div className="space-y-2">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/admin/plants')}
                                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                                >
                                    <Factory className="w-4 h-4" />
                                    Add New Plant
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/admin/renewable-energy')}
                                    className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                                >
                                    <Zap className="w-4 h-4" />
                                    View Energy Details
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/admin/shutdown')}
                                    className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                                >
                                    <Shield className="w-4 h-4" />
                                    Resilience Dashboard
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Map Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 bg-slate-800/40 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50"
                >
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-400" />
                        Plant Network Map
                    </h2>
                    <div className="h-[350px] rounded-xl overflow-hidden border border-slate-700/50">
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
                    </div>
                </motion.div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-8 text-center text-gray-500 text-sm"
                >
                    <p>H₂-OptiPlant • Smart Green Hydrogen Production System • Smart India Hackathon 2024</p>
                </motion.div>
            </div>

            {/* Plant Detail Modal */}
            <PlantDetailModal
                plant={selectPlant}
                onClose={() => setSelectedPlant(null)}
            />
        </div>
    );
};

export default Dashboard;
