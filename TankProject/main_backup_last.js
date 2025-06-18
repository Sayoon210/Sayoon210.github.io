import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';

// --- Scene, Camera, Renderer Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// 렌더러 크기를 창의 전체 너비와 높이로 설정
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Renderer Gamma/Color Space Settings (필수!)
renderer.outputColorSpace = THREE.SRGBColorSpace; // Three.js r152+ 권장

// --- Scene Background to Light Gray ---
scene.background = new THREE.Color(0xdddddd); // 밝은 회색 배경

// --- OrbitControls Setup ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
camera.position.set(0, 10, 15); // 카메라 초기 위치 설정
controls.target.set(0, 0, 0); // 카메라가 바라볼 지점 설정
controls.update();
// controls.enabled = false; // 게임 플레이 시 OrbitControls를 비활성화할 수 있습니다.

// --- Lighting ---
// *** 추가: 기본 광원 설정 (장면을 밝히기 위함) ***
const ambientLight = new THREE.AmbientLight(0xffffff, 3.0); // 전체적인 환경광 (강도 3.0으로 조정)
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 10.0); // 주된 광원 (강도 10.0으로 조정)
directionalLight.position.set(5, 5, 5).normalize(); // 위치 설정 및 정규화
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xffffff, 1.5, 100); // 특정 지점을 밝히는 광원
pointLight.position.set(0, 5, 0);
scene.add(pointLight);
// *** 광원 설정 끝 ***

// --- Rapier Physics World Initialization Variables ---
let world;
let tankRigidBody = null;
let tankMesh = null;
let groundMesh = null; // 단순 직육면체 바닥 메쉬
let groundRigidBody = null; // 단순 직육면체 바닥의 RigidBody

// 로딩 상태를 추적하기 위한 플래그 (이제 맵 GLB 로딩은 없어졌으므로 탱크만 필요)
let tankModelLoaded = false;

// --- Rapier Debug Renderer Setup ---
let rapierDebugMesh = null; // 디버그 렌더링을 위한 메쉬

// --- Keyboard Input State ---
const keys = {
    w: false, s: false, a: false, d: false, q: false, e: false,
    r: false, f: false, // R, F 키 상태 추가
    space: false // 스페이스바 상태 추가
};

// Keyboard Event Listeners
window.addEventListener('keydown', (event) => {
    if (event.key === 'w' || event.key === 'W') keys.w = true;
    if (event.key === 's' || event.key === 'S') keys.s = true;
    if (event.key === 'a' || event.key === 'A') keys.a = true;
    if (event.key === 'd' || event.key === 'D') keys.d = true;
    if (event.key === 'q' || event.key === 'Q') keys.q = true;
    if (event.key === 'e' || event.key === 'E') keys.e = true;
    if (event.key === 'r' || event.key === 'R') keys.r = true; // R 키 추가
    if (event.key === 'f' || event.key === 'F') keys.f = true; // F 키 추가
    if (event.code === 'Space') keys.space = true; // 스페이스바 추가
});

window.addEventListener('keyup', (event) => {
    if (event.key === 'w' || event.key === 'W') keys.w = false;
    if (event.key === 's' || event.key === 'S') keys.s = false;
    if (event.key === 'a' || event.key === 'A') keys.a = false;
    if (event.key === 'd' || event.key === 'D') keys.d = false;
    if (event.key === 'q' || event.key === 'Q') keys.q = false;
    if (event.key === 'e' || event.key === 'E') keys.e = false;
    if (event.key === 'r' || event.key === 'R') keys.r = false; // R 키 추가
    if (event.key === 'f' || event.key === 'F') keys.f = false; // F 키 추가
    if (event.code === 'Space') keys.space = false; // 스페이스바 추가
});

// Wheel Mesh Arrays (전역 선언)
let L_wheel_front_meshes = [];
let L_wheel_rear_meshes = [];
let R_wheel_front_meshes = [];
let R_wheel_rear_meshes = [];
let potapMesh = null;
let poshinRotateCore = null; // PoshinRotateCore 메쉬 참조 변수 추가
let poshinBig = null; // PoshinBig 메쉬 참조 변수 추가

// --- Camera Follow Variables ---
const cameraPotapOffset = new THREE.Vector3(12, 3, 0); // Potap 기준 카메라 오프셋
const cameraLookAtOffset = new THREE.Vector3(-10, 0, 0); // Potap 기준 카메라가 바라볼 지점 오프셋
const cameraSmoothFactor = 0.5; // 카메라 이동 부드럽게 하는 계수

