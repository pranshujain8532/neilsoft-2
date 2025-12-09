import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Html, RoundedBox } from '@react-three/drei';
import { Suspense, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Maximize2, Minimize2, Eye, Activity, Thermometer, Gauge, Power } from 'lucide-react';
import * as THREE from 'three';

// ============== PARAMETERS (from KCL - scaled for Three.js) ==============
const CONFIG = {
    // All dimensions in display units (scaled from mm)
    scale: 0.001,

    // Receiver Tank
    tankLength: 0.8,
    tankDiameter: 0.4,
    tankRadius: 0.2,

    // Support Legs
    legHeight: 0.08,
    legSize: 0.06,
    legPositions: [-0.3, -0.1, 0.1, 0.3],

    // Drain
    drainDia: 0.02,
    drainLength: 0.03,

    // Compressor Cabinet
    cabinetWidth: 0.7,
    cabinetDepth: 0.5,
    cabinetHeight: 0.6,

    // Side Control Panel
    sideUnitW: 0.2,
    sideUnitD: 0.2,
    sideUnitH: 0.4,

    // Sensors
    sensorDia: 0.01,
    sensorH: 0.015,
};

// ============== COLORS ==============
const COLORS = {
    tankBlue: '#0077aa',
    metalGray: '#444444',
    displayDark: '#333333',
    buttonRed: '#cc0000',
    ledGreen: '#00cc44',
    ledRed: '#ff3333',
    sensorGreen: '#00aa44',
    sensorRed: '#cc2222',
    white: '#ffffff',
};

