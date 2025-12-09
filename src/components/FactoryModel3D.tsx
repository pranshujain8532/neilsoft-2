import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Html } from '@react-three/drei';
import { Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import { Maximize2, Minimize2, Eye } from 'lucide-react';

// ============== PARAMETERS (from KCL) ==============
const CONFIG = {
    plotLength: 150,
    plotWidth: 100,
    factorySize: 70,
    factoryHeight: 20,
    windAreaL: 50,
    turbineTowerH: 45,
    turbineBladeL: 18,
    tankRadius: 6,
    tankHeight: 12,
    sphereRadius: 5,
    batteryL: 10,
    batteryW: 4,
    batteryH: 4,
    panelW: 2,
    panelH: 1,
};

// ============== COLORS ==============
const COLORS = {
    grass: '#4a7c4e',
    road: '#3d3d3d',
    factory: '#b5b5b5',
    factoryAccent: '#8fa1ac',
    steel: '#c9c9c9',
    tanks: '#dfe3e6',
    sphere: '#e8ecef',
    wind: '#ffffff',
    blade: '#f5f5f5',
    panel: '#1d3a6e',
    frame: '#7a7a7a',
    battery: '#24c266',
    bms: '#cccccc',
    fence: '#666666',
    water: '#7da9c6',
};

// ============== GROUND ==============
const Ground = () => (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]} receiveShadow>
        <boxGeometry args={[CONFIG.plotLength, CONFIG.plotWidth, 0.5]} />
        <meshStandardMaterial color={COLORS.grass} />
    </mesh>
);

// ============== ROADS ==============
const Roads = () => (
    <group>
        {/* Main perimeter road */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -CONFIG.plotWidth / 2 + 3]}>
            <boxGeometry args={[CONFIG.plotLength - 10, 6, 0.1]} />
            <meshStandardMaterial color={COLORS.road} />
        </mesh>
        {/* Access road to storage */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[50, 0.02, -15]}>
            <boxGeometry args={[40, 6, 0.1]} />
            <meshStandardMaterial color={COLORS.road} />
        </mesh>
    </group>
);

// ============== CENTRAL FACTORY (70x70) ==============
const Factory = () => (
    <group position={[0, 0, 0]}>
        {/* Factory pad */}
        <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[CONFIG.factorySize, 0.3, CONFIG.factorySize]} />
            <meshStandardMaterial color="#bdbdbd" />
        </mesh>
        {/* Main factory building */}
        <mesh position={[0, CONFIG.factoryHeight / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[CONFIG.factorySize, CONFIG.factoryHeight, CONFIG.factorySize]} />
            <meshStandardMaterial color={COLORS.factory} />
        </mesh>
        {/* Control room */}
        <mesh position={[CONFIG.factorySize / 2 + 5, 3, 10]} castShadow>
            <boxGeometry args={[10, 6, 14]} />
            <meshStandardMaterial color="#c7c7c7" />
        </mesh>
        {/* Loading docks */}
        {[-15, 0, 15].map((x, i) => (
            <mesh key={i} position={[x, 1.5, -CONFIG.factorySize / 2 - 2.5]}>
                <boxGeometry args={[10, 3, 5]} />
                <meshStandardMaterial color={COLORS.factoryAccent} />
            </mesh>
        ))}
        {/* Chimneys */}
        <mesh position={[-15, CONFIG.factoryHeight + 4, 10]}>
            <cylinderGeometry args={[1.2, 1.2, 8, 16]} />
            <meshStandardMaterial color={COLORS.steel} />
        </mesh>
        <mesh position={[8, CONFIG.factoryHeight + 3, -12]}>
            <cylinderGeometry args={[0.9, 0.9, 6, 16]} />
            <meshStandardMaterial color={COLORS.steel} />
        </mesh>
        {/* Roof vents */}
        {[-20, -12, -4, 4, 12, 20].map((x, i) => (
            <mesh key={i} position={[x, CONFIG.factoryHeight + 0.6, -5]}>
                <cylinderGeometry args={[0.5, 0.5, 1.2, 8]} />
                <meshStandardMaterial color={COLORS.steel} />
            </mesh>
        ))}
        {/* Electrolyzer modules on west side */}
        {[0, 5, 10, 15, 20, 25].map((y, i) => (
            <mesh key={i} position={[-CONFIG.factorySize / 2 - 12, 1, -8 + y]}>
                <boxGeometry args={[8, 2, 3]} />
                <meshStandardMaterial color="#e1eef7" />
            </mesh>
        ))}
        {/* Water treatment area */}
        <mesh position={[-CONFIG.factorySize / 2 - 3, 0.3, CONFIG.factorySize / 2 + 11]}>
            <boxGeometry args={[18, 0.6, 10]} />
            <meshStandardMaterial color={COLORS.water} />
        </mesh>
        <mesh position={[-CONFIG.factorySize / 2, 1.5, CONFIG.factorySize / 2 + 12]}>
            <cylinderGeometry args={[2, 2, 3, 16]} />
            <meshStandardMaterial color="#cfd8dc" />
        </mesh>
    </group>
);

