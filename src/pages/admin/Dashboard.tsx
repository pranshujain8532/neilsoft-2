import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Cpu, Zap, TrendingUp, Activity, Radio, Rocket, Truck, Database,
    Brain, Shield, MapPin, AlertTriangle, CheckCircle2, Server, Network,
    Gauge, BarChart3, LineChart, PieChart, Target, Sparkles, Box, Cloud,
    Droplets, Sun, Wind, Battery
} from 'lucide-react';

interface SystemMetrics {
    plants: any[];
    transport: { active: number; total: number };
    ml_models: { active: number; total: number };
    storage: { level: number; capacity: number };
}

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
    const [systemStatus, setSystemStatus] = useState('OPERATIONAL');
    const [activityFeed, setActivityFeed] = useState<Array<{ id: number; type: string; message: string; time: string }>>([]);

    const fetchSystemMetrics = async () => {
        try {
            const [plantsRes] = await Promise.all([
                fetch('http://localhost:5000/api/plants/with-ml')
            ]);

            const plantsData = await plantsRes.json();

            setMetrics({
                plants: plantsData.plants || [],
                transport: { active: 12, total: 25 },
                ml_models: { active: 5, total: 5 },
                storage: { level: 87, capacity: 100 }
            });

            setActivityFeed(prev => [
                {
                    id: Date.now(),
                    type: 'success',
                    message: 'ML Profit Model: Optimization complete',
                    time: new Date().toLocaleTimeString()
                },
                ...prev.slice(0, 4)
            ]);

            setLoading(false);
        } catch (error) {
            console.error('Error:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSystemMetrics();
        const interval = setInterval(fetchSystemMetrics, 10000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full border-4 border-transparent border-t-cyan-500 border-r-cyan-500 animate-spin mx-auto" />
                        <Cpu className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-cyan-400 animate-pulse" />
                    </div>
                    <p className="text-cyan-400 mt-6 text-xl font-bold tracking-wider">INITIALIZING MISSION CONTROL</p>
                    <p className="text-gray-500 text-sm mt-2">Loading system diagnostics...</p>
                </motion.div>
            </div>
        );
    }

    const totalProfit = metrics?.plants.reduce((sum, p) => sum + (p.mlPredictions?.profit_prediction?.daily_profit || 0), 0) || 0;
    const totalCapacity = metrics?.plants.reduce((sum, p) => sum + (p.capacity || 0), 0) || 0;
    const avgEfficiency = metrics?.plants.length > 0
        ? (metrics.plants.reduce((sum, p) => sum + ((p.efficiency || 0) * 100), 0) / metrics.plants.length)
        : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white overflow-x-hidden">
            {/* Animated Background Grid */}
            <div className="fixed inset-0 opacity-10 pointer-events-none">
                <div className="absolute inset-0" style={{
                    backgroundImage: `
                        linear-gradient(to right, rgb(6, 182, 212) 1px, transparent 1px),
                        linear-gradient(to bottom, rgb(6, 182, 212) 1px, transparent 1px)
                    `,
                    backgroundSize: '80px 80px',
                    animation: 'gridMove 30s linear infinite'
                }} />
            </div>

            {/* Floating Particles */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {[...Array(15)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-cyan-400 rounded-full"
                        initial={{
                            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
                            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
                            opacity: 0
                        }}
                        animate={{
                            y: [null, Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080)],
                            opacity: [0, 0.8, 0]
                        }}
                        transition={{
                            duration: Math.random() * 8 + 5,
                            repeat: Infinity,
                            delay: Math.random() * 3
                        }}
                    />
                ))}
            </div>

            <div className="relative z-10 py-12 px-8">
                <div className="max-w-[2000px] mx-auto space-y-12">
                    {/* Header Section */}
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-center mb-16"
                    >
                        <div className="flex items-center justify-center gap-4 mb-6">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                className="w-20 h-20 rounded-full border-4 border-cyan-500 border-t-transparent flex items-center justify-center"
                            >
                                <Sparkles className="w-10 h-10 text-cyan-400" />
                            </motion.div>
                            <div>
                                <h1 className="text-6xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                                    H2-OPTIPLANT MISSION CONTROL
                                </h1>
                                <p className="text-gray-400 mt-3 flex items-center justify-center gap-3 text-lg">
                                    <Radio className="w-5 h-5 animate-pulse text-green-500" />
                                    System Status: <span className="font-bold text-green-400">{systemStatus}</span>
                                    <span className="mx-2">•</span>
                                    <span className="text-gray-500">All Systems Nominal</span>
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Hero Stats - Full Width */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8"
                    >
                        <MetricCard
                            icon={Rocket}
                            label="Network H₂ Production"
                            value={`${totalCapacity}`}
                            unit="Tons Per Day"
                            color="cyan"
                            trend="+12% from last month"
                        />
                        <MetricCard
                            icon={TrendingUp}
                            label="Daily Revenue (ML Predicted)"
                            value={`$${(totalProfit / 1000).toFixed(1)}K`}
                            unit="USD / Day"
                            color="green"
                            trend="+8.2% profit margin"
                        />
                        <MetricCard
                            icon={Zap}
                            label="Avg Network Efficiency"
                            value={`${avgEfficiency.toFixed(1)}`}
                            unit="Percent Operational"
                            color="yellow"
                            trend="+3.1% improvement"
                        />
                        <MetricCard
                            icon={Activity}
                            label="Production Facilities"
                            value={`${metrics?.plants.length || 0}`}
                            unit="Plants Online"
                            color="blue"
                            trend="100% availability"
                        />
                    </motion.div>

                    {/* Main Content - 2 Column Layout */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                        {/* Left Column - 2 cols */}
                        <div className="xl:col-span-2 space-y-10">
                            {/* Network Topology */}
                            <Section
                                title="Production Network Topology"
                                icon={Network}
                                iconColor="cyan"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                                    {metrics?.plants.map((plant, idx) => (
                                        <PlantNode key={idx} plant={plant} index={idx} />
                                    ))}
                                </div>
                            </Section>

                            {/* ML Models Status */}
                            <Section
                                title="AI/ML Intelligence Layer"
                                icon={Brain}
                                iconColor="purple"
                                subtitle="5 Active Models • Real-Time Inference"
                            >
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mt-8">
                                    <ModelIndicator name="Profit Predictor" status="active" accuracy={94} />
                                    <ModelIndicator name="Safety Monitor" status="active" accuracy={89} />
                                    <ModelIndicator name="Energy Forecaster" status="active" accuracy={92} />
                                    <ModelIndicator name="Route Optimizer" status="active" accuracy={87} />
                                    <ModelIndicator name="Demand Predictor" status="active" accuracy={91} />
                                </div>
                            </Section>

                            {/* Energy Flow Visualization */}
                            <Section
                                title="Real-Time Energy Mix"
                                icon={Zap}
                                iconColor="yellow"
                                subtitle="Renewable Energy Distribution Across Network"
                            >
                                <div className="grid grid-cols-3 gap-8 mt-8">
                                    <EnergySource
                                        icon={Sun}
                                        name="Solar"
                                        percentage={45}
                                        capacity="240 MW"
                                        color="yellow"
                                    />
                                    <EnergySource
                                        icon={Wind}
                                        name="Wind"
                                        percentage={35}
                                        capacity="185 MW"
                                        color="cyan"
                                    />
                                    <EnergySource
                                        icon={Droplets}
                                        name="Hydro"
                                        percentage={20}
                                        capacity="105 MW"
                                        color="blue"
                                    />
                                </div>
                            </Section>
                        </div>

                        {/* Right Column - 1 col */}
                        <div className="space-y-10">
                            {/* Transport Fleet */}
                            <Section
                                title="Transport Fleet"
                                icon={Truck}
                                iconColor="orange"
                                compact
                            >
                                <div className="space-y-6 mt-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 text-lg">Active Deliveries</span>
                                        <span className="text-4xl font-black text-orange-400">12</span>
                                    </div>
                                    <CircularProgress percentage={48} label="Fleet Utilization" color="orange" size="large" />

                                    <div className="pt-6 border-t border-gray-700 space-y-3">
                                        <StatRow label="Avg Delivery Time" value="4.2 hrs" />
                                        <StatRow label="On-Time Rate" value="96%" highlight />
                                        <StatRow label="Total Distance Today" value="2,340 km" />
                                    </div>
                                </div>
                            </Section>

                            {/* Storage Status */}
                            <Section
                                title="H₂ Storage Network"
                                icon={Database}
                                iconColor="blue"
                                compact
                            >
                                <div className="mt-6">
                                    <CircularProgress percentage={87} label="Network Capacity" color="blue" size="large" />

                                    <div className="mt-6 space-y-3">
                                        <StatRow label="High Pressure (700 bar)" value="3,200 kg" />
                                        <StatRow label="Low Pressure (350 bar)" value="1,850 kg" />
                                        <StatRow label="Liquid H₂ (-253°C)" value="4,120 kg" />
                                        <div className="pt-3 border-t border-gray-700">
                                            <StatRow label="Total Stored" value="9,170 kg" highlight />
                                        </div>
                                    </div>
                                </div>
                            </Section>

                            {/* Activity Feed */}
                            <Section
                                title="Live System Activity"
                                icon={Activity}
                                iconColor="green"
                                compact
                            >
                                <div className="space-y-3 max-h-[400px] overflow-y-auto mt-6 pr-2">
                                    <AnimatePresence mode="popLayout">
                                        {activityFeed.map((activity) => (
                                            <motion.div
                                                key={activity.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                className="flex items-start gap-3 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-green-500/30 transition-colors"
                                            >
                                                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0 animate-pulse" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-gray-300">{activity.message}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </Section>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes gridMove {
                    0% { transform: translate(0, 0); }
                    100% { transform: translate(80px, 80px); }
                }
            `}</style>
        </div>
    );
};

// ========== SUB COMPONENTS ==========

const Section = ({ title, icon: Icon, iconColor, subtitle, children, compact = false }: any) => {
    const colors = {
        cyan: 'text-cyan-400 border-cyan-500/20',
        purple: 'text-purple-400 border-purple-500/20',
        yellow: 'text-yellow-400 border-yellow-500/20',
        orange: 'text-orange-400 border-orange-500/20',
        blue: 'text-blue-400 border-blue-500/20',
        green: 'text-green-400 border-green-500/20'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-gradient-to-br from-gray-900/60 to-gray-800/40 backdrop-blur-xl rounded-3xl border ${colors[iconColor]} ${compact ? 'p-6' : 'p-8'} shadow-2xl`}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <Icon className={`w-7 h-7 ${colors[iconColor].split(' ')[0]}`} />
                    <h2 className="text-2xl font-bold text-white">{title}</h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Live
                </div>
            </div>
            {subtitle && <p className="text-gray-500 text-sm ml-10">{subtitle}</p>}
            {children}
        </motion.div>
    );
};

const MetricCard = ({ icon: Icon, label, value, unit, color, trend }: any) => {
    const colors = {
        cyan: 'from-cyan-500/10 to-cyan-600/5 border-cyan-500/30 text-cyan-400',
        green: 'from-green-500/10 to-green-600/5 border-green-500/30 text-green-400',
        yellow: 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/30 text-yellow-400',
        blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/30 text-blue-400'
    };

    return (
        <motion.div
            whileHover={{ scale: 1.03, y: -8 }}
            className={`bg-gradient-to-br ${colors[color]} backdrop-blur-xl p-8 rounded-2xl border-2 shadow-xl`}
        >
            <Icon className={`w-12 h-12 mb-4 ${colors[color].split(' ')[2]}`} />
            <div className="text-sm text-gray-400 mb-2 font-medium">{label}</div>
            <div className="text-5xl font-black mb-2">{value}</div>
            <div className="text-sm text-gray-500 mb-4">{unit}</div>
            <div className="text-sm text-green-400 font-semibold flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                {trend}
            </div>
        </motion.div>
    );
};

const PlantNode = ({ plant, index }: any) => {
    const status = plant.mlPredictions?.safety_status?.status || 'normal';
    const statusColors = {
        optimal: { bg: 'from-green-500/20 to-green-600/10', border: 'border-green-500/40', dot: 'bg-green-500', text: 'text-green-400' },
        normal: { bg: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/40', dot: 'bg-blue-500', text: 'text-blue-400' },
        warning: { bg: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/40', dot: 'bg-orange-500', text: 'text-orange-400' }
    };
    const colors = statusColors[status as keyof typeof statusColors] || statusColors.normal;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05, y: -5 }}
            className={`relative p-6 bg-gradient-to-br ${colors.bg} rounded-2xl border-2 ${colors.border} cursor-pointer group`}
        >
            <div className={`absolute top-3 right-3 w-3 h-3 ${colors.dot} rounded-full animate-pulse`} />
            <MapPin className={`w-8 h-8 ${colors.text} mb-3`} />
            <div className="text-lg font-bold text-white mb-1">{plant.plant_name || plant.name}</div>
            <div className="text-sm text-gray-400 mb-3">{plant.capacity} TPD Capacity</div>
            <div className={`text-xl font-bold ${colors.text}`}>
                ${plant.mlPredictions?.profit_prediction?.daily_profit?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-gray-500">Daily Revenue</div>
        </motion.div>
    );
};

const ModelIndicator = ({ name, status, accuracy }: any) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -10, scale: 1.05 }}
            className="text-center"
        >
            <div className="relative w-24 h-24 mx-auto mb-3">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="42" fill="none" stroke="#374151" strokeWidth="6" />
                    <motion.circle
                        cx="48"
                        cy="48"
                        r="42"
                        fill="none"
                        stroke="#a78bfa"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 42}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - accuracy / 100) }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-purple-400" />
                </div>
            </div>
            <div className="text-lg font-black text-white">{accuracy}%</div>
            <div className="text-xs text-gray-500 mt-1">{name}</div>
        </motion.div>
    );
};

