import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { Search, Home, Activity, BarChart3, Settings, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CommandPalette = ({ isOpen, setIsOpen, setActiveTab }) => {
    const [search, setSearch] = useState('');

    useEffect(() => {
        const down = (e) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, [setIsOpen]);

    const commands = [
        { icon: Home, label: 'Dashboard', action: () => setActiveTab('dashboard'), keywords: ['home', 'overview'] },
        { icon: Activity, label: 'Digital Twin', action: () => setActiveTab('digital-twin'), keywords: ['twin', 'simulation'] },
        { icon: BarChart3, label: 'Analytics', action: () => setActiveTab('analytics'), keywords: ['charts', 'data'] },
        { icon: Settings, label: 'Settings', action: () => setActiveTab('settings'), keywords: ['config', 'preferences'] },
        { icon: Zap, label: 'Refresh Data', action: () => window.location.reload(), keywords: ['reload', 'update'] },
    ];

    const handleSelect = (action) => {
        action();
        setIsOpen(false);
        setSearch('');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={() => setIsOpen(false)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
                    >
                        <Command className="rounded-2xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                            <div className="flex items-center border-b border-slate-800/50 px-4">
                                <Search className="w-5 h-5 text-slate-400 mr-3" />
                                <Command.Input
                                    value={search}
                                    onValueChange={setSearch}
                                    placeholder="Type a command or search..."
                                    className="flex-1 bg-transparent border-none outline-none py-4 text-white placeholder:text-slate-500"
                                />
                                <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-xs text-slate-400">
                                    <span className="text-xs">ESC</span>
                                </kbd>
                            </div>
                            <Command.List className="max-h-96 overflow-y-auto p-2">
                                <Command.Empty className="py-6 text-center text-sm text-slate-400">
                                    No results found.
                                </Command.Empty>
                                <Command.Group heading="Navigation" className="text-xs text-slate-500 px-2 py-1.5 font-medium">
                                    {commands.map((cmd, idx) => {
                                        const Icon = cmd.icon;
                                        return (
                                            <Command.Item
                                                key={idx}
                                                onSelect={() => handleSelect(cmd.action)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-slate-300 hover:bg-slate-800/50 hover:text-white transition-colors data-[selected=true]:bg-blue-500/10 data-[selected=true]:text-blue-400"
                                            >
                                                <Icon className="w-4 h-4" />
                                                <span>{cmd.label}</span>
                                            </Command.Item>
                                        );
                                    })}
                                </Command.Group>
                            </Command.List>
                            <div className="border-t border-slate-800/50 px-4 py-2 text-xs text-slate-500 flex items-center justify-between">
                                <span>Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">⌘K</kbd> to toggle</span>
                                <span>Navigate with <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↑↓</kbd></span>
                            </div>
                        </Command>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CommandPalette;
