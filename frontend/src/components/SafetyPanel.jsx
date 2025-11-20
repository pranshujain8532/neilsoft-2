import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const SafetyPanel = () => {
    const [safetyData, setSafetyData] = useState(null);

    useEffect(() => {
        fetchSafetyStatus();
        const interval = setInterval(fetchSafetyStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    const fetchSafetyStatus = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/safety/status');
            const data = await response.json();
            setSafetyData(data);
        } catch (error) {
            console.error('Failed to fetch safety status:', error);
        }
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'SAFE':
                return {
                    icon: CheckCircle,
                    color: 'text-green-400',
                    bgColor: 'bg-green-500/10',
                    borderColor: 'border-green-500/30',
                    label: 'All Systems Safe',
                };
            case 'WARNING':
                return {
                    icon: AlertTriangle,
                    color: 'text-yellow-400',
                    bgColor: 'bg-yellow-500/10',
                    borderColor: 'border-yellow-500/30',
                    label: 'Warning Detected',
                };
            case 'CRITICAL':
                return {
                    icon: XCircle,
                    color: 'text-red-400',
                    bgColor: 'bg-red-500/10',
                    borderColor: 'border-red-500/30',
                    label: 'Critical Alert',
                };
            default:
                return {
                    icon: Shield,
                    color: 'text-slate-400',
                    bgColor: 'bg-slate-500/10',
                    borderColor: 'border-slate-500/30',
                    label: 'Unknown',
                };
        }
    };

    if (!safetyData) {
        return <div className="glass-card p-6 rounded-2xl h-64 flex items-center justify-center">
            <div className="text-slate-400">Loading safety data...</div>
        </div>;
    }

    const statusConfig = getStatusConfig(safetyData.overall_status);
    const StatusIcon = statusConfig.icon;

    return (
        <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${statusConfig.bgColor} flex items-center justify-center border ${statusConfig.borderColor}`}>
                        <Shield className={`w-5 h-5 ${statusConfig.color}`} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Safety Monitor</h2>
                        <p className="text-xs text-slate-400">Real-time hazard detection</p>
                    </div>
                </div>
            </div>

            <div className={`p-4 rounded-xl ${statusConfig.bgColor} border ${statusConfig.borderColor} mb-6`}>
                <div className="flex items-center gap-3">
                    <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
                    <div>
                        <div className={`font-semibold ${statusConfig.color}`}>{statusConfig.label}</div>
                        <div className="text-xs text-slate-400 mt-0.5">Last checked: Just now</div>
                    </div>
                </div>
            </div>

            {safetyData.alerts && safetyData.alerts.length > 0 && (
                <div className="mb-6 space-y-2">
                    <div className="text-sm font-medium text-slate-300 mb-2">Active Alerts:</div>
                    {safetyData.alerts.map((alert, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 rounded bg-yellow-500/5 border border-yellow-500/20">
                            <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                            <span className="text-sm text-yellow-300">{alert}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="space-y-3">
                <MetricRow
                    label="Pressure"
                    value={`${safetyData.metrics?.pressure_bar?.toFixed(2) || 0} bar`}
                    status={safetyData.metrics?.pressure_bar < 31 ? 'safe' : 'warning'}
                />
                <MetricRow
                    label="Temperature"
                    value={`${safetyData.metrics?.temperature_c?.toFixed(1) || 0}°C`}
                    status={safetyData.metrics?.temperature_c < 80 ? 'safe' : 'warning'}
                />
                <MetricRow
                    label="H₂ Leak Detection"
                    value={`${safetyData.metrics?.leak_ppm?.toFixed(1) || 0} ppm`}
                    status={safetyData.metrics?.leak_ppm < 100 ? 'safe' : 'critical'}
                />
            </div>
        </div>
    );
};

const MetricRow = ({ label, value, status }) => {
    const statusColors = {
        safe: 'text-green-400',
        warning: 'text-yellow-400',
        critical: 'text-red-400',
    };

    return (
        <div className="flex justify-between items-center py-2 border-b border-slate-800/50 last:border-0">
            <span className="text-sm text-slate-400">{label}</span>
            <span className={`text-sm font-semibold ${statusColors[status]}`}>{value}</span>
        </div>
    );
};

export default SafetyPanel;
