import React, { useState, useEffect } from 'react';
import { Activity, Droplet, Wind, Sun, Zap, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const DigitalTwin = () => {
    const [plantData, setPlantData] = useState(null);
    const [selectedComponent, setSelectedComponent] = useState(null);

    useEffect(() => {
        fetchPlantData();
        const interval = setInterval(fetchPlantData, 3000);
        return () => clearInterval(interval);
    }, []);

    const fetchPlantData = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/dashboard/stats');
            const data = await response.json();
            setPlantData(data);
        } catch (error) {
            console.error('Failed to fetch plant data:', error);
        }
    };

    const components = [
        {
            id: 'solar',
            name: 'Solar Array',
            icon: Sun,
            x: 50,
            y: 100,
            status: 'active',
            output: plantData?.solar_input_kw || 0,
            efficiency: 92,
            color: '#f59e0b'
        },
        {
            id: 'wind',
            name: 'Wind Turbine',
            icon: Wind,
            x: 250,
            y: 80,
            status: 'active',
            output: plantData?.wind_input_kw || 0,
            efficiency: 88,
            color: '#3b82f6'
        },
        {
            id: 'electrolyzer',
            name: 'Electrolyzer',
            icon: Zap,
            x: 150,
            y: 250,
            status: 'active',
            output: plantData?.h2_production_rate_kg_hr || 0,
            efficiency: plantData?.system_efficiency_percent || 0,
            color: '#22c55e'
        },
        {
            id: 'storage',
            name: 'H₂ Storage Tank',
            icon: Droplet,
            x: 350,
            y: 250,
            status: 'active',
            level: plantData?.storage_level_percent || 0,
            capacity: '10,000 kg',
            color: '#8b5cf6'
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Digital Twin - Plant Overview</h1>
                    <p className="text-slate-400">Real-time visualization of hydrogen production facility</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    <span className="text-sm font-medium text-green-400">System Online</span>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Main Plant Visualization */}
                <div className="xl:col-span-2 glass-card p-8 rounded-2xl">
                    <svg viewBox="0 0 500 400" className="w-full h-auto">
                        {/* Energy Flow Lines */}
                        <motion.path
                            d="M 100 120 Q 125 180 150 230"
                            stroke="#f59e0b"
                            strokeWidth="3"
                            fill="none"
                            strokeDasharray="5,5"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                        <motion.path
                            d="M 250 100 Q 200 180 170 230"
                            stroke="#3b82f6"
                            strokeWidth="3"
                            fill="none"
                            strokeDasharray="5,5"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                        />
                        <motion.path
                            d="M 180 270 L 330 270"
                            stroke="#22c55e"
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray="8,4"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        />

                        {/* Component Nodes */}
                        {components.map((component) => {
                            const Icon = component.icon;
                            return (
                                <g
                                    key={component.id}
                                    transform={`translate(${component.x}, ${component.y})`}
                                    onClick={() => setSelectedComponent(component)}
                                    className="cursor-pointer"
                                >
                                    <motion.circle
                                        r="35"
                                        fill={`${component.color}20`}
                                        stroke={component.color}
                                        strokeWidth="2"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                    />
                                    <motion.circle
                                        r="25"
                                        fill={`${component.color}40`}
                                        animate={{
                                            scale: [1, 1.2, 1],
                                            opacity: [0.5, 0.8, 0.5]
                                        }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                    <foreignObject x="-12" y="-12" width="24" height="24">
                                        <Icon className="w-6 h-6" style={{ color: component.color }} />
                                    </foreignObject>
                                    <text
                                        y="55"
                                        textAnchor="middle"
                                        fill="#94a3b8"
                                        fontSize="12"
                                        fontWeight="500"
                                    >
                                        {component.name}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                </div>

                {/* Component Details Panel */}
                <div className="space-y-4">
                    {selectedComponent ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-card p-6 rounded-2xl"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: `${selectedComponent.color}20`, borderColor: `${selectedComponent.color}40`, borderWidth: '1px' }}
                                >
                                    <selectedComponent.icon className="w-6 h-6" style={{ color: selectedComponent.color }} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">{selectedComponent.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                        <span className="text-xs text-green-400">Operational</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {selectedComponent.output !== undefined && (
                                    <MetricRow label="Output" value={`${selectedComponent.output.toFixed(1)} ${selectedComponent.id === 'electrolyzer' ? 'kg/hr' : 'kW'}`} />
                                )}
                                {selectedComponent.efficiency !== undefined && (
                                    <MetricRow label="Efficiency" value={`${selectedComponent.efficiency.toFixed(1)}%`} />
                                )}
                                {selectedComponent.level !== undefined && (
                                    <MetricRow label="Fill Level" value={`${selectedComponent.level.toFixed(1)}%`} />
                                )}
                                {selectedComponent.capacity && (
                                    <MetricRow label="Capacity" value={selectedComponent.capacity} />
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <div className="glass-card p-6 rounded-2xl h-64 flex items-center justify-center">
                            <div className="text-center text-slate-400">
                                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Click on a component to view details</p>
                            </div>
                        </div>
                    )}

                    {/* System Metrics */}
                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="text-sm font-semibold text-slate-300 mb-4">System Metrics</h3>
                        <div className="space-y-3">
                            <MetricRow
                                label="Total Energy Input"
                                value={`${plantData?.total_energy_kw?.toFixed(0) || 0} kW`}
                            />
                            <MetricRow
                                label="H₂ Production"
                                value={`${plantData?.h2_production_rate_kg_hr?.toFixed(2) || 0} kg/hr`}
                            />
                            <MetricRow
                                label="Overall Efficiency"
                                value={`${plantData?.system_efficiency_percent?.toFixed(1) || 0}%`}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetricRow = ({ label, value }) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-800/50 last:border-0">
        <span className="text-sm text-slate-400">{label}</span>
        <span className="text-sm font-semibold text-white">{value}</span>
    </div>
);

export default DigitalTwin;