const EnergySource = ({ icon: Icon, name, percentage, capacity, color }: any) => {
    const colors = {
        yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/40 text-yellow-400',
        cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/40 text-cyan-400',
        blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/40 text-blue-400'
    };

    return (
        <motion.div
            whileHover={{ scale: 1.05 }}
            className={`bg-gradient-to-br ${colors[color]} rounded-2xl border-2 p-6 text-center`}
        >
            <Icon className={`w-12 h-12 ${colors[color].split(' ')[2]} mx-auto mb-4`} />
            <div className="text-4xl font-black text-white mb-2">{percentage}%</div>
            <div className="text-sm text-gray-400 mb-1">{name}</div>
            <div className="text-xs text-gray-500">{capacity}</div>
        </motion.div>
    );
};

const CircularProgress = ({ percentage, label, color, size = 'medium' }: any) => {
    const radius = size === 'large' ? 60 : 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    const colorMap = {
        orange: '#fb923c',
        blue: '#60a5fa',
        green: '#4ade80'
    };

    const containerSize = size === 'large' ? 'w-40 h-40' : 'w-32 h-32';

    return (
        <div className="flex flex-col items-center">
            <div className={`relative ${containerSize}`}>
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx={size === 'large' ? 80 : 64} cy={size === 'large' ? 80 : 64} r={radius} fill="none" stroke="#374151" strokeWidth="10" />
                    <motion.circle
                        cx={size === 'large' ? 80 : 64}
                        cy={size === 'large' ? 80 : 64}
                        r={radius}
                        fill="none"
                        stroke={colorMap[color]}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className={`${size === 'large' ? 'text-4xl' : 'text-3xl'} font-black`}>{percentage}%</div>
                    </div>
                </div>
            </div>
            <div className="text-sm text-gray-400 mt-3 font-medium">{label}</div>
        </div>
    );
};

const StatRow = ({ label, value, highlight = false }: any) => {
    return (
        <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">{label}</span>
            <span className={`font-bold ${highlight ? 'text-green-400 text-lg' : 'text-white'}`}>{value}</span>
        </div>
    );
};

export default Dashboard;
