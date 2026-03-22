import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { parseAlgorithm } from "@/lib/cube-visualizer";

interface ThreeCubePlayerProps {
  scramble: string;
  solutionAlgorithm: string;
  targetStep: number;
  className?: string;
}

type Axis = "x" | "y" | "z";

type CubieState = {
  mesh: THREE.Mesh;
  homeX: number;
  homeY: number;
  homeZ: number;
  x: number;
  y: number;
  z: number;
};

type MoveConfig = {
  axis: Axis;
  layer: -1 | 0 | 1;
  baseSign: 1 | -1;
};

type ActiveAnimation = {
  rotator: THREE.Group;
  axis: Axis;
  axisVector: THREE.Vector3;
  selected: CubieState[];
  startAt: number;
  durationMs: number;
  angle: number;
  stepDelta: 1 | -1;
};

const SPACING = 1.04;
const CUBIE_SIZE = 0.94;

const FACE_COLORS = {
  U: 0xfacc15,
  D: 0xf8fafc,
  F: 0xef4444,
  B: 0xf97316,
  R: 0x3b82f6,
  L: 0x22c55e,
  internal: 0x111827,
};

const MOVE_MAP: Record<string, MoveConfig> = {
  R: { axis: "x", layer: 1, baseSign: -1 },
  L: { axis: "x", layer: -1, baseSign: 1 },
  U: { axis: "y", layer: 1, baseSign: -1 },
  D: { axis: "y", layer: -1, baseSign: 1 },
  F: { axis: "z", layer: 1, baseSign: -1 },
  B: { axis: "z", layer: -1, baseSign: 1 },
};

const AXIS_VECTORS: Record<Axis, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function createCubieMaterials(x: number, y: number, z: number) {
  return [
    new THREE.MeshStandardMaterial({
      color: x === 1 ? FACE_COLORS.R : FACE_COLORS.internal,
      roughness: 0.42,
      metalness: 0.04,
    }),
    new THREE.MeshStandardMaterial({
      color: x === -1 ? FACE_COLORS.L : FACE_COLORS.internal,
      roughness: 0.42,
      metalness: 0.04,
    }),
    new THREE.MeshStandardMaterial({
      color: y === 1 ? FACE_COLORS.U : FACE_COLORS.internal,
      roughness: 0.42,
      metalness: 0.04,
    }),
    new THREE.MeshStandardMaterial({
      color: y === -1 ? FACE_COLORS.D : FACE_COLORS.internal,
      roughness: 0.42,
      metalness: 0.04,
    }),
    new THREE.MeshStandardMaterial({
      color: z === 1 ? FACE_COLORS.F : FACE_COLORS.internal,
      roughness: 0.42,
      metalness: 0.04,
    }),
    new THREE.MeshStandardMaterial({
      color: z === -1 ? FACE_COLORS.B : FACE_COLORS.internal,
      roughness: 0.42,
      metalness: 0.04,
    }),
  ];
}

function parseMoveToken(token: string): {
  axis: Axis;
  layer: -1 | 0 | 1;
  axisVector: THREE.Vector3;
  angle: number;
  turns: number;
} | null {
  const trimmed = token.trim().toUpperCase();
  if (!trimmed) return null;

  const base = MOVE_MAP[trimmed[0]];
  if (!base) return null;

  const isPrime = trimmed.includes("'");
  const turns = trimmed.includes("2") ? 2 : 1;
  const sign = isPrime ? -base.baseSign : base.baseSign;
  const angle = sign * turns * (Math.PI / 2);

  return {
    axis: base.axis,
    layer: base.layer,
    axisVector: AXIS_VECTORS[base.axis],
    angle,
    turns,
  };
}

function inverseMove(token: string) {
  const trimmed = token.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes("2")) return trimmed;
  return trimmed.includes("'") ? trimmed.replace("'", "") : `${trimmed}'`;
}

