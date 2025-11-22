import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, RefreshCw, Download, Settings, X } from 'lucide-react';
import toast from 'react-hot-toast';

const FloatingActionButton = () => {
    const [isOpen, setIsOpen] = useState(false);

    const actions = [
        {
            icon: RefreshCw, label: 'Refresh Data', color: 'from-blue-500 to-blue-600', action: () => {
                toast.loading('Refreshing data...', { id: 'refresh' });
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }
        },
        {
            icon: Download, label: 'Export Report', color: 'from-green-500 to-green-600', action: () => {
                toast.success('Report exported successfully!');
            }
        },
        {
            icon: Settings, label: 'Quick Settings', color: 'from-purple-500 to-purple-600', action: () => {
                toast('Settings panel coming soon!');
            }
        },
    ];

    return (
        <div className="fixed bottom-8 right-8 z-40">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute bottom-20 right-0 flex flex-col gap-3"
                    >
                        {actions.map((action, idx) => {
                            const Icon = action.icon;
                            return (
                                <motion.button
                                    key={idx}
                                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 20, scale: 0.8 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => {
                                        action.action();
                                        setIsOpen(false);
                                    }}
                                    className="group flex items-center gap-3"
                                >
                                    <span className="bg-slate-900/90 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-lg border border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        {action.label}
                                    </span>
                                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110`}>
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                </motion.button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 via-purple-600 to-cyan-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-shadow"
            >
                <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {isOpen ? <X className="w-6 h-6 text-white" /> : <Plus className="w-6 h-6 text-white" />}
                </motion.div>
            </motion.button>
        </div>
    );
};

export default FloatingActionButton;
