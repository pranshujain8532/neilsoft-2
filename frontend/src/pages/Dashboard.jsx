import React, { useEffect, useState } from 'react';
import ProductionMonitor from '../components/ProductionMonitor';
import EnergyMixChart from '../components/EnergyMixChart';
import FinancialPanel from '../components/FinancialPanel';
import SafetyPanel from '../components/SafetyPanel';
import PredictionChart from '../components/PredictionChart';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch initial data
        fetchDashboardStats();

        // Poll every 5 seconds for real-time updates
        const interval = setInterval(() => {
            fetchDashboardStats();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const fetchDashboardStats = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/dashboard/stats');
            const data = await response.json();
            setStats(data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top Row - Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <MetricCard
                    title="H₂ Production"
                    value={stats?.h2_production_rate_kg_hr || 0}
                    unit="kg/hr"
                    trend="+5.2%"
                    color="green"
                />
                <MetricCard
                    title="System Efficiency"
                    value={stats?.system_efficiency_percent || 0}
                    unit="%"
                    trend="+2.1%"
                    color="blue"
                />
                <MetricCard
                    title="Total Energy Input"
                    value={stats?.total_energy_kw || 0}
                    unit="kW"
                    trend="+8.5%"
                    color="purple"
                />
                <MetricCard
                    title="Storage Level"
                    value={stats?.storage_level_percent || 0}
                    unit="%"
                    trend="Stable"
                    color="orange"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    <ProductionMonitor stats={stats} />
                    <EnergyMixChart stats={stats} />
                </div>

                <div className="space-y-6">
                    <SafetyPanel />
                    <FinancialPanel />
                </div>
            </div>

            {/* Bottom Row - Predictions */}
            <div className="grid grid-cols-1 gap-6">
                <PredictionChart />
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, unit, trend, color }) => {
    const colorClasses = {
        green: 'from-green-500/20 to-green-600/5 border-green-500/30 text-green-400',
        blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400',
        purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400',
        orange: 'from-orange-500/20 to-orange-600/5 border-orange-500/30 text-orange-400',
    };

    return (
        <div className={`glass-card p-6 rounded-2xl bg-gradient-to-br ${colorClasses[color]}`}>
            <div className="flex justify-between items-start mb-3">
                <h3 className="text-sm font-medium text-slate-400">{title}</h3>
                <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                    {trend}
                </span>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{value.toFixed(1)}</span>
                <span className="text-lg text-slate-500">{unit}</span>
            </div>
        </div>
    );
};

export default Dashboard;
