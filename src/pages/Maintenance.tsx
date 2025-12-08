import React, { useEffect, useState } from 'react';
import MaintenanceCalendar from '../components/MaintenanceCalendar';

interface DashboardStats {
    operational_percent: number;
    maintenance_due: number;
    critical_issues: number;
}

interface Alert {
    id: string;
    msg: string;
    time: string;
    type: 'critical' | 'warning' | 'info';
}

interface Vehicle {
    id: string;
    registration: string;
    status: string;
}

const Maintenance: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats>({
        operational_percent: 100,
        maintenance_due: 0,
        critical_issues: 0
    });
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Fetch Stats
            const statsRes = await fetch('http://localhost:5001/maintenance/stats');
            const statsData = await statsRes.json();
            if (statsData && !statsData.error) setStats(statsData);

            // Fetch Alerts
            const alertsRes = await fetch('http://localhost:5001/maintenance/alerts');
            const alertsData = await alertsRes.json();

            if (Array.isArray(alertsData)) {
                const formattedAlerts = alertsData.map((a: any) => ({
                    ...a,
                    time: a.time ? new Date(a.time).toLocaleDateString() : 'Unknown'
                }));
                setAlerts(formattedAlerts);
            }

            // Fetch Vehicles for dropdown
            const vehiclesRes = await fetch('http://localhost:5001/maintenance/vehicles');
            const vehiclesData = await vehiclesRes.json();
            if (vehiclesData.vehicles && vehiclesData.vehicles.length > 0) {
                setVehicles(vehiclesData.vehicles);
                setSelectedVehicle(vehiclesData.vehicles[0].registration);
            }
        } catch (error) {
            console.error("Error fetching maintenance data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleScheduleService = async () => {
        const dateInput = document.getElementById('service-date') as HTMLInputElement;

        if (!selectedVehicle) {
            alert('Please select a vehicle.');
            return;
        }
        if (!dateInput.value) {
            alert('Please select a date for service.');
            return;
        }

        try {
            const response = await fetch('http://localhost:5001/maintenance/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: dateInput.value,
                    vehicle_id: selectedVehicle
                })
            });

            const result = await response.json();

            if (result.success) {
                alert(result.message);
                fetchDashboardData();
                setRefreshKey(prev => prev + 1);
            } else {
                alert(result.error || 'Failed to schedule service');
            }
        } catch (e) {
            console.error('Schedule failed', e);
            alert('Failed to schedule service');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Fleet Maintenance</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Predictive maintenance schedule and vehicle health monitoring
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        Export Report
                    </button>
                    <div className="flex items-center gap-2">
                        {/* Vehicle Dropdown - fetched from DB */}
                        <select
                            value={selectedVehicle}
                            onChange={(e) => setSelectedVehicle(e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[160px]"
                        >
                            <option value="">Select Vehicle</option>
                            {vehicles.map((v) => (
                                <option key={v.id} value={v.registration}>
                                    {v.registration} ({v.status})
                                </option>
                            ))}
                        </select>
                        <input
                            type="date"
                            id="service-date"
                            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <button
                            onClick={handleScheduleService}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                        >
                            Schedule Service
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <MaintenanceCalendar key={refreshKey} />
                </div>

                <div className="space-y-6">
                    {/* Quick Stats */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Fleet Health Overview</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800/30">
                                <span className="text-green-700 dark:text-green-400 font-medium">Operational</span>
                                <span className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.operational_percent}%</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800/30">
                                <span className="text-yellow-700 dark:text-yellow-400 font-medium">Maintenance Due</span>
                                <span className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.maintenance_due}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800/30">
                                <span className="text-red-700 dark:text-red-400 font-medium">Critical Issues</span>
                                <span className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.critical_issues}</span>
                            </div>
                        </div>
                    </div>

                    {/* Recent Alerts */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Recent Alerts</h3>
                        <div className="space-y-3">
                            {loading ? (
                                <p className="text-gray-400 text-sm">Loading alerts...</p>
                            ) : alerts.length === 0 ? (
                                <p className="text-gray-400 text-sm">No recent alerts - Fleet is healthy!</p>
                            ) : (
                                alerts.map((alert, i) => (
                                    <div key={i} className="flex gap-3 items-start pb-3 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                                        <div className={`w-2 h-2 mt-2 rounded-full ${alert.type === 'critical' ? 'bg-red-500' :
                                                alert.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                                            }`} />
                                        <div>
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{alert.msg}</p>
                                            <p className="text-xs text-gray-500">{alert.id} • {alert.time}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Maintenance;
