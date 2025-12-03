import { useRef, useEffect } from "react";
import { Renderer, Program, Triangle, Mesh } from "ogl";
import "../styles/LightRays.css";

const hexToRgb = (hex: string): number[] => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m
        ? [
            parseInt(m[1], 16) / 255,
            parseInt(m[2], 16) / 255,
            parseInt(m[3], 16) / 255,
        ]
        : [1, 1, 1];
};

interface LightRaysProps {
    raysOrigin?: string;
    raysColor?: string;
    raysSpeed?: number;
    lightSpread?: number;
    rayLength?: number;
    followMouse?: boolean;
    mouseInfluence?: number;
    noiseAmount?: number;
    distortion?: number;
    className?: string;
    numRays?: number;
}

const LightRays: React.FC<LightRaysProps> = ({
    raysOrigin = "top-center",
    raysColor = "#00ffff",
    raysSpeed = 1.5,
    lightSpread = 0.8,
    rayLength = 1.2,
    followMouse = true,
    mouseInfluence = 0.15,
    noiseAmount = 0.1,
    distortion = 0.05,
    className = "",
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<Renderer | null>(null);
    const uniformsRef = useRef<any>(null);
    const animationRef = useRef<number | null>(null);
    const mouseRef = useRef({ x: 0.5, y: 0.0 });

    // Parse raysOrigin to get position
    const getOriginPosition = (origin: string): [number, number] => {
        if (origin === "top-center") return [0.5, -0.05]; // Higher up, slightly above viewport
        if (origin === "center") return [0.5, 0.5];
        if (origin === "bottom-center") return [0.5, 1.0];
        return [0.5, -0.05];
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 2), alpha: true });
        rendererRef.current = renderer;
        const gl = renderer.gl;
        container.appendChild(gl.canvas);
        gl.canvas.style.width = "100%";
        gl.canvas.style.height = "100%";

        const vert = `
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

        const frag = `
      precision highp float;
      uniform float iTime;
      uniform vec2 iResolution;
      uniform vec2 iMouse;
      uniform vec2 iOrigin;
      uniform vec3 raysColor;
      uniform float raysSpeed;
      uniform float lightSpread;
      uniform float rayLength;
      uniform float noiseAmount;
      uniform float mouseInfluence;
      uniform float distortion;
      varying vec2 vUv;

      float noise(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      void main() {
        vec2 uv = vUv;
        vec2 aspectCorrection = vec2(iResolution.x / iResolution.y, 1.0);
        
        // Dynamic origin influenced by mouse
        vec2 origin = iOrigin + vec2(
          (iMouse.x - 0.5) * mouseInfluence,
          (iMouse.y - iOrigin.y) * mouseInfluence * 0.3
        );
        
        // Calculate direction from origin with aspect ratio correction
        vec2 dir = (uv - origin) * aspectCorrection;
        float dist = length(dir);
        float angle = atan(dir.y, dir.x);
        
        // Create 100 rays - balanced density
        float numRays = 100.0;
        
        // Convert angle to ray index
        float rayIndex = angle * numRays / 6.28318;
        
        // Create medium-thin, intense lines with chromatic aberration for rainbow effect
        float rayPattern = fract(rayIndex);
        
        // Main ray pattern (40% thinner than previous)
        float mainRay = smoothstep(0.458, 0.5, rayPattern) - smoothstep(0.5, 0.542, rayPattern);
        
        // Chromatic aberration - offset for RGB channels (rainbow effect)
        float offsetAmount = 0.007; // Enhanced rainbow spread
        
        // Red channel - slightly behind
        float rayIndexR = (angle - offsetAmount) * numRays / 6.28318;
        float rayPatternR = fract(rayIndexR);
        float redRay = smoothstep(0.458, 0.5, rayPatternR) - smoothstep(0.5, 0.542, rayPatternR);
        
        // Green channel - center (same as main)
        float greenRay = mainRay;
        
        // Blue channel - slightly ahead
        float rayIndexB = (angle + offsetAmount) * numRays / 6.28318;
        float rayPatternB = fract(rayIndexB);
        float blueRay = smoothstep(0.458, 0.5, rayPatternB) - smoothstep(0.5, 0.542, rayPatternB);
        
        // Add slow rotation animation
        float rotation = iTime * raysSpeed * 0.05;
        float animatedAngle = angle + rotation;
        float animatedRayIndex = animatedAngle * numRays / 6.28318;
        float animatedPattern = fract(animatedRayIndex);
        animatedPattern = smoothstep(0.458, 0.5, animatedPattern) - smoothstep(0.5, 0.542, animatedPattern);
        
        // Blend static and animated patterns
        rayPattern = mix(mainRay, animatedPattern, 0.3);
        redRay = mix(redRay, animatedPattern, 0.3);
        greenRay = mix(greenRay, animatedPattern, 0.3);
        blueRay = mix(blueRay, animatedPattern, 0.3);
        
        // Add subtle noise variation
        float n = noise(vec2(angle * 20.0, dist * 3.0));
        rayPattern *= (0.7 + n * noiseAmount * 3.0);
        redRay *= (0.7 + n * noiseAmount * 3.0);
        greenRay *= (0.7 + n * noiseAmount * 3.0);
        blueRay *= (0.7 + n * noiseAmount * 3.0);
        
        // Distance falloff
        float distanceFade = 1.0 - smoothstep(0.0, rayLength * 1.5, dist);
        distanceFade = pow(distanceFade, lightSpread);
        
        // Smaller, dimmer glow at origin
        float originGlow = exp(-dist * 25.0) * 0.6;
        
        // Combine everything with high intensity for bright thin rays
        float intensityR = redRay * distanceFade * 2.2 + originGlow; // 2.2x brighter
        float intensityG = greenRay * distanceFade * 2.2 + originGlow;
        float intensityB = blueRay * distanceFade * 2.2 + originGlow;
        
        // Add subtle wave distortion
        float wave = sin(dist * 30.0 - iTime * 2.0) * distortion * 0.02;
        intensityR += wave;
        intensityG += wave;
        intensityB += wave;
        
        // Color with chromatic aberration (rainbow dispersion)
        vec3 color = vec3(
          raysColor.r * intensityR,
          raysColor.g * intensityG,
          raysColor.b * intensityB
        );
        
        // Alpha
        float avgIntensity = (intensityR + intensityG + intensityB) / 3.0;
        float alpha = distanceFade * (0.3 + avgIntensity * 0.7);
        
        gl_FragColor = vec4(color, alpha);
      }
    `;

        const originPos = getOriginPosition(raysOrigin);
        const uniforms = {
            iTime: { value: 0 },
            iResolution: { value: [window.innerWidth, window.innerHeight] },
            iMouse: { value: [0.5, 0.0] },
            iOrigin: { value: originPos },
            raysColor: { value: hexToRgb(raysColor) },
            raysSpeed: { value: raysSpeed },
            lightSpread: { value: lightSpread },
            rayLength: { value: rayLength },
            noiseAmount: { value: noiseAmount },
            mouseInfluence: { value: mouseInfluence },
            distortion: { value: distortion },
        };
        uniformsRef.current = uniforms;

        const geometry = new Triangle(gl);
        const program = new Program(gl, { vertex: vert, fragment: frag, uniforms });
        const mesh = new Mesh(gl, { geometry, program });

        const resize = () => {
            renderer.setSize(container.clientWidth, container.clientHeight);
            uniforms.iResolution.value = [container.clientWidth, container.clientHeight];
        };
        resize();
        window.addEventListener("resize", resize);

        // Mouse tracking
        const handleMouseMove = (e: MouseEvent) => {
            if (!followMouse) return;
            const rect = container.getBoundingClientRect();
            mouseRef.current = {
                x: (e.clientX - rect.left) / rect.width,
                y: (e.clientY - rect.top) / rect.height,
            };
        };

        if (followMouse) {
            window.addEventListener("mousemove", handleMouseMove);
        }

        const update = (t: number) => {
            uniforms.iTime.value = t * 0.001;

            // Smooth mouse interpolation
            if (followMouse) {
                uniforms.iMouse.value[0] += (mouseRef.current.x - uniforms.iMouse.value[0]) * 0.08;
                uniforms.iMouse.value[1] += (mouseRef.current.y - uniforms.iMouse.value[1]) * 0.08;
            }

            renderer.render({ scene: mesh });
            animationRef.current = requestAnimationFrame(update);
        };
        animationRef.current = requestAnimationFrame(update);

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            window.removeEventListener("resize", resize);
            if (followMouse) {
                window.removeEventListener("mousemove", handleMouseMove);
            }
            renderer.gl.getExtension("WEBGL_lose_context")?.loseContext();
            if (container.contains(gl.canvas)) {
                container.removeChild(gl.canvas);
            }
        };
    }, [raysOrigin, raysColor, raysSpeed, lightSpread, rayLength, noiseAmount, followMouse, mouseInfluence, distortion]);

    return <div ref={containerRef} className={`light-rays-container ${className}`} />;
};

export default LightRays;
