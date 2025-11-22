import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Lightbulb, BarChart3, Settings, Sparkles, Shield, FlaskConical } from 'lucide-react';

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'enhanced-dashboard', label: 'ML Dashboard', icon: Sparkles, path: '/enhanced-dashboard', badge: 'NEW' },
        { id: 'digital-twin', label: 'Digital Twin', icon: Lightbulb, path: '/digital-twin' },
        { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
        { id: 'ml-analytics', label: 'ML Analytics', icon: FlaskConical, path: '/ml-analytics', badge: 'AI' },
        { id: 'safety', label: 'Safety Monitor', icon: Shield, path: '/safety', badge: 'NEW' },
        { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
    ];

    return (
        <aside className="w-64 bg-[var(--color-card)] border-r border-gray-800 flex flex-col">
            <div className="p-6 border-b border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <span className="text-lg font-bold">H₂</span>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">H2-OptiPlant</h2>
                        <p className="text-xs text-gray-400">Green Hydrogen</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                                }`}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="flex-1 text-left font-medium">{item.label}</span>
                            {item.badge && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.badge === 'NEW' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'
                                    }`}>
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-800">
                <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-4">
                    <p className="text-sm font-semibold mb-1">🚀 ML Models Active</p>
                    <p className="text-xs text-gray-400">5 AI models running</p>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
