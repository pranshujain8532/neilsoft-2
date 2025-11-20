import React from 'react';
import { Activity, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const ProductionMonitor = ({ stats }) => {
    // Generate mock historical data
    const generateHistoricalData = () => {
        const data = [];
        const baseProduction = stats?.h2_production_rate_kg_hr || 25;

        for (let i = 23; i >= 0; i--) {
            data.push({
                time: `${i}h ago`,
                production: baseProduction + (Math.random() * 5 - 2.5),
                target: 30,
            });
        }
        return data.reverse();
    };

    const data = generateHistoricalData();

    return (
        <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center border border-green-500/20">
                        <Activity className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Production Monitor</h2>
                        <p className="text-xs text-slate-400">Real-time H₂ generation tracking</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    <span className="text-xs font-medium text-green-400">Live</span>
                </div>
            </div>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="productionGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                        <XAxis
                            dataKey="time"
                            stroke="#64748b"
                            style={{ fontSize: '12px' }}
                            interval={5}
                        />
                        <YAxis
                            stroke="#64748b"
                            style={{ fontSize: '12px' }}
                            label={{ value: 'kg/hr', angle: -90, position: 'insideLeft', fill: '#64748b' }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                            }}
                            labelStyle={{ color: '#94a3b8' }}
                            itemStyle={{ color: '#22c55e' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="production"
                            stroke="#22c55e"
                            strokeWidth={2.5}
                            fill="url(#productionGradient)"
                            name="Actual Production"
                        />
                        <Line
                            type="monotone"
                            dataKey="target"
                            stroke="#3b82f6"
                            strokeDasharray="5 5"
                            strokeWidth={2}
                            dot={false}
                            name="Target"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800/50">
                <StatItem label="Current" value={`${stats?.h2_production_rate_kg_hr?.toFixed(2) || 0} kg/hr`} />
                <StatItem label="Today's Total" value="612 kg" />
                <StatItem label="Target Achievement" value="97.2%" />
            </div>
        </div>
    );
};

const StatItem = ({ label, value }) => (
    <div className="text-center">
        <div className="text-xs text-slate-500 mb-1">{label}</div>
        <div className="text-sm font-semibold text-white">{value}</div>
    </div>
);

export default ProductionMonitor;
