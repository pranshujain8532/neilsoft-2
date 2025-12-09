import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, MapPin, Zap } from 'lucide-react';

interface PlantData {
    name: string;
    location: string;
    coordinates: { lat: number; lng: number };
    dailyProfit: number;
    monthlyProfit: number;
    lcoh: number;
    roi: number;
    profitMargin: number;
    status: 'operational' | 'maintenance';
}

// Currency: All values in INR (₹)
// Conversion rate: 1 USD = 89.9 INR
const USD_TO_INR = 89.9;
const toINR = (usd: number) => Math.round(usd * USD_TO_INR);
const formatINR = (value: number) => `₹${value.toLocaleString('en-IN')}`;

const PlantProfitability = () => {
    const [plants, setPlants] = useState<PlantData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch real-time plant data
        const fetchPlants = async () => {
            // Sample data - in production this would come from API
            const samplePlants: PlantData[] = [
                {
                    name: 'Gujarat Green H2 Plant',
                    location: 'Ahmedabad, Gujarat',
                    coordinates: { lat: 23.0225, lng: 72.5714 },
                    dailyProfit: 15000,
                    monthlyProfit: 450000,
                    lcoh: 1.75,
                    roi: 0.22,
                    profitMargin: 0.35,
                    status: 'operational'
                },
                {
                    name: 'Maharashtra Hydro-Wind Plant',
                    location: 'Pune, Maharashtra',
                    coordinates: { lat: 18.5204, lng: 73.8567 },
                    dailyProfit: 12000,
                    monthlyProfit: 360000,
                    lcoh: 1.92,
                    roi: 0.18,
                    profitMargin: 0.28,
                    status: 'operational'
                },
                {
                    name: 'Tamil Nadu Solar Hub',
                    location: 'Chennai, Tamil Nadu',
                    coordinates: { lat: 13.0827, lng: 80.2707 },
                    dailyProfit: 10000,
                    monthlyProfit: 300000,
                    lcoh: 2.05,
                    roi: 0.15,
                    profitMargin: 0.25,
                    status: 'operational'
                }
            ];

            setPlants(samplePlants);
            setLoading(false);
        };

        fetchPlants();

        // Update every 30 seconds
        const interval = setInterval(fetchPlants, 30000);
        return () => clearInterval(interval);
    }, []);

    const bestPlant = plants.reduce((best, plant) =>
        plant.dailyProfit > (best?.dailyProfit || 0) ? plant : best
        , plants[0]);

    if (loading) {
        return <div className="animate-pulse">Loading plant data...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Best Plant Highlight */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-glass p-6 border-2 border-green-500/50"
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-green-500/20 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Most Profitable Plant</h3>
                            <p className="text-sm text-gray-500">Based on current production</p>
                        </div>
                    </div>
                    <span className="px-4 py-2 bg-green-500/20 text-green-500 rounded-full text-sm font-medium">
                        Best ROI: {(bestPlant?.roi * 100).toFixed(1)}%
                    </span>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-bold text-2xl gradient-text mb-2">{bestPlant?.name}</h4>
                        <div className="flex items-center text-gray-600 dark:text-gray-400 mb-4">
                            <MapPin className="w-4 h-4 mr-2" />
                            <span className="text-sm">{bestPlant?.location}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Daily Profit</p>
                            <p className="text-2xl font-bold text-green-500">{formatINR(toINR(bestPlant?.dailyProfit || 0))}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">LCOH</p>
                            <p className="text-2xl font-bold">₹{Math.round((bestPlant?.lcoh || 0) * 89.9)}/kg</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Plant Comparison Table */}
            <div className="card-glass p-6">
                <h3 className="text-xl font-bold mb-4">Plant Profitability Comparison</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-3 px-4">Plant Name</th>
                                <th className="text-left py-3 px-4">Location</th>
                                <th className="text-right py-3 px-4">Daily Profit</th>
                                <th className="text-right py-3 px-4">Monthly</th>
                                <th className="text-right py-3 px-4">LCOH</th>
                                <th className="text-right py-3 px-4">Margin</th>
                                <th className="text-right py-3 px-4">ROI</th>
                                <th className="text-center py-3 px-4">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {plants.map((plant, idx) => (
                                <motion.tr
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                >
                                    <td className="py-3 px-4">
                                        <div className="font-medium">{plant.name}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                            <MapPin className="w-3 h-3 mr-1" />
                                            {plant.location}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <span className="font-bold text-green-500">
                                            {formatINR(toINR(plant.dailyProfit))}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                                        {formatINR(toINR(plant.monthlyProfit))}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <span className={plant.lcoh < 2 ? 'text-green-500 font-medium' : ''}>
                                            ₹{Math.round(plant.lcoh * 89.9)}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        {(plant.profitMargin * 100).toFixed(1)}%
                                    </td>
                                    <td className="py-3 px-4 text-right font-medium">
                                        {(plant.roi * 100).toFixed(1)}%
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs ${plant.status === 'operational'
                                            ? 'bg-green-500/20 text-green-500'
                                            : 'bg-yellow-500/20 text-yellow-500'
                                            }`}>
                                            {plant.status}
                                        </span>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Key Insights */}
            <div className="grid md:grid-cols-3 gap-4">
                <div className="card-glass p-4">
                    <div className="flex items-center space-x-3 mb-2">
                        <Zap className="w-5 h-5 text-hydrogen-500" />
                        <h4 className="font-bold">Total Daily Profit</h4>
                    </div>
                    <p className="text-2xl font-bold gradient-text">
                        {formatINR(toINR(plants.reduce((sum, p) => sum + p.dailyProfit, 0)))}
                    </p>
                </div>
                <div className="card-glass p-4">
                    <div className="flex items-center space-x-3 mb-2">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        <h4 className="font-bold">Avg. Profit Margin</h4>
                    </div>
                    <p className="text-2xl font-bold text-green-500">
                        {((plants.reduce((sum, p) => sum + p.profitMargin, 0) / plants.length) * 100).toFixed(1)}%
                    </p>
                </div>
                <div className="card-glass p-4">
                    <div className="flex items-center space-x-3 mb-2">
                        <MapPin className="w-5 h-5 text-blue-500" />
                        <h4 className="font-bold">Active Plants</h4>
                    </div>
                    <p className="text-2xl font-bold">
                        {plants.filter(p => p.status === 'operational').length}/{plants.length}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PlantProfitability;
