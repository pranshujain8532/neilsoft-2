import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Shield, TrendingUp, Leaf } from 'lucide-react';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const Landing = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Three.js animated background
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        // Create animated particles
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 1000;
        const posArray = new Float32Array(particlesCount * 3);

        for (let i = 0; i < particlesCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 10;
        }

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.015,
            color: 0x1890ff,
            transparent: true,
            opacity: 0.8,
        });

        const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particlesMesh);

        camera.position.z = 3;

        let mouseX = 0;
        let mouseY = 0;

        const handleMouseMove = (event: MouseEvent) => {
            mouseX = (event.clientX / window.innerWidth) * 2 - 1;
            mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
        };

        window.addEventListener('mousemove', handleMouseMove);

        const animate = () => {
            requestAnimationFrame(animate);

            particlesMesh.rotation.x += 0.0005;
            particlesMesh.rotation.y += 0.0005;

            // Mouse interaction
            particlesMesh.rotation.x += mouseY * 0.0005;
            particlesMesh.rotation.y += mouseX * 0.0005;

            renderer.render(scene, camera);
        };

        animate();

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
        };
    }, []);

    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* 3D Background */}
            <canvas
                ref={canvasRef}
                className="fixed top-0 left-0 w-full h-full -z-10 opacity-30"
            />

            {/* Hero Section */}
            <section className="section-padding min-h-screen flex items-center justify-center relative">
                <div className="max-w-7xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h1 className="text-5xl md:text-7xl font-bold mb-6">
                            <span className="gradient-text">Green Hydrogen</span>
                            <br />
                            <span className="text-gray-800 dark:text-white">For a Sustainable Future</span>
                        </h1>

                        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                            Smart AI-powered system for hydrogen production, storage, and transportation
                            using renewable energy sources
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link to="/signup" className="btn-primary inline-flex items-center justify-center space-x-2">
                                <span>Get Started</span>
                                <ArrowRight size={20} />
                            </Link>
                            <Link to="/login" className="btn-secondary">
                                Sign In
                            </Link>
                        </div>
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20"
                    >
                        <div className="card-glass text-center">
                            <h3 className="text-3xl font-bold text-hydrogen-500 mb-2">50+</h3>
                            <p className="text-gray-600 dark:text-gray-300">TPD Production</p>
                        </div>
                        <div className="card-glass text-center">
                            <h3 className="text-3xl font-bold text-green-500 mb-2">&lt;$2</h3>
                            <p className="text-gray-600 dark:text-gray-300">Per kg LCOH</p>
                        </div>
                        <div className="card-glass text-center">
                            <h3 className="text-3xl font-bold text-hydrogen-500 mb-2">99.9%</h3>
                            <p className="text-gray-600 dark:text-gray-300">Hydrogen Purity</p>
                        </div>
                        <div className="card-glass text-center">
                            <h3 className="text-3xl font-bold text-green-500 mb-2">100%</h3>
                            <p className="text-gray-600 dark:text-gray-300">Renewable Energy</p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section className="section-padding bg-white/50 dark:bg-gray-800/50">
                <div className="max-w-7xl mx-auto">
                    <motion.h2
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-4xl font-bold text-center mb-16 gradient-text"
                    >
                        Powered by Advanced Technology
                    </motion.h2>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <FeatureCard
                            icon={<Zap className="w-12 h-12 text-hydrogen-500" />}
                            title="AI-Powered Optimization"
                            description="Machine learning models for profit prediction, safety monitoring, and logistics optimization"
                        />
                        <FeatureCard
                            icon={<Shield className="w-12 h-12 text-green-500" />}
                            title="Blockchain Certification"
                            description="Immutable guarantee of origin certificates on Polygon blockchain"
                        />
                        <FeatureCard
                            icon={<TrendingUp className="w-12 h-12 text-hydrogen-500" />}
                            title="Real-time Monitoring"
                            description="Live IoT sensor data, fleet tracking, and production analytics"
                        />
                        <FeatureCard
                            icon={<Leaf className="w-12 h-12 text-green-500" />}
                            title="100% Renewable"
                            description="Solar, wind, and hydropower integration with smart energy management"
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="section-padding">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="card-glass p-12"
                    >
                        <h2 className="text-3xl font-bold mb-4">Ready to Go Green?</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-8">
                            Join the future of clean energy with our smart hydrogen production platform
                        </p>
                        <Link to="/signup" className="btn-primary inline-flex items-center space-x-2">
                            <span>Start Your Journey</span>
                            <ArrowRight size={20} />
                        </Link>
                    </motion.div>
                </div>
            </section>
        </div>
    );
};

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.05 }}
            className="card-glass p-6 text-center"
        >
            <div className="flex justify-center mb-4">{icon}</div>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-gray-600 dark:text-gray-300">{description}</p>
        </motion.div>
    );
};

export default Landing;
