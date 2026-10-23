import * as THREE from "three";

export type ArenaSceneController = {
  resize: (width: number, height: number) => void;
  setRunning: (running: boolean) => void;
  setPointer: (x: number, y: number) => void;
  dispose: () => void;
};

/** Local procedural artwork: no model downloads, textures, controls or postprocessing. */
export function createArenaScene(
  canvas: HTMLCanvasElement,
): ArenaSceneController {
  const context = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  if (!context) throw new Error("WebGL2 is unavailable; keep the poster visible.");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30);
  const stage = new THREE.Group();
  scene.add(stage);
  let frame = 0;
  let last = 0;
  let time = 0;
  let running = false;
  let disposed = false;
  let pointerX = 0;
  let pointerY = 0;
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const lights: THREE.DirectionalLight[] = [];

  const geometry = <T extends THREE.BufferGeometry>(value: T): T => {
    geometries.add(value);
    return value;
  };
  const material = <T extends THREE.Material>(value: T): T => {
    materials.add(value);
    return value;
  };
  const mesh = (
    shape: THREE.BufferGeometry,
    surface: THREE.Material,
    parent: THREE.Object3D = stage,
  ) => {
    const object = new THREE.Mesh(geometry(shape), surface);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    running = false;
    cancelAnimationFrame(frame);
    geometries.forEach((item) => item.dispose());
    materials.forEach((item) => item.dispose());
    lights.forEach((light) => light.shadow.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
  };

  try {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    camera.position.set(0, 2.1, 7.7);
    camera.lookAt(0, -0.15, 0);
    scene.add(new THREE.HemisphereLight(0xf7ffe5, 0x526b5e, 2.4));
    const key = new THREE.DirectionalLight(0xfff7db, 3.2);
    key.position.set(-3, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -4;
    key.shadow.normalBias = 0.025;
    scene.add(key);
    lights.push(key);
    const rim = new THREE.DirectionalLight(0xd5f65b, 1.5);
    rim.position.set(4, 3, -3);
    scene.add(rim);
    lights.push(rim);

    const carbon = material(
      new THREE.MeshStandardMaterial({
        color: 0x16302c,
        metalness: 0.35,
        roughness: 0.3,
      }),
    );
    const lime = material(
      new THREE.MeshStandardMaterial({
        color: 0xd5f65b,
        metalness: 0.18,
        roughness: 0.35,
      }),
    );
    const grip = material(
      new THREE.MeshStandardMaterial({ color: 0x152321, roughness: 0.8 }),
    );
    const white = material(
      new THREE.MeshStandardMaterial({
        color: 0xfffdf2,
        roughness: 0.65,
        side: THREE.DoubleSide,
      }),
    );
    const courtSurface = material(
      new THREE.MeshStandardMaterial({ color: 0x294a42, roughness: 0.85 }),
    );
    const courtEdge = material(
      new THREE.MeshStandardMaterial({ color: 0x142d29, roughness: 0.55 }),
    );
    const courtLines = material(
      new THREE.MeshStandardMaterial({ color: 0xdce8c5, roughness: 0.9 }),
    );
    const lines = material(
      new THREE.LineBasicMaterial({
        color: 0xb9d3bb,
        transparent: true,
        opacity: 0.7,
      }),
    );
    const stems = material(new THREE.LineBasicMaterial({ color: 0x93a78c }));

    // A raised miniature court anchors the objects and receives their shadows.
    const court = new THREE.Group();
    court.position.set(0, -1.88, 0);
    court.rotation.y = -0.15;
    stage.add(court);
    mesh(new THREE.BoxGeometry(4.6, 0.16, 2.65), courtEdge, court);
    mesh(
      new THREE.BoxGeometry(4.5, 0.04, 2.55),
      courtSurface,
      court,
    ).position.y = 0.1;
    const stripe = (width: number, depth: number, x: number, z: number) => {
      const line = mesh(
        new THREE.BoxGeometry(width, 0.008, depth),
        courtLines,
        court,
      );
      line.position.set(x, 0.128, z);
      line.castShadow = false;
    };
    for (const z of [-1.12, 1.12, -0.86, 0.86]) stripe(4.15, 0.018, 0, z);
    for (const x of [-2.07, 2.07, -1.7, 1.7, -0.55, 0.55, 0])
      stripe(0.018, 2.25, x, 0);
    stripe(1.52, 0.018, -1.31, 0);
    stripe(1.52, 0.018, 1.31, 0);

    const racket = new THREE.Group();
    racket.position.set(-0.64, 0.48, 0.3);
    racket.rotation.set(-0.12, -0.23, -0.48);
    racket.scale.setScalar(0.91);
    stage.add(racket);
    const hoop = mesh(
      new THREE.TorusGeometry(0.77, 0.052, 12, 80),
      carbon,
      racket,
    );
    hoop.scale.y = 1.27;
    hoop.position.y = 0.65;
    const inlay = mesh(
      new THREE.TorusGeometry(0.77, 0.021, 8, 80),
      lime,
      racket,
    );
    inlay.scale.y = 1.27;
    inlay.position.set(0, 0.65, 0.043);
    const stringPoints: number[] = [];
    for (let i = -5; i <= 5; i++) {
      const x = i * 0.128;
      const extentY = 0.91 * Math.sqrt(1 - (x / 0.72) ** 2);
      stringPoints.push(x, 0.65 - extentY, 0, x, 0.65 + extentY, 0);
      const y = i * 0.16;
      const extentX = 0.72 * Math.sqrt(1 - (y / 0.91) ** 2);
      stringPoints.push(-extentX, 0.65 + y, 0, extentX, 0.65 + y, 0);
    }
    const strings = geometry(new THREE.BufferGeometry());
    strings.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(stringPoints, 3),
    );
    racket.add(new THREE.LineSegments(strings, lines));
    mesh(
      new THREE.CylinderGeometry(0.026, 0.026, 1.25, 12),
      carbon,
      racket,
    ).position.y = -0.94;
    mesh(
      new THREE.CylinderGeometry(0.053, 0.027, 0.2, 12),
      lime,
      racket,
    ).position.y = -0.34;
    mesh(
      new THREE.CylinderGeometry(0.07, 0.087, 0.7, 16),
      grip,
      racket,
    ).position.y = -1.91;
    for (let i = 0; i < 9; i++) {
      const band = mesh(
        new THREE.TorusGeometry(0.074 + i * 0.0012, 0.006, 4, 16),
        carbon,
        racket,
      );
      band.rotation.x = Math.PI / 2;
      band.position.y = -1.62 - i * 0.071;
    }
    mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.04, 16),
      lime,
      racket,
    ).position.y = -2.28;

    const shuttle = new THREE.Group();
    shuttle.position.set(1.1, 0.05, 0.6);
    shuttle.rotation.set(0.12, 0.35, -0.62);
    stage.add(shuttle);
    mesh(new THREE.SphereGeometry(0.205, 24, 16), white, shuttle).scale.y = 1.2;
    mesh(
      new THREE.CylinderGeometry(0.21, 0.19, 0.085, 24),
      lime,
      shuttle,
    ).position.y = 0.15;
    // Individual curved feather vanes, with a thin visible spine and an open crown.
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const points: number[] = [];
      const indices: number[] = [];
      const spine: THREE.Vector3[] = [
        new THREE.Vector3(Math.cos(angle) * 0.17, 0.14, Math.sin(angle) * 0.17),
      ];
      for (let row = 0; row <= 10; row++) {
        const t = row / 10;
        const radius = 0.25 + t * 0.42 - t * t * 0.025;
        const y = 0.32 + t * 1.02;
        const halfWidth = 0.115 * Math.pow(Math.sin(Math.PI * t), 0.45);
        spine.push(
          new THREE.Vector3(
            Math.cos(angle) * radius,
            y,
            Math.sin(angle) * radius,
          ),
        );
        for (let column = -1; column <= 1; column++) {
          const offset = halfWidth * column;
          const curve = column === 0 ? 0.012 : 0;
          points.push(
            Math.cos(angle) * (radius + curve) - Math.sin(angle) * offset,
            y,
            Math.sin(angle) * (radius + curve) + Math.cos(angle) * offset,
          );
        }
        if (row < 10)
          for (let column = 0; column < 2; column++) {
            const a = row * 3 + column;
            indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
          }
      }
      const feather = new THREE.BufferGeometry();
      feather.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(points, 3),
      );
      feather.setIndex(indices);
      feather.computeVertexNormals();
      mesh(feather, white, shuttle);
      shuttle.add(
        new THREE.Line(
          geometry(new THREE.BufferGeometry().setFromPoints(spine)),
          stems,
        ),
      );
    }
    const binding = mesh(
      new THREE.TorusGeometry(0.34, 0.009, 6, 48),
      white,
      shuttle,
    );
    binding.rotation.x = Math.PI / 2;
    binding.position.y = 0.54;

    const draw = () => {
      if (!disposed) renderer.render(scene, camera);
    };
    const tick = (now: number) => {
      if (!running || disposed) return;
      frame = requestAnimationFrame(tick);
      if (now - last < 1000 / 30) return;
      time += Math.min((now - last) / 1000, 0.05);
      last = now;
      stage.rotation.y = THREE.MathUtils.lerp(
        stage.rotation.y,
        pointerX * 0.13,
        0.08,
      );
      stage.rotation.x = THREE.MathUtils.lerp(
        stage.rotation.x,
        pointerY * 0.045,
        0.08,
      );
      racket.position.y = 0.48 + Math.sin(time * 0.9) * 0.055;
      racket.rotation.y = -0.23 + Math.sin(time * 0.55) * 0.045;
      shuttle.position.y = 0.05 + Math.sin(time * 1.05 + 0.6) * 0.09;
      shuttle.rotation.y = 0.35 + Math.sin(time * 0.65) * 0.17;
      draw();
    };
    return {
      resize(width, height) {
        if (disposed || !width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.position.z = camera.aspect < 1.1 ? 8.8 : 7.7;
        camera.lookAt(0, -0.15, 0);
        camera.updateProjectionMatrix();
        draw();
      },
      setRunning(value) {
        if (disposed || value === running) return;
        running = value;
        cancelAnimationFrame(frame);
        if (running) {
          last = performance.now();
          frame = requestAnimationFrame(tick);
        }
      },
      setPointer(x, y) {
        pointerX = Math.max(-1, Math.min(1, x));
        pointerY = Math.max(-1, Math.min(1, y));
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
