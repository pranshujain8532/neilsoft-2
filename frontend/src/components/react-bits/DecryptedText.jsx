import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";

const DecryptedText = ({ text, className = "", speed = 50, delay = 0 }) => {
    const [displayText, setDisplayText] = useState("");
    const [isScrambling, setIsScrambling] = useState(true);

    useEffect(() => {
        let iteration = 0;
        let interval;

        const startScramble = () => {
            interval = setInterval(() => {
                setDisplayText(
                    text
                        .split("")
                        .map((letter, index) => {
                            if (index < iteration) {
                                return text[index];
                            }
                            return characters[Math.floor(Math.random() * characters.length)];
                        })
                        .join("")
                );

                if (iteration >= text.length) {
                    clearInterval(interval);
                    setIsScrambling(false);
                }

                iteration += 1 / 3;
            }, speed);
        };

        const timeout = setTimeout(startScramble, delay);

        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
        };
    }, [text, speed, delay]);

    return (
        <motion.span
            className={`inline-block font-mono ${className}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {displayText}
        </motion.span>
    );
};

export default DecryptedText;
