import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const SplineBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Camera
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 5;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#1f0929');

        // Create animated particles
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 2000;
        const posArray = new Float32Array(particlesCount * 3);

        for (let i = 0; i < particlesCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 15;
        }

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.02,
            color: 0xffcc88,
            transparent: true,
            opacity: 0.6,
        });

        const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particlesMesh);

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(ambientLight);

        // Sunrise Light
        const sunlight = new THREE.DirectionalLight('#ffcc88', 0);
        sunlight.position.set(100, 200, 300);
        scene.add(sunlight);

        // Renderer
        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            antialias: true,
            alpha: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        // Resize Handler
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', handleResize);

        // Scroll Progress
        const getScrollProgress = () => {
            return Math.min(window.scrollY / (document.body.scrollHeight - window.innerHeight), 1);
        };

        // Animation Loop
        const animate = () => {
            const scrollProgress = getScrollProgress();

            // Rotate particles
            particlesMesh.rotation.x += 0.0003;
            particlesMesh.rotation.y += 0.0003;

            // Map scroll to sunlight intensity
            sunlight.intensity = scrollProgress * 2.0;

            // Change scene color based on scroll
            const baseColor = new THREE.Color('#1f0929');
            const sunriseColor = new THREE.Color('#ff8f3b');
            scene.background = baseColor.clone().lerp(sunriseColor, scrollProgress * 0.5);

            // Change particle color
            particlesMaterial.opacity = 0.6 + scrollProgress * 0.4;

            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        };

        animate();

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
            particlesGeometry.dispose();
            particlesMaterial.dispose();
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0"
            style={{ background: '#1f0929' }}
        />
    );
};

export default SplineBackground;
