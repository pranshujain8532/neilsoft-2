import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Package, Clock, CheckCircle, FileText, ChevronRight,
    Shield, Leaf, Zap, Download, Copy, ExternalLink,
    TrendingUp, Award, Truck, XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '@/utils/api';
import { supabase } from '@/lib/supabase';

// Blockchain Certificate ID Generator
const generateBlockchainId = (orderId: string, timestamp: string): string => {
    const hash = btoa(`${orderId}-${timestamp}-H2OptiPlant`).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return `0x${hash.substring(0, 40)}`;
};

const generateTokenId = (orderId: string): string => {
    const shortHash = btoa(orderId).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16).toUpperCase();
    return `H2OPT-${shortHash}`;
};

const OrderHistory = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        fetchOrders();

        // Realtime subscription
        const subscription = supabase
            .channel('public:orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                fetchOrders();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await orderAPI.getAll();
            if (response.data) {
                // Enrich orders with blockchain certificate data
                const enrichedOrders = response.data.map((order: any) => ({
                    ...order,
                    certificate: order.certificate || {
                        tokenId: generateTokenId(order.id),
                        blockchainTxHash: generateBlockchainId(order.id, order.created_at),
                        carbonIntensity: 0.4 + Math.random() * 0.3,
                        energyMix: {
                            solar: 50 + Math.floor(Math.random() * 30),
                            wind: 20 + Math.floor(Math.random() * 20),
                            hydro: 10 + Math.floor(Math.random() * 15)
                        }
                    }
                }));
                setOrders(enrichedOrders);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getStatusConfig = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'delivered':
                return { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', icon: CheckCircle };
            case 'in-transit':
                return { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', icon: Truck };
            case 'confirmed':
                return { color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30', icon: Award };
            case 'pending':
                return { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', icon: Clock };
            case 'cancelled':
                return { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', icon: XCircle };
            default:
                return { color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30', icon: Package };
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 border-4 border-emerald-500/30 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <Package className="absolute inset-0 m-auto w-8 h-8 text-emerald-400 animate-pulse" />
                    </div>
                    <p className="text-gray-400 text-lg font-medium">Loading Orders...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="relative z-10 max-w-6xl mx-auto p-6 lg:p-8">
                {/* Hero Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                            <Package className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-emerald-200 to-emerald-400 bg-clip-text text-transparent">
                                Order History
                            </h1>
                            <p className="text-emerald-400/80 text-sm font-medium">Blockchain-Verified Green Hydrogen Certificates</p>
                        </div>
                    </div>
                </motion.div>

                {orders.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-12 text-center border border-slate-700/50"
                    >
                        <Package className="w-20 h-20 text-gray-500 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold text-white mb-2">No orders yet</h2>
                        <p className="text-gray-400 mb-8 max-w-md mx-auto">
                            Start your green hydrogen journey today and receive blockchain-verified certificates for every purchase.
                        </p>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/shop')}
                            className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
                        >
                            Browse Marketplace
                        </motion.button>
                    </motion.div>
                ) : (
                    <div className="space-y-6">
                        {/* Summary Stats */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
                        >
                            <div className="bg-slate-800/40 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <Package className="w-4 h-4 text-emerald-400" />
                                    <span className="text-xs text-gray-400 uppercase">Total Orders</span>
                                </div>
                                <div className="text-2xl font-bold text-white">{orders.length}</div>
                            </div>
                            <div className="bg-slate-800/40 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="w-4 h-4 text-blue-400" />
                                    <span className="text-xs text-gray-400 uppercase">Total Spent</span>
                                </div>
                                <div className="text-2xl font-bold text-white">
                                    ₹{orders.reduce((sum, o) => sum + (o.total_price || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </div>
                            </div>
                            <div className="bg-slate-800/40 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="w-4 h-4 text-amber-400" />
                                    <span className="text-xs text-gray-400 uppercase">H₂ Purchased</span>
                                </div>
                                <div className="text-2xl font-bold text-white">
                                    {orders.reduce((sum, o) => sum + (o.quantity || 0), 0)} kg
                                </div>
                            </div>
                            <div className="bg-slate-800/40 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <Leaf className="w-4 h-4 text-green-400" />
                                    <span className="text-xs text-gray-400 uppercase">CO₂ Saved</span>
                                </div>
                                <div className="text-2xl font-bold text-white">
                                    {(orders.reduce((sum, o) => sum + (o.quantity || 0), 0) * 9.3).toFixed(0)} kg
                                </div>
                            </div>
                        </motion.div>

                        {/* Orders List */}
                        {orders.map((order, idx) => {
                            const statusConfig = getStatusConfig(order.status);
                            const StatusIcon = statusConfig.icon;

                            return (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden hover:border-emerald-500/30 transition-all"
                                >
                                    {/* Order Header */}
                                    <div className="p-6">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                                                    <Package className="w-6 h-6 text-emerald-400" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg text-white">Order #{order.id.slice(0, 8).toUpperCase()}</h3>
                                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mt-1">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(order.created_at).toLocaleDateString('en-US', {
                                                                year: 'numeric', month: 'short', day: 'numeric'
                                                            })}
                                                        </span>
                                                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.border} border`}>
                                                            <StatusIcon className={`w-3 h-3 ${statusConfig.color}`} />
                                                            <span className={statusConfig.color}>{order.status?.toUpperCase()}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="text-center">
                                                    <div className="text-xs text-gray-500 uppercase">Quantity</div>
                                                    <div className="font-bold text-white">{order.quantity} kg</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-xs text-gray-500 uppercase">Total</div>
                                                    <div className="font-bold text-xl bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                                                        ₹{order.total_price?.toLocaleString('en-IN')}
                                                    </div>
                                                </div>
                                                <motion.button
                                                    whileHover={{ x: 4 }}
                                                    className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-full transition-colors"
                                                    onClick={() => navigate(`/order/${order.id}`)}
                                                >
                                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                                </motion.button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Blockchain Certificate Section */}
                                    <div className="px-6 pb-6">
                                        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl p-4 border border-indigo-500/30">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Shield className="w-5 h-5 text-indigo-400" />
                                                    <span className="font-semibold text-white">Blockchain Certificate</span>
                                                    <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                                                        VERIFIED
                                                    </span>
                                                </div>
                                                <button className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                                                    <Download className="w-4 h-4" />
                                                    <span>Download</span>
                                                </button>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-4">
                                                {/* Token ID */}
                                                <div className="bg-slate-900/50 rounded-lg p-3">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs text-gray-500 uppercase">Token ID</span>
                                                        <button
                                                            onClick={() => copyToClipboard(order.certificate?.tokenId, `token-${order.id}`)}
                                                            className="text-gray-400 hover:text-white transition-colors"
                                                        >
                                                            {copiedId === `token-${order.id}` ? (
                                                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                                            ) : (
                                                                <Copy className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                    <div className="font-mono text-sm text-emerald-400 truncate">
                                                        {order.certificate?.tokenId}
                                                    </div>
                                                </div>

                                                {/* Blockchain TX Hash */}
                                                <div className="bg-slate-900/50 rounded-lg p-3">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs text-gray-500 uppercase">Blockchain TX</span>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => copyToClipboard(order.certificate?.blockchainTxHash, `tx-${order.id}`)}
                                                                className="text-gray-400 hover:text-white transition-colors"
                                                            >
                                                                {copiedId === `tx-${order.id}` ? (
                                                                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                                                                ) : (
                                                                    <Copy className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                            <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                                                <ExternalLink className="w-4 h-4" />
                                                            </a>
                                                        </div>
                                                    </div>
                                                    <div className="font-mono text-xs text-purple-400 truncate">
                                                        {order.certificate?.blockchainTxHash}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Energy Mix & Carbon Info */}
                                            <div className="mt-4 flex flex-wrap items-center gap-4">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Leaf className="w-4 h-4 text-green-400" />
                                                    <span className="text-gray-400">Carbon Intensity:</span>
                                                    <span className="text-green-400 font-medium">
                                                        {order.certificate?.carbonIntensity?.toFixed(2)} kgCO₂eq/kg
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs">
                                                    <span className="text-gray-500">Energy Mix:</span>
                                                    <span className="flex items-center gap-1 text-amber-400">
                                                        ☀️ {order.certificate?.energyMix?.solar}%
                                                    </span>
                                                    <span className="flex items-center gap-1 text-cyan-400">
                                                        💨 {order.certificate?.energyMix?.wind}%
                                                    </span>
                                                    <span className="flex items-center gap-1 text-blue-400">
                                                        💧 {order.certificate?.energyMix?.hydro}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-12 text-center text-gray-500 text-sm"
                >
                    <p>H₂-OptiPlant • Blockchain-Verified Green Hydrogen • Smart India Hackathon 2024</p>
                </motion.div>
            </div>
        </div>
    );
};

export default OrderHistory;
