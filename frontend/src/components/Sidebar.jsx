import React from 'react';
import { LayoutDashboard, Activity, BarChart3, Settings, Zap } from 'lucide-react';
import clsx from 'clsx';

const Sidebar = ({ activeTab, setActiveTab }) => {
    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
        { id: 'digital-twin', icon: Activity, label: 'Digital Twin' },
        { id: 'analytics', icon: BarChart3, label: 'Analytics' },
        { id: 'settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <aside className="w-64 glass-panel border-r border-slate-800/50 flex flex-col z-20">
            <div className="p-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center shadow-lg shadow-green-500/20">
                    <Zap className="text-white w-6 h-6 fill-current" />
                </div>
                <div>
                    <h1 className="font-bold text-xl tracking-tight text-white">H2-OptiPlant</h1>
                    <p className="text-xs text-slate-400">Smart Hydrogen System</p>
                </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={clsx(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
                            activeTab === item.id
                                ? "bg-gradient-to-r from-blue-600/20 to-green-500/20 border border-blue-500/30 text-white shadow-lg shadow-blue-500/10"
                                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                        )}
                    >
                        <item.icon className={clsx(
                            "w-5 h-5 transition-colors",
                            activeTab === item.id ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                        )} />
                        <span className="font-medium">{item.label}</span>
                        {activeTab === item.id && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                        )}
                    </button>
                ))}
            </nav>

            <div className="p-4">
                <div className="glass-card p-4 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-400">System Status</span>
                        <span className="flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                    </div>
                    <div className="text-sm font-semibold text-green-400">Operational</div>
                    <div className="text-xs text-slate-500 mt-1">Uptime: 14d 2h</div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
