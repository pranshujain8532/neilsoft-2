import React, { useState } from 'react';
import { calculateETA } from '../services/etaService';
import { MapPin, Navigation, Clock } from 'lucide-react';

interface RouteSimulatorProps {
    isOpen: boolean;
    onClose: () => void;
}

const RouteSimulator: React.FC<RouteSimulatorProps> = ({ isOpen, onClose }) => {
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSimulate = async () => {
        setLoading(true);
        const res = await calculateETA(origin, destination);
        setResult(res);
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-blue-500" />
                        Route Simulator
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        ✕
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Origin</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={origin}
                                onChange={(e) => setOrigin(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Mumbai"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destination</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Pune"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSimulate}
                        disabled={loading || !origin || !destination}
                        className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/30"
                    >
                        {loading ? 'Calculating...' : 'Simulate Route'}
                    </button>

                    {result && (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30 animate-in fade-in slide-in-from-bottom-4">
                            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Simulation Results</h3>
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-blue-500" />
                                    <span>Duration: <strong>{result.duration}</strong></span>
                                </div>
                                <div>
                                    <span>Distance: <strong>{result.distance}</strong></span>
                                </div>
                            </div>
                            {result.duration_in_traffic && (
                                <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                                    ⚠️ Heavy traffic: {result.duration_in_traffic}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RouteSimulator;
