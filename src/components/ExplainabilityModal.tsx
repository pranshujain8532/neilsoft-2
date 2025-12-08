import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface FeatureImportance {
    feature: string;
    importance: number;
    value: number;
}

interface ExplainabilityModalProps {
    isOpen: boolean;
    onClose: () => void;
    explanation: { features: FeatureImportance[] } | null;
    plantName: string;
}

const ExplainabilityModal: React.FC<ExplainabilityModalProps> = ({ isOpen, onClose, explanation, plantName }) => {
    if (!isOpen || !explanation) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-700"
                >
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Info className="w-5 h-5 text-purple-500" />
                                AI Recommendation Logic
                            </h2>
                            <p className="text-sm text-gray-500">Why {plantName} was recommended</p>
                        </div>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={explanation.features} layout="vertical" margin={{ left: 40 }}>
                                <XAxis type="number" />
                                <YAxis dataKey="feature" type="category" width={100} />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-gray-900 text-white p-3 rounded-lg text-sm">
                                                    <p className="font-bold">{data.feature}</p>
                                                    <p>Impact: {data.importance.toFixed(4)}</p>
                                                    <p>Value: {data.value.toFixed(2)}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                                    {explanation.features.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.importance > 0 ? '#10b981' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm text-purple-800 dark:text-purple-300">
                        <p>
                            <strong>How to read this:</strong> Green bars indicate features that positively influenced the recommendation score, while red bars indicate negative influence. The length of the bar represents the magnitude of the impact.
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ExplainabilityModal;
