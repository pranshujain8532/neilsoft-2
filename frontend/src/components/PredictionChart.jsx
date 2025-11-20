import React, { useEffect, useState } from 'react';
import { Brain, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const PredictionChart = () => {
    const [predictions, setPredictions] = useState(null);

    useEffect(() => {
        fetchPredictions();
    }, []);

    const fetchPredictions = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/predictions/energy');
            const data = await response.json();
            setPredictions(data);
        } catch (error) {
            console.error('Failed to fetch predictions:', error);
        }
    };

    if (!predictions) {
        return <div className="glass-card p-6 rounded-2xl h-64 flex items-center justify-center">
            <div className="text-slate-400">Loading predictions...</div>
        </div>;
    }

    // Format data for chart (show only next 12 hours for clarity)
    const chartData = predictions.forecast.slice(0, 12).map(item => ({
        time: new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        solar: item.solar_kw,
        wind: item.wind_kw,
        h2_production: item.predicted_h2_kg,
    }));

    return (
        <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center border border-purple-500/20">
                        <Brain className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">AI-Powered Predictions</h2>
                        <p className="text-xs text-slate-400">Next 12 hours forecasting</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-medium text-purple-400">
                        Model Accuracy: {predictions.model_accuracy}
                    </span>
                </div>
            </div>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                        <XAxis
                            dataKey="time"
                            stroke="#64748b"
                            style={{ fontSize: '12px' }}
                        />
                        <YAxis
                            stroke="#64748b"
                            style={{ fontSize: '12px' }}
                            label={{ value: 'kW / kg', angle: -90, position: 'insideLeft', fill: '#64748b' }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                            }}
                            labelStyle={{ color: '#94a3b8' }}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="line"
                        />
                        <Line
                            type="monotone"
                            dataKey="solar"
                            stroke="#f59e0b"
                            strokeWidth={2.5}
                            name="Solar (kW)"
                            dot={{ fill: '#f59e0b', r: 3 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="wind"
                            stroke="#3b82f6"
                            strokeWidth={2.5}
                            name="Wind (kW)"
                            dot={{ fill: '#3b82f6', r: 3 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="h2_production"
                            stroke="#22c55e"
                            strokeWidth={2.5}
                            name="H₂ Production (kg/hr)"
                            dot={{ fill: '#22c55e', r: 3 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800/50">
                <PredictionStat label="Peak Solar" value="1.2 MW" time="2:00 PM" />
                <PredictionStat label="Peak Wind" value="0.8 MW" time="11:00 PM" />
                <PredictionStat label="Peak H₂" value="42 kg/hr" time="2:30 PM" />
            </div>
        </div>
    );
};

const PredictionStat = ({ label, value, time }) => (
    <div className="text-center">
        <div className="text-xs text-slate-500 mb-1">{label}</div>
        <div className="text-sm font-semibold text-white">{value}</div>
        <div className="text-xs text-purple-400 mt-0.5">{time}</div>
    </div>
);

export default PredictionChart;