const ThreeCubePlayer = ({
  scramble,
  solutionAlgorithm,
  targetStep,
  className,
}: ThreeCubePlayerProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cubeGroupRef = useRef<THREE.Group | null>(null);
  const cubiesRef = useRef<CubieState[]>([]);
  const activeAnimationRef = useRef<ActiveAnimation | null>(null);
  const requestedTargetStepRef = useRef(0);
  const currentStepRef = useRef(0);
  const rafRef = useRef<number>(0);

  const scrambleMoves = useMemo(() => parseAlgorithm(scramble), [scramble]);
  const solutionMoves = useMemo(
    () => parseAlgorithm(solutionAlgorithm),
    [solutionAlgorithm]
  );

  useEffect(() => {
    requestedTargetStepRef.current = Math.max(
      0,
      Math.min(targetStep, solutionMoves.length)
    );
  }, [solutionMoves.length, targetStep]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x131a24);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      32,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      100
    );
    camera.position.set(6.2, 6.1, 7.2);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, Math.max(container.clientHeight, 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(5, 8, 6);
    key.castShadow = true;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x60a5fa, 0.35);
    fill.position.set(-6, 3, -4);
    scene.add(fill);

    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambient);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(8, 64),
      new THREE.MeshBasicMaterial({
        color: 0x0f172a,
        transparent: true,
        opacity: 0.35,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.35;
    scene.add(floor);

    const cubeGroup = new THREE.Group();
    cubeGroupRef.current = cubeGroup;
    scene.add(cubeGroup);

    const geometry = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);
    const cubies: CubieState[] = [];

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const mesh = new THREE.Mesh(geometry, createCubieMaterials(x, y, z));
          mesh.position.set(x * SPACING, y * SPACING, z * SPACING);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          cubeGroup.add(mesh);
          cubies.push({ mesh, homeX: x, homeY: y, homeZ: z, x, y, z });
        }
      }
    }

    cubiesRef.current = cubies;

    const rotateCubies = (token: string, animate = true, stepDelta: 1 | -1 = 1) => {
      const cubeGroupObj = cubeGroupRef.current;
      const cubieState = cubiesRef.current;
      if (!cubeGroupObj || cubieState.length === 0) return;

      const parsed = parseMoveToken(token);
      if (!parsed) return;

      const { axis, layer, axisVector, angle, turns } = parsed;
      const selected = cubieState.filter((cubie) => cubie[axis] === layer);
      if (selected.length === 0) return;

      if (!animate) {
        const quaternion = new THREE.Quaternion().setFromAxisAngle(axisVector, angle);

        selected.forEach((cubie) => {
          cubie.mesh.applyQuaternion(quaternion);

          const next = new THREE.Vector3(cubie.x, cubie.y, cubie.z).applyAxisAngle(
            axisVector,
            angle
          );

          cubie.x = Math.round(next.x);
          cubie.y = Math.round(next.y);
          cubie.z = Math.round(next.z);
          cubie.mesh.position.set(
            cubie.x * SPACING,
            cubie.y * SPACING,
            cubie.z * SPACING
          );
        });
        return;
      }

      const rotator = new THREE.Group();
      cubeGroupObj.add(rotator);
      selected.forEach((cubie) => rotator.attach(cubie.mesh));

      activeAnimationRef.current = {
        rotator,
        axis,
        axisVector: axisVector.clone(),
        selected,
        startAt: performance.now(),
        durationMs: turns === 2 ? 340 : 220,
        angle,
        stepDelta,
      };
    };

    const syncToRequestedStep = () => {
      if (activeAnimationRef.current) return;

      const target = requestedTargetStepRef.current;
      const current = currentStepRef.current;

      if (current === target) return;

      if (current < target) {
        const nextMove = solutionMoves[current];
        if (!nextMove) return;
        rotateCubies(nextMove, true, 1);
        return;
      }

      const previousMove = solutionMoves[current - 1];
      if (!previousMove) return;
      rotateCubies(inverseMove(previousMove), true, -1);
    };

    const rebuildCube = () => {
      const items = cubiesRef.current;
      if (items.length === 0) return;

      // Reset transform/orientation to solved physical cube.
      items.forEach((cubie) => {
        cubie.x = cubie.homeX;
        cubie.y = cubie.homeY;
        cubie.z = cubie.homeZ;
        cubie.mesh.rotation.set(0, 0, 0);
        cubie.mesh.quaternion.identity();
        cubie.mesh.position.set(cubie.x * SPACING, cubie.y * SPACING, cubie.z * SPACING);
      });

      activeAnimationRef.current = null;
      currentStepRef.current = 0;
      requestedTargetStepRef.current = Math.max(
        0,
        Math.min(requestedTargetStepRef.current, solutionMoves.length)
      );

      scrambleMoves.forEach((move) => rotateCubies(move, false));
      syncToRequestedStep();
    };

    rebuildCube();

    const resizeObserver = new ResizeObserver(() => {
      const activeRenderer = rendererRef.current;
      const activeCamera = cameraRef.current;
      const host = containerRef.current;
      if (!activeRenderer || !activeCamera || !host) return;

      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      activeRenderer.setSize(width, height);
      activeCamera.aspect = width / height;
      activeCamera.updateProjectionMatrix();
    });
    resizeObserver.observe(container);

    const renderFrame = () => {
      const animation = activeAnimationRef.current;

      if (animation) {
        const elapsed = performance.now() - animation.startAt;
        const progress = Math.min(1, elapsed / animation.durationMs);
        const eased = easeInOutCubic(progress);
        animation.rotator.rotation[animation.axis] = animation.angle * eased;

        if (progress >= 1) {
          const cubeGroupObj = cubeGroupRef.current;
          if (cubeGroupObj) {
            animation.selected.forEach((cubie) => cubeGroupObj.attach(cubie.mesh));
            cubeGroupObj.remove(animation.rotator);

            animation.selected.forEach((cubie) => {
              const rotated = new THREE.Vector3(cubie.x, cubie.y, cubie.z).applyAxisAngle(
                animation.axisVector,
                animation.angle
              );
              cubie.x = Math.round(rotated.x);
              cubie.y = Math.round(rotated.y);
              cubie.z = Math.round(rotated.z);
              cubie.mesh.position.set(
                cubie.x * SPACING,
                cubie.y * SPACING,
                cubie.z * SPACING
              );
            });
          }

          currentStepRef.current = Math.max(
            0,
            Math.min(solutionMoves.length, currentStepRef.current + animation.stepDelta)
          );
          activeAnimationRef.current = null;
          syncToRequestedStep();
        }
      }

      const activeRenderer = rendererRef.current;
      const activeScene = sceneRef.current;
      const activeCamera = cameraRef.current;
      if (activeRenderer && activeScene && activeCamera) {
        activeRenderer.render(activeScene, activeCamera);
      }

      rafRef.current = requestAnimationFrame(renderFrame);
    };

    rafRef.current = requestAnimationFrame(renderFrame);

    const syncHandle = window.setInterval(syncToRequestedStep, 24);

    return () => {
      window.clearInterval(syncHandle);
      cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();

      renderer.dispose();
      geometry.dispose();
      cubiesRef.current.forEach((cubie) => {
        const materials = Array.isArray(cubie.mesh.material)
          ? cubie.mesh.material
          : [cubie.mesh.material];
        materials.forEach((material) => material.dispose());
      });
      scene.clear();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      cubeGroupRef.current = null;
      cubiesRef.current = [];
      activeAnimationRef.current = null;
    };
  }, [scrambleMoves, solutionMoves]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-[320px] w-full overflow-hidden rounded-xl border border-border bg-[#101827]",
        className
      )}
    />
  );
};

export default ThreeCubePlayer;
