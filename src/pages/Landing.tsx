import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import CardSwap, { Card } from '@/components/CardSwap';
import Silk from '@/components/Silk';
import SplitText from '@/components/SplitText';

const Landing = () => {
    return (
        <div className="relative min-h-screen w-full overflow-hidden flex items-center bg-[#0a0a0a]">
            {/* Gradient Blinds Background - Removed Ballpit */}


            {/* Main Content Grid */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start pt-20">

                {/* Left Column: Text Content */}
                <div className="text-left">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="mb-8">
                            <SplitText
                                text="Green Hydrogen"
                                className="text-6xl md:text-8xl font-bold gradient-text block leading-tight"
                                delay={50}
                                tag="h1"
                                textAlign="left"
                            />
                            <SplitText
                                text="For a Sustainable Future"
                                className="text-4xl md:text-6xl font-bold text-gray-800 dark:text-white mt-4 block leading-tight"
                                delay={100}
                                tag="h1"
                                textAlign="left"
                            />
                        </div>

                        <p className="text-xl text-gray-400 mb-10 max-w-xl leading-relaxed">
                            Smart AI-powered system for hydrogen production, storage, and transportation
                            using renewable energy sources.
                        </p>

                        <div className="flex flex-wrap gap-4">
                            <Link to="/signup" className="btn-primary inline-flex items-center justify-center space-x-2 px-8 py-4 text-lg">
                                <span>Get Started</span>
                                <ArrowRight size={24} />
                            </Link>
                            <Link to="/login" className="px-8 py-4 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-all text-lg">
                                Sign In
                            </Link>
                        </div>
                    </motion.div>
                </div>

                {/* Right Column: Card Swap */}
                <div className="h-[600px] w-full flex items-start justify-center lg:justify-end relative perspective-1000 mt-32">
                    <div className="w-[400px] h-[500px] relative">
                        <CardSwap
                            cardDistance={50}
                            verticalDistance={40}
                            delay={4000}
                            pauseOnHover={true}
                        >
                            <Card>
                                <div className="absolute inset-0 z-0 w-full h-full overflow-hidden rounded-[20px]">
                                    <Silk color="#7B7481" />
                                </div>
                                {/* Window Header */}
                                <div className="absolute top-0 left-0 right-0 h-12 bg-black/40 backdrop-blur-xl border-b border-white/10 flex items-center px-4 z-20 rounded-t-[20px]">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                    </div>
                                    <div className="ml-4 px-3 py-1 rounded-full bg-white/10 text-[10px] font-mono text-white/70 border border-white/5">
                                        AI_Optimization.exe
                                    </div>
                                </div>
                                <div className="h-full flex flex-col justify-center p-8 pt-20 text-left relative z-10">
                                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-6 backdrop-blur-md border border-white/20">
                                        <span className="text-2xl">🤖</span>
                                    </div>
                                    <SplitText
                                        text="AI-Powered Optimization"
                                        className="text-3xl font-bold mb-4 text-white leading-tight"
                                        tag="h3"
                                        textAlign="left"
                                    />
                                    <p className="text-gray-300 text-sm leading-relaxed">
                                        Advanced machine-learning models for safety monitoring, profit prediction, and logistics optimization.
                                    </p>
                                </div>
                            </Card>

                            <Card>
                                <div className="absolute inset-0 z-0 w-full h-full overflow-hidden rounded-[20px]">
                                    <Silk color="#4A90E2" />
                                </div>
                                {/* Window Header */}
                                <div className="absolute top-0 left-0 right-0 h-12 bg-black/40 backdrop-blur-xl border-b border-white/10 flex items-center px-4 z-20 rounded-t-[20px]">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                    </div>
                                    <div className="ml-4 px-3 py-1 rounded-full bg-white/10 text-[10px] font-mono text-white/70 border border-white/5">
                                        Real_Time_Monitoring.sys
                                    </div>
                                </div>
                                <div className="h-full flex flex-col justify-center p-8 pt-20 text-left relative z-10">
                                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-6 backdrop-blur-md border border-white/20">
                                        <span className="text-2xl">📊</span>
                                    </div>
                                    <SplitText
                                        text="Real Time Analytics"
                                        className="text-3xl font-bold mb-4 text-white leading-tight"
                                        tag="h3"
                                        textAlign="left"
                                    />
                                    <p className="text-gray-300 text-sm leading-relaxed">
                                        Live IoT sensor data integration, fleet tracking, and comprehensive production analytics dashboard.
                                    </p>
                                </div>
                            </Card>

                            <Card>
                                <div className="absolute inset-0 z-0 w-full h-full overflow-hidden rounded-[20px]">
                                    <Silk color="#50C878" />
                                </div>
                                {/* Window Header */}
                                <div className="absolute top-0 left-0 right-0 h-12 bg-black/40 backdrop-blur-xl border-b border-white/10 flex items-center px-4 z-20 rounded-t-[20px]">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                    </div>
                                    <div className="ml-4 px-3 py-1 rounded-full bg-white/10 text-[10px] font-mono text-white/70 border border-white/5">
                                        Eco_Friendly.app
                                    </div>
                                </div>
                                <div className="h-full flex flex-col justify-center p-8 pt-20 text-left relative z-10">
                                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-6 backdrop-blur-md border border-white/20">
                                        <span className="text-2xl">🌱</span>
                                    </div>
                                    <SplitText
                                        text="100% Renewable"
                                        className="text-3xl font-bold mb-4 text-white leading-tight"
                                        tag="h3"
                                        textAlign="left"
                                    />
                                    <p className="text-gray-300 text-sm leading-relaxed">
                                        Seamless integration with Solar, Wind, and Hydro power sources for sustainable hydrogen production.
                                    </p>
                                </div>
                            </Card>
                        </CardSwap>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Landing;
