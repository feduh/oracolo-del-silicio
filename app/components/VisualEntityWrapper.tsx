// app/components/VisualEntityWrapper.tsx
import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Points, PointMaterial } from "@react-three/drei";

export type ActivityState = "idle" | "processing" | "fetching_audio" | "speaking";

const highlightColor = '#2e8b57';
const neutralLightColor = '#FFFFFF';

interface VisualEntityWrapperProps {
activityState: ActivityState;
}


const PARTICLE_COUNT = 1500; // User preferred
const IDLE_RADIUS = 4.0;
const LERP_SPEED = 0.04; // Slightly adjusted from user's 0.05 for smoother transitions
const IDLE_SPEED_MULTIPLIER = 0.0007; // Slightly increased for more noticeable idle movement

// Loading Animation Parameters
const LOADING_CURVE_RADIUS_START = 1.0; // Starting radius of the spiral
const LOADING_CURVE_RADIUS_END = 0.1; // Radius it converges to
const LOADING_CURVE_ROTATION_SPEED = 0.8; // Increased for faster visual change
const LOADING_PARTICLE_SPEED_ALONG_CURVE = 1.2; // Increased for faster particle movement on curve
const LOADING_CURVE_FREQUENCY = 1.5; // User preferred - for a wider, single spiral feel
const LOADING_CURVE_HEIGHT_AMPLITUDE = 0.3; // Amplitude of Z-axis movement for the curve
const LOADING_SPIRAL_TURNS = 3; // How many turns the spiral makes as it forms

// Speaking Blob Parameters
const BLOB_RADIUS_BASE = 1.4; // User preferred (was 1.5, slight adjustment for stability)
const BLOB_RADIUS_VARIATION = 0.35; // Increased for more irregularity
const SPEAKING_PULSE_SPEED = 3.5; // Increased
const SPEAKING_PULSE_MAGNITUDE = 0.35; // Increased
const SPEAKING_SURFACE_NOISE_SPEED = 0.8; // Increased
const SPEAKING_SURFACE_NOISE_MAGNITUDE = 0.2; // Increased
const SPEAKING_LERP_MULTIPLIER = 1.8; // Slightly decreased for smoother blob formation

const BLOB_ROTATION_SPEED = 0.15;
const BLOB_DRIFT_SPEED = 0.015; // Reduced for more centered feel
const FETCHING_JITTER_STRENGTH = 0.01; // Reduced jitter for fetching, as processing has its own anim


function getRandomPointInSphere(radius: number): THREE.Vector3 {
let x, y, z, d2;
do {
x = (Math.random() * 2 - 1);
y = (Math.random() * 2 - 1);
z = (Math.random() * 2 - 1);
d2 = x*x + y*y + z*z;
} while (d2 > 1);
return new THREE.Vector3(x * radius, y * radius, z * radius);
}

function getRandomPointOnSphere(radius: number): THREE.Vector3 {
const u = Math.random();
const v = Math.random();
const theta = 2 * Math.PI * u;
const phi = Math.acos(2 * v - 1);
const sx = radius * Math.sin(phi) * Math.cos(theta);
const sy = radius * Math.sin(phi) * Math.sin(theta);
const sz = radius * Math.cos(phi);
return new THREE.Vector3(sx, sy, sz);
}

function simpleNoise3D(x: number, y: number, z: number, time: number, scale = 3.0) { // Increased scale for finer noise
return (Math.sin(x * scale + time * 1.2) + Math.cos(y * scale - time * 1.4) + Math.sin(z * scale + time * 0.9)) / 3;
}


