import React from 'react';
import { Bell, Search, User } from 'lucide-react';

const Header = () => {
    return (
        <header className="h-20 px-8 flex items-center justify-between border-b border-slate-800/30 bg-slate-900/20 backdrop-blur-sm z-10">
            <div className="flex items-center gap-4 flex-1">
                <div className="relative w-96 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search system parameters..."
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-full py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:bg-slate-800 transition-all placeholder:text-slate-600"
                    />
                </div>
            </div>

            <div className="flex items-center gap-6">
                <button className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800/50">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900"></span>
                </button>

                <div className="flex items-center gap-3 pl-6 border-l border-slate-800/50">
                    <div className="text-right hidden md:block">
                        <div className="text-sm font-medium text-white">Admin User</div>
                        <div className="text-xs text-slate-500">Plant Manager</div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-[2px]">
                        <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                            <User className="w-5 h-5 text-slate-300" />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
