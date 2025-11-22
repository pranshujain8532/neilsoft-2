import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export const BackgroundBeams = ({ className }) => {
    const beams = [
        { delay: 0, duration: 7, rotate: 45 },
        { delay: 2, duration: 8, rotate: -30 },
        { delay: 4, duration: 6, rotate: 60 },
        { delay: 1, duration: 9, rotate: -45 },
    ];

    return (
        <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
            {beams.map((beam, idx) => (
                <motion.div
                    key={idx}
                    className="absolute h-[400%] w-[2px] bg-gradient-to-b from-transparent via-blue-500/30 to-transparent"
                    style={{
                        left: `${20 + idx * 20}%`,
                        rotate: `${beam.rotate}deg`,
                    }}
                    animate={{
                        y: ["-100%", "100%"],
                        opacity: [0, 1, 0],
                    }}
                    transition={{
                        duration: beam.duration,
                        repeat: Infinity,
                        delay: beam.delay,
                        ease: "linear",
                    }}
                />
            ))}

            {/* Radial gradient overlay */}
            <div className="absolute inset-0 bg-gradient-radial from-transparent via-slate-950/50 to-slate-950" />
        </div>
    );
};
