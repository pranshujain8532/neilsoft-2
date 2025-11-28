import React from 'react';
import MaintenanceCalendar from '../components/MaintenanceCalendar';

const Maintenance: React.FC = () => {
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Fleet Maintenance</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Predictive maintenance schedule and vehicle health monitoring
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        Export Report
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                await fetch('http://localhost:5000/api/maintenance/alert', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        vehicleId: 'TEST-ALERT-001',
                                        wearScore: 0.95,
                                        confidenceInterval: [0.9, 1.0]
                                    })
                                });
                            } catch (e) {
                                console.error('Failed to trigger alert', e);
                            }
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30"
                    >
                        Test Alert
                    </button>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            id="service-date"
                            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <button
                            onClick={() => {
                                const dateInput = document.getElementById('service-date') as HTMLInputElement;
                                if (!dateInput.value) {
                                    alert('Please select a date for service.');
                                    return;
                                }
                                const date = new Date(dateInput.value);
                                alert(`Service scheduled for ${date.toLocaleDateString()}`);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                        >
                            Schedule Service
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <MaintenanceCalendar />
                </div>

                <div className="space-y-6">
                    {/* Quick Stats */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Fleet Health Overview</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800/30">
                                <span className="text-green-700 dark:text-green-400 font-medium">Operational</span>
                                <span className="text-2xl font-bold text-green-700 dark:text-green-400">92%</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800/30">
                                <span className="text-yellow-700 dark:text-yellow-400 font-medium">Maintenance Due</span>
                                <span className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">3</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800/30">
                                <span className="text-red-700 dark:text-red-400 font-medium">Critical Issues</span>
                                <span className="text-2xl font-bold text-red-700 dark:text-red-400">1</span>
                            </div>
                        </div>
                    </div>

                    {/* Recent Alerts */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Recent Alerts</h3>
                        <div className="space-y-3">
                            {[
                                { id: 'GJ-01-AB-1234', msg: 'Engine temperature high', time: '2h ago', type: 'warning' },
                                { id: 'MH-02-CD-5678', msg: 'Brake pad wear critical', time: '5h ago', type: 'critical' },
                                { id: 'DL-03-EF-9012', msg: 'Scheduled service upcoming', time: '1d ago', type: 'info' },
                            ].map((alert, i) => (
                                <div key={i} className="flex gap-3 items-start pb-3 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                                    <div className={`w-2 h-2 mt-2 rounded-full ${alert.type === 'critical' ? 'bg-red-500' :
                                        alert.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                                        }`} />
                                    <div>
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{alert.msg}</p>
                                        <p className="text-xs text-gray-500">{alert.id} • {alert.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Maintenance;
