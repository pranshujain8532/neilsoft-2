import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, Zap, AlertTriangle, Play, Power,
    Thermometer, Gauge,
    Radio, Heart, Timer,
    CheckCircle2, Waves, TrendingUp, Brain, Server, AlertCircle, Loader2
} from 'lucide-react';
import {
    XAxis, YAxis, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';

// Types
interface Telemetry {
    membrane_resistance: number;
    stack_temp: number;
    internal_pressure: number;
    protection_current: number;
    restart_readiness: number;
}

interface RecoveryTrajectory {
    ramp_rate_amps_per_sec: number;
    time_to_full_seconds: number;
    time_to_full_formatted: string;
    limiting_constraint: string;
    constraint_reason: string;
}

interface DigitalShadow {
    restart_rupture_probability: number;
    restart_rupture_percent: number;
    recommendation: string;
    verdict: string;
    confidence_score: number;
}

interface VPPData {
    grid_frequency_hz: number;
    deviation_hz: number;
    action: string;
    power_absorbed_kw: number;
    status: string;
}

interface DashboardData {
    state: string;
    is_standby: boolean;
    plant_id: string | null;
    telemetry: Telemetry;
    recovery: RecoveryTrajectory;
    digital_shadow: DigitalShadow;
    vpp: VPPData;
}

interface ActionResult {
    success: boolean;
    message?: string;
    error?: string;
    action?: string;
    state?: string;
    trajectory?: RecoveryTrajectory;
    pulse_voltage_v?: number;
    pulse_current_ma?: number;
    pulse_duration_ms?: number;
    corrosion_prevention_score?: number;
    total_pulses_today?: number;
}

const ML_API_URL = (import.meta as any).env?.VITE_ML_API_URL || 'http://localhost:5001';

// Animated pulse component
const HeartbeatPulse = ({ active }: { active: boolean }) => (
    <div className="relative">
        <motion.div
            className={`w-4 h-4 rounded-full ${active ? 'bg-cyan-400' : 'bg-slate-500'}`}
            animate={active ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
        />
        {active && (
            <motion.div
                className="absolute inset-0 w-4 h-4 rounded-full bg-cyan-400"
                animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            />
        )}
    </div>
);

const Shutdown = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(false);
    const [heartbeatHistory, setHeartbeatHistory] = useState<{ time: string, current: number, resistance: number }[]>([]);
    const [actionResult, setActionResult] = useState<ActionResult | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const plantId = '123e4567-e89b-12d3-a456-426614174000'; // Will be resolved by backend

    const fetchDashboard = useCallback(async () => {
        try {
            const res = await fetch(`${ML_API_URL}/api/rhs-rrp/dashboard/${plantId}`);
            if (res.ok) {
                const newData: DashboardData = await res.json();
                setData(newData);
                setHeartbeatHistory(prev => {
                    const point = {
                        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                        current: newData.telemetry.protection_current || 0,
                        resistance: (newData.telemetry.membrane_resistance || 0.15) * 100
                    };
                    return [...prev, point].slice(-30);
                });
            }
        } catch (err) {
            console.error("Dashboard fetch failed:", err);
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
        const interval = setInterval(fetchDashboard, 3000);
        return () => clearInterval(interval);
    }, [fetchDashboard]);

    const triggerStandby = async () => {
        setActionLoading('standby');
        setActionResult(null);
        try {
            const res = await fetch(`${ML_API_URL}/api/rhs-rrp/control/manual-standby`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plant_id: plantId, probability: 80 })
            });
            const result: ActionResult = await res.json();
            setActionResult(result);
            if (result.success) {
                await fetchDashboard(); // Refresh data
            }
        } catch (e) {
            setActionResult({ success: false, error: 'Network error. Check if ML service is running.' });
        }
        setActionLoading(null);
    };

    const triggerRapidInject = async () => {
        setActionLoading('inject');
        setActionResult(null);
        try {
            const res = await fetch(`${ML_API_URL}/api/rhs-rrp/control/rapid-inject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plant_id: plantId })
            });
            const result: ActionResult = await res.json();
            setActionResult(result);
            if (result.success) {
                await fetchDashboard();
            }
        } catch (e) {
            setActionResult({ success: false, error: 'Network error. Check if ML service is running.' });
        }
        setActionLoading(null);
    };

    const triggerPolarization = async () => {
        setActionLoading('pulse');
        setActionResult(null);
        try {
            const res = await fetch(`${ML_API_URL}/api/rhs-rrp/innovations/polarization/${plantId}`, { method: 'POST' });
            const result: ActionResult = await res.json();
            setActionResult(result);
        } catch (e) {
            setActionResult({ success: false, error: 'Network error. Check if ML service is running.' });
        }
        setActionLoading(null);
    };

    const getStateColor = (state: string) => {
        switch (state) {
            case 'HOT_STANDBY': return 'text-amber-400 bg-amber-500/20 border-amber-500/50';
            case 'OPERATIONAL': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/50';
            case 'EMERGENCY_SCRAM': return 'text-red-500 bg-red-500/20 border-red-500/50';
            case 'RECOVERY_RAMP': return 'text-blue-400 bg-blue-500/20 border-blue-500/50';
            default: return 'text-slate-400 bg-slate-500/20 border-slate-500/50';
        }
    };

    const isStandby = data?.state === 'HOT_STANDBY' || data?.state === 'RECOVERY_RAMP';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
                        Resilience Dashboard
                    </h1>
                    <p className="text-slate-400 mt-1 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        RHS-RRP: Resilient Hot Standby & Rapid Recovery Protocol
                        {data?.plant_id && <span className="text-xs text-slate-500">| Plant: {data.plant_id.slice(0, 8)}...</span>}
                    </p>
                </div>
                <motion.div
                    className={`px-6 py-3 rounded-xl font-bold flex items-center gap-3 border ${getStateColor(data?.state || 'OPERATIONAL')}`}
                    animate={isStandby ? { boxShadow: ['0 0 0 0 rgba(251, 191, 36, 0)', '0 0 20px 5px rgba(251, 191, 36, 0.3)', '0 0 0 0 rgba(251, 191, 36, 0)'] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <HeartbeatPulse active={isStandby} />
                    <span className="text-lg">{data?.state?.replace('_', ' ') || 'LOADING'}</span>
                </motion.div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-12 gap-6">
                {/* LEFT: Heartbeat Monitor */}
                <div className="col-span-8 space-y-6">
                    <motion.div
                        className="bg-slate-800/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 shadow-2xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold flex items-center gap-3">
                                <Heart className={`w-6 h-6 ${isStandby ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
                                System Heartbeat Monitor
                            </h2>
                            <div className="flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-cyan-400" /> Protection Current (A)</span>
                                <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-400" /> Membrane Health (%)</span>
                            </div>
                        </div>
                        <div className="h-[280px]">
                            {heartbeatHistory.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={heartbeatHistory}>
                                        <defs>
                                            <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.6} />
                                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="resistanceGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                                        <YAxis stroke="#64748b" fontSize={10} />
                                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                                        <Area type="monotone" dataKey="current" stroke="#22d3ee" fill="url(#currentGrad)" strokeWidth={2} name="Current (A)" />
                                        <Area type="monotone" dataKey="resistance" stroke="#a855f7" fill="url(#resistanceGrad)" strokeWidth={2} name="Membrane (%)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-500">
                                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                    Loading telemetry data...
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-4 gap-4">
                        <motion.div className="bg-gradient-to-br from-orange-500/20 to-red-500/10 rounded-xl p-4 border border-orange-500/30" whileHover={{ scale: 1.02 }}>
                            <div className="flex items-center gap-2 text-orange-400 mb-2"><Thermometer className="w-5 h-5" /><span className="text-sm font-medium">Stack Temp</span></div>
                            <p className="text-3xl font-bold font-mono">{data?.telemetry?.stack_temp?.toFixed(1) || '--'}°C</p>
                            <p className="text-xs text-slate-400 mt-1">Target: 65.0°C</p>
                        </motion.div>
                        <motion.div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-xl p-4 border border-blue-500/30" whileHover={{ scale: 1.02 }}>
                            <div className="flex items-center gap-2 text-blue-400 mb-2"><Gauge className="w-5 h-5" /><span className="text-sm font-medium">Pressure</span></div>
                            <p className="text-3xl font-bold font-mono">{data?.telemetry?.internal_pressure?.toFixed(1) || '--'} bar</p>
                            <p className="text-xs text-slate-400 mt-1">Holding: 30 bar</p>
                        </motion.div>
                        <motion.div className="bg-gradient-to-br from-cyan-500/20 to-teal-500/10 rounded-xl p-4 border border-cyan-500/30" whileHover={{ scale: 1.02 }}>
                            <div className="flex items-center gap-2 text-cyan-400 mb-2"><Zap className="w-5 h-5" /><span className="text-sm font-medium">Protection I</span></div>
                            <p className="text-3xl font-bold font-mono">{data?.telemetry?.protection_current?.toFixed(1) || '0.0'} A</p>
                            <p className="text-xs text-slate-400 mt-1">{isStandby ? '~1% of 5000A' : 'Normal operation'}</p>
                        </motion.div>
                        <motion.div className="bg-gradient-to-br from-emerald-500/20 to-green-500/10 rounded-xl p-4 border border-emerald-500/30" whileHover={{ scale: 1.02 }}>
                            <div className="flex items-center gap-2 text-emerald-400 mb-2"><TrendingUp className="w-5 h-5" /><span className="text-sm font-medium">Readiness</span></div>
                            <p className="text-3xl font-bold font-mono">{data?.telemetry?.restart_readiness?.toFixed(0) || '100'}%</p>
                            <p className="text-xs text-slate-400 mt-1">Restart Index</p>
                        </motion.div>
                    </div>

                    {/* Recovery & Shadow */}
                    <div className="grid grid-cols-2 gap-6">
                        <motion.div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4"><Timer className="w-5 h-5 text-blue-400" />Recovery Trajectory</h3>
                            {data?.recovery && (
                                <div className="space-y-4">
                                    <div className="text-center py-4 bg-slate-900/50 rounded-xl">
                                        <p className="text-slate-400 text-sm">Time to Full Capacity</p>
                                        <p className="text-4xl font-bold font-mono text-blue-400 mt-1">{data.recovery.time_to_full_formatted}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div><p className="text-slate-400">Ramp Rate</p><p className="font-mono font-bold">{data.recovery.ramp_rate_amps_per_sec} A/s</p></div>
                                        <div><p className="text-slate-400">Constraint</p><p className="font-bold text-amber-400">{data.recovery.limiting_constraint}</p></div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                        <motion.div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 relative overflow-hidden" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                            <div className="absolute top-4 right-4 opacity-10"><Brain className="w-24 h-24 text-purple-400" /></div>
                            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4"><Brain className="w-5 h-5 text-purple-400" />Digital Shadow (AI)</h3>
                            {data?.digital_shadow && (
                                <div className="space-y-4 relative z-10">
                                    <div className="text-center py-4 bg-slate-900/50 rounded-xl">
                                        <p className="text-slate-400 text-sm">Restart Risk (T+10s)</p>
                                        <p className={`text-4xl font-bold font-mono mt-1 ${(data.digital_shadow.restart_rupture_percent || 0) < 10 ? 'text-emerald-400' : (data.digital_shadow.restart_rupture_percent || 0) < 20 ? 'text-amber-400' : 'text-red-400'}`}>
                                            {(data.digital_shadow.restart_rupture_percent || 0).toFixed(1)}%
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-center"><span className="text-slate-400 text-sm">Verdict</span><span className="font-bold text-lg">{data.digital_shadow.verdict}</span></div>
                                    <div className="w-full bg-slate-700/50 h-3 rounded-full overflow-hidden">
                                        <motion.div className={`h-full rounded-full ${(data.digital_shadow.restart_rupture_percent || 0) < 10 ? 'bg-emerald-500' : (data.digital_shadow.restart_rupture_percent || 0) < 20 ? 'bg-amber-500' : 'bg-red-500'}`} initial={{ width: 0 }} animate={{ width: `${Math.min(data.digital_shadow.restart_rupture_percent || 0, 100)}%` }} transition={{ duration: 0.5 }} />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>

                {/* RIGHT: Controls */}
                <div className="col-span-4 space-y-6">
                    <motion.div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-6"><Power className="w-5 h-5 text-purple-400" />Operator Controls</h3>
                        <div className="space-y-4">
                            <motion.button
                                onClick={triggerStandby}
                                disabled={isStandby || actionLoading === 'standby'}
                                className="w-full py-4 px-6 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-amber-500/20"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {actionLoading === 'standby' ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertTriangle className="w-5 h-5" />}
                                {actionLoading === 'standby' ? 'TRIGGERING...' : 'TRIGGER HOT STANDBY'}
                            </motion.button>

                            <motion.button
                                onClick={triggerRapidInject}
                                disabled={!isStandby || actionLoading === 'inject'}
                                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {actionLoading === 'inject' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                                {actionLoading === 'inject' ? 'INITIATING...' : 'RAPID INJECT'}
                            </motion.button>

                            <motion.button
                                onClick={triggerPolarization}
                                disabled={actionLoading === 'pulse'}
                                className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-all flex items-center justify-center gap-3"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {actionLoading === 'pulse' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Waves className="w-5 h-5" />}
                                {actionLoading === 'pulse' ? 'PULSING...' : 'ANTI-CORROSION PULSE'}
                            </motion.button>
                        </div>

                        {/* Action Result Feedback */}
                        <AnimatePresence>
                            {actionResult && (
                                <motion.div
                                    className={`mt-4 p-4 rounded-xl border ${actionResult.success ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-red-500/20 border-red-500/50'}`}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        {actionResult.success ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                        ) : (
                                            <AlertCircle className="w-5 h-5 text-red-400" />
                                        )}
                                        <span className={`font-medium ${actionResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {actionResult.success ? 'Action Completed' : 'Action Failed'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-300">{actionResult.message || actionResult.error}</p>

                                    {/* Pulse specific data */}
                                    {actionResult.pulse_voltage_v !== undefined && (
                                        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                                            <p>Voltage: <span className="font-mono">{actionResult.pulse_voltage_v}V</span></p>
                                            <p>Current: <span className="font-mono">{actionResult.pulse_current_ma}mA</span></p>
                                            <p>Duration: <span className="font-mono">{actionResult.pulse_duration_ms}ms</span></p>
                                            <p>Score: <span className="font-mono">{((actionResult.corrosion_prevention_score || 0) * 100).toFixed(0)}%</span></p>
                                        </div>
                                    )}

                                    {/* Trajectory specific data */}
                                    {actionResult.trajectory && (
                                        <div className="mt-3 text-xs">
                                            <p>Ramp Rate: <span className="font-mono text-blue-400">{actionResult.trajectory.ramp_rate_amps_per_sec} A/s</span></p>
                                            <p>Time to Full: <span className="font-mono text-blue-400">{actionResult.trajectory.time_to_full_formatted}</span></p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* VPP */}
                    <motion.div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl p-6 border border-yellow-500/30" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4"><Radio className="w-5 h-5 text-yellow-400" />VPP Grid Services</h3>
                        {data?.vpp && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center"><span className="text-slate-400">Grid Frequency</span><span className={`text-2xl font-bold font-mono ${data.vpp.status === 'NORMAL' ? 'text-emerald-400' : 'text-amber-400'}`}>{(data.vpp.grid_frequency_hz || 50).toFixed(2)} Hz</span></div>
                                <div className="flex justify-between items-center"><span className="text-slate-400">Deviation</span><span className={`font-mono ${Math.abs(data.vpp.deviation_hz || 0) < 0.1 ? 'text-emerald-400' : 'text-amber-400'}`}>{(data.vpp.deviation_hz || 0) > 0 ? '+' : ''}{(data.vpp.deviation_hz || 0).toFixed(3)} Hz</span></div>
                                <div className="flex justify-between items-center"><span className="text-slate-400">Action</span><span className={`px-3 py-1 rounded-full text-xs font-bold ${data.vpp.action === 'ABSORB_LOAD' ? 'bg-blue-500/20 text-blue-400' : data.vpp.action === 'REDUCE_LOAD' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}`}>{data.vpp.action || 'STANDBY'}</span></div>
                                {(data.vpp.power_absorbed_kw || 0) > 0 && (<div className="p-3 bg-blue-500/10 rounded-lg"><p className="text-sm text-blue-400">Absorbing <span className="font-bold">{data.vpp.power_absorbed_kw.toFixed(1)} kW</span> from grid</p></div>)}
                            </div>
                        )}
                    </motion.div>

                    {/* Status */}
                    <motion.div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4"><Server className="w-5 h-5 text-slate-400" />System Status</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center"><span className="text-slate-400 text-sm">PID Controller</span><span className="flex items-center gap-2 text-emerald-400 text-sm"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />Active</span></div>
                            <div className="flex justify-between items-center"><span className="text-slate-400 text-sm">Coolant Pump VFD</span><span className="flex items-center gap-2 text-emerald-400 text-sm"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />Modulating</span></div>
                            <div className="flex justify-between items-center"><span className="text-slate-400 text-sm">H₂ Crossover Sensor</span><span className="flex items-center gap-2 text-emerald-400 text-sm"><div className="w-2 h-2 rounded-full bg-emerald-400" />Normal</span></div>
                            <div className="flex justify-between items-center"><span className="text-slate-400 text-sm">Outlet Valves</span><span className="text-amber-400 text-sm font-medium">{isStandby ? 'CLOSED' : 'OPEN'}</span></div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Shutdown;
