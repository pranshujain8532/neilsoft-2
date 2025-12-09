import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Html, Text } from '@react-three/drei';
import { Suspense, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Maximize2, Minimize2, Eye, Activity, Zap, Thermometer, Gauge } from 'lucide-react';
import * as THREE from 'three';

// ============== PARAMETERS (from KCL - converted to meters for Three.js) ==============
const CONFIG = {
    // Convert mm to meters (divide by 1000) and adjust for visualization
    scale: 0.01, // Scale factor for better visibility
    gap: 0.3,    // 30mm gap between components

    // Diameters (in display units)
    compPlateDia: 2.0,
    insulatorDia: 1.8,
    endPlateDia: 1.8,
    collectorDia: 1.7,
    gasketOD: 1.7,
    gasketID: 1.4,
    membraneDia: 1.6,

    // Thicknesses
    tComp: 0.15,
    tIns: 0.05,
    tEnd: 0.10,
    tCollector: 0.03,
    tGasket: 0.02,
    tMembrane: 0.01,

    // Ports and sensors
    portDia: 0.12,
    portRadius: 0.70,
    sensorDia: 0.08,
    sensorHeight: 0.12,
    sensorOffsetR: 0.65,

    // Bolts
    boltDia: 0.10,
    boltPCD: 1.70,
    numBolts: 8,
};

// ============== COLORS ==============
const COLORS = {
    steelGray: '#5f646e',
    creamWhite: '#f0e8d2',
    titaniumSilver: '#b4b9be',
    blackRubber: '#141414',
    darkGray: '#323232',
    greenActive: '#1eff5a',
    redInactive: '#ff3030',
    membrane: '#4a90d4',
    gasket: '#1a1a1a',
};

// ============== Z POSITIONS (exploded view) ==============
const zPos = {
    bottomPlate: -1.78,
    insulator1: -1.38,
    endPlateA: -1.005,
    collectorA: -0.64,
    gasketA: -0.315,
    membrane: 0,
    gasketB: 0.315,
    collectorB: 0.64,
    endPlateB: 1.005,
    insulator2: 1.38,
    topPlate: 1.78,
};

// ============== COMPRESSION PLATE (with bolt holes) ==============
const CompressionPlate = ({ position, isActive }: { position: [number, number, number]; isActive?: boolean }) => {
    return (
        <group position={position}>
            <mesh castShadow receiveShadow>
                <cylinderGeometry args={[CONFIG.compPlateDia / 2, CONFIG.compPlateDia / 2, CONFIG.tComp, 32]} />
                <meshStandardMaterial
                    color={COLORS.steelGray}
                    metalness={0.9}
                    roughness={0.2}
                />
            </mesh>
            {/* Bolt holes pattern */}
            {Array.from({ length: CONFIG.numBolts }).map((_, i) => {
                const angle = (i / CONFIG.numBolts) * Math.PI * 2;
                const x = Math.cos(angle) * (CONFIG.boltPCD / 2);
                const z = Math.sin(angle) * (CONFIG.boltPCD / 2);
                return (
                    <mesh key={i} position={[x, 0, z]}>
                        <cylinderGeometry args={[CONFIG.boltDia / 2, CONFIG.boltDia / 2, CONFIG.tComp + 0.01, 16]} />
                        <meshStandardMaterial color="#2a2a2a" />
                    </mesh>
                );
            })}
        </group>
    );
};

// ============== INSULATOR DISC ==============
const Insulator = ({ position }: { position: [number, number, number] }) => (
    <mesh position={position} castShadow>
        <cylinderGeometry args={[CONFIG.insulatorDia / 2, CONFIG.insulatorDia / 2, CONFIG.tIns, 32]} />
        <meshStandardMaterial color={COLORS.creamWhite} metalness={0.1} roughness={0.8} />
    </mesh>
);