// ============== RECEIVER TANK ==============
const ReceiverTank = ({ isOperating }: { isOperating?: boolean }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    return (
        <group>
            {/* Main horizontal cylinder tank */}
            <mesh ref={meshRef} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
                <cylinderGeometry args={[CONFIG.tankRadius, CONFIG.tankRadius, CONFIG.tankLength, 32]} />
                <meshStandardMaterial
                    color={COLORS.tankBlue}
                    metalness={0.7}
                    roughness={0.3}
                />
            </mesh>

            {/* End caps */}
            <mesh position={[CONFIG.tankLength / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <sphereGeometry args={[CONFIG.tankRadius, 16, 16, 0, Math.PI]} />
                <meshStandardMaterial color={COLORS.tankBlue} metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[-CONFIG.tankLength / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <sphereGeometry args={[CONFIG.tankRadius, 16, 16, 0, Math.PI]} />
                <meshStandardMaterial color={COLORS.tankBlue} metalness={0.7} roughness={0.3} />
            </mesh>
        </group>
    );
};

// ============== SUPPORT LEGS ==============
const SupportLegs = () => {
    const groundZ = -CONFIG.tankRadius - CONFIG.legHeight;

    return (
        <group>
            {CONFIG.legPositions.map((x, i) => (
                <mesh
                    key={i}
                    position={[x, groundZ + CONFIG.legHeight / 2, 0]}
                    castShadow
                >
                    <boxGeometry args={[CONFIG.legSize, CONFIG.legHeight, CONFIG.legSize]} />
                    <meshStandardMaterial color={COLORS.metalGray} metalness={0.6} roughness={0.4} />
                </mesh>
            ))}
        </group>
    );
};

// ============== DRAIN VALVE ==============
const DrainValve = () => (
    <mesh position={[0, -CONFIG.tankRadius - CONFIG.drainLength / 2, 0]}>
        <cylinderGeometry args={[CONFIG.drainDia / 2, CONFIG.drainDia / 2, CONFIG.drainLength, 12]} />
        <meshStandardMaterial color={COLORS.metalGray} metalness={0.6} roughness={0.4} />
    </mesh>
);

// ============== COMPRESSOR CABINET ==============
interface CabinetProps {
    isOperating?: boolean;
    temperature?: number;
    pressure?: number;
}

const CompressorCabinet = ({ isOperating = true, temperature = 45, pressure = 8 }: CabinetProps) => {
    const cabinetY = CONFIG.tankRadius + CONFIG.cabinetHeight / 2;

    return (
        <group position={[0, cabinetY, 0]}>
            {/* Main cabinet body */}
            <RoundedBox
                args={[CONFIG.cabinetWidth, CONFIG.cabinetHeight, CONFIG.cabinetDepth]}
                radius={0.01}
                smoothness={4}
                castShadow
                receiveShadow
            >
                <meshStandardMaterial color={COLORS.tankBlue} metalness={0.7} roughness={0.3} />
            </RoundedBox>

            {/* Control Display Panel */}
            <mesh position={[-0.17, 0.15, CONFIG.cabinetDepth / 2 + 0.002]}>
                <boxGeometry args={[0.12, 0.08, 0.004]} />
                <meshStandardMaterial color={COLORS.displayDark} metalness={0.2} roughness={0.6} />
            </mesh>

            {/* Display text */}
            <Html position={[-0.17, 0.15, CONFIG.cabinetDepth / 2 + 0.01]} center>
                <div className="bg-gray-900 text-green-400 px-2 py-1 text-xs font-mono rounded" style={{ minWidth: '80px' }}>
                    <div>T: {temperature}°C</div>
                    <div>P: {pressure} bar</div>
                </div>
            </Html>

            {/* Grille / Ventilation area */}
            <mesh position={[0.1, 0.05, CONFIG.cabinetDepth / 2 + 0.002]}>
                <boxGeometry args={[0.2, 0.3, 0.006]} />
                <meshStandardMaterial color="#3a7a9a" metalness={0.5} roughness={0.5} />
            </mesh>

            {/* Grille slots */}
            {Array.from({ length: 15 }).map((_, i) => (
                <mesh key={i} position={[0.1, -0.08 + i * 0.018, CONFIG.cabinetDepth / 2 + 0.005]}>
                    <boxGeometry args={[0.18, 0.006, 0.008]} />
                    <meshStandardMaterial color="#1a4a6a" />
                </mesh>
            ))}

            {/* Emergency Stop Button */}
            <mesh position={[0.16, 0.17, CONFIG.cabinetDepth / 2 + 0.01]}>
                <cylinderGeometry args={[0.02, 0.02, 0.015, 16]} />
                <meshStandardMaterial
                    color={COLORS.buttonRed}
                    metalness={0.5}
                    roughness={0.4}
                />
            </mesh>

            {/* Power LED indicator */}
            <mesh position={[0.16, 0.11, CONFIG.cabinetDepth / 2 + 0.008]}>
                <cylinderGeometry args={[0.005, 0.005, 0.005, 12]} />
                <meshStandardMaterial
                    color={isOperating ? COLORS.ledGreen : COLORS.ledRed}
                    emissive={isOperating ? COLORS.ledGreen : COLORS.ledRed}
                    emissiveIntensity={0.8}
                />
            </mesh>
        </group>
    );
};

// ============== SIDE CONTROL PANEL ==============
const SideControlPanel = ({ isActive = true }: { isActive?: boolean }) => {
    const groundZ = -CONFIG.tankRadius - CONFIG.legHeight;
    const offsetX = CONFIG.cabinetWidth / 2 + 0.25;
    const offsetZ = CONFIG.cabinetDepth / 2 + 0.15;

    return (
        <group position={[offsetX, groundZ + CONFIG.sideUnitH / 2, offsetZ]}>
            {/* Panel body */}
            <RoundedBox
                args={[CONFIG.sideUnitW, CONFIG.sideUnitH, CONFIG.sideUnitD]}
                radius={0.005}
                smoothness={4}
                castShadow
            >
                <meshStandardMaterial color={COLORS.tankBlue} metalness={0.7} roughness={0.3} />
            </RoundedBox>

            {/* Digital display */}
            <mesh position={[0, 0.05, CONFIG.sideUnitD / 2 + 0.002]}>
                <boxGeometry args={[0.08, 0.06, 0.004]} />
                <meshStandardMaterial color={COLORS.displayDark} metalness={0.2} roughness={0.6} />
            </mesh>

            {/* Status indicator */}
            <mesh position={[0, -0.05, CONFIG.sideUnitD / 2 + 0.008]}>
                <sphereGeometry args={[0.008, 12, 12]} />
                <meshStandardMaterial
                    color={isActive ? '#00ff44' : '#ff3333'}
                    emissive={isActive ? '#00ff44' : '#ff3333'}
                    emissiveIntensity={0.6}
                />
            </mesh>

            {/* Label */}
            <Html position={[0, 0.12, CONFIG.sideUnitD / 2 + 0.01]} center>
                <div className="text-xs text-white bg-gray-800/80 px-1 rounded whitespace-nowrap">
                    AUX CTRL
                </div>
            </Html>
        </group>
    );
};

// ============== SENSORS ==============
interface SensorProps {
    position: [number, number, number];
    isOk?: boolean;
    label?: string;
}

const Sensor = ({ position, isOk = true, label }: SensorProps) => (
    <group position={position}>
        <mesh>
            <cylinderGeometry args={[CONFIG.sensorDia / 2, CONFIG.sensorDia / 2, CONFIG.sensorH, 12]} />
            <meshStandardMaterial
                color={isOk ? COLORS.sensorGreen : COLORS.sensorRed}
                emissive={isOk ? '#00aa44' : '#cc2222'}
                emissiveIntensity={0.4}
                metalness={0.6}
                roughness={0.4}
            />
        </mesh>
        {label && (
            <Html position={[0, 0.03, 0]} center>
                <div className="text-[8px] text-white bg-gray-900/80 px-0.5 rounded whitespace-nowrap">
                    {label}
                </div>
            </Html>
        )}
    </group>
);

// ============== FULL COMPRESSOR ASSEMBLY ==============
interface CompressorAssemblyProps {
    isOperating?: boolean;
    temperature?: number;
    pressure?: number;
    oilLevel?: number;
}

const CompressorAssembly = ({
    isOperating = true,
    temperature = 45,
    pressure = 8,
    oilLevel = 85
}: CompressorAssemblyProps) => {
    const groupRef = useRef<THREE.Group>(null);

    // Subtle animation
    useFrame((state) => {
        if (groupRef.current && isOperating) {
            groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.05;
        }
    });

    return (
        <group ref={groupRef}>
            <ReceiverTank isOperating={isOperating} />
            <SupportLegs />
            <DrainValve />
            <CompressorCabinet
                isOperating={isOperating}
                temperature={temperature}
                pressure={pressure}
            />
            <SideControlPanel isActive={isOperating} />

            {/* Sensors */}
            <Sensor
                position={[-0.15, CONFIG.tankRadius + CONFIG.sensorH / 2, 0]}
                isOk={pressure < 10}
                label="PRESS"
            />
            <Sensor
                position={[0.15, CONFIG.tankRadius + CONFIG.cabinetHeight + CONFIG.sensorH / 2, 0.05]}
                isOk={temperature < 60}
                label="TEMP"
            />
            <Sensor
                position={[0.2, -0.1, CONFIG.tankDiameter / 2 + CONFIG.sensorH / 2]}
                isOk={oilLevel > 50}
                label="OIL"
            />

            {/* Title label */}
            <Html position={[0, CONFIG.tankRadius + CONFIG.cabinetHeight + 0.15, 0]} center>
                <div className="bg-gray-900/90 text-white px-3 py-1 rounded-lg text-sm font-bold border border-cyan-500/50">
                    H₂ Compressor Unit
                </div>
            </Html>
        </group>
    );
};

// ============== MAIN SCENE ==============
interface CompressorSceneProps {
    isOperating?: boolean;
    temperature?: number;
    pressure?: number;
    oilLevel?: number;
}

const CompressorScene = (props: CompressorSceneProps) => (
    <>
        <ambientLight intensity={0.4} />
        <directionalLight
            position={[3, 5, 4]}
            intensity={1.0}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
        />
        <pointLight position={[-2, 3, -2]} intensity={0.3} color="#fff5e6" />
        <pointLight position={[0, 1, 2]} intensity={0.2} color="#88ccff" />

        <CompressorAssembly {...props} />

        <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={0.8}
            maxDistance={4}
            autoRotate={false}
        />
        <Environment preset="studio" />
    </>
);

// ============== MAIN COMPONENT ==============
interface Compressor3DProps {
    className?: string;
    isOperating?: boolean;
    temperature?: number;
    pressure?: number;
    oilLevel?: number;
    onToggleFullscreen?: () => void;
    fullscreen?: boolean;
}

const Compressor3D = ({
    className = '',
    isOperating = true,
    temperature = 48,
    pressure = 7.5,
    oilLevel = 82,
    onToggleFullscreen,
    fullscreen = false
}: Compressor3DProps) => {
    const [viewMode, setViewMode] = useState<'perspective' | 'side' | 'front'>('perspective');

    const getCameraPosition = (): [number, number, number] => {
        switch (viewMode) {
            case 'side': return [1.5, 0.3, 0];
            case 'front': return [0, 0.3, 1.2];
            default: return [1.0, 0.6, 1.0];
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
                    onClick={() => setViewMode('front')}
                    className={`p-2 rounded-lg text-xs font-medium transition-all ${viewMode === 'front'
                            ? 'bg-cyan-500 text-white'
                            : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700'
                        }`}
                >
                    Front
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
                    <Power className="w-4 h-4 text-cyan-400" />
                    H₂ Compressor - 3D Model
                </h3>
                <p className="text-gray-500 text-xs mt-0.5">800mm Tank | KCL/AutoCAD Design</p>
            </div>

            {/* Status Panel */}
            <div className="absolute bottom-3 left-3 z-10 bg-gray-900/90 backdrop-blur-sm rounded-xl p-3 border border-gray-700/50">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div className="flex items-center gap-2">
                        <Activity className={`w-3.5 h-3.5 ${isOperating ? 'text-green-400' : 'text-red-400'}`} />
                        <span className="text-gray-400">Status:</span>
                        <span className={isOperating ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                            {isOperating ? 'RUNNING' : 'STOPPED'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Thermometer className={`w-3.5 h-3.5 ${temperature < 60 ? 'text-green-400' : 'text-red-400'}`} />
                        <span className="text-gray-400">Temp:</span>
                        <span className={temperature < 60 ? 'text-green-400' : 'text-red-400'}>{temperature}°C</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Gauge className={`w-3.5 h-3.5 ${pressure < 10 ? 'text-green-400' : 'text-red-400'}`} />
                        <span className="text-gray-400">Pressure:</span>
                        <span className={pressure < 10 ? 'text-green-400' : 'text-red-400'}>{pressure} bar</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded-full ${oilLevel > 50 ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span className="text-gray-400">Oil:</span>
                        <span className={oilLevel > 50 ? 'text-green-400' : 'text-red-400'}>{oilLevel}%</span>
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
            <Canvas shadows camera={{ position: getCameraPosition(), fov: 50 }}>
                <Suspense fallback={null}>
                    <PerspectiveCamera
                        makeDefault
                        position={getCameraPosition()}
                        fov={50}
                    />
                    <CompressorScene
                        isOperating={isOperating}
                        temperature={temperature}
                        pressure={pressure}
                        oilLevel={oilLevel}
                    />
                </Suspense>
            </Canvas>
        </motion.div>
    );
};

export default Compressor3D;