// ============== WIND TURBINES ==============
const WindTurbine = ({ position }: { position: [number, number, number] }) => {
    const [x, y, z] = position;
    return (
        <group position={[x, y, z]}>
            {/* Tower */}
            <mesh position={[0, CONFIG.turbineTowerH / 2, 0]} castShadow>
                <cylinderGeometry args={[1.2, 1.5, CONFIG.turbineTowerH, 16]} />
                <meshStandardMaterial color={COLORS.wind} />
            </mesh>
            {/* Nacelle */}
            <mesh position={[0, CONFIG.turbineTowerH + 1.1, 0]}>
                <boxGeometry args={[4, 2.2, 2.2]} />
                <meshStandardMaterial color={COLORS.wind} />
            </mesh>
            {/* Hub */}
            <mesh position={[2.5, CONFIG.turbineTowerH + 1.1, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.6, 0.6, 0.8, 16]} />
                <meshStandardMaterial color={COLORS.wind} />
            </mesh>
            {/* Blades */}
            {[0, 120, 240].map((angle, i) => (
                <mesh
                    key={i}
                    position={[3, CONFIG.turbineTowerH + 1.1, 0]}
                    rotation={[Math.PI / 2, 0, (angle * Math.PI) / 180]}
                >
                    <boxGeometry args={[1.4, CONFIG.turbineBladeL, 0.25]} />
                    <meshStandardMaterial color={COLORS.blade} />
                </mesh>
            ))}
        </group>
    );
};

const WindFarm = () => {
    const turbinePositions: [number, number, number][] = [
        [-60, 0, 35],
        [-50, 0, 35],
        [-40, 0, 35],
        [-30, 0, 35],
        [-20, 0, 35],
    ];
    return (
        <group>
            {/* Wind farm pad */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-40, 0.04, 35]}>
                <boxGeometry args={[50, 30, 0.08]} />
                <meshStandardMaterial color="#d9e3e9" />
            </mesh>
            {turbinePositions.map((pos, i) => (
                <WindTurbine key={i} position={pos} />
            ))}
        </group>
    );
};

