import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Zap, Activity, ArrowRight, Battery, Sun, Wind, Droplet } from 'lucide-react';

const EnergyMix = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        fetchEnergyData();
        const interval = setInterval(fetchEnergyData, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchEnergyData = async () => {
        try {
            const response = await fetch('http://localhost:5001/api/energy/optimization');
            const result = await response.json();
            if (result.success) {
                setData(result.data);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching energy data:', error);
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Energy Intelligence...</div>;

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 section-padding">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-7xl mx-auto"
            >
                <div className="mb-8">
                    <h1 className="text-4xl font-bold gradient-text mb-2">Energy Mix Optimization</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        AI-driven power source selection based on 40+ thermodynamic and market parameters.
                    </p>
                </div>

                {/* Recommendation Card */}
                {data && (
                    <div className="card-glass p-8 mb-8 border-l-4 border-hydrogen-500 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Zap className="w-32 h-32" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center space-x-3 mb-4">
                                <span className="px-3 py-1 bg-hydrogen-500 text-white rounded-full text-sm font-bold animate-pulse">
                                    AI RECOMMENDATION
                                </span>
                                <span className="text-gray-500 text-sm">Updated: {new Date().toLocaleTimeString()}</span>
                            </div>

                            <h2 className="text-3xl font-bold mb-4">
                                Switch to <span className="text-hydrogen-500">{data.recommendation.optimal_source}</span>
                            </h2>

                            <p className="text-xl text-gray-700 dark:text-gray-300 mb-6 max-w-3xl">
                                {data.recommendation.reason}
                            </p>

                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="bg-white/50 dark:bg-black/20 p-4 rounded-lg">
                                    <div className="text-sm text-gray-500">Efficiency Score</div>
                                    <div className="text-2xl font-bold text-green-500">
                                        {(data.recommendation.efficiency_score * 100).toFixed(1)}%
                                    </div>
                                </div>
                                <div className="bg-white/50 dark:bg-black/20 p-4 rounded-lg">
                                    <div className="text-sm text-gray-500">Projected Savings</div>
                                    <div className="text-2xl font-bold text-blue-500">
                                        ${data.recommendation.projected_savings.toFixed(2)}/hr
                                    </div>
                                </div>
                                <div className="bg-white/50 dark:bg-black/20 p-4 rounded-lg">
                                    <div className="text-sm text-gray-500">Grid Price</div>
                                    <div className="text-2xl font-bold text-purple-500">
                                        ${data.market_data.grid_price.toFixed(2)}/MWh
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Current Mix Chart */}
                    <div className="card-glass p-6">
                        <h3 className="text-xl font-bold mb-6">Current Power Distribution</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Solar', value: data?.current_mix.solar },
                                            { name: 'Wind', value: data?.current_mix.wind },
                                            { name: 'Hydro', value: data?.current_mix.hydro },
                                            { name: 'Grid', value: data?.current_mix.grid },
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {COLORS.map((color, index) => (
                                            <Cell key={`cell-${index}`} fill={color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Thermodynamic Parameters */}
                    <div className="card-glass p-6">
                        <h3 className="text-xl font-bold mb-6">Thermodynamic Parameters (Live)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {data && Object.entries(data.physics_params).slice(0, 8).map(([key, value]: [string, any]) => (
                                <div key={key} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                                        {key.replace(/_/g, ' ')}
                                    </span>
                                    <span className="font-mono font-bold">
                                        {typeof value === 'number' ? value.toFixed(2) : value}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 text-center text-xs text-gray-500">
                            + 32 more parameters processed by ML model
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default EnergyMix;
