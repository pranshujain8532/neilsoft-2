import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Zap, DollarSign, ArrowRight, CheckCircle, AlertTriangle, Leaf, Tag, Star } from 'lucide-react';
import { transportAPI } from '@/utils/api';
import { supabase } from '@/lib/supabase';

interface TransportOption {
    mode: string;
    mode_name: string;
    mode_icon: string;
    total_cost_inr: number;
    travel_time_hours: number;
    co2_kg: number;
    quality_loss_percent: number;
    eta: string;
    distance_km?: number;
    recommendation: string;
    recommendation_label: string;
    scores: {
        cost: number;
        time: number;
        safety: number;
        carbon: number;
        quality: number;
        final: number;
    };
}

interface Plant {
    id: string;
    name: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    capacity_mw?: number;
    status?: string;
    renewable_percentage?: number;
    lcoh?: number;
    safety_rating?: number;
    pipeline_available?: boolean;
}

interface SmartDispatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
    onDispatchConfirm: (order: any, option: TransportOption, plantName: string) => void;
}

// Haversine distance calculation
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Scoring weights as per user requirement
const SCORING_WEIGHTS = {
    cost: 0.35,      // 35%
    time: 0.25,      // 25%
    safety: 0.20,    // 20%
    quality: 0.15,   // 15%
    renewable: 0.05  // 5% (changed from carbon)
};

// Score a plant based on order requirements
const scorePlant = (plant: Plant, orderQty: number, distance: number): { score: number; breakdown: Record<string, number> } => {
    const capacity = (plant.capacity_mw || 50) * 1000; // Convert MW to kg/day approx
    const lcoh = plant.lcoh || 2.5;
    const renewable = (plant.renewable_percentage || 0) / 100;
    const safetyRating = plant.safety_rating || 0.85;

    // Normalize metrics (0.0 to 1.0)
    // Capacity: Bell curve peaking at 50% utilization
    const capRatio = Math.min(orderQty / (capacity + 1), 1.0);
    const sCap = 1.0 - Math.abs(capRatio - 0.5);

    // Distance: Closer is better (0 score at 2000km) - affects time
    const sTime = Math.max(0, 1.0 - (distance / 2000));

    // LCOH: Cheaper is better ($1 = 1.0 score, $5 = 0.0 score) - affects cost
    const sCost = Math.max(0, 1.0 - (lcoh - 1.0) / 4.0);

    // Safety from plant rating
    const sSafety = safetyRating;

    // Renewable percentage
    const sRenewable = renewable;

    // Combined quality score (capacity match affects quality)
    const sQuality = sCap;

    // Calculate final score using weights
    const finalScore = (
        SCORING_WEIGHTS.cost * sCost +
        SCORING_WEIGHTS.time * sTime +
        SCORING_WEIGHTS.safety * sSafety +
        SCORING_WEIGHTS.quality * sQuality +
        SCORING_WEIGHTS.renewable * sRenewable
    );

    return {
        score: finalScore,
        breakdown: {
            cost: Math.round(SCORING_WEIGHTS.cost * sCost * 100),
            time: Math.round(SCORING_WEIGHTS.time * sTime * 100),
            safety: Math.round(SCORING_WEIGHTS.safety * sSafety * 100),
            quality: Math.round(SCORING_WEIGHTS.quality * sQuality * 100),
            renewable: Math.round(SCORING_WEIGHTS.renewable * sRenewable * 100)
        }
    };
};

// INR to USD conversion rate (approximate)
const INR_TO_USD = 0.012;