// ============== STORAGE TANKS ==============
const StorageArea = () => (
    <group position={[55, 0, 0]}>
        {/* Storage pad */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
            <boxGeometry args={[40, 40, 0.15]} />
            <meshStandardMaterial color="#dcdcdc" />
        </mesh>
        {/* Cylindrical tanks */}
        <mesh position={[-10, CONFIG.tankHeight / 2, 8]} castShadow>
            <cylinderGeometry args={[CONFIG.tankRadius, CONFIG.tankRadius, CONFIG.tankHeight, 24]} />
            <meshStandardMaterial color={COLORS.tanks} />
        </mesh>
        <mesh position={[12, CONFIG.tankHeight / 2, 8]} castShadow>
            <cylinderGeometry args={[CONFIG.tankRadius, CONFIG.tankRadius, CONFIG.tankHeight, 24]} />
            <meshStandardMaterial color={COLORS.tanks} />
        </mesh>
        <mesh position={[1, 5, -10]} castShadow>
            <cylinderGeometry args={[5, 5, 10, 24]} />
            <meshStandardMaterial color={COLORS.tanks} />
        </mesh>
        {/* Spherical vessels (approximated with spheres) */}
        <mesh position={[-12, CONFIG.sphereRadius, -12]} castShadow>
            <sphereGeometry args={[CONFIG.sphereRadius, 24, 24]} />
            <meshStandardMaterial color={COLORS.sphere} />
        </mesh>
        <mesh position={[12, CONFIG.sphereRadius, -12]} castShadow>
            <sphereGeometry args={[CONFIG.sphereRadius, 24, 24]} />
            <meshStandardMaterial color={COLORS.sphere} />
        </mesh>
        {/* Fence posts around storage */}
        {Array.from({ length: 9 }).map((_, i) => (
            <mesh key={`fb-${i}`} position={[-20 + i * 5, 1.1, -20]}>
                <cylinderGeometry args={[0.15, 0.15, 2.2, 8]} />
                <meshStandardMaterial color={COLORS.fence} />
            </mesh>
        ))}
    </group>
);

// ============== BATTERY STORAGE ==============
const BatteryStorage = () => (
    <group position={[-50, 0, 0]}>
        {/* Battery pad */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
            <boxGeometry args={[13, 7, 0.4]} />
            <meshStandardMaterial color="#bdbdbd" />
        </mesh>
        {/* Battery unit */}
        <mesh position={[0, CONFIG.batteryH / 2, 0]} castShadow>
            <boxGeometry args={[CONFIG.batteryL, CONFIG.batteryH, CONFIG.batteryW]} />
            <meshStandardMaterial color={COLORS.battery} />
        </mesh>
        {/* Terminals */}
        <mesh position={[-2.5, CONFIG.batteryH + 0.3, 0]}>
            <cylinderGeometry args={[0.45, 0.45, 0.6, 16]} />
            <meshStandardMaterial color="#ff3030" />
        </mesh>
        <mesh position={[2.5, CONFIG.batteryH + 0.3, 0]}>
            <cylinderGeometry args={[0.45, 0.45, 0.6, 16]} />
            <meshStandardMaterial color="#3a3a3a" />
        </mesh>
        {/* BMS Cabinet */}
        <mesh position={[7.5, 1.1, 0]}>
            <boxGeometry args={[2.2, 2.2, 0.9]} />
            <meshStandardMaterial color={COLORS.bms} />
        </mesh>
        {/* LED indicators */}
        {[0, 0.4, 0.8].map((x, i) => (
            <mesh key={i} position={[x, CONFIG.batteryH + 0.05, CONFIG.batteryW / 2 + 0.05]}>
                <sphereGeometry args={[0.12, 8, 8]} />
                <meshStandardMaterial
                    color={i === 0 ? '#00ff66' : i === 1 ? '#ffe000' : '#ff3030'}
                    emissive={i === 0 ? '#00ff66' : i === 1 ? '#ffe000' : '#ff3030'}
                    emissiveIntensity={0.5}
                />
            </mesh>
        ))}
        {/* Bollards */}
        {[[-6.2, -3.2], [6.2, -3.2], [-6.2, 3.2], [6.2, 3.2]].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.55, z]}>
                <cylinderGeometry args={[0.18, 0.18, 1.1, 8]} />
                <meshStandardMaterial color="#d4b000" />
            </mesh>
        ))}
    </group>
);

// ============== SOLAR PANELS ==============
const SolarPanel = ({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) => (
    <group position={position} rotation={[0, rotation, 0]}>
        <mesh rotation={[-Math.PI / 7, 0, 0]} position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[CONFIG.panelW, 0.05, CONFIG.panelH]} />
            <meshStandardMaterial color={COLORS.panel} />
        </mesh>
        {/* Frame legs */}
        {[[-0.9, -0.4], [0.9, -0.4], [-0.9, 0.4], [0.9, 0.4]].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.3, z]}>
                <cylinderGeometry args={[0.05, 0.05, 0.6, 6]} />
                <meshStandardMaterial color={COLORS.frame} />
            </mesh>
        ))}
    </group>
);

