// Safety Monitor Page with PINN ML Model
import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Activity, Thermometer, Gauge } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

const SafetyMonitor = () => {
    const [containers, setContainers] = useState([]);
    const [selectedContainer, setSelectedContainer] = useState(null);
    const [safetyData, setSafetyData] = useState(null);
    const [loading, setLoading] = useState(false);

    const mockContainers = [
        { id: 'TANK-001', pressure: 25, temp: 28, leak: 15, fillLevel: 65 },
        { id: 'TANK-002', pressure: 28, temp: 32, leak: 45, fillLevel: 78 },
        { id: 'TANK-003', pressure: 22, temp: 25, leak: 8, fillLevel: 52 },
    ];

    const analyzeSafety = async (container) => {
        setLoading(true);
        setSelectedContainer(container);

        try {
            const response = await axios.post(`${API_URL}/api/ml-rl/safety-analysis`, {
                container_id: container.id,
                pressure_bar: container.pressure,
                temperature_c: container.temp,
                leak_ppm: container.leak,
                volume_m3: 150,
                fill_level_percent: container.fillLevel,
                age_years: 2.5,
                pressure_cycles: 1200,
                vibration_level: 0.3,
                humidity_percent: 45,
                health_score: 87
            });

            setSafetyData(response.data);
        } catch (error) {
            console.error('Safety analysis error:', error);
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Shield className="w-8 h-8 text-green-500" />
                    Safety Monitor (PINN)
                </h1>
                <p className="text-gray-400 mt-1">Physics-Informed Neural Network for thermodynamic safety analysis</p>
            </div>

            {/* Container Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mockContainers.map((container) => (
                    <button
                        key={container.id}
                        onClick={() => analyzeSafety(container)}
                        className={`bg-[var(--color-card)] border rounded-2xl p-6 text-left transition-all hover:border-blue-500 ${selectedContainer?.id === container.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-800'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">{container.id}</h3>
                            <div className={`w-3 h-3 rounded-full ${container.leak < 20 ? 'bg-green-400' : container.leak < 50 ? 'bg-yellow-400' : 'bg-red-400'
                                } animate-pulse`} />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <p className="text-gray-400">Pressure</p>
                                <p className="font-semibold">{container.pressure} bar</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Temperature</p>
                                <p className="font-semibold">{container.temp}°C</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Leak Rate</p>
                                <p className="font-semibold">{container.leak} ppm</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Fill Level</p>
                                <p className="font-semibold">{container.fillLevel}%</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Safety Analysis Results */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Shield className="w-12 h-12 text-blue-500 animate-pulse" />
                    <p className="ml-4 text-xl text-gray-400">Running PINN Analysis...</p>
                </div>
            )}

            {safetyData && !loading && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Overall Safety */}
                    <div className="bg-[var(--color-card)] border border-gray-800 rounded-2xl p-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Activity className="w-6 h-6 text-green-400" />
                            Overall Safety Assessment
                        </h2>

                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-400">Safety Score</span>
                                <span className="text-4xl font-bold text-green-400">
                                    {safetyData.safety_analysis?.safety_score}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-4">
                                <div
                                    className="bg-gradient-to-r from-green-500 to-blue-500 h-4 rounded-full transition-all"
                                    style={{ width: `${safetyData.safety_analysis?.safety_score}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-sm text-gray-500">Container: {selectedContainer?.id}</span>
                                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${safetyData.safety_analysis?.status === 'SAFE'
                                        ? 'bg-green-500/20 text-green-400'
                                        : safetyData.safety_analysis?.status === 'CAUTION'
                                            ? 'bg-yellow-500/20 text-yellow-400'
                                            : 'bg-red-500/20 text-red-400'
                                    }`}>
                                    {safetyData.safety_analysis?.status}
                                </span>
                            </div>
                        </div>

                        {/* Risk Factors */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3">Risk Factor Analysis</h3>
                            <div className="space-y-3">
                                {Object.entries(safetyData.safety_analysis?.risk_factors || {}).map(([key, value]) => (
                                    <div key={key}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm text-gray-400 capitalize">{key}</span>
                                            <span className="text-sm font-mono">{value}%</span>
                                        </div>
                                        <div className="w-full bg-gray-800 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${value < 30 ? 'bg-green-500' : value < 60 ? 'bg-yellow-500' : 'bg-red-500'
                                                    }`}
                                                style={{ width: `${value}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Physics Analysis */}
                    <div className="bg-[var(--color-card)] border border-gray-800 rounded-2xl p-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Thermometer className="w-6 h-6 text-orange-400" />
                            Thermodynamic Analysis
                        </h2>

                        <div className="space-y-4">
                            {safetyData.safety_analysis?.physics_analysis && Object.entries(safetyData.safety_analysis.physics_analysis).map(([key, value]) => (
                                <div key={key} className="bg-gray-900/50 rounded-lg p-4">
                                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                                        {key.replace(/_/g, ' ')}
                                    </p>
                                    <p className="text-2xl font-bold text-blue-400">{value}</p>
                                </div>
                            ))}

                            {/* Model Info */}
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                                <p className="text-xs text-purple-400 mb-1">ML Model</p>
                                <p className="text-sm font-semibold">{safetyData.safety_analysis?.model}</p>
                            </div>
                        </div>
                    </div>

                    {/* Anomaly Detection */}
                    {safetyData.anomaly_detection && (
                        <div className="lg:col-span-2 bg-[var(--color-card)] border border-gray-800 rounded-2xl p-6">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-6 h-6 text-yellow-400" />
                                Anomaly Detection
                            </h2>

                            {safetyData.anomaly_detection.is_anomaly ? (
                                <div className="space-y-3">
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                                        <p className="text-red-400 font-semibold mb-2">⚠️ Anomalies Detected</p>
                                        <p className="text-sm text-gray-300">Anomaly Score: {safetyData.anomaly_detection.anomaly_score}</p>
                                    </div>

                                    {safetyData.anomaly_detection.anomalies?.map((anomaly, idx) => (
                                        <div key={idx} className="bg-gray-900/50 rounded-lg p-4">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className={`w-5 h-5 mt-0.5 ${anomaly.severity === 'critical' ? 'text-red-400' :
                                                        anomaly.severity === 'high' ? 'text-orange-400' : 'text-yellow-400'
                                                    }`} />
                                                <div className="flex-1">
                                                    <p className="font-semibold capitalize">{anomaly.type} Anomaly</p>
                                                    <p className="text-sm text-gray-400 mt-1">{anomaly.message}</p>
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        Severity: <span className={`font-semibold ${anomaly.severity === 'critical' ? 'text-red-400' :
                                                                anomaly.severity === 'high' ? 'text-orange-400' : 'text-yellow-400'
                                                            }`}>{anomaly.severity.toUpperCase()}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-3" />
                                    <p className="text-lg font-semibold text-green-400">No Anomalies Detected</p>
                                    <p className="text-sm text-gray-400 mt-1">All parameters within normal range</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Preventive Actions */}
                    {safetyData.preventive_actions && (
                        <div className="lg:col-span-2 bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/30 rounded-2xl p-6">
                            <h2 className="text-xl font-bold mb-4">Recommended Actions</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {safetyData.preventive_actions.map((action, idx) => (
                                    <div key={idx} className="flex items-start gap-3 bg-black/30 rounded-lg p-4">
                                        <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                                        <p className="text-sm text-gray-300">{action}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SafetyMonitor;
