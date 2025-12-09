import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Factory, DollarSign, Activity, Zap, Users, AlertTriangle, TrendingUp, Droplet } from 'lucide-react';

interface PlantData {
    plant_id: string;
    plant_name: string;
    location: string | { city?: string; state?: string };
    weather: any;
    energy_output: any;
    profit_prediction: any;
    safety_status: any;
    lcoh: number;
    forecast?: any;
    next_day_prediction?: any;
}

interface PlantDetailModalProps {
    plant: PlantData | null;
    onClose: () => void;
}

const PlantDetailModal: React.FC<PlantDetailModalProps> = ({ plant, onClose }) => {
    if (!plant) return null;

    // Extract data for calculations
    const h2Production = plant.profit_prediction?.h2_production_kg || 0;
    const lcoh = plant.lcoh || 2;
    const totalRevenue = plant.profit_prediction?.breakdown?.total_revenue || 0;
    const h2Revenue = plant.profit_prediction?.breakdown?.h2_revenue || 0;
    const o2Revenue = plant.profit_prediction?.breakdown?.oxygen_revenue || 0;
    const totalDailyCost = h2Production * lcoh;
    const dailyProfit = plant.profit_prediction?.daily_profit || 0;

    // Derived Cost Breakdown
    const costBreakdown = {
        energy: totalDailyCost * 0.60,
        capex_depreciation: totalDailyCost * 0.20,
        maintenance: totalDailyCost * 0.10,
        operational_labor: totalDailyCost * 0.05,
        water_materials: totalDailyCost * 0.05
    };

    // Operational Metrics
    const capacityUtilization = plant.profit_prediction?.efficiency_data?.electrolyzer_load || 85;
    const maxCapacity = h2Production / (capacityUtilization / 100);
    const productionLines = Math.floor(maxCapacity / 500) + 1;
    const employeeCount = Math.floor(productionLines * 4.5);
    const efficiency = plant.profit_prediction?.efficiency_data?.electrolyzer_efficiency || 70;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-gray-900 border border-gray-700/50 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
                >
                    {/* Header */}
                    <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-gray-900/95 border-b border-gray-800 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                                <Factory className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">{plant.plant_name}</h2>
                                <p className="text-gray-400 text-sm">
                                    {(typeof plant.location === 'object' ? `${plant.location?.city}, ${plant.location?.state}` : plant.location) || 'Unknown Location'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-6 space-y-8">
                        {/* Profit Calculation Breakdown */}
                        <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-emerald-400" />
                                Profit Calculation Breakdown
                            </h3>

                            <div className="bg-gray-900/50 rounded-lg p-5 font-mono text-sm border border-gray-700/50 overflow-x-auto">
                                <div className="min-w-[600px]">
                                    <div className="flex items-center gap-2 text-lg flex-wrap">
                                        <span className={dailyProfit >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                                            ${dailyProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </span>
                                        <span className="text-gray-500">=</span>
                                        <span className="text-blue-300">
                                            (${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} Revenue)
                                        </span>
                                        <span className="text-gray-500">-</span>
                                        <span className="text-amber-300">
                                            (${totalDailyCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} Costs)
                                        </span>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-700/50 grid grid-cols-2 gap-8">
                                        <div>
                                            <div className="text-xs text-blue-400 uppercase tracking-wider mb-2">Revenue Breakdown</div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-gray-400">
                                                    <span>H₂ Sales:</span>
                                                    <span className="text-gray-200">${h2Revenue.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-gray-400">
                                                    <span>O₂ Sales:</span>
                                                    <span className="text-gray-200">${o2Revenue.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-amber-400 uppercase tracking-wider mb-2">Cost Breakdown (Est.)</div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-gray-400">
                                                    <span>Energy (60%):</span>
                                                    <span className="text-gray-300">-${costBreakdown.energy.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                </div>
                                                <div className="flex justify-between text-gray-400">
                                                    <span>Capex/Depr (20%):</span>
                                                    <span className="text-gray-300">-${costBreakdown.capex_depreciation.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                </div>
                                                <div className="flex justify-between text-gray-400">
                                                    <span>Maintenance (10%):</span>
                                                    <span className="text-gray-300">-${costBreakdown.maintenance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                </div>
                                                <div className="flex justify-between text-gray-400">
                                                    <span>Labor/Ops (10%):</span>
                                                    <span className="text-gray-300">-${(costBreakdown.operational_labor + costBreakdown.water_materials).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Key Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Capacity Metrics */}
                            <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-blue-400" />
                                    Production Capacity
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-400">Utilization Rate</span>
                                            <span className="text-white font-medium">{capacityUtilization.toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-700/50 rounded-full h-2.5 overflow-hidden">
                                            <div
                                                className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                                                style={{ width: `${capacityUtilization}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="bg-gray-900/50 p-3 rounded-lg">
                                            <div className="text-xs text-gray-500">Max Capacity</div>
                                            <div className="text-lg font-mono text-white">{maxCapacity.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg</div>
                                        </div>
                                        <div className="bg-gray-900/50 p-3 rounded-lg">
                                            <div className="text-xs text-gray-500">Available</div>
                                            <div className="text-lg font-mono text-gray-400">{(maxCapacity - h2Production).toLocaleString(undefined, { maximumFractionDigits: 0 })} kg</div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Production Statistics */}
                            <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-yellow-400" />
                                    Production Stats
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b border-gray-700/30">
                                        <span className="text-gray-400">Units (Today)</span>
                                        <span className="text-white font-mono">{h2Production.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-700/30">
                                        <span className="text-gray-400">Efficiency Rate</span>
                                        <span className="text-emerald-400 font-mono">{efficiency.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-700/30">
                                        <span className="text-gray-400">Est. Downtime</span>
                                        <span className="text-white font-mono">{((100 - capacityUtilization) * 0.24).toFixed(1)} hrs</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-gray-400">Quality Score</span>
                                        <span className="text-purple-400 font-mono">99.98%</span>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Operational Details */}
                        <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Users className="w-5 h-5 text-purple-400" />
                                Operational Details
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-gray-900/50 p-4 rounded-xl text-center border border-gray-700/30">
                                    <Factory className="w-6 h-6 mx-auto mb-2 text-gray-500" />
                                    <div className="text-2xl font-bold text-white">{productionLines}</div>
                                    <div className="text-xs text-gray-500 uppercase">Active Lines</div>
                                </div>
                                <div className="bg-gray-900/50 p-4 rounded-xl text-center border border-gray-700/30">
                                    <Users className="w-6 h-6 mx-auto mb-2 text-gray-500" />
                                    <div className="text-2xl font-bold text-white">{employeeCount}</div>
                                    <div className="text-xs text-gray-500 uppercase">Employees</div>
                                </div>
                                <div className="bg-gray-900/50 p-4 rounded-xl text-center border border-gray-700/30">
                                    <Zap className="w-6 h-6 mx-auto mb-2 text-gray-500" />
                                    <div className="text-2xl font-bold text-white">{plant.energy_output?.total || 0} MW</div>
                                    <div className="text-xs text-gray-500 uppercase">Power Usage</div>
                                </div>
                                <div className="bg-gray-900/50 p-4 rounded-xl text-center border border-gray-700/30">
                                    <AlertTriangle className={`w-6 h-6 mx-auto mb-2 ${plant.safety_status?.status === 'optimal' ? 'text-emerald-500' : 'text-amber-500'}`} />
                                    <div className="text-2xl font-bold text-white capitalize">{plant.safety_status?.status || 'N/A'}</div>
                                    <div className="text-xs text-gray-500 uppercase">Safety Level</div>
                                </div>
                            </div>
                        </section>

                        {/* LCOH Badge */}
                        <div className="flex justify-center">
                            <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-2xl px-8 py-4 text-center">
                                <div className="text-sm text-emerald-400 mb-1">Levelized Cost of Hydrogen</div>
                                <div className="text-4xl font-bold text-white">${lcoh.toFixed(2)}<span className="text-lg text-gray-400">/kg</span></div>
                                {lcoh < 2 && <div className="text-xs text-emerald-400 mt-1">✓ Below $2/kg target</div>}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default PlantDetailModal;