// --- Raycasting Variables ---
let raycaster = null;
let raycastLine = null;
let raycastActive = false;
const raycastDuration = 10; // Raycast 선이 유지될 시간 (밀리초)
let raycastTimer = 0;
let lastSpacePressTime = 0; // 마지막 스페이스바 누른 시간
const raycastCooldown = 200; // Raycast 쿨다운 시간 (밀리초)


// --- Refactored Wheel Rotation Function ---
function rotateWheels(wheelMeshes, speed, factor, isForward, flipRotationAxis = false) {
    wheelMeshes.forEach(wheel => {
        let rotationAmount = speed * factor;
        if (!isForward) {
            rotationAmount *= -1; // 후진 시 회전 방향 반대
        }
        if (flipRotationAxis) {
            rotationAmount *= -1; // 특정 바퀴 회전 축 반전
        }
        wheel.rotation.y += rotationAmount; // Y축 회전
    });
}

// --- 기하학 위치 데이터를 정리하는 헬퍼 함수 ---
function cleanGeometry(geometry) { // 함수명 변경
    const positionAttribute = geometry.getAttribute('position');
    if (positionAttribute) {
        const positions = positionAttribute.array;
        let hasNaN = false;
        for (let i = 0; i < positions.length; i++) {
            if (isNaN(positions[i])) {
                positions[i] = 0; // NaN을 0 또는 적절한 기본값으로 교체
                hasNaN = true;
                console.warn(`기하학 위치 속성의 ${i}번째 인덱스에서 NaN이 감지되어 수정되었습니다.`);
            }
        }
        if (hasNaN) {
            positionAttribute.needsUpdate = true; // Three.js에게 버퍼를 다시 업로드하라고 알림
            geometry.computeBoundingBox();       // 수정 후 경계 상자 다시 계산
            geometry.computeBoundingSphere();    // 수정 후 경계 구체 다시 계산
        }
    }
}

// --- 탱크 초기 위치 설정 함수 (탱크 로드 후 호출) ---
function initTankPos() {
    if (tankModelLoaded && tankRigidBody && groundMesh) {
        const tankStartY = 20;

        tankRigidBody.setTranslation(
            new RAPIER.Vector3(0, tankStartY, 0),
            true // rigid body를 깨워서 즉시 적용
        );
        tankMesh.position.y = tankStartY; // Three.js 메쉬도 업데이트
        console.log("Tank final initial position set to Y:", tankStartY);
    }
}


