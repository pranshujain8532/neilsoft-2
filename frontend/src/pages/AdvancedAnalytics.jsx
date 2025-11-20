import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Target, AlertCircle, BarChart3, PieChart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const AdvancedAnalytics = () => {
    const [profitability, setProfitability] = useState(null);
    const [degradation, setDegradation] = useState(null);
    const [energyOptimization, setEnergyOptimization] = useState(null);
    const [logistics, setLogistics] = useState(null);
    const [designOptimization, setDesignOptimization] = useState(null);
    const [enhancedLCOH, setEnhancedLCOH] = useState(null);

    useEffect(() => {
        fetchAnalytics();
        const interval = setInterval(fetchAnalytics, 10000); // Update every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchAnalytics = async () => {
        try {
            // Fetch profitability analysis
            const profitRes = await fetch('http://localhost:8000/api/ml/profitability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const profitData = await profitRes.json();
            setProfitability(profitData);

            // Fetch degradation analysis
            const degradRes = await fetch('http://localhost:8000/api/ml/degradation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const degradData = await degradRes.json();
            setDegradation(degradData);

            // Fetch energy optimization
            const energyRes = await fetch('http://localhost:8000/api/optimization/energy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const energyData = await energyRes.json();
            setEnergyOptimization(energyData);

            // Fetch logistics optimization
            const logisticsRes = await fetch('http://localhost:8000/api/optimization/logistics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const logisticsData = await logisticsRes.json();
            setLogistics(logisticsData);

            // Fetch design optimization
            const designRes = await fetch('http://localhost:8000/api/optimization/design', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const designData = await designRes.json();
            setDesignOptimization(designData);

            // Fetch enhanced LCOH
            const lcohRes = await fetch('http://localhost:8000/api/economics/enhanced');
            const lcohData = await lcohRes.json();
            setEnhancedLCOH(lcohData);

        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        }
    };

    if (!profitability || !degradation || !energyOptimization) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading Advanced Analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Advanced Analytics & Optimization</h1>
                    <p className="text-slate-400">AI-powered insights and optimization strategies</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-400">ML Models Active</span>
                </div>
            </div>

            {/* Top Row - Profitability & Degradation */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Profitability Analysis */}
                <div className="glass-card p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-600/10 flex items-center justify-center border border-green-500/20">
                                <TrendingUp className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Profitability Analysis</h2>
                                <p className="text-xs text-slate-400">AI-powered scoring</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-green-400">
                                {profitability.profitability_score}
                            </div>
                            <div className="text-xs text-slate-400">Score (0-100)</div>
                        </div>
                    </div>

                    <div className="space-y-3 mb-4">
                        <MetricBar
                            label="Cost Efficiency"
                            value={profitability.cost_efficiency * 100}
                            color="green"
                        />
                        <MetricBar
                            label="Inventory Velocity"
                            value={profitability.inventory_velocity * 100}
                            color="blue"
                        />
                    </div>

                    {profitability.recommendations && profitability.recommendations.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-800/50">
                            <div className="text-sm font-medium text-slate-300 mb-2">Recommendations:</div>
                            {profitability.recommendations.map((rec, idx) => (
                                <div key={idx} className="text-sm text-slate-400 mb-1 flex items-start gap-2">
                                    <span className="text-yellow-400">•</span>
                                    <span>{rec}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Equipment Degradation */}
                <div className="glass-card p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-600/10 flex items-center justify-center border border-orange-500/20">
                                <AlertCircle className="w-5 h-5 text-orange-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Equipment Health</h2>
                                <p className="text-xs text-slate-400">Degradation prediction</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-orange-400">
                                {degradation.health_score.toFixed(0)}%
                            </div>
                            <div className="text-xs text-slate-400">Health Score</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-slate-800/30 p-3 rounded-xl">
                            <div className="text-xs text-slate-400 mb-1">Remaining Life</div>
                            <div className="text-lg font-semibold text-white">{degradation.rul_days} days</div>
                        </div>
                        <div className="bg-slate-800/30 p-3 rounded-xl">
                            <div className="text-xs text-slate-400 mb-1">Failure Risk (30d)</div>
                            <div className="text-lg font-semibold text-orange-400">
                                {degradation.failure_probability['30_days'].toFixed(1)}%
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-800/50">
                        <div className="text-sm font-medium text-white bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                            {degradation.maintenance_recommendation}
                        </div>
                    </div>
                </div>
            </div>

            {/* Energy Optimization */}
            <div className="glass-card p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-600/10 flex items-center justify-center border border-blue-500/20">
                            <Target className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Energy Optimization</h2>
                            <p className="text-xs text-slate-400">Fuzzy Logic + RL Controller</p>
                        </div>
                    </div>
                    <div className="px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
                        <span className="text-sm font-medium text-blue-400">{energyOptimization.strategy}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 p-4 rounded-xl">
                        <div className="text-xs text-slate-400 mb-2">Electrolyzer Allocation</div>
                        <div className="text-2xl font-bold text-white mb-1">
                            {energyOptimization.allocations.electrolyzer_kw} kW
                        </div>
                        <div className="text-xs text-green-400">
                            {energyOptimization.renewable_utilization.toFixed(1)}% renewable
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 p-4 rounded-xl">
                        <div className="text-xs text-slate-400 mb-2">Battery Status</div>
                        <div className="text-2xl font-bold text-white mb-1">
                            {Math.abs(energyOptimization.allocations.battery_charging_kw)} kW
                        </div>
                        <div className="text-xs text-purple-400">
                            {energyOptimization.allocations.battery_charging_kw > 0 ? 'Charging' : 'Discharging'}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 p-4 rounded-xl">
                        <div className="text-xs text-slate-400 mb-2">System Efficiency</div>
                        <div className="text-2xl font-bold text-white mb-1">
                            {energyOptimization.efficiency.toFixed(1)}%
                        </div>
                        <div className="text-xs text-green-400">
                            ${energyOptimization.cost_savings.toFixed(2)} saved
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row - Logistics & Design */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Logistics Optimization */}
                {logistics && (
                    <div className="glass-card p-6 rounded-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 flex items-center justify-center border border-cyan-500/20">
                                    <PieChart className="w-5 h-5 text-cyan-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Logistics Optimization</h2>
                                    <p className="text-xs text-slate-400">VRP Solver - {logistics.optimization_method}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-slate-800/30 p-3 rounded-xl">
                                <div className="text-xs text-slate-400 mb-1">Total Distance</div>
                                <div className="text-lg font-semibold text-white">{logistics.total_distance_km} km</div>
                            </div>
                            <div className="bg-slate-800/30 p-3 rounded-xl">
                                <div className="text-xs text-slate-400 mb-1">Total Cost</div>
                                <div className="text-lg font-semibold text-cyan-400">${logistics.total_cost_usd}</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {logistics.routes.map((route, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 bg-slate-800/20 rounded-lg">
                                    <span className="text-sm text-slate-300">Vehicle {route.vehicle_id}</span>
                                    <div className="flex gap-4 text-xs">
                                        <span className="text-slate-400">{route.stops} stops</span>
                                        <span className="text-cyan-400">{route.utilization.toFixed(0)}% loaded</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-800/50">
                            <div className="text-sm text-green-400">
                                ✓ {logistics.savings_vs_unoptimized} savings vs unoptimized routes
                            </div>
                        </div>
                    </div>
                )}

                {/* Design Optimization */}
                {designOptimization && (
                    <div className="glass-card p-6 rounded-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-600/10 flex items-center justify-center border border-purple-500/20">
                                    <DollarSign className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Generative Design</h2>
                                    <p className="text-xs text-slate-400">{designOptimization.algorithm}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-purple-400">
                                    {designOptimization.capex_reduction.savings_percent}%
                                </div>
                                <div className="text-xs text-slate-400">CAPEX Saved</div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 p-4 rounded-xl mb-4">
                            <div className="text-sm text-slate-300 mb-2">Cost Reduction</div>
                            <div className="text-3xl font-bold text-white mb-1">
                                ${(designOptimization.capex_reduction.savings_usd / 1000).toFixed(0)}K
                            </div>
                            <div className="text-xs text-slate-400">
                                Optimized: ${(designOptimization.capex_reduction.optimized_usd / 1000000).toFixed(2)}M
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-sm font-medium text-slate-300 mb-2">Improvements:</div>
                            {designOptimization.improvements.map((improvement, idx) => (
                                <div key={idx} className="text-sm text-slate-400 flex items-start gap-2">
                                    <span className="text-purple-400">✓</span>
                                    <span>{improvement}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Enhanced LCOH Analysis */}
            {enhancedLCOH && (
                <div className="glass-card p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-600/10 flex items-center justify-center border border-emerald-500/20">
                                <DollarSign className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Enhanced LCOH Analysis</h2>
                                <p className="text-xs text-slate-400">Comprehensive cost breakdown</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-emerald-400">
                                ${enhancedLCOH.lcoh_usd_per_kg}/kg
                            </div>
                            <div className={`text-sm ${enhancedLCOH.achievement === 'Below Target' ? 'text-green-400' : 'text-yellow-400'}`}>
                                {enhancedLCOH.achievement}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-800/30 p-3 rounded-xl">
                            <div className="text-xs text-slate-400 mb-1">CAPEX Share</div>
                            <div className="text-lg font-semibold text-white">
                                {enhancedLCOH.cost_composition.capex_percent}%
                            </div>
                        </div>
                        <div className="bg-slate-800/30 p-3 rounded-xl">
                            <div className="text-xs text-slate-400 mb-1">OPEX Share</div>
                            <div className="text-lg font-semibold text-white">
                                {enhancedLCOH.cost_composition.opex_percent}%
                            </div>
                        </div>
                        <div className="bg-slate-800/30 p-3 rounded-xl">
                            <div className="text-xs text-slate-400 mb-1">Annual Production</div>
                            <div className="text-lg font-semibold text-white">
                                {(enhancedLCOH.production.annual_kg / 1000).toFixed(0)}K kg
                            </div>
                        </div>
                        <div className="bg-slate-800/30 p-3 rounded-xl">
                            <div className="text-xs text-slate-400 mb-1">Target LCOH</div>
                            <div className="text-lg font-semibold text-green-400">
                                ${enhancedLCOH.target_lcoh}/kg
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const MetricBar = ({ label, value, color }) => {
    const colorClasses = {
        green: 'bg-green-500',
        blue: 'bg-blue-500',
        purple: 'bg-purple-500',
        orange: 'bg-orange-500'
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm text-slate-400">{label}</span>
                <span className="text-sm font-semibold text-white">{value.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${colorClasses[color]}`}
                    style={{ width: `${Math.min(value, 100)}%` }}
                />
            </div>
        </div>
    );
};

export default AdvancedAnalytics;
