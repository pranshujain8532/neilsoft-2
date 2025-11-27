import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { storageAPI } from '@/utils/api';
import { supabase } from '@/lib/supabase';
import * as THREE from 'three';
import { AlertTriangle, Thermometer, Gauge } from 'lucide-react';

// 3D Storage Container Component
function StorageContainer({ position, fillLevel, temperature, status }: any) {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame(() => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.002;
        }
    });

    const getColor = () => {
        if (status === 'critical') return '#ef4444';
        if (status === 'warning') return '#f59e0b';
        return '#38a169';
    };

    return (
        <group position={position}>
            {/* Tank body */}
            <mesh ref={meshRef}>
                <cylinderGeometry args={[0.5, 0.5, 2, 32]} />
                <meshStandardMaterial color={getColor()} metalness={0.7} roughness={0.3} />
            </mesh>

            {/* Fill level indicator */}
            <mesh position={[0, -1 + (fillLevel / 100) * 2, 0]}>
                <cylinderGeometry args={[0.48, 0.48, (fillLevel / 100) * 2, 32]} />
                <meshStandardMaterial color="#1890ff" transparent opacity={0.6} />
            </mesh>

            {/* Temperature indicator */}
            {temperature > 50 && (
                <mesh position={[0, 1.2, 0]}>
                    <sphereGeometry args={[0.1, 16, 16]} />
                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
                </mesh>
            )}
        </group>
    );
}
const Storage = () => {
    const [containers, setContainers] = useState<any[]>([]);
    const [selectedContainer, setSelectedContainer] = useState<any>(null);

    const fetchContainers = async () => {
        try {
            const { data } = await storageAPI.getContainers();
            if (data) {
                setContainers(data);
            }
        } catch (error) {
            console.error('Error fetching storage health:', error);
        }
    };

    useEffect(() => {
        fetchContainers();

        const channel = supabase
            .channel('public:containers')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'containers' },
                (payload) => {
                    console.log('Container change received!', payload);
                    if (payload.eventType === 'INSERT') {
                        setContainers((prev) => [...prev, payload.new]);
                    } else if (payload.eventType === 'UPDATE') {
                        setContainers((prev) =>
                            prev.map((c) => (c.id === payload.new.id ? { ...c, ...payload.new } : c))
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setContainers((prev) => prev.filter((c) => c.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Critical': return 'text-red-500 bg-red-500/20';
            case 'Maintenance Required': return 'text-yellow-500 bg-yellow-500/20';
            default: return 'text-green-500 bg-green-500/20';
        }
    };

    const criticalCount = containers.filter(c => c.status === 'Critical').length;
    const warningCount = containers.filter(c => c.status === 'Maintenance Required').length;
    // Mock capacities for visualization since API returns health data
    const totalCapacity = containers.length * 10000;
    const totalFilled = containers.reduce((sum, c) => sum + (10000 * (c.pressure_bar / 350)), 0);

    return (
        <div className="max-w-7xl mx-auto section-padding">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-4xl font-bold gradient-text mb-8">Storage Health Monitoring</h1>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="card-glass p-6">
                        <h3 className="text-sm text-gray-600 dark:text-gray-300 mb-2">Total Containers</h3>
                        <p className="text-3xl font-bold">{containers.length}</p>
                    </div>
                    <div className="card-glass p-6">
                        <h3 className="text-sm text-gray-600 dark:text-gray-300 mb-2">Avg Health Score</h3>
                        <p className="text-3xl font-bold text-hydrogen-500">
                            {(containers.reduce((sum, c) => sum + c.health_score, 0) / (containers.length || 1)).toFixed(1)}%
                        </p>
                    </div>
                    <div className="card-glass p-6">
                        <h3 className="text-sm text-gray-600 dark:text-gray-300 mb-2">Avg Pressure</h3>
                        <p className="text-3xl font-bold text-blue-500">
                            {(containers.reduce((sum, c) => sum + c.pressure_bar, 0) / (containers.length || 1)).toFixed(0)} bar
                        </p>
                    </div>
                    <div className="card-glass p-6">
                        <h3 className="text-sm text-gray-600 dark:text-gray-300 mb-2">Active Alerts</h3>
                        <p className="text-3xl font-bold text-red-500">{criticalCount + warningCount}</p>
                    </div>
                </div>

                {/* 3D Visualization */}
                <div className="grid lg:grid-cols-2 gap-8">
                    <div className="card-glass p-6">
                        <h3 className="text-xl font-bold mb-4">3D Digital Twin</h3>
                        <div className="h-96 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                            <Canvas camera={{ position: [8, 4, 8] }}>
                                <ambientLight intensity={0.5} />
                                <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1} />
                                <pointLight position={[-10, -10, -10]} intensity={0.5} />

                                {/* Render containers in a grid */}
                                {containers.map((container, index) => (
                                    <StorageContainer
                                        key={container.id}
                                        position={[
                                            (index % 2) * 3 - 1.5,
                                            0,
                                            Math.floor(index / 2) * 3 - 1.5
                                        ]}
                                        fillLevel={(container.pressure_bar / 350) * 100}
                                        temperature={container.temperature_c}
                                        status={container.status === 'Optimal' ? 'operational' : container.status === 'Critical' ? 'critical' : 'warning'}
                                    />
                                ))}

                                <gridHelper args={[10, 10]} />
                                <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
                            </Canvas>
                        </div>
                        <p className="text-sm text-center text-gray-500 mt-2">
                            Real-time visualization based on thermodynamic sensors
                        </p>
                    </div>

                    {/* Container List */}
                    <div className="card-glass p-6">
                        <h3 className="text-xl font-bold mb-4">Thermodynamic Analysis</h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {containers.map((container) => (
                                <motion.div
                                    key={container.id}
                                    whileHover={{ scale: 1.02 }}
                                    onClick={() => setSelectedContainer(container)}
                                    className={`p-4 rounded-lg cursor-pointer transition-all bg-white/5 hover:bg-white/10 ${selectedContainer?.id === container.id ? 'ring-2 ring-hydrogen-500' : ''
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h4 className="font-bold">{container.id} - {container.type}</h4>
                                            <div className="text-xs text-gray-500">Last Inspection: {container.last_inspection}</div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(container.status)}`}>
                                            {container.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-gray-500">
                                                <span>Pressure</span>
                                                <span className="text-gray-900 dark:text-gray-100">{container.pressure_bar} bar</span>
                                            </div>
                                            <div className="flex justify-between text-gray-500">
                                                <span>Temperature</span>
                                                <span className="text-gray-900 dark:text-gray-100">{container.temperature_c}°C</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-gray-500">
                                                <span>Hoop Stress</span>
                                                <span className="text-gray-900 dark:text-gray-100">{container.hoop_stress_mpa} MPa</span>
                                            </div>
                                            <div className="flex justify-between text-gray-500">
                                                <span>Fatigue Cycles</span>
                                                <span className="text-gray-900 dark:text-gray-100">{container.stress_cycles}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Health Score Bar */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span>Structure Health Score</span>
                                            <span className="font-bold">{container.health_score}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${container.health_score < 70 ? 'bg-red-500' :
                                                    container.health_score < 90 ? 'bg-yellow-500' : 'bg-green-500'
                                                    }`}
                                                style={{ width: `${container.health_score}%` }}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Storage;