// --- Rapier Physics Engine Initialization & Scene/Model Loading ---
RAPIER.init().then(() => {
    console.log("Rapier initialized.");
    const gravity = { x: 0.0, y: -9.81, z: 0.0 }; // 중력 설정
    world = new RAPIER.World(gravity);

    // --- Rapier Debug Renderer Initialization ---
    const material = new THREE.LineBasicMaterial({
        color: 0xff0000, // 디버그 콜라이더 색상을 빨간색으로 (잘 보이도록)
        vertexColors: true
    });
    const geometry = new THREE.BufferGeometry();
    rapierDebugMesh = new THREE.LineSegments(geometry, material);
    scene.add(rapierDebugMesh);
    console.log("Rapier Debug Renderer initialized.");

    // --- Raycaster 및 Raycast Line 초기화 ---
    raycaster = new THREE.Raycaster();
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff }); // 파란색 선
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1)]);
    raycastLine = new THREE.Line(lineGeometry, lineMaterial);
    raycastLine.visible = false; // 처음에는 숨김
    scene.add(raycastLine);
    console.log("Raycaster and Raycast Line initialized.");


    // --- Ground Creation (scene.glb loading & Rapier) ---
    const mapLoader = new GLTFLoader();
    const mapModelPath = 'tank_map.glb'; // 맵 GLB 파일 경로
    mapLoader.load(
        mapModelPath,
        function (gltf) {
            groundMesh = gltf.scene; // 맵 모델 전체를 groundMesh로 사용
            scene.add(groundMesh);
            console.log('Map model (test5.glb) loaded successfully:', gltf);

            let hasValidCollider = false;

            groundMesh.traverse((child) => {
                if (child.isMesh) {
                    console.log(`Processing mesh for collider: ${child.name}`);

                    // --- NaN 값 정리 함수 적용 ---
                    cleanGeometry(child.geometry); // <<< 여기에서 cleanGeometry 호출!

                    const positions = child.geometry.attributes.position.array;
                    const indices = child.geometry.index ? child.geometry.index.array : null;

                    // cleanGeometry가 NaN을 처리했으므로, 여기서는 유효성만 최종 확인
                    if (positions.length === 0) {
                        console.warn(`Mesh "${child.name}" has no position data after sanitation. Skipping collider creation.`);
                        return;
                    }
                    if (!indices || indices.length === 0) {
                        console.warn(`Mesh "${child.name}" has no index data. Skipping TriMesh collider creation. Try converting to indexed geometry in Blender.`);
                        return;
                    }

                    const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
                    groundRigidBody = world.createRigidBody(rigidBodyDesc);

                    const scaledPositions = new Float32Array(positions.length);
                    const dummyVector = new THREE.Vector3();
                    const dummyQuaternion = new THREE.Quaternion();
                    const dummyScale = new THREE.Vector3();

                    child.matrixWorld.decompose(dummyVector, dummyQuaternion, dummyScale);

                    for (let i = 0; i < positions.length; i += 3) {
                        dummyVector.set(positions[i], positions[i + 1], positions[i + 2]);
                        dummyVector.applyMatrix4(child.matrixWorld);
                        scaledPositions[i] = dummyVector.x;
                        scaledPositions[i + 1] = dummyVector.y;
                        scaledPositions[i + 2] = dummyVector.z;
                    }

                    const colliderDesc = RAPIER.ColliderDesc.trimesh(scaledPositions, indices);
                    colliderDesc.setRestitution(0.0);
                    colliderDesc.setFriction(0.8);

                    world.createCollider(colliderDesc, groundRigidBody);
                    console.log(`Collider created for mesh: ${child.name}`);
                    hasValidCollider = true;
                }
            });

            if (!hasValidCollider) {
                console.warn("No valid colliders were created from test5.glb. Please check if the model contains actual meshes with valid geometry data (no NaN values, indexed).");
            }

            // 맵 로드 완료 후 탱크 위치 초기화 시도
            initTankPos();
        },
        undefined,
        function (error) {
            console.error('An error happened loading the test5.glb map model:', error);
        }
    );


    // --- GLB Model Loading (Tank) ---
    const tankLoader = new GLTFLoader();
    const tankModelPath = 'tankv1.glb';

    tankLoader.load(
        tankModelPath,
        function (gltf) {
            tankMesh = gltf.scene;
            scene.add(tankMesh);
            console.log('Tank model loaded successfully:', gltf);

            // --- 탱크 모델의 모든 메시에 NaN 값 정리 함수 적용 ---
            tankMesh.traverse((child) => {
                if (child.isMesh) {
                    cleanGeometry(child.geometry); // <<< 여기에서 cleanGeometry 호출!
                }
            });

            // 탱크 모델의 바퀴 및 Potap, PoshinRotateCore, PoshinBig 메쉬 찾기
            for (let i = 1; i <= 7; i++) {
                const lWheel = tankMesh.getObjectByName(`L_wheel_${i}`);
                if (lWheel) {
                    if (i <= 4) { L_wheel_front_meshes.push(lWheel); } else { L_wheel_rear_meshes.push(lWheel); }
                } else { console.warn(`L_wheel_${i} not found!`); }
                const rWheel = tankMesh.getObjectByName(`R_wheel_${i}`);
                if (rWheel) {
                    if (i <= 4) { R_wheel_front_meshes.push(rWheel); } else { R_wheel_rear_meshes.push(rWheel); }
                } else { console.warn(`R_wheel_${i} not found!`); }
            }
            console.log("Found L_wheel front meshes:", L_wheel_front_meshes.length);
            console.log("Found L_wheel rear meshes:", L_wheel_rear_meshes.length);
            console.log("Found R_wheel front meshes:", R_wheel_front_meshes.length);
            console.log("Found R_wheel rear meshes:", R_wheel_rear_meshes.length);

            potapMesh = tankMesh.getObjectByName('Potap');
            if (potapMesh) { console.log("Potap mesh found:", potapMesh); } else { console.warn("Potap mesh not found!"); }

            poshinRotateCore = tankMesh.getObjectByName('PoshinRotateCore');
            if (poshinRotateCore) { console.log("PoshinRotateCore mesh found:", poshinRotateCore); } else { console.warn("PoshinRotateCore mesh not found!"); }

            // PoshinBig 메쉬 찾기
            poshinBig = tankMesh.getObjectByName('poshinBig'); // 소문자 'p'로 수정
            if (poshinBig) { console.log("PoshinBig mesh found:", poshinBig); } else { console.warn("PoshinBig mesh not found!"); }


            // 탱크의 바운딩 박스 크기 계산
            const box = new THREE.Box3().setFromObject(tankMesh);
            const size = box.getSize(new THREE.Vector3());
            console.log("Tank Mesh Bounding Box Size:", size);

            // 탱크 Rigidbody 생성
            const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
                .setLinearDamping(1.5)
                .enabledRotations(true, true, true);

            tankRigidBody = world.createRigidBody(rigidBodyDesc);

            // 탱크 Collider 생성
            const colliderHeight = size.y * 0.8;
            const colliderYOffset = -size.y * 0.1;

            const colliderDesc = RAPIER.ColliderDesc.cuboid(size.x / 2, colliderHeight / 2, size.z / 2)
                .setRestitution(0.0)
                .setFriction(1.0)
                .setTranslation(0, colliderYOffset, 0)
                .setDensity(100);

            world.createCollider(colliderDesc, tankRigidBody);
            console.log("Tank RigidBody and Collider created.");

            tankModelLoaded = true;
            initTankPos();
        },
        undefined,
        function (error) {
            console.error('An error happened loading the tankv1.glb model:', error);
        }
    );

});

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    const deltaTime = (performance.now() - raycastTimer) / 1000;
    raycastTimer = performance.now();

    if (world) {
        world.step();

        // --- Update Rapier Debug Renderer ---
        const buffers = world.debugRender();
        rapierDebugMesh.geometry.setAttribute('position', new THREE.BufferAttribute(buffers.vertices, 3));
        rapierDebugMesh.geometry.setAttribute('color', new THREE.BufferAttribute(buffers.colors, 4));
        rapierDebugMesh.geometry.attributes.position.needsUpdate = true;
        rapierDebugMesh.geometry.attributes.color.needsUpdate = true;

        if (tankRigidBody && tankMesh) {
            const position = tankRigidBody.translation();
            const rotation = tankRigidBody.rotation();

            tankMesh.position.set(position.x, position.y, position.z);
            tankMesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

            const currentAngVel = tankRigidBody.angvel();
            tankRigidBody.setAngvel(new RAPIER.Vector3(0, currentAngVel.y, 0), true);


            const maxSpeed = 10;
            const accelerationForce = 50000;
            const brakingForce = 500000;
            const torqueImpulseMagnitude = 150000;
            const angularBrakingImpulse = 20000;

            const currentLinearVelocity = tankRigidBody.linvel();
            const currentHorizontalSpeed = Math.sqrt(currentLinearVelocity.x * currentLinearVelocity.x + currentLinearVelocity.z * currentLinearVelocity.z);
            const currentAngularVelocity = tankRigidBody.angvel();

            let applyBraking = true;

            if (keys.w) {
                applyBraking = false;
                const forwardDirection = new THREE.Vector3(-1, 0, 0);
                forwardDirection.applyQuaternion(tankMesh.quaternion);
                if (currentHorizontalSpeed < maxSpeed) {
                    const forceMagnitude = accelerationForce * (1 - (currentHorizontalSpeed / maxSpeed));
                    const force = new RAPIER.Vector3(
                        forwardDirection.x * forceMagnitude,
                        0,
                        forwardDirection.z * forceMagnitude
                    );
                    tankRigidBody.addForce(force, true);
                }
                rotateWheels(L_wheel_front_meshes, currentHorizontalSpeed * 0.1, 0.1, true);
                rotateWheels(L_wheel_rear_meshes, currentHorizontalSpeed * 0.1, 0.1, true, true);
                rotateWheels(R_wheel_front_meshes, currentHorizontalSpeed * 0.1, 0.1, true, true);
                rotateWheels(R_wheel_rear_meshes, currentHorizontalSpeed * 0.1, 0.1, true);
            } else if (keys.s) {
                applyBraking = false;
                const backwardDirection = new THREE.Vector3(1, 0, 0);
                backwardDirection.applyQuaternion(tankMesh.quaternion);
                if (currentHorizontalSpeed < maxSpeed) {
                    const forceMagnitude = accelerationForce * (1 - (currentHorizontalSpeed / maxSpeed));
                    const force = new RAPIER.Vector3(
                        backwardDirection.x * forceMagnitude,
                        0,
                        backwardDirection.z * forceMagnitude
                    );
                    tankRigidBody.addForce(force, true);
                }
                rotateWheels(L_wheel_front_meshes, currentHorizontalSpeed * 0.1, 0.1, false);
                rotateWheels(L_wheel_rear_meshes, currentHorizontalSpeed * 0.1, 0.1, false, true);
                rotateWheels(R_wheel_front_meshes, currentHorizontalSpeed * 0.1, 0.1, false, true);
                rotateWheels(R_wheel_rear_meshes, currentHorizontalSpeed * 0.1, 0.1, false);
            }

            if (applyBraking) {
                const stopThreshold = 0.2;
                const effectiveBrakingForce = brakingForce;

                if (currentHorizontalSpeed > stopThreshold) {
                    const brakeDirection = new THREE.Vector3(-currentLinearVelocity.x, 0, -currentLinearVelocity.z).normalize();
                    const actualBrakeMagnitude = effectiveBrakingForce * (currentHorizontalSpeed / maxSpeed);
                    const brakeForce = new RAPIER.Vector3(
                        brakeDirection.x * actualBrakeMagnitude,
                        0,
                        brakeDirection.z * actualBrakeMagnitude
                    );
                    tankRigidBody.addForce(brakeForce, true);
                    rotateWheels(L_wheel_front_meshes, currentHorizontalSpeed * 0.1, 0.05, currentLinearVelocity.x < 0);
                    rotateWheels(L_wheel_rear_meshes, currentHorizontalSpeed * 0.1, 0.05, currentLinearVelocity.x < 0, true);
                    rotateWheels(R_wheel_front_meshes, currentHorizontalSpeed * 0.1, 0.05, currentLinearVelocity.x > 0, true);
                    rotateWheels(R_wheel_rear_meshes, currentHorizontalSpeed * 0.1, 0.05, currentLinearVelocity.x > 0);

                } else {
                    tankRigidBody.setLinvel(new RAPIER.Vector3(0, currentLinearVelocity.y, 0), true);
                    L_wheel_front_meshes.forEach(wheel => wheel.rotation.y = 0);
                    L_wheel_rear_meshes.forEach(wheel => wheel.rotation.y = 0);
                    R_wheel_front_meshes.forEach(wheel => wheel.rotation.y = 0);
                    R_wheel_rear_meshes.forEach(wheel => wheel.rotation.y = 0);
                }
            }


            // 회전 속도 제어를 위한 변수 추가 (상단이나 관련 변수 정의하는 곳에 추가)
            const maxAngularSpeedY = 1.0; // Y축 최대 회전 속도 (초당 라디안, 이 값을 조절하여 최대 속도를 변경하세요)
            if (keys.a) {
                // 현재 Y축 각속도가 양수 방향으로 최대값을 초과하지 않는 경우에만 토크 적용
                if (currentAngularVelocity.y < maxAngularSpeedY) {
                    tankRigidBody.applyTorqueImpulse(new RAPIER.Vector3(0, torqueImpulseMagnitude, 0), true);
                }
                rotateWheels(R_wheel_front_meshes, 0.5, 0.05, true, true);
                rotateWheels(R_wheel_rear_meshes, 0.5, 0.05, true);
                rotateWheels(L_wheel_front_meshes, 0.5, 0.05, false);
                rotateWheels(L_wheel_rear_meshes, 0.5, 0.05, false, true);
            } else if (keys.d) {
                // 현재 Y축 각속도가 음수 방향으로 최대값의 음수를 초과하지 않는 경우에만 토크 적용
                if (currentAngularVelocity.y > -maxAngularSpeedY) {
                    tankRigidBody.applyTorqueImpulse(new RAPIER.Vector3(0, -torqueImpulseMagnitude, 0), true);
                }
                rotateWheels(L_wheel_front_meshes, 0.5, 0.05, true);
                rotateWheels(L_wheel_rear_meshes, 0.5, 0.05, true, true);
                rotateWheels(R_wheel_front_meshes, 0.5, 0.05, false, true);
                rotateWheels(R_wheel_rear_meshes, 0.5, 0.05, false);
            } else {
                if (Math.abs(currentAngularVelocity.y) > 0.01) {
                    const brakingTorqueDirection = -Math.sign(currentAngularVelocity.y);
                    const angularBrakingImpulse = 0.5; // 브레이크 임펄스 크기 (필요 시 정의)
                    tankRigidBody.applyTorqueImpulse(new RAPIER.Vector3(0, angularBrakingImpulse * brakingTorqueDirection, 0), true);
                } else {
                    const currentAngVel = tankRigidBody.angvel();
                    tankRigidBody.setAngvel(new RAPIER.Vector3(currentAngVel.x, 0, currentAngVel.z), true);
                }
            }

            // Potap (포탑) 회전 로직
            if (potapMesh) {
                const potapRotationSpeed = 0.01;
                if (keys.q) { potapMesh.rotation.y += potapRotationSpeed; }
                else if (keys.e) { potapMesh.rotation.y -= potapRotationSpeed; }
            }

            // PoshinRotateCore Y축 회전 로직 (R/F 키)
            if (poshinRotateCore) {
                const poshinRotationSpeed = 0.02;
                const minRotationRad = THREE.MathUtils.degToRad(-30);
                const maxRotationRad = THREE.MathUtils.degToRad(10);

                if (keys.f) {
                    poshinRotateCore.rotation.z += poshinRotationSpeed;
                    if (poshinRotateCore.rotation.z > maxRotationRad) {
                        poshinRotateCore.rotation.z = maxRotationRad;
                    }
                } else if (keys.r) {
                    poshinRotateCore.rotation.z -= poshinRotationSpeed;
                    if (poshinRotateCore.rotation.z < minRotationRad) {
                        poshinRotateCore.rotation.z = minRotationRad;
                    }
                }
            }

            // --- Raycasting (스페이스바) 로직 ---
            if (keys.space && !raycastActive && (performance.now() - lastSpacePressTime > raycastCooldown)) {
                if (poshinRotateCore && poshinBig) { // PoshinRotateCore와 PoshinBig 모두 로드되었는지 확인
                    lastSpacePressTime = performance.now();

                    const origin = new THREE.Vector3();
                    poshinRotateCore.getWorldPosition(origin); // Raycast 시작점: PoshinRotateCore의 월드 위치

                    const targetPoint = new THREE.Vector3();
                    poshinBig.getWorldPosition(targetPoint); // Raycast 목표점: PoshinBig의 월드 위치

                    const direction = new THREE.Vector3();
                    direction.subVectors(targetPoint, origin); // 방향: 목표점 - 시작점
                    direction.normalize(); // 단위 벡터로 정규화

                    const rayLength = 200; // Raycast 최대 길이

                    // Rapier Raycast
                    const ray = new RAPIER.Ray(origin, direction);
                    const maxToi = rayLength;
                    const solid = true;
                    const hit = world.castRay(ray, maxToi, solid);

                    let hitPoint = new THREE.Vector3();
                    if (hit) {
                        console.log('[________________HIT__________________]');

                    } else {
                        hitPoint.copy(origin).add(direction.multiplyScalar(rayLength));
                        console.log("Raycast Missed.");
                    }

                    // Three.js Raycast Line 시각화
                    raycastLine.geometry.setFromPoints([origin, hitPoint]);
                    raycastLine.geometry.attributes.position.needsUpdate = true;
                    raycastLine.visible = true;
                    raycastActive = true;
                    raycastTimer = performance.now();
                } else {
                    console.warn("PoshinRotateCore or PoshinBig mesh not found for raycasting! Please ensure both exist in your GLB model.");
                }
            }

            // Raycast 선이 일정 시간 후 사라지도록 처리
            if (raycastActive && (performance.now() - raycastTimer > raycastDuration)) {
                raycastLine.visible = false;
                raycastActive = false;
            }


            // 카메라 팔로우 로직
            if (tankMesh && potapMesh) {
                const potapWorldPosition = new THREE.Vector3();
                potapMesh.getWorldPosition(potapWorldPosition);
                const potapWorldQuaternion = new THREE.Quaternion();
                potapMesh.getWorldQuaternion(potapWorldQuaternion);

                const rotatedCameraOffset = cameraPotapOffset.clone().applyQuaternion(potapWorldQuaternion);

                const targetCameraPosition = potapWorldPosition.add(rotatedCameraOffset);

                camera.position.lerp(targetCameraPosition, cameraSmoothFactor);

                const lookAtOrigin = new THREE.Vector3();
                potapMesh.getWorldPosition(lookAtOrigin);

                const potapForward = new THREE.Vector3(-1, 0, 0);
                potapForward.applyQuaternion(potapWorldQuaternion);

                const targetLookAtPoint = lookAtOrigin.add(potapForward.multiplyScalar(Math.abs(cameraLookAtOffset.x)));

                camera.lookAt(targetLookAtPoint);
            }
        }
    }
    renderer.render(scene, camera);
}

animate();

// --- Renderer & Camera Update on Window Resize ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});