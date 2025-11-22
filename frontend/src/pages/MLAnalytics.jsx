// ML Analytics Page with all 5 models
import React, { useState } from 'react';
import { Brain, MessageSquare, TruckIcon, Shield, Sparkles, Send } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

const MLAnalytics = () => {
    const [chatMessage, setChatMessage] = useState('');
    const [chatResponses, setChatResponses] = useState([]);
    const [recommendations, setRecommendations] = useState(null);
    const [logistics, setLogistics] = useState(null);
    const [loading, setLoading] = useState(false);

    const sendChatMessage = async () => {
        if (!chatMessage.trim()) return;

        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/api/chatbot/message`, {
                message: chatMessage,
                session_id: 'demo-session'
            });

            setChatResponses([...chatResponses, {
                user: chatMessage,
                bot: response.data.response,
                suggestions: response.data.quick_replies
            }]);
            setChatMessage('');
        } catch (error) {
            console.error('Chat error:', error);
        }
        setLoading(false);
    };

    const getRecommendations = async () => {
        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/api/ml-rl/recommend-plant`, {
                order_id: 'ORD-DEMO',
                quantity_kg: 100,
                delivery_location: 'Delhi, India',
                priority: 0.8
            });
            setRecommendations(response.data);
        } catch (error) {
            console.error('Recommendation error:', error);
        }
        setLoading(false);
    };

    const optimizeLogistics = async () => {
        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/api/logistics/optimize`, [
                { quantity_kg: 200, location: 'Mumbai', priority: 0.7 },
                { quantity_kg: 150, location: 'Delhi', priority: 0.8 },
                { quantity_kg: 180, location: 'Bangalore', priority: 0.6 }
            ]);
            setLogistics(response.data);
        } catch (error) {
            console.error('Logistics error:', error);
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Brain className="w-8 h-8 text-purple-500" />
                    ML Analytics Hub
                </h1>
                <p className="text-gray-400 mt-1">Interact with all 5 AI models</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chatbot */}
                <div className="bg-[var(--color-card)] border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <MessageSquare className="w-6 h-6 text-blue-400" />
                        <h2 className="text-xl font-bold">AI Chatbot (Gemini)</h2>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-4 h-64 overflow-y-auto mb-4">
                        {chatResponses.length === 0 ? (
                            <p className="text-gray-500 text-center mt-20">Ask me about green hydrogen!</p>
                        ) : (
                            <div className="space-y-4">
                                {chatResponses.map((chat, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <div className="bg-blue-600/20 rounded-lg p-3 ml-12">
                                            <p className="text-sm">{chat.user}</p>
                                        </div>
                                        <div className="bg-gray-800 rounded-lg p-3 mr-12">
                                            <p className="text-sm">{chat.bot}</p>
                                            {chat.suggestions && (
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {chat.suggestions.map((sug, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => setChatMessage(sug)}
                                                            className="text-xs px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded"
                                                        >
                                                            {sug}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                            placeholder="Ask about hydrogen pricing, safety, delivery..."
                            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                        />
                        <button
                            onClick={sendChatMessage}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Recommendations */}
                <div className="bg-[var(--color-card)] border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Sparkles className="w-6 h-6 text-yellow-400" />
                        <h2 className="text-xl font-bold">Plant Recommendations (PPO RL)</h2>
                    </div>

                    {!recommendations ? (
                        <div className="text-center py-12">
                            <Sparkles className="w-12 h-12 text-yellow-400/50 mx-auto mb-4" />
                            <p className="text-gray-400 mb-4">Get AI-powered plant recommendations for orders</p>
                            <button
                                onClick={getRecommendations}
                                disabled={loading}
                                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Analyzing...' : 'Get Recommendations'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Top Recommended Plants:</h3>
                            {recommendations.recommendations?.map((plant, idx) => (
                                <div key={idx} className="bg-gray-900/50 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold text- lg">{plant.plant_name}</span>
                                        <span className="text-2xl font-bold text-yellow-400">{plant.match_score}%</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                                        <div>Capacity: {plant.available_capacity_kg} kg</div>
                                        <div>Distance: {plant.distance_km} km</div>
                                        <div>Price: ${plant.price_per_kg}/kg</div>
                                        <div>Energy Score: {plant.energy_score}</div>
                                    </div>
                                    <div className="mt-2 text-xs text-green-400">{plant.reason}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Logistics Optimizer */}
            <div className="bg-[var(--color-card)] border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <TruckIcon className="w-6 h-6 text-green-400" />
                    <h2 className="text-xl font-bold">Logistics Optimizer (VRP)</h2>
                </div>

                {!logistics ? (
                    <div className="text-center py-12">
                        <TruckIcon className="w-12 h-12 text-green-400/50 mx-auto mb-4" />
                        <p className="text-gray-400 mb-4">Optimize delivery routes and fleet requirements</p>
                        <button
                            onClick={optimizeLogistics}
                            disabled={loading}
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Optimizing...' : 'Optimize Routes'}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-gray-900/50 rounded-lg p-4">
                                <p className="text-sm text-gray-400">Required Vehicles</p>
                                <p className="text-3xl font-bold text-green-400">{logistics.fleet_requirements?.optimal_vehicles}</p>
                            </div>
                            <div className="bg-gray-900/50 rounded-lg p-4">
                                <p className="text-sm text-gray-400">Total Distance</p>
                                <p className="text-3xl font-bold text-blue-400">{logistics.route_optimization?.total_distance_km} km</p>
                            </div>
                            <div className="bg-gray-900/50 rounded-lg p-4">
                                <p className="text-sm text-gray-400">Est. Time</p>
                                <p className="text-3xl font-bold text-purple-400">{logistics.estimated_completion_time?.toFixed(1)} hrs</p>
                            </div>
                            <div className="bg-gray-900/50 rounded-lg p-4">
                                <p className="text-sm text-gray-400">Total Cost</p>
                                <p className="text-3xl font-bold text-yellow-400">${logistics.total_cost_usd}</p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-3">Optimized Routes:</h3>
                            <div className="space-y-2">
                                {logistics.route_optimization?.routes?.map((route, idx) => (
                                    <div key={idx} className="bg-gray-900/50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-semibold">{route.vehicle_id}</span>
                                            <span className="text-sm text-gray-400">{route.num_stops} stops</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                            <div>
                                                <span className="text-gray-400">Distance:</span>
                                                <span className="ml-2 text-blue-400">{route.total_distance_km} km</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">Duration:</span>
                                                <span className="ml-2 text-purple-400">{route.estimated_duration_hours?.toFixed(1)} hrs</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">Load:</span>
                                                <span className="ml-2 text-green-400">{route.total_load_kg} kg</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MLAnalytics;
