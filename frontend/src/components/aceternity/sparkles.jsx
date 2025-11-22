import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

export const Sparkles = ({ className, count = 15 }) => {
    const [sparkles, setSparkles] = useState([]);

    useEffect(() => {
        const generateSparkle = () => ({
            id: Math.random(),
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 3 + 1,
            duration: Math.random() * 2 + 1,
        });

        const initialSparkles = Array.from({ length: count }, generateSparkle);
        setSparkles(initialSparkles);

        const interval = setInterval(() => {
            setSparkles((prev) => {
                const newSparkles = [...prev];
                const indexToReplace = Math.floor(Math.random() * newSparkles.length);
                newSparkles[indexToReplace] = generateSparkle();
                return newSparkles;
            });
        }, 500);

        return () => clearInterval(interval);
    }, [count]);

    return (
        <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
            <AnimatePresence>
                {sparkles.map((sparkle) => (
                    <motion.div
                        key={sparkle.id}
                        className="absolute rounded-full bg-white"
                        style={{
                            left: `${sparkle.x}%`,
                            top: `${sparkle.y}%`,
                            width: sparkle.size,
                            height: sparkle.size,
                        }}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                            opacity: [0, 1, 0],
                            scale: [0, 1, 0],
                        }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{
                            duration: sparkle.duration,
                            ease: "easeInOut",
                        }}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};
