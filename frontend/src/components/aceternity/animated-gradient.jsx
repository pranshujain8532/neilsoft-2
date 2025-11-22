import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export const AnimatedGradient = ({ className, colors = [] }) => {
    const defaultColors = [
        "rgba(59, 130, 246, 0.3)",  // blue
        "rgba(139, 92, 246, 0.3)",  // purple
        "rgba(34, 197, 94, 0.3)",   // green
        "rgba(236, 72, 153, 0.3)",  // pink
    ];

    const gradientColors = colors.length > 0 ? colors : defaultColors;

    return (
        <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
            <motion.div
                className="absolute inset-0"
                style={{
                    background: `radial-gradient(circle at 20% 50%, ${gradientColors[0]} 0%, transparent 50%),
                       radial-gradient(circle at 80% 80%, ${gradientColors[1]} 0%, transparent 50%),
                       radial-gradient(circle at 40% 20%, ${gradientColors[2]} 0%, transparent 50%),
                       radial-gradient(circle at 60% 70%, ${gradientColors[3]} 0%, transparent 50%)`,
                    filter: "blur(60px)",
                }}
                animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, 0],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
            <motion.div
                className="absolute inset-0"
                style={{
                    background: `radial-gradient(circle at 70% 30%, ${gradientColors[1]} 0%, transparent 50%),
                       radial-gradient(circle at 30% 70%, ${gradientColors[2]} 0%, transparent 50%)`,
                    filter: "blur(80px)",
                }}
                animate={{
                    scale: [1.1, 1, 1.1],
                    rotate: [5, 0, 5],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
        </div>
    );
};