export const SmartDispatchModal = ({ isOpen, onClose, order, onDispatchConfirm }: SmartDispatchModalProps) => {
    const [loading, setLoading] = useState(false);
    const [transportOptions, setTransportOptions] = useState<TransportOption[]>([]);
    const [routeInfo, setRouteInfo] = useState<any>(null);
    const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
    const [allPlants, setAllPlants] = useState<Plant[]>([]);
    const [plantScores, setPlantScores] = useState<Record<string, { score: number; distance: number }>>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && order) {
            fetchPlantsAndOptimize();
        }
    }, [isOpen, order]);

    const fetchPlantsAndOptimize = async () => {
        if (!order) return;

        setLoading(true);
        setTransportOptions([]);
        setError(null);

        try {
            // Step 1: Fetch ALL operational plants from database
            const { data: plants, error: plantsError } = await supabase
                .from('plants')
                .select('*')
                .eq('status', 'operational');

            if (plantsError) throw plantsError;
            if (!plants || plants.length === 0) {
                setError('No operational plants found in database');
                setLoading(false);
                return;
            }

            setAllPlants(plants);
            console.log(`[SmartDispatch] Fetched ${plants.length} operational plants from DB`);

            // Step 2: Get customer/destination coordinates
            let destLat = 20.5937, destLon = 78.9629; // Default India center

            if (order.delivery_latitude && order.delivery_longitude) {
                destLat = order.delivery_latitude;
                destLon = order.delivery_longitude;
            } else if (order.delivery_address) {
                // Use ML API to geocode if needed (or Google Maps)
                try {
                    const geocodeResp = await fetch(
                        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(order.delivery_address)}&format=json&limit=1`,
                        { headers: { 'User-Agent': 'HydrogenPlatform/1.0' } }
                    );
                    const geocodeData = await geocodeResp.json();
                    if (geocodeData && geocodeData[0]) {
                        destLat = parseFloat(geocodeData[0].lat);
                        destLon = parseFloat(geocodeData[0].lon);
                    }
                } catch (e) {
                    console.log('[SmartDispatch] Geocoding failed, using fallback');
                }
            }

            // Step 3: Calculate distance and score for each plant
            const scores: Record<string, { score: number; distance: number; breakdown: Record<string, number> }> = {};
            let bestPlant: Plant | null = null;
            let bestScore = -1;

            for (const plant of plants) {
                const plantLat = plant.latitude || 20.5937;
                const plantLon = plant.longitude || 78.9629;
                const distance = calculateDistance(plantLat, plantLon, destLat, destLon);

                const { score, breakdown } = scorePlant(plant, order.quantity || 1000, distance);

                scores[plant.id] = { score, distance, breakdown };

                console.log(`[SmartDispatch] Plant: ${plant.name}, Distance: ${distance.toFixed(0)}km, Score: ${(score * 100).toFixed(1)}%`);

                if (score > bestScore) {
                    bestScore = score;
                    bestPlant = plant;
                }
            }

            setPlantScores(scores);

            if (!bestPlant) {
                setError('Could not select optimal plant');
                setLoading(false);
                return;
            }

            setSelectedPlant(bestPlant);
            const plantOrigin = bestPlant.location || bestPlant.name;

            console.log(`[SmartDispatch] SELECTED: ${bestPlant.name} (Score: ${(bestScore * 100).toFixed(1)}%)`);
            console.log(`[SmartDispatch] Scoring breakdown: Cost ${SCORING_WEIGHTS.cost * 100}%, Time ${SCORING_WEIGHTS.time * 100}%, Safety ${SCORING_WEIGHTS.safety * 100}%, Quality ${SCORING_WEIGHTS.quality * 100}%, Renewable ${SCORING_WEIGHTS.renewable * 100}%`);

            // Step 4: Call ML service for transport optimization from selected plant
            const result = await transportAPI.optimizeRoute({
                origin: plantOrigin,
                destination: order.delivery_address,
                quantity: order.quantity || 1000,
                priority: (order.priority_score || 0) > 50 ? 'high' : 'normal'
            });

            console.log('[SmartDispatch] Transport options:', result);

            if (result.success && result.options && result.options.length > 0) {
                setTransportOptions(result.options);
                setRouteInfo(result.route);
            } else {
                setError('No transport options available for this route');
            }
        } catch (err: any) {
            console.error('Failed to fetch transport options:', err);
            setError(err.message || 'Failed to fetch transport options');
        } finally {
            setLoading(false);
        }
    };

    const formatETA = (hours: number) => {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h ${m}m`;
    };

    const formatLocation = (location: any): string => {
        if (!location) return 'Unknown';
        if (typeof location === 'string') return location;
        if (typeof location === 'object') {
            return location.city || location.name || location.address || JSON.stringify(location);
        }
        return String(location);
    };

    // Convert INR to USD
    const formatCostUSD = (costINR: number): string => {
        const usd = costINR * INR_TO_USD;
        return `$${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getOptionStyle = (recommendation: string) => {
        switch (recommendation) {
            case 'fastest':
                return { gradient: 'from-purple-500 to-blue-500', icon: <Zap className="w-5 h-5" /> };
            case 'cheapest':
                return { gradient: 'from-green-500 to-emerald-500', icon: <DollarSign className="w-5 h-5" /> };
            case 'best':
            default:
                return { gradient: 'from-amber-500 to-orange-500', icon: <Star className="w-5 h-5" /> };
        }
    };

    if (!isOpen || !order) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-[#1a1f2e] rounded-2xl shadow-2xl max-w-4xl w-full border border-gray-700/50 overflow-hidden max-h-[90vh] overflow-y-auto"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-700/50">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Smart Dispatch</h2>
                                <p className="text-gray-400 text-sm mt-1">
                                    Order #{order.id?.slice(0, 8)} • {order.quantity} kg → {order.delivery_address?.slice(0, 40) || 'Destination'}
                                </p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                                <p className="text-white font-medium">Analyzing {allPlants.length || 'all'} plants...</p>
                                <p className="text-gray-500 text-sm">Scoring: Cost 35% • Time 25% • Safety 20% • Quality 15% • Renewable 5%</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-12">
                                <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                                <p className="text-white font-medium">{error}</p>
                                <button onClick={fetchPlantsAndOptimize} className="mt-4 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg">
                                    Retry
                                </button>
                            </div>
                        ) : transportOptions.length > 0 ? (
                            <>
                                {/* Selected Plant + Route Info */}
                                {(selectedPlant || routeInfo) && (
                                    <div className="bg-[#141821] rounded-xl p-4 mb-6 flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                                            <span className="text-white font-medium">{selectedPlant?.name || formatLocation(routeInfo?.origin)}</span>
                                            <ArrowRight className="w-4 h-4 text-gray-500" />
                                            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                                            <span className="text-white truncate max-w-[250px]">{formatLocation(routeInfo?.destination || order.delivery_address)}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-gray-400">
                                            {selectedPlant && plantScores[selectedPlant.id] && (
                                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-lg">
                                                    Plant Score: {(plantScores[selectedPlant.id].score * 100).toFixed(0)}%
                                                </span>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <Tag className="w-4 h-4" />
                                                <span className="font-medium">{routeInfo?.distance_km?.toFixed(2)} km</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Transport Options - Show ALL */}
                                <div className={`grid gap-4 ${transportOptions.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : transportOptions.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                                    {transportOptions.map((option, i) => {
                                        const style = getOptionStyle(option.recommendation);

                                        return (
                                            <motion.div
                                                key={`${option.mode}-${i}`}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="bg-[#141821] rounded-xl overflow-hidden border border-gray-700/50"
                                            >
                                                <div className={`bg-gradient-to-r ${style.gradient} px-4 py-3 flex items-center gap-2`}>
                                                    {style.icon}
                                                    <span className="font-bold text-white">{option.recommendation_label || option.recommendation}</span>
                                                </div>
                                                <div className="p-4 space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-3xl">{option.mode_icon}</span>
                                                        <div>
                                                            <h4 className="font-bold text-white">{option.mode_name}</h4>
                                                            <p className="text-gray-500 text-sm">{option.distance_km?.toFixed(2) || routeInfo?.distance_km?.toFixed(2)} km</p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-[#1a1f2e] rounded-lg p-3">
                                                            <p className="text-gray-500 text-xs mb-1">Cost</p>
                                                            <p className="text-green-400 font-bold text-lg">{formatCostUSD(option.total_cost_inr)}</p>
                                                        </div>
                                                        <div className="bg-[#1a1f2e] rounded-lg p-3">
                                                            <p className="text-gray-500 text-xs mb-1">ETA</p>
                                                            <p className="text-cyan-400 font-bold text-lg">{formatETA(option.travel_time_hours)}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between text-sm">
                                                        <span className="flex items-center gap-1 text-gray-400">
                                                            <Leaf className="w-4 h-4 text-green-400" />
                                                            {option.co2_kg?.toFixed(2)} kg CO₂
                                                        </span>
                                                        <span className="flex items-center gap-1 text-gray-400">
                                                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                                                            {option.quality_loss_percent?.toFixed(2)}% loss
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between py-2">
                                                        <span className="text-gray-400">Score</span>
                                                        <span className={`text-2xl font-bold bg-gradient-to-r ${style.gradient} bg-clip-text text-transparent`}>
                                                            {(option.scores?.final * 100)?.toFixed(0) || 0}%
                                                        </span>
                                                    </div>

                                                    <button
                                                        onClick={() => onDispatchConfirm(order, option, selectedPlant?.name || '')}
                                                        className={`w-full py-3 bg-gradient-to-r ${style.gradient} text-white font-bold rounded-xl flex items-center justify-center gap-2`}
                                                    >
                                                        <CheckCircle className="w-5 h-5" />
                                                        Confirm Dispatch
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                <div className="mt-6 text-center text-gray-500 text-sm">
                                    Scoring: Cost 35% • Time 25% • Safety 20% • Quality 15% • Renewable 5%
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                                <p className="text-white font-medium">No transport options available</p>
                                <button onClick={fetchPlantsAndOptimize} className="mt-4 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg">
                                    Retry
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default SmartDispatchModal;
