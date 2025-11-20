import React from 'react';
import { Sun, Wind, Zap } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const EnergyMixChart = ({ stats }) => {
    const data = [
        { name: 'Solar', value: stats?.solar_input_kw || 0, color: '#f59e0b' },
        { name: 'Wind', value: stats?.wind_input_kw || 0, color: '#3b82f6' },
    ];

    const totalEnergy = data.reduce((sum, item) => sum + item.value, 0);

    return (
        <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-orange-500/10 flex items-center justify-center border border-blue-500/20">
                        <Zap className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Energy Mix</h2>
                        <p className="text-xs text-slate-400">Renewable energy distribution</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-white">{totalEnergy.toFixed(0)} kW</div>
                    <div className="text-xs text-slate-400">Total Input</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={70}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: '1px solid #334155',
                                    borderRadius: '8px'
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex flex-col justify-center space-y-4">
                    <EnergySource
                        icon={Sun}
                        name="Solar Energy"
                        value={stats?.solar_input_kw || 0}
                        percentage={(stats?.solar_input_kw / totalEnergy * 100) || 0}
                        color="orange"
                    />
                    <EnergySource
                        icon={Wind}
                        name="Wind Energy"
                        value={stats?.wind_input_kw || 0}
                        percentage={(stats?.wind_input_kw / totalEnergy * 100) || 0}
                        color="blue"
                    />
                </div>
            </div>
        </div>
    );
};

const EnergySource = ({ icon: Icon, name, value, percentage, color }) => {
    const colorClasses = {
        orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    };

    return (
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${colorClasses[color]}`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-300">{name}</span>
                    <span className="text-sm font-semibold text-white">{value.toFixed(0)} kW</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full ${color === 'orange' ? 'bg-orange-500' : 'bg-blue-500'}`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default EnergyMixChart;