// ============== END PLATE (with port holes) ==============
const EndPlate = ({ position, isActive }: { position: [number, number, number]; isActive?: boolean }) => (
    <group position={position}>
        <mesh castShadow receiveShadow>
            <cylinderGeometry args={[CONFIG.endPlateDia / 2, CONFIG.endPlateDia / 2, CONFIG.tEnd, 32]} />
            <meshStandardMaterial color={COLORS.steelGray} metalness={0.7} roughness={0.4} />
        </mesh>
        {/* Port holes */}
        <mesh position={[CONFIG.portRadius, 0, 0]}>
            <cylinderGeometry args={[CONFIG.portDia / 2, CONFIG.portDia / 2, CONFIG.tEnd + 0.01, 16]} />
            <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[-CONFIG.portRadius, 0, 0]}>
            <cylinderGeometry args={[CONFIG.portDia / 2, CONFIG.portDia / 2, CONFIG.tEnd + 0.01, 16]} />
            <meshStandardMaterial color="#1a1a1a" />
        </mesh>
    </group>
);

// ============== CURRENT COLLECTOR ==============
const CurrentCollector = ({ position, isActive }: { position: [number, number, number]; isActive?: boolean }) => (
    <mesh position={position} castShadow>
        <cylinderGeometry args={[CONFIG.collectorDia / 2, CONFIG.collectorDia / 2, CONFIG.tCollector, 32]} />
        <meshStandardMaterial
            color={COLORS.titaniumSilver}
            metalness={0.9}
            roughness={0.3}
            emissive={isActive ? '#4488ff' : '#000000'}
            emissiveIntensity={isActive ? 0.2 : 0}
        />
    </mesh>
);

// ============== GASKET RING ==============
const Gasket = ({ position }: { position: [number, number, number] }) => (
    <mesh position={position}>
        <torusGeometry args={[(CONFIG.gasketOD + CONFIG.gasketID) / 4, (CONFIG.gasketOD - CONFIG.gasketID) / 4, 16, 48]} />
        <meshStandardMaterial color={COLORS.blackRubber} metalness={0.05} roughness={0.9} />
    </mesh>
);

// ============== MEA MEMBRANE ==============
const Membrane = ({ position, isActive }: { position: [number, number, number]; isActive?: boolean }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current && isActive) {
            meshRef.current.material.emissiveIntensity = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.15;
        }
    });

    return (
        <mesh ref={meshRef} position={position} castShadow>
            <cylinderGeometry args={[CONFIG.membraneDia / 2, CONFIG.membraneDia / 2, CONFIG.tMembrane, 32]} />
            <meshStandardMaterial
                color={COLORS.membrane}
                metalness={0.2}
                roughness={0.7}
                emissive={isActive ? '#00aaff' : '#000000'}
                emissiveIntensity={isActive ? 0.3 : 0}
                transparent
                opacity={0.85}
            />
        </mesh>
    );
};

// ============== SENSOR MOUNT ==============
const SensorMount = ({ position, isActive }: { position: [number, number, number]; isActive?: boolean }) => (
    <mesh position={position}>
        <cylinderGeometry args={[CONFIG.sensorDia / 2, CONFIG.sensorDia / 2, CONFIG.sensorHeight, 16]} />
        <meshStandardMaterial
            color={isActive ? COLORS.greenActive : COLORS.redInactive}
            emissive={isActive ? '#00ff44' : '#ff0000'}
            emissiveIntensity={0.5}
        />
    </mesh>
);

// ============== BOLT ==============
const Bolt = ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
        {/* Shaft */}
        <mesh>
            <cylinderGeometry args={[0.05, 0.05, 0.6, 12]} />
            <meshStandardMaterial color={COLORS.steelGray} metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.33, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.06, 6]} />
            <meshStandardMaterial color={COLORS.steelGray} metalness={0.9} roughness={0.2} />
        </mesh>
    </group>
);

// ============== NUT ==============
const Nut = ({ position }: { position: [number, number, number] }) => (
    <mesh position={position}>
        <cylinderGeometry args={[0.08, 0.08, 0.06, 6]} />
        <meshStandardMaterial color={COLORS.steelGray} metalness={0.9} roughness={0.2} />
    </mesh>
);

// ============== STATUS INDICATOR LIGHT ==============
const StatusLight = ({ position, active, label }: { position: [number, number, number]; active: boolean; label?: string }) => (
    <group position={position}>
        <mesh>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial
                color={active ? '#00ff55' : '#ff3333'}
                emissive={active ? '#00ff55' : '#ff3333'}
                emissiveIntensity={0.8}
            />
        </mesh>
        {label && (
            <Html position={[0.2, 0, 0]} center>
                <div className="text-xs text-white bg-gray-900/80 px-1 rounded whitespace-nowrap">
                    {label}
                </div>
            </Html>
        )}
    </group>
);

