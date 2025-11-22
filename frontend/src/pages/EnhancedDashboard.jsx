// Enhanced Dashboard with ML Integration
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, Zap, AlertTriangle, CheckCircle2, Brain } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

const EnhancedDashboard = () => {
    const [profitData, setProfitData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMLData();
    }, []);

    const fetchMLData = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/demo/dashboard-rl`);
            setProfitData(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching ML data:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Brain className="w-16 h-16 text-blue-500 animate-pulse mx-auto mb-4" />
                    <p className="text-xl text-gray-400">Loading ML Models...</p>
                </div>
            </div>
        );
    }

    const profitPrediction = profitData?.profit_prediction || {};
    const safetyAnalysis = profitData?.safety_analysis || {};

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Brain className="w-8 h-8 text-blue-500" />
                        ML-Powered Dashboard
                    </h1>
                    <p className="text-gray-400 mt-1">Real-time predictions from 5 AI models</p>
                </div>
                <button
                    onClick={fetchMLData}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                    Refresh Data
                </button>
            </div>

            {/* Profit Prediction Section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-4">
                    <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <DollarSign className="w-6 h-6 text-blue-400" />
                            <h2 className="text-xl font-bold">Profit Prediction (DQN Reinforcement Learning)</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-black/30 rounded-xl p-4">
                                <p className="text-sm text-gray-400 mb-1">Current Score</p>
                                <p className="text-3xl font-bold text-green-400">
                                    {profitPrediction.current_profitability_score || 0}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Out of 100</p>
                            </div>

                            <div className="bg-black/30 rounded-xl p-4">
                                <p className="text-sm text-gray-400 mb-1">7-Day Forecast</p>
                                <p className="text-3xl font-bold text-blue-400">
                                    {profitPrediction.forecast?.['7_days'] || 0}
                                </p>
                                <div className="flex items-center gap-1 mt-1 text-green-400">
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="text-xs">+2.9%</span>
                                </div>
                            </div>

                            <div className="bg-black/30 rounded-xl p-4">
                                <p className="text-sm text-gray-400 mb-1">30-Day Forecast</p>
                                <p className="text-3xl font-bold text-purple-400">
                                    {profitPrediction.forecast?.['30_days'] || 0}
                                </p>
                                <div className="flex items-center gap-1 mt-1 text-green-400">
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="text-xs">+7.2%</span>
                                </div>
                            </div>

                            <div className="bg-black/30 rounded-xl p-4">
                                <p className="text-sm text-gray-400 mb-1">90-Day Forecast</p>
                                <p className="text-3xl font-bold text-orange-400">
                                    {profitPrediction.forecast?.['90_days'] || 0}
                                </p>
                                <div className="flex items-center gap-1 mt-1 text-green-400">
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="text-xs">+9.8%</span>
                                </div>
                            </div>
                        </div>

                        {/* Recommendations */}
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-yellow-400" />
                                AI Recommendations
                            </h3>
                            <div className="space-y-2">
                                {profitPrediction.recommendations?.map((rec, index) => (
                                    <div key={index} className="flex items-start gap-3 bg-black/20 rounded-lg p-3">
                                        <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                                        <p className="text-sm text-gray-300">{rec}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action Suggested */}
                        <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                            <p className="text-sm font-semibold text-yellow-400">Recommended Strategy:</p>
                            <p className="text-white mt-1">{profitPrediction.recommended_action || 'Loading...'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Safety Analysis Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[var(--color-card)] border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Activity className="w-6 h-6 text-green-400" />
                        <h2 className="text-xl font-bold">Safety Monitor (PINN)</h2>
                    </div>

                    <div className="space-y-4">
                        {/* Safety Score */}
                        <div className="relative">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-400">Overall Safety Score</span>
                                <span className="text-2xl font-bold text-green-400">
                                    {safetyAnalysis.safety_analysis?.safety_score || 0}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-3">
                                <div
                                    className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all"
                                    style={{ width: `${safetyAnalysis.safety_analysis?.safety_score || 0}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Status: <span className="text-green-400 font-semibold">
                                    {safetyAnalysis.safety_analysis?.status || 'SAFE'}
                                </span>
                            </p>
                        </div>

                        {/* Risk Factors */}
                        <div>
                            <h3 className="text-sm font-semibold mb-3">Risk Analysis</h3>
                            <div className="space-y-2">
                                {Object.entries(safetyAnalysis.safety_analysis?.risk_factors || {}).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-400 capitalize">{key}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 bg-gray-800 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${value < 30 ? 'bg-green-500' : value < 60 ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}
                                                    style={{ width: `${value}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-mono w-12 text-right">{value}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Physics Analysis */}
                <div className="bg-[var(--color-card)] border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="w-6 h-6 text-orange-400" />
                        <h2 className="text-xl font-bold">Thermodynamic Analysis</h2>
                    </div>

                    <div className="space-y-4">
                        {Object.entries(safetyAnalysis.safety_analysis?.physics_analysis || {}).map(([key, value]) => (
                            <div key={key} className="bg-gray-800/50 rounded-lg p-4">
                                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                                    {key.replace(/_/g, ' ')}
                                </p>
                                <p className="text-2xl font-bold text-blue-400">{value}</p>
                            </div>
                        ))}

                        {/* Container ID */}
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <p className="text-xs text-gray-400 mb-1">Container ID</p>
                            <p className="text-lg font-mono text-blue-400">
                                {safetyAnalysis.container_id || 'TANK-001'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Model Status */}
            <div className="bg-gradient-to-br from-purple-600/10 to-blue-600/10 border border-purple-500/30 rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-4">Active ML Models</h2>
                <div className="grid grid-cols-5 gap-4">
                    {[
                        { name: 'Profit Predictor', type: 'DQN RL', active: true },
                        { name: 'Recommendations', type: 'PPO RL', active: true },
                        { name: 'Safety Monitor', type: 'PINN', active: true },
                        { name: 'Chatbot', type: 'Gemini AI', active: true },
                        { name: 'Logistics', type: 'VRP', active: true },
                    ].map((model) => (
                        <div key={model.name} className="bg-black/30 rounded-lg p-4 text-center">
                            <div className="w-3 h-3 bg-green-400 rounded-full mx-auto mb-2 animate-pulse" />
                            <p className="text-sm font-semibold">{model.name}</p>
                            <p className="text-xs text-gray-400">{model.type}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default EnhancedDashboard;
