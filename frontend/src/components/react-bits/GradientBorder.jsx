import React from 'react';
import { motion } from 'framer-motion';

const GradientBorder = ({ children, className = "", colors = ["#38bdf8", "#818cf8", "#c084fc", "#38bdf8"] }) => {
    return (
        <div className={`relative group ${className}`}>
            {/* Animated Gradient Border */}
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 opacity-30 group-hover:opacity-100 transition-opacity duration-500 blur-sm group-hover:blur-md animate-gradient-xy" />

            {/* Rotating Border Line */}
            <motion.div
                className="absolute -inset-[1px] rounded-2xl opacity-50"
                style={{
                    background: `conic-gradient(from 0deg, transparent 0deg, ${colors[0]} 90deg, transparent 180deg)`,
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />

            {/* Content Container */}
            <div className="relative h-full bg-slate-950/90 backdrop-blur-xl rounded-2xl border border-slate-800/50 overflow-hidden">
                {children}
            </div>
        </div>
    );
};

export default GradientBorder;