// ============== FULL ELECTROLYZER STACK ==============
interface ElectrolyzerStackProps {
    isOperating?: boolean;
    temperature?: number;
    pressure?: number;
    efficiency?: number;
}

const ElectrolyzerStack = ({
    isOperating = true,
    temperature = 75,
    pressure = 30,
    efficiency = 85
}: ElectrolyzerStackProps) => {
    const groupRef = useRef<THREE.Group>(null);

    // Slow rotation when operating
    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Stack components from bottom to top */}
            <CompressionPlate position={[0, zPos.bottomPlate, 0]} isActive={isOperating} />
            <Insulator position={[0, zPos.insulator1, 0]} />
            <EndPlate position={[0, zPos.endPlateA, 0]} isActive={isOperating} />
            <CurrentCollector position={[0, zPos.collectorA, 0]} isActive={isOperating} />
            <Gasket position={[0, zPos.gasketA, 0]} />
            <Membrane position={[0, zPos.membrane, 0]} isActive={isOperating} />
            <Gasket position={[0, zPos.gasketB, 0]} />
            <CurrentCollector position={[0, zPos.collectorB, 0]} isActive={isOperating} />
            <EndPlate position={[0, zPos.endPlateB, 0]} isActive={isOperating} />
            <Insulator position={[0, zPos.insulator2, 0]} />
            <CompressionPlate position={[0, zPos.topPlate, 0]} isActive={isOperating} />

            {/* Sensor mounts on end plates */}
            <SensorMount position={[CONFIG.sensorOffsetR, zPos.endPlateA + 0.1, CONFIG.sensorOffsetR]} isActive={temperature < 80} />
            <SensorMount position={[-CONFIG.sensorOffsetR, zPos.endPlateA + 0.1, -CONFIG.sensorOffsetR]} isActive={pressure > 20} />
            <SensorMount position={[CONFIG.sensorOffsetR, zPos.endPlateB + 0.1, -CONFIG.sensorOffsetR]} isActive={efficiency > 80} />
            <SensorMount position={[-CONFIG.sensorOffsetR, zPos.endPlateB + 0.1, CONFIG.sensorOffsetR]} isActive={isOperating} />

            {/* Status lights */}
            <StatusLight position={[1.3, 0.5, 0]} active={isOperating} label="Power" />
            <StatusLight position={[1.3, 0, 0]} active={temperature < 80} label="Temp OK" />
            <StatusLight position={[1.3, -0.5, 0]} active={pressure > 20} label="Pressure" />

            {/* Bolt array beside stack */}
            {Array.from({ length: 8 }).map((_, i) => (
                <group key={i}>
                    <Bolt position={[1.6, -0.7 + i * 0.2, 0]} />
                    <Nut position={[1.85, -0.7 + i * 0.2, 0]} />
                </group>
            ))}

            {/* Labels */}
            <Html position={[0, 2.2, 0]} center>
                <div className="bg-gray-900/90 text-white px-3 py-1 rounded-lg text-sm font-bold border border-cyan-500/50">
                    PEM Electrolyzer Stack
                </div>
            </Html>
        </group>
    );
};

// ============== MAIN SCENE ==============
interface ElectrolyzerSceneProps {
    isOperating?: boolean;
    temperature?: number;
    pressure?: number;
    efficiency?: number;
}

const ElectrolyzerScene = (props: ElectrolyzerSceneProps) => (
    <>
        <ambientLight intensity={0.4} />
        <directionalLight
            position={[5, 8, 3]}
            intensity={1.0}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
        />
        <pointLight position={[-3, 4, -2]} intensity={0.4} color="#fff5e6" />
        <pointLight position={[0, 0, 3]} intensity={0.3} color="#88ccff" />

        <ElectrolyzerStack {...props} />

        <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={3}
            maxDistance={15}
            autoRotate={false}
            autoRotateSpeed={0.5}
        />
        <Environment preset="studio" />
    </>
);

// ============== MAIN COMPONENT ==============
interface Electrolyzer3DProps {
    className?: string;
    isOperating?: boolean;
    temperature?: number;
    pressure?: number;
    efficiency?: number;
    onToggleFullscreen?: () => void;
    fullscreen?: boolean;
}