const ParticleSystem: React.FC<{ activityState: ActivityState }> = ({ activityState }) => {
const pointsRef = useRef<THREE.Points>(null!);

const particlesData = useMemo(() => {
const data = [];
for (let i = 0; i < PARTICLE_COUNT; i++) {
const initialPos = getRandomPointInSphere(IDLE_RADIUS * 1.5);
data.push({
currentPosition: initialPos.clone(),
idleTargetPosition: getRandomPointInSphere(IDLE_RADIUS),
velocity: new THREE.Vector3(
(Math.random() - 0.5) * IDLE_SPEED_MULTIPLIER,
(Math.random() - 0.5) * IDLE_SPEED_MULTIPLIER,
(Math.random() - 0.5) * IDLE_SPEED_MULTIPLIER
),
speakingPhaseOffset: Math.random() * Math.PI * 2,
speakingRadiusFactor: BLOB_RADIUS_BASE + (Math.random() - 0.5) * BLOB_RADIUS_VARIATION,
originalIndex: i,
baseBlobDirection: getRandomPointOnSphere(1),
curveParameter: (i / PARTICLE_COUNT) * LOADING_SPIRAL_TURNS * 2 * Math.PI,
targetLerpFactor: Math.random() * 0.02 + 0.02
});
}
return data;
}, []);

const positions = useMemo(() => {
const posArray = new Float32Array(PARTICLE_COUNT * 3);
particlesData.forEach((p, i) => {
posArray[i * 3] = p.currentPosition.x;
posArray[i * 3 + 1] = p.currentPosition.y;
posArray[i * 3 + 2] = p.currentPosition.z;
});
return posArray;
}, [particlesData]);

useEffect(() => {
if (activityState === "idle") {
particlesData.forEach(p => {
p.idleTargetPosition.copy(getRandomPointInSphere(IDLE_RADIUS));
});
} else if (activityState === "processing" || activityState === "fetching_audio") {
particlesData.forEach((p, index) => {
p.curveParameter = (index / PARTICLE_COUNT) * LOADING_SPIRAL_TURNS * 2 * Math.PI + Math.random() * 0.1;
});
}
}, [activityState, particlesData]);

const blobCenterOffset = useMemo(() => new THREE.Vector3(), []);
const curveRotation = useMemo(() => new THREE.Euler(), []);


useFrame((state, delta) => {
if (!pointsRef.current) return;

const positionsAttribute = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
const time = state.clock.getElapsedTime();

if (activityState !== "idle") {
blobCenterOffset.x = Math.sin(time * BLOB_DRIFT_SPEED) * 0.02;
blobCenterOffset.y = Math.cos(time * BLOB_DRIFT_SPEED * 1.2) * 0.02;
}

if (activityState === "processing" || activityState === "fetching_audio") {
curveRotation.x += delta * LOADING_CURVE_ROTATION_SPEED * 0.2;
curveRotation.y += delta * LOADING_CURVE_ROTATION_SPEED * 0.3;
curveRotation.z += delta * LOADING_CURVE_ROTATION_SPEED * 0.1;
}


for (let i = 0; i < PARTICLE_COUNT; i++) {
const p = particlesData[i];
const targetPosition = new THREE.Vector3();
let currentLerpSpeed = p.targetLerpFactor;

if (activityState === "idle") {
p.currentPosition.lerp(p.idleTargetPosition, currentLerpSpeed * 0.5);
if (p.currentPosition.distanceTo(p.idleTargetPosition) < 0.5) {
p.idleTargetPosition.copy(getRandomPointInSphere(IDLE_RADIUS));
}
p.currentPosition.x += p.velocity.x * (1 + Math.sin(time * 0.2 + p.originalIndex * 0.1)) * (delta * 60);
p.currentPosition.y += p.velocity.y * (1 + Math.cos(time * 0.25 + p.originalIndex * 0.1)) * (delta * 60);
p.currentPosition.z += p.velocity.z * (1 + Math.sin(time * 0.3 + p.originalIndex * 0.1)) * (delta * 60);

if (p.currentPosition.lengthSq() > (IDLE_RADIUS * 1.3) ** 2) {
p.idleTargetPosition.copy(getRandomPointInSphere(IDLE_RADIUS * 0.6));
p.velocity.multiplyScalar(0.1);
}

} else if (activityState === "processing" || activityState === "fetching_audio") {
currentLerpSpeed = LERP_SPEED * (activityState === "fetching_audio" ? 1.5 : 1.2);
const t = p.curveParameter + time * LOADING_PARTICLE_SPEED_ALONG_CURVE;
const currentProcessingRadius = THREE.MathUtils.lerp(LOADING_CURVE_RADIUS_START, LOADING_CURVE_RADIUS_END, Math.min(1, (time * 0.2) % 1));


targetPosition.x = Math.cos(t * LOADING_CURVE_FREQUENCY) * currentProcessingRadius * (1 + Math.sin(t*0.5 + time) * 0.2) ;
targetPosition.y = Math.sin(t * LOADING_CURVE_FREQUENCY) * currentProcessingRadius * (1 + Math.cos(t*0.5 + time) * 0.2);
targetPosition.z = Math.sin(t * (LOADING_CURVE_FREQUENCY * 1.5)) * LOADING_CURVE_HEIGHT_AMPLITUDE * (currentProcessingRadius / LOADING_CURVE_RADIUS_START);

targetPosition.applyEuler(curveRotation);
targetPosition.add(blobCenterOffset);

if(activityState === "fetching_audio"){
targetPosition.x += (Math.random() - 0.5) * FETCHING_JITTER_STRENGTH;
targetPosition.y += (Math.random() - 0.5) * FETCHING_JITTER_STRENGTH;
}
p.currentPosition.lerp(targetPosition, currentLerpSpeed);

} else if (activityState === "speaking") {
currentLerpSpeed = LERP_SPEED * SPEAKING_LERP_MULTIPLIER;
const baseRadius = p.speakingRadiusFactor;
const pulse = Math.sin(time * SPEAKING_PULSE_SPEED + p.speakingPhaseOffset) * SPEAKING_PULSE_MAGNITUDE;
const noiseDisplacement = new THREE.Vector3();
const noiseTime = time * SPEAKING_SURFACE_NOISE_SPEED;
noiseDisplacement.x = simpleNoise3D(p.baseBlobDirection.x, p.baseBlobDirection.y, p.baseBlobDirection.z, noiseTime, 3.0) * SPEAKING_SURFACE_NOISE_MAGNITUDE;
noiseDisplacement.y = simpleNoise3D(p.baseBlobDirection.y, p.baseBlobDirection.z, p.baseBlobDirection.x, noiseTime * 1.1, 3.0) * SPEAKING_SURFACE_NOISE_MAGNITUDE;
noiseDisplacement.z = simpleNoise3D(p.baseBlobDirection.z, p.baseBlobDirection.x, p.baseBlobDirection.y, noiseTime * 1.2, 3.0) * SPEAKING_SURFACE_NOISE_MAGNITUDE;

const currentDynamicRadius = baseRadius + pulse;
targetPosition.copy(p.baseBlobDirection).multiplyScalar(currentDynamicRadius).add(noiseDisplacement).add(blobCenterOffset);
p.currentPosition.lerp(targetPosition, currentLerpSpeed);
}
positionsAttribute.setXYZ(i, p.currentPosition.x, p.currentPosition.y, p.currentPosition.z);
}
positionsAttribute.needsUpdate = true;

if (activityState !== "idle") {
pointsRef.current.rotation.x += delta * BLOB_ROTATION_SPEED * 0.3;
pointsRef.current.rotation.y += delta * BLOB_ROTATION_SPEED * 0.6;
pointsRef.current.rotation.z += delta * BLOB_ROTATION_SPEED * 0.1;
} else {
pointsRef.current.rotation.x = THREE.MathUtils.lerp(pointsRef.current.rotation.x, 0, 0.02);
pointsRef.current.rotation.y = THREE.MathUtils.lerp(pointsRef.current.rotation.y, 0, 0.02);
pointsRef.current.rotation.z = THREE.MathUtils.lerp(pointsRef.current.rotation.z, 0, 0.02);
}
});

return (
<Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
<PointMaterial
transparent
color={highlightColor} // ***** Colore particelle *****
size={activityState === "speaking" ? 0.035 : (activityState === "processing" || activityState === "fetching_audio" ? 0.03 : 0.022)}
sizeAttenuation={true}
depthWrite={false}
blending={THREE.AdditiveBlending}
opacity={activityState === "idle" ? 1 : (activityState === "processing" || activityState === "fetching_audio" ? 0.65 : 0.85)}
/>
</Points>
);
};




const VisualEntityWrapper: React.FC<VisualEntityWrapperProps> = ({ activityState }) => {
return (
<div className="absolute inset-0 z-0 pointer-events-none w-full h-full">
<Canvas
camera={{ position: [0, 0, 3.0], fov: 75 }}
style={{ background: 'transparent' }}
>
{/* Luci impostate per un contrasto e una tinta tematici */}
<ambientLight intensity={0.1} color={highlightColor} />
<directionalLight position={[1, 2, 2]} intensity={1} color={neutralLightColor} />
<ParticleSystem activityState={activityState} />
</Canvas>
</div>
);
};

export default VisualEntityWrapper;