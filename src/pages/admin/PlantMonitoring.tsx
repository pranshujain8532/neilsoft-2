import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { plantAPI, machineAPI } from '@/utils/api';
import { Activity, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const PlantMonitoring = () => {
    const [plants, setPlants] = useState<any[]>([]);
    const [selectedPlant, setSelectedPlant] = useState<any>(null);
    const [machines, setMachines] = useState<any[]>([]);

    useEffect(() => {
        fetchPlants();
    }, []);

    const fetchPlants = async () => {
        try {
            const res = await plantAPI.getAll();
            setPlants(res.data || getMockPlants());
            if (res.data?.length > 0) {
                selectPlant(res.data[0]);
            }
        } catch (error) {
            // Use mock data if API fails
            const mockPlants = getMockPlants();
            setPlants(mockPlants);
            selectPlant(mockPlants[0]);
        }
    };

    const selectPlant = async (plant: any) => {
        setSelectedPlant(plant);
        try {
            const res = await machineAPI.getByPlant(plant._id || plant.id);
            setMachines(res.data || getMockMachines());
        } catch (error) {
            setMachines(getMockMachines());
        }
    };

    const getMockPlants = () => [
        { id: '1', name: 'Gujarat Solar Plant', location: 'Kutch, Gujarat', capacity: '100 TPD', status: 'operational', efficiency: 92 },
        { id: '2', name: 'Tamil Nadu Wind Plant', location: 'Coimbatore, TN', capacity: '75 TPD', status: 'operational', efficiency: 88 },
        { id: '3', name: 'Karnataka Hydro Plant', location: 'Mysore, KA', capacity: '50 TPD', status: 'maintenance', efficiency: 0 },
    ];

    const getMockMachines = () => [
        { id: '1', name: 'Electrolyzer Stack 1', type: 'Alkaline', health: 95, status: 'operational', temperature: 75, pressure: 30 },
        { id: '2', name: 'Electrolyzer Stack 2', type: 'Alkaline', health: 92, status: 'operational', temperature: 78, pressure: 30 },
        { id: '3', name: 'Compressor Unit A', type: 'Compressor', health: 88, status: 'operational', temperature: 65, pressure: 350 },
        { id: '4', name: 'Purification System', type: 'Purifier', health: 97, status: 'operational', temperature: 25, pressure: 10 },
        { id: '5', name: 'Cooling Tower', type: 'Cooling', health: 65, status: 'warning', temperature: 35, pressure: 1 },
    ];

    const getHealthColor = (health: number) => {
        if (health >= 90) return 'text-green-500';
        if (health >= 70) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'operational':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'warning':
                return <AlertCircle className="w-5 h-5 text-yellow-500" />;
            case 'error':
                return <XCircle className="w-5 h-5 text-red-500" />;
            default:
                return <Activity className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <div className="max-w-7xl mx-auto section-padding">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-4xl font-bold gradient-text mb-8">Plant Monitoring</h1>

                {/* Plant Selection */}
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                    {plants.map((plant) => (
                        <motion.div
                            key={plant.id}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => selectPlant(plant)}
                            className={`card-glass p-6 cursor-pointer transition-all ${selectedPlant?.id === plant.id ? 'ring-2 ring-hydrogen-500' : ''
                                }`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-lg">{plant.name}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">{plant.location}</p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${plant.status === 'operational' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'
                                    }`}>
                                    {plant.status}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-300">Capacity</span>
                                <span className="font-bold">{plant.capacity}</span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-sm text-gray-600 dark:text-gray-300">Efficiency</span>
                                <span className="font-bold text-hydrogen-500">{plant.efficiency}%</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* 3D Visualization */}
                {selectedPlant && (
                    <div className="grid lg:grid-cols-2 gap-8 mb-8">
                        <div className="card-glass p-6">
                            <h3 className="text-xl font-bold mb-4">3D Plant Model</h3>
                            <div className="h-96 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                                <Canvas camera={{ position: [5, 5, 5] }}>
                                    <ambientLight intensity={0.5} />
                                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
                                    <pointLight position={[-10, -10, -10]} />

                                    {/* Simple plant visualization */}
                                    <group>
                                        {/* Main building */}
                                        <mesh position={[0, 0.5, 0]}>
                                            <boxGeometry args={[2, 1, 2]} />
                                            <meshStandardMaterial color="#1890ff" />
                                        </mesh>

                                        {/* Electrolyzer stacks */}
                                        <mesh position={[-1.5, 0.75, -1.5]}>
                                            <cylinderGeometry args={[0.3, 0.3, 1.5]} />
                                            <meshStandardMaterial color="#38a169" />
                                        </mesh>
                                        <mesh position={[1.5, 0.75, -1.5]}>
                                            <cylinderGeometry args={[0.3, 0.3, 1.5]} />
                                            <meshStandardMaterial color="#38a169" />
                                        </mesh>

                                        {/* Storage tanks */}
                                        <mesh position={[-2, 1, 2]}>
                                            <cylinderGeometry args={[0.5, 0.5, 2]} />
                                            <meshStandardMaterial color="#fbbf24" />
                                        </mesh>
                                        <mesh position={[2, 1, 2]}>
                                            <cylinderGeometry args={[0.5, 0.5, 2]} />
                                            <meshStandardMaterial color="#fbbf24" />
                                        </mesh>
                                    </group>

                                    <Environment preset="sunset" />
                                    <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
                                </Canvas>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                                Use mouse to rotate, zoom, and pan the 3D model
                            </p>
                        </div>

                        {/* Machine Health */}
                        <div className="card-glass p-6">
                            <h3 className="text-xl font-bold mb-4">Machine Health Status</h3>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {machines.map((machine) => (
                                    <div key={machine.id} className="p-4 bg-white/5 rounded-lg">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center space-x-2">
                                                {getStatusIcon(machine.status)}
                                                <div>
                                                    <h4 className="font-medium">{machine.name}</h4>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">{machine.type}</p>
                                                </div>
                                            </div>
                                            <span className={`text-2xl font-bold ${getHealthColor(machine.health)}`}>
                                                {machine.health}%
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">Temp:</span>
                                                <span className="font-medium">{machine.temperature}°C</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">Pressure:</span>
                                                <span className="font-medium">{machine.pressure} bar</span>
                                            </div>
                                        </div>

                                        {/* Health bar */}
                                        <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${machine.health >= 90 ? 'bg-green-500' :
                                                        machine.health >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                                    }`}
                                                style={{ width: `${machine.health}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default PlantMonitoring;