const Electrolyzer3D = ({
    className = '',
    isOperating = true,
    temperature = 72,
    pressure = 32,
    efficiency = 87,
    onToggleFullscreen,
    fullscreen = false
}: Electrolyzer3DProps) => {
    const [viewMode, setViewMode] = useState<'perspective' | 'side' | 'top'>('perspective');

    const getCameraPosition = (): [number, number, number] => {
        switch (viewMode) {
            case 'top': return [0, 8, 0];
            case 'side': return [6, 0, 0];
            default: return [4, 3, 4];
        }
    };

    return (
        <motion.div
            className={`relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl overflow-hidden border border-slate-700/50 ${className}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* Controls */}
            <div className="absolute top-3 right-3 z-10 flex gap-2">
                <button
                    onClick={() => setViewMode('perspective')}
                    className={`p-2 rounded-lg text-xs font-medium transition-all ${viewMode === 'perspective'
                            ? 'bg-cyan-500 text-white'
                            : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700'
                        }`}
                >
                    3D
                </button>
                <button
                    onClick={() => setViewMode('side')}
                    className={`p-2 rounded-lg text-xs font-medium transition-all ${viewMode === 'side'
                            ? 'bg-cyan-500 text-white'
                            : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700'
                        }`}
                >
                    Side
                </button>
                <button
                    onClick={() => setViewMode('top')}
                    className={`p-2 rounded-lg text-xs font-medium transition-all ${viewMode === 'top'
                            ? 'bg-cyan-500 text-white'
                            : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700'
                        }`}
                >
                    Top
                </button>
                {onToggleFullscreen && (
                    <button
                        onClick={onToggleFullscreen}
                        className="p-2 bg-gray-800/80 text-gray-400 hover:bg-gray-700 rounded-lg transition-all"
                    >
                        {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                )}
            </div>

            {/* Title */}
            <div className="absolute top-3 left-3 z-10">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    PEM Electrolyzer - Exploded View
                </h3>
                <p className="text-gray-500 text-xs mt-0.5">200mm Stack | KCL/AutoCAD Design</p>
            </div>

            {/* Status Panel */}
            <div className="absolute bottom-3 left-3 z-10 bg-gray-900/90 backdrop-blur-sm rounded-xl p-3 border border-gray-700/50">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div className="flex items-center gap-2">
                        <Zap className={`w-3.5 h-3.5 ${isOperating ? 'text-green-400' : 'text-red-400'}`} />
                        <span className="text-gray-400">Status:</span>
                        <span className={isOperating ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                            {isOperating ? 'ACTIVE' : 'OFFLINE'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Thermometer className={`w-3.5 h-3.5 ${temperature < 80 ? 'text-green-400' : 'text-red-400'}`} />
                        <span className="text-gray-400">Temp:</span>
                        <span className={temperature < 80 ? 'text-green-400' : 'text-red-400'}>{temperature}°C</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Gauge className={`w-3.5 h-3.5 ${pressure > 20 ? 'text-green-400' : 'text-red-400'}`} />
                        <span className="text-gray-400">Pressure:</span>
                        <span className={pressure > 20 ? 'text-green-400' : 'text-red-400'}>{pressure} bar</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Activity className={`w-3.5 h-3.5 ${efficiency > 80 ? 'text-green-400' : 'text-yellow-400'}`} />
                        <span className="text-gray-400">Efficiency:</span>
                        <span className={efficiency > 80 ? 'text-green-400' : 'text-yellow-400'}>{efficiency}%</span>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-3 right-3 z-10 bg-gray-900/80 backdrop-blur-sm rounded-lg p-2 text-xs">
                <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500" /> Normal
                    </span>
                    <span className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500" /> Alert
                    </span>
                </div>
            </div>

            {/* Canvas */}
            <Canvas shadows camera={{ position: getCameraPosition(), fov: 45 }}>
                <Suspense fallback={null}>
                    <PerspectiveCamera
                        makeDefault
                        position={getCameraPosition()}
                        fov={45}
                    />
                    <ElectrolyzerScene
                        isOperating={isOperating}
                        temperature={temperature}
                        pressure={pressure}
                        efficiency={efficiency}
                    />
                </Suspense>
            </Canvas>
        </motion.div>
    );
};

export default Electrolyzer3D;
