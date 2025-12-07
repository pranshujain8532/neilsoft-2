import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package, AlertTriangle, Thermometer, Gauge, Droplets,
    Shield, Clock, ChevronRight, X, Bell, CheckCircle, RefreshCw,
    Beaker, Fuel, Database, Settings, BarChart3
} from 'lucide-react';
import { storageAPI } from '@/utils/api';
import { supabase } from '@/lib/supabase';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';


interface Container {
    id: string;
    name: string;
    capacity: number;
    current_level?: number;
    pressure_bar?: number;
    temperature_c?: number;
    status: string;
    health_score?: number;
    storage_type?: string;
    fill_percentage?: number;
    hydrogen_purity_percent?: number;
    evaporation_rate_percent?: number;
    last_inspection_date?: string;
    next_inspection_due?: string;
    hoop_stress_mpa?: number;
    stress_cycles?: number;
}

interface StorageAlert {
    id: string;
    container_id: string;
    alert_type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description?: string;
    detected_at: string;
    status: string;
    container?: Container;
}

interface SensorReading {
    id: string;
    container_id: string;
    sensor_type: string;
    value: number;
    unit: string;
    is_anomaly: boolean;
    timestamp: string;
}

const Storage = () => {
    const [containers, setContainers] = useState<Container[]>([]);
    const [alerts, setAlerts] = useState<StorageAlert[]>([]);
    const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
    const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'sensors' | 'alerts' | 'transactions'>('overview');

    // Fetch containers
    const fetchContainers = async () => {
        try {
            const { data } = await storageAPI.getContainers();
            if (data) {
                setContainers(data);
            }
        } catch (error) {
            console.error('Error fetching containers:', error);
        }
    };

    // Fetch alerts
    const fetchAlerts = async () => {
        try {
            const { data } = await supabase
                .from('storage_alerts')
                .select('*')
                .eq('status', 'open')
                .order('detected_at', { ascending: false });
            if (data) {
                setAlerts(data);
            }
        } catch (error) {
            console.error('Error fetching alerts:', error);
        }
    };

    // Fetch sensor readings for a container
    const fetchSensorReadings = async (containerId: string) => {
        try {
            const { data } = await supabase
                .from('storage_sensor_readings')
                .select('*')
                .eq('container_id', containerId)
                .order('timestamp', { ascending: false })
                .limit(50);
            if (data) {
                setSensorReadings(data);
            }
        } catch (error) {
            console.error('Error fetching sensor readings:', error);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchContainers(), fetchAlerts()]);
            setLoading(false);
        };
        loadData();

        // Real-time subscription for containers
        const containerChannel = supabase
            .channel('public:containers')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'containers' },
                (payload) => {
                    if (payload.eventType === 'UPDATE') {
                        setContainers((prev) =>
                            prev.map((c) => (c.id === payload.new.id ? { ...c, ...payload.new } : c))
                        );
                    }
                }
            )
            .subscribe();

        // Real-time subscription for alerts
        const alertChannel = supabase
            .channel('public:storage_alerts')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'storage_alerts' },
                (payload) => {
                    setAlerts((prev) => [payload.new as StorageAlert, ...prev]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(containerChannel);
            supabase.removeChannel(alertChannel);
        };
    }, []);

    const refreshData = async () => {
        setRefreshing(true);
        await Promise.all([fetchContainers(), fetchAlerts()]);
        setRefreshing(false);
    };

    const resolveAlert = async (alertId: string) => {
        try {
            // Delete the alert from database instead of just updating status
            await supabase
                .from('storage_alerts')
                .delete()
                .eq('id', alertId);
            setAlerts((prev) => prev.filter((a) => a.id !== alertId));
        } catch (error) {
            console.error('Error resolving/deleting alert:', error);
        }
    };

    const openContainerDetail = async (container: Container) => {
        setSelectedContainer(container);
        await fetchSensorReadings(container.id);
    };

    // Calculate KPIs
    const totalCapacity = containers.reduce((sum, c) => sum + (c.capacity || 0), 0);
    const _totalFilled = containers.reduce((sum, c) => sum + ((c.capacity || 0) * (c.fill_percentage || 0) / 100), 0);
    const avgFillPercentage = containers.length > 0
        ? containers.reduce((sum, c) => sum + (c.fill_percentage || 0), 0) / containers.length
        : 0;
    const avgHealthScore = containers.length > 0
        ? containers.reduce((sum, c) => sum + (c.health_score || 0), 0) / containers.length
        : 0;
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'critical': return 'from-red-500/20 to-red-500/5 border-red-500/30';
            case 'maintenance required':
            case 'warning': return 'from-amber-500/20 to-amber-500/5 border-amber-500/30';
            default: return 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30';
        }
    };

    const getStorageTypeIcon = (type?: string) => {
        switch (type?.toLowerCase()) {
            case 'liquid': return <Droplets className="w-6 h-6 text-cyan-400" />;
            case 'lohc': return <Beaker className="w-6 h-6 text-purple-400" />;
            case 'underground': return <Database className="w-6 h-6 text-amber-400" />;
            default: return <Fuel className="w-6 h-6 text-hydrogen-400" />;
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        }
    };

    // Format sensor data for chart
    const formatSensorData = (readings: SensorReading[], sensorType: string) => {
        return readings
            .filter(r => r.sensor_type === sensorType)
            .slice().reverse()
            .map(r => ({
                time: new Date(r.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                value: r.value,
                isAnomaly: r.is_anomaly
            }));
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl">
                    <p className="text-gray-400 text-xs mb-1">{label}</p>
                    <p className="text-lg font-bold" style={{ color: payload[0].color }}>
                        {payload[0].value} {payload[0].unit || ''}
                    </p>
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
                        <Package className="absolute inset-0 m-auto w-8 h-8 text-hydrogen-400 animate-pulse" />
                    </div>
                    <p className="text-gray-400 text-lg">Loading storage facilities...</p>
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
                    className="mb-8"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-hydrogen-500/20 to-hydrogen-600/10 border border-hydrogen-500/30">
                                <Package className="w-8 h-8 text-hydrogen-400" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-hydrogen-200 to-hydrogen-400 bg-clip-text text-transparent">
                                    Storage Management
                                </h1>
                                <p className="text-gray-400 mt-1">
                                    Real-time monitoring of {containers.length} hydrogen storage facilities
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={refreshData}
                            disabled={refreshing}
                            className="p-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-5 h-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Critical Alert Banner */}
                    {criticalAlerts > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
                                <div>
                                    <p className="text-red-400 font-semibold">
                                        {criticalAlerts} Critical Alert{criticalAlerts > 1 ? 's' : ''} Detected
                                    </p>
                                    <p className="text-red-400/70 text-sm">
                                        Immediate attention required
                                    </p>
                                </div>
                            </div>
                            <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 transition-colors">
                                View Alerts
                            </button>
                        </motion.div>
                    )}

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                            { label: 'Total Tanks', value: containers.length, icon: Package, color: 'text-blue-400', bg: 'from-blue-500 to-blue-600' },
                            { label: 'Total Capacity', value: `${(totalCapacity / 1000).toFixed(0)} tons`, icon: Database, color: 'text-hydrogen-400', bg: 'from-hydrogen-500 to-hydrogen-600' },
                            { label: 'Avg Fill Level', value: `${avgFillPercentage.toFixed(1)}%`, icon: Gauge, color: 'text-emerald-400', bg: 'from-emerald-500 to-emerald-600' },
                            { label: 'Health Score', value: `${avgHealthScore.toFixed(1)}%`, icon: Shield, color: 'text-purple-400', bg: 'from-purple-500 to-purple-600' },
                            { label: 'Active Alerts', value: alerts.length, icon: Bell, color: criticalAlerts > 0 ? 'text-red-400' : 'text-amber-400', bg: criticalAlerts > 0 ? 'from-red-500 to-red-600' : 'from-amber-500 to-amber-600' },
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.bg} flex items-center justify-center`}>
                                        <stat.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs uppercase tracking-wider">{stat.label}</p>
                                        <p className="text-xl font-bold text-white">{stat.value}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Storage Facilities Grid */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Fuel className="w-5 h-5 text-hydrogen-400" />
                                Storage Facilities
                            </h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            {containers.map((container, index) => (
                                <motion.div
                                    key={container.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ scale: 1.02, y: -3 }}
                                    onClick={() => openContainerDetail(container)}
                                    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${getStatusColor(container.status)} 
                                                backdrop-blur-sm border cursor-pointer group transition-all duration-300
                                                hover:shadow-xl hover:shadow-hydrogen-500/10`}
                                >
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-gray-800/50">
                                                    {getStorageTypeIcon(container.storage_type)}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white">{container.name || container.id}</h3>
                                                    <p className="text-gray-400 text-xs capitalize">{container.storage_type || 'Compressed Gas'}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium
                                                ${container.status === 'Optimal' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    container.status === 'Critical' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-amber-500/20 text-amber-400'}`}>
                                                {container.status}
                                            </span>
                                        </div>

                                        {/* Fill Level Bar */}
                                        <div className="mb-4">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-gray-400">Fill Level</span>
                                                <span className="text-white font-medium">{(container.fill_percentage || 0).toFixed(1)}%</span>
                                            </div>
                                            <div className="h-2.5 bg-gray-700/50 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${container.fill_percentage || 0}%` }}
                                                    transition={{ duration: 1, ease: 'easeOut' }}
                                                    className={`h-full rounded-full ${(container.fill_percentage || 0) > 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                                                        (container.fill_percentage || 0) > 40 ? 'bg-gradient-to-r from-hydrogen-500 to-hydrogen-400' :
                                                            'bg-gradient-to-r from-amber-500 to-amber-400'
                                                        }`}
                                                />
                                            </div>
                                        </div>

                                        {/* Metrics Grid */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-gray-800/30 rounded-lg p-2">
                                                <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
                                                    <Gauge className="w-3 h-3" />
                                                    Pressure
                                                </div>
                                                <p className="text-white font-semibold">{container.pressure_bar || 0} bar</p>
                                            </div>
                                            <div className="bg-gray-800/30 rounded-lg p-2">
                                                <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
                                                    <Thermometer className="w-3 h-3" />
                                                    Temperature
                                                </div>
                                                <p className="text-white font-semibold">{container.temperature_c || 0}°C</p>
                                            </div>
                                            <div className="bg-gray-800/30 rounded-lg p-2">
                                                <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
                                                    <Beaker className="w-3 h-3" />
                                                    Purity
                                                </div>
                                                <p className="text-white font-semibold">{(container.hydrogen_purity_percent || 99.97).toFixed(2)}%</p>
                                            </div>
                                            <div className="bg-gray-800/30 rounded-lg p-2">
                                                <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
                                                    <Shield className="w-3 h-3" />
                                                    Health
                                                </div>
                                                <p className={`font-semibold ${(container.health_score || 0) > 90 ? 'text-emerald-400' :
                                                    (container.health_score || 0) > 70 ? 'text-amber-400' : 'text-red-400'
                                                    }`}>{(container.health_score || 0).toFixed(1)}%</p>
                                            </div>
                                        </div>

                                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ChevronRight className="w-5 h-5 text-hydrogen-400" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Alerts Panel */}
                    <div className="lg:col-span-1">
                        <div className="bg-gray-800/30 rounded-2xl border border-gray-700/30 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Bell className="w-5 h-5 text-amber-400" />
                                    Active Alerts
                                </h2>
                                <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
                                    {alerts.length}
                                </span>
                            </div>

                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                {alerts.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p>No active alerts</p>
                                        <p className="text-sm mt-1">All systems operating normally</p>
                                    </div>
                                ) : (
                                    alerts.map((alert) => (
                                        <motion.div
                                            key={alert.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className={`p-4 rounded-xl border ${getSeverityColor(alert.severity)}`}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    <span className="font-medium text-sm capitalize">{alert.alert_type.replace('_', ' ')}</span>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); resolveAlert(alert.id); }}
                                                    className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                                                    title="Resolve Alert"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <p className="text-white text-sm mb-2">{alert.title}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <Clock className="w-3 h-3" />
                                                {new Date(alert.detected_at).toLocaleString('en-IN')}
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Container Detail Modal */}
                <AnimatePresence>
                    {selectedContainer && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => setSelectedContainer(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl border border-gray-700/50 
                                           w-full max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Modal Header */}
                                <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 p-6 flex justify-between items-start z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-gradient-to-br from-hydrogen-500/20 to-hydrogen-600/10 border border-hydrogen-500/30">
                                            {getStorageTypeIcon(selectedContainer.storage_type)}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">{selectedContainer.name || selectedContainer.id}</h2>
                                            <p className="text-gray-400 text-sm capitalize">{selectedContainer.storage_type || 'Compressed Gas'} • {selectedContainer.status}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedContainer(null)}
                                        className="p-2 rounded-full hover:bg-gray-700/50 transition-colors"
                                    >
                                        <X className="w-6 h-6 text-gray-400" />
                                    </button>
                                </div>

                                <div className="p-6">
                                    {/* Tabs */}
                                    <div className="flex gap-2 mb-6">
                                        {['overview', 'sensors', 'alerts'].map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab as any)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize
                                                    ${activeTab === tab ? 'bg-hydrogen-500/20 text-hydrogen-400 border border-hydrogen-500/30' : 'text-gray-400 hover:text-white hover:bg-gray-700/30'}`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tab Content */}
                                    {activeTab === 'overview' && (
                                        <div className="space-y-6">
                                            {/* Key Metrics */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {[
                                                    { label: 'Capacity', value: `${(selectedContainer.capacity / 1000).toFixed(1)} tons`, icon: Database, color: 'from-hydrogen-500 to-hydrogen-600' },
                                                    { label: 'Fill Level', value: `${(selectedContainer.fill_percentage || 0).toFixed(1)}%`, icon: Gauge, color: 'from-emerald-500 to-emerald-600' },
                                                    { label: 'Pressure', value: `${selectedContainer.pressure_bar || 0} bar`, icon: Gauge, color: 'from-blue-500 to-blue-600' },
                                                    { label: 'Health', value: `${(selectedContainer.health_score || 0).toFixed(1)}%`, icon: Shield, color: 'from-purple-500 to-purple-600' },
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

                                            {/* Additional Details */}
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                                                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                                        <BarChart3 className="w-5 h-5 text-hydrogen-400" />
                                                        Thermodynamic Parameters
                                                    </h3>
                                                    <div className="space-y-3">
                                                        {[
                                                            { label: 'Temperature', value: `${selectedContainer.temperature_c || 0}°C` },
                                                            { label: 'Hoop Stress', value: `${selectedContainer.hoop_stress_mpa || 0} MPa` },
                                                            { label: 'Stress Cycles', value: selectedContainer.stress_cycles || 0 },
                                                            { label: 'H₂ Purity', value: `${(selectedContainer.hydrogen_purity_percent || 99.97).toFixed(3)}%` },
                                                        ].map((item) => (
                                                            <div key={item.label} className="flex justify-between py-2 border-b border-gray-700/30">
                                                                <span className="text-gray-400">{item.label}</span>
                                                                <span className="text-white font-medium">{item.value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                                                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                                        <Settings className="w-5 h-5 text-hydrogen-400" />
                                                        Maintenance Info
                                                    </h3>
                                                    <div className="space-y-3">
                                                        {[
                                                            { label: 'Last Inspection', value: selectedContainer.last_inspection_date ? new Date(selectedContainer.last_inspection_date).toLocaleDateString() : 'N/A' },
                                                            { label: 'Next Due', value: selectedContainer.next_inspection_due ? new Date(selectedContainer.next_inspection_due).toLocaleDateString() : 'N/A' },
                                                            { label: 'Evaporation Rate', value: `${selectedContainer.evaporation_rate_percent || 0}%/day` },
                                                        ].map((item) => (
                                                            <div key={item.label} className="flex justify-between py-2 border-b border-gray-700/30">
                                                                <span className="text-gray-400">{item.label}</span>
                                                                <span className="text-white font-medium">{item.value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'sensors' && (
                                        <div className="space-y-6">
                                            {/* Pressure Chart */}
                                            <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                                    <Gauge className="w-5 h-5 text-blue-400" />
                                                    Pressure History
                                                </h3>
                                                <div className="h-48">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={formatSensorData(sensorReadings, 'pressure')}>
                                                            <defs>
                                                                <linearGradient id="pressureGradient" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                                            <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
                                                            <YAxis stroke="#6b7280" fontSize={12} />
                                                            <Tooltip content={<CustomTooltip />} />
                                                            <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#pressureGradient)" />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>

                                            {/* Temperature Chart */}
                                            <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                                    <Thermometer className="w-5 h-5 text-orange-400" />
                                                    Temperature History
                                                </h3>
                                                <div className="h-48">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={formatSensorData(sensorReadings, 'temperature')}>
                                                            <defs>
                                                                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                                                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                                            <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
                                                            <YAxis stroke="#6b7280" fontSize={12} />
                                                            <Tooltip content={<CustomTooltip />} />
                                                            <Area type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} fill="url(#tempGradient)" />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>

                                            {sensorReadings.length === 0 && (
                                                <div className="text-center py-12 text-gray-500">
                                                    <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                                    <p className="text-lg">No sensor data available yet</p>
                                                    <p className="text-sm mt-2">Sensor readings will appear once the SQL schema is set up</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'alerts' && (
                                        <div className="space-y-3">
                                            {alerts.filter(a => a.container_id === selectedContainer.id).length === 0 ? (
                                                <div className="text-center py-12 text-gray-500">
                                                    <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                                    <p className="text-lg">No alerts for this container</p>
                                                </div>
                                            ) : (
                                                alerts
                                                    .filter(a => a.container_id === selectedContainer.id)
                                                    .map((alert) => (
                                                        <div key={alert.id} className={`p-4 rounded-xl border ${getSeverityColor(alert.severity)}`}>
                                                            <div className="flex items-start justify-between">
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <AlertTriangle className="w-4 h-4" />
                                                                        <span className="font-medium capitalize">{alert.alert_type.replace('_', ' ')}</span>
                                                                    </div>
                                                                    <p className="text-white mb-2">{alert.title}</p>
                                                                    <p className="text-gray-400 text-sm">{alert.description}</p>
                                                                </div>
                                                                <button
                                                                    onClick={() => resolveAlert(alert.id)}
                                                                    className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm transition-colors"
                                                                >
                                                                    Resolve
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                            )}
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

export default Storage;