const SolarArrays = () => {
    const panels: { pos: [number, number, number]; rot?: number }[] = [];

    // South strip
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 14; col++) {
            panels.push({
                pos: [-65 + col * 5, 0, -40 + row * 3],
                rot: 0
            });
        }
    }
    // North strip
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 10; col++) {
            panels.push({
                pos: [-50 + col * 5, 0, 45 - row * 3],
                rot: Math.PI
            });
        }
    }

    return (
        <group>
            {panels.map((p, i) => (
                <SolarPanel key={i} position={p.pos} rotation={p.rot} />
            ))}
        </group>
    );
};

// ============== LOGISTICS AREA ==============
const LogisticsArea = () => (
    <group position={[68, 0, -15]}>
        {/* Pad */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <boxGeometry args={[20, 10, 0.1]} />
            <meshStandardMaterial color={COLORS.road} />
        </mesh>
        {/* Truck cab */}
        <mesh position={[-6, 1.3, 0]}>
            <boxGeometry args={[4, 2.6, 2.6]} />
            <meshStandardMaterial color="#d0d0d0" />
        </mesh>
        {/* Tanker */}
        <mesh position={[2, 1.7, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[1.7, 1.7, 8, 16]} />
            <meshStandardMaterial color="#ebeff2" />
        </mesh>
        {/* Wheels (simplified) */}
        {[-7, -5, 4].map((x, i) => (
            <group key={i}>
                <mesh position={[x, 0.55, -1.5]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.55, 0.55, 0.35, 12]} />
                    <meshStandardMaterial color="#111111" />
                </mesh>
                <mesh position={[x, 0.55, 1.5]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.55, 0.55, 0.35, 12]} />
                    <meshStandardMaterial color="#111111" />
                </mesh>
            </group>
        ))}
    </group>
);

// ============== ELECTRICAL INFRASTRUCTURE ==============
const ElectricalInfra = () => (
    <group>
        {/* Transformer */}
        <mesh position={[-10, 1.5, 30]}>
            <boxGeometry args={[6, 3, 3]} />
            <meshStandardMaterial color="#8f9ea3" />
        </mesh>
        {/* Substation */}
        <mesh position={[4, 2, 30]}>
            <boxGeometry args={[10, 4, 6]} />
            <meshStandardMaterial color="#c2c9cc" />
        </mesh>
        {/* Pipelines from factory to storage */}
        <mesh position={[27.5, 2.5, 5]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.3, 0.3, 20, 8]} />
            <meshStandardMaterial color={COLORS.steel} />
        </mesh>
        <mesh position={[27.5, 2.5, -5]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.25, 0.25, 20, 8]} />
            <meshStandardMaterial color={COLORS.steel} />
        </mesh>
    </group>
);

// ============== ADMIN BUILDING ==============
const AdminBuilding = () => (
    <mesh position={[-55, 1.6, -42]}>
        <boxGeometry args={[10, 3.2, 6]} />
        <meshStandardMaterial color="#d8d8d8" />
    </mesh>
);

// ============== FIRE HYDRANTS ==============
const FireHydrants = () => (
    <group>
        {[
            [38, 38], [38, -38], [-38, 38], [-38, -38]
        ].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.42, z]}>
                <cylinderGeometry args={[0.18, 0.18, 0.85, 8]} />
                <meshStandardMaterial color="#c8102e" />
            </mesh>
        ))}
    </group>
);

// ============== LABELS ==============
const Labels = () => (
    <group>
        <Html position={[0, 25, 0]} center>
            <div className="bg-gray-900/80 text-white px-3 py-1 rounded-lg text-sm font-bold whitespace-nowrap">
                H₂ Production Factory
            </div>
        </Html>
        <Html position={[-40, 50, 35]} center>
            <div className="bg-blue-900/80 text-cyan-400 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap">
                Wind Farm (5 Turbines)
            </div>
        </Html>
        <Html position={[55, 15, 0]} center>
            <div className="bg-gray-800/80 text-gray-300 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap">
                H₂ Storage Tanks
            </div>
        </Html>
        <Html position={[-50, 6, 0]} center>
            <div className="bg-green-900/80 text-green-400 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap">
                Battery Storage
            </div>
        </Html>
    </group>
);

// ============== MAIN SCENE ==============
const FactoryScene = () => (
    <>
        <ambientLight intensity={0.4} />
        <directionalLight
            position={[50, 80, 30]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
        />
        <pointLight position={[-30, 40, -20]} intensity={0.3} color="#fff5e6" />

        <Ground />
        <Roads />
        <Factory />
        <WindFarm />
        <StorageArea />
        <BatteryStorage />
        <SolarArrays />
        <LogisticsArea />
        <ElectricalInfra />
        <AdminBuilding />
        <FireHydrants />
        <Labels />

        <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={30}
            maxDistance={300}
            maxPolarAngle={Math.PI / 2.1}
        />
        <Environment preset="sunset" />
    </>
);

// ============== MAIN COMPONENT ==============
interface FactoryModel3DProps {
    className?: string;
    fullscreen?: boolean;
    onToggleFullscreen?: () => void;
}

const FactoryModel3D = ({ className = '', fullscreen = false, onToggleFullscreen }: FactoryModel3DProps) => {
    const [viewMode, setViewMode] = useState<'perspective' | 'top' | 'front'>('perspective');

    const getCameraPosition = (): [number, number, number] => {
        switch (viewMode) {
            case 'top': return [0, 150, 0];
            case 'front': return [0, 40, 120];
            default: return [80, 60, 80];
        }
    };

    return (
        <motion.div
            className={`relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden border border-slate-700/50 ${className}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* Controls */}
            <div className="absolute top-3 right-3 z-10 flex gap-2">
                <button
                    onClick={() => setViewMode('perspective')}
                    className={`p-2 rounded-lg text-xs font-medium transition-all ${viewMode === 'perspective'
                        ? 'bg-hydrogen-500 text-white'
                        : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700'
                        }`}
                >
                    3D
                </button>
                <button
                    onClick={() => setViewMode('top')}
                    className={`p-2 rounded-lg text-xs font-medium transition-all ${viewMode === 'top'
                        ? 'bg-hydrogen-500 text-white'
                        : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700'
                        }`}
                >
                    Top
                </button>
                <button
                    onClick={() => setViewMode('front')}
                    className={`p-2 rounded-lg text-xs font-medium transition-all ${viewMode === 'front'
                        ? 'bg-hydrogen-500 text-white'
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
                    <Eye className="w-4 h-4 text-hydrogen-400" />
                    Green H₂ Production Facility - 3D Model
                </h3>
                <p className="text-gray-500 text-xs mt-0.5">150m × 100m plot | AutoCAD/KCL Design</p>
            </div>

            {/* Legend */}
            <div className="absolute bottom-3 left-3 z-10 bg-gray-900/80 backdrop-blur-sm rounded-lg p-2 text-xs">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-[#b5b5b5]" /> Factory
                    </span>
                    <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-white" /> Wind
                    </span>
                    <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-[#1d3a6e]" /> Solar
                    </span>
                    <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-[#24c266]" /> Battery
                    </span>
                    <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-[#dfe3e6]" /> H₂ Tanks
                    </span>
                </div>
            </div>

            {/* Canvas */}
            <Canvas shadows>
                <Suspense fallback={null}>
                    <PerspectiveCamera
                        makeDefault
                        position={getCameraPosition()}
                        fov={50}
                    />
                    <FactoryScene />
                </Suspense>
            </Canvas>
        </motion.div>
    );
};

export default FactoryModel3D;
