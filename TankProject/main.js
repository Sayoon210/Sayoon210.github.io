import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';

// --- 씬(Scene), 카메라(Camera), 렌더러(Renderer) 설정 ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 렌더러 감마/컬러 스페이스 설정 (필수!)
renderer.outputColorSpace = THREE.SRGBColorSpace; // Three.js r152 이상

// --- 씬 배경을 옅은 회색으로 설정 ---
scene.background = new THREE.Color(0xdddddd); // 옅은 회색

// --- OrbitControls 설정 ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
camera.position.set(0, 10, 15); // 초기 카메라 위치
controls.target.set(0, 0, 0); // 컨트롤러의 초점
controls.update();

// --- 조명 ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 10.0);
directionalLight.position.set(5, 5, 5).normalize();
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xffffff, 1.5, 100);
pointLight.position.set(0, 5, 0);
scene.add(pointLight);

let wasWPressed = false;
let wasSPressed = false;

// --- Rapier 물리 세계 초기화 변수 ---
let world;
let tankRigidBody = null;
let tankMesh = null;

// --- 키보드 입력 상태 저장 ---
const keys = {
    w: false,
    s: false, // S 키 추가
    a: false, // A 키 추가
    d: false, // D 키 추가
    q: false, // Q 키 추가
    e: false  // E 키 추가
};

// 키보드 이벤트 리스너
window.addEventListener('keydown', (event) => {
    if (event.key === 'w' || event.key === 'W') {
        keys.w = true;
    }
    if (event.key === 's' || event.key === 'S') { // S 키 감지
        keys.s = true;
    }
    if (event.key === 'a' || event.key === 'A') { // A 키 감지
        keys.a = true;
    }
    if (event.key === 'd' || event.key === 'D') { // D 키 감지
        keys.d = true;
    }
    if (event.key === 'q' || event.key === 'Q') {
        keys.q = true;
    }
    if (event.key === 'e' || event.key === 'E') {
        keys.e = true;
    }
});

window.addEventListener('keyup', (event) => {
    if (event.key === 'w' || event.key === 'W') {
        keys.w = false;
    }
    if (event.key === 's' || event.key === 'S') { // S 키 감지
        keys.s = false;
    }
    if (event.key === 'a' || event.key === 'A') { // A 키 감지
        keys.a = false;
    }
    if (event.key === 'd' || event.key === 'D') { // D 키 감지
        keys.d = false;
    }
    if (event.key === 'q' || event.key === 'Q') {
        keys.q = false;
    }
    if (event.key === 'e' || event.key === 'E') {
        keys.e = false;
    }
});

// 바퀴 메쉬 찾기
// animate 함수 외부에 선언 (스크립트 상단 등)
let L_wheel_front_meshes = []; // L_wheel_1 ~ L_wheel_4
let L_wheel_rear_meshes = [];  // L_wheel_5 ~ L_wheel_7
let R_wheel_front_meshes = []; // R_wheel_1 ~ R_wheel_4
let R_wheel_rear_meshes = [];  // R_wheel_5 ~ R_wheel_7
let potapMesh = null;

// --- Rapier 물리 엔진 초기화 및 씬/모델 로드 ---
RAPIER.init().then(() => {
    console.log("Rapier initialized.");
    const gravity = { x: 0.0, y: -9.81, z: 0.0 };
    world = new RAPIER.World(gravity);

    // --- 바닥 생성 (Three.js 및 Rapier) ---
    const groundSize = 100;
    const groundHeight = 0.1; // 바닥 두께
    const groundYPosition = -1; // 바닥의 Y 위치 (Three.js Mesh의 중심)

    const groundGeometry = new THREE.BoxGeometry(groundSize, groundHeight, groundSize);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.position.y = groundYPosition; // Three.js 바닥 위치 설정
    scene.add(groundMesh);

    // Rapier 바닥 (정적 Rigidbody) - Collider의 중심 Y 위치가 중요
    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(groundSize / 2, groundHeight / 2, groundSize / 2)
        .setTranslation(0, groundYPosition + groundHeight / 2, 0); // 물리 바닥의 실제 상단 Y 위치
    world.createCollider(groundColliderDesc);
    console.log("Ground created. Three.js Mesh Y:", groundYPosition, " | Rapier Collider Top Y:", (groundYPosition + groundHeight / 2));

    // --- GLB 모델 로드 ---
    const loader = new GLTFLoader();
    const modelPath = 'tank6.glb';

    loader.load(
        modelPath,
        function (gltf) {
            tankMesh = gltf.scene;
            scene.add(tankMesh);
            console.log('Model loaded successfully:', gltf);

            // 바퀴 메쉬 참조 찾기 및 그룹별 배열에 저장
            // 블렌더 계층 구조 에 따라 바퀴를 분류합니다.
            for (let i = 1; i <= 7; i++) {
                const lWheel = tankMesh.getObjectByName(`L_wheel_${i}`);
                if (lWheel) {
                    if (i <= 4) {
                        L_wheel_front_meshes.push(lWheel);
                    } else {
                        L_wheel_rear_meshes.push(lWheel);
                    }
                } else {
                    console.warn(`L_wheel_${i} not found! Check the GLB model's hierarchy.`);
                }

                const rWheel = tankMesh.getObjectByName(`R_wheel_${i}`);
                if (rWheel) {
                    if (i <= 4) {
                        R_wheel_front_meshes.push(rWheel);
                    } else {
                        R_wheel_rear_meshes.push(rWheel);
                    }
                } else {
                    console.warn(`R_wheel_${i} not found! Check the GLB model's hierarchy.`);
                }
            }
            console.log("Found L_wheel front meshes:", L_wheel_front_meshes.length);
            console.log("Found L_wheel rear meshes:", L_wheel_rear_meshes.length);
            console.log("Found R_wheel front meshes:", R_wheel_front_meshes.length);
            console.log("Found R_wheel rear meshes:", R_wheel_rear_meshes.length);
            // ... (기존 모델 초기 위치 설정 및 Rapier 물리 바디 연결 코드)
            // Potap 메쉬 참조 찾기
            potapMesh = tankMesh.getObjectByName('Potap'); // 'Potap'은 블렌더에서 설정된 정확한 오브젝트 이름이어야 합니다.
            if (potapMesh) {
                console.log("Potap mesh found:", potapMesh);
            } else {
                console.warn("Potap mesh not found! Check the GLB model's hierarchy.");
            }

            // 모델 초기 위치 설정 (물리 바닥 위에 있도록 충분히 높게)
            const initialTankYPosition = (groundYPosition + groundHeight / 2) + 5; // 바닥 위 5 유닛에서 시작
            const initialTankPosition = new THREE.Vector3(0, initialTankYPosition, 0);
            tankMesh.position.copy(initialTankPosition);

            // --- 탱크 모델링에 물리 바디 연결 (Rapier) ---
            const box = new THREE.Box3().setFromObject(tankMesh);
            const size = box.getSize(new THREE.Vector3());
            console.log("Tank Mesh Bounding Box Size:", size);

            // 급정거 로직을 직접 구현하므로, Damping과 Friction을 조금 더 일반적인 값으로 되돌립니다.
            const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
                .setTranslation(initialTankPosition.x, initialTankPosition.y, initialTankPosition.z)
                .setLinearDamping(0.8) // 일반적인 감쇠 값
                .setAngularDamping(0.8); // 일반적인 각 감쇠 값

            tankRigidBody = world.createRigidBody(rigidBodyDesc);

            const colliderHeight = size.y * 0.8;
            const colliderYOffset = -size.y * 0.1;

            const colliderDesc = RAPIER.ColliderDesc.cuboid(size.x / 2, colliderHeight / 2, size.z / 2)
                .setRestitution(0.0)
                .setFriction(1.0) // 일반적인 마찰 값
                .setTranslation(0, colliderYOffset, 0)
                .setDensity(100);

            world.createCollider(colliderDesc, tankRigidBody);
            console.log("Tank RigidBody and Collider created at initial Y:", initialTankPosition.y);
            console.log("Expected fall start from Y:", initialTankYPosition, " to ground top Y:", (groundYPosition + groundHeight / 2));
        },
        undefined,
        function (error) {
            console.error('An error happened loading the tank2.glb model:', error);
        }
    );
});

// wheelRotationFactor는 animate 함수 내부의 변수이므로,
// 함수가 접근할 수 있도록 인자로 전달하거나 전역 상수로 정의합니다.
// 여기서는 인자로 전달하는 방식을 사용하겠습니다.

function rotateLWheelsFront(speed, factor, isForward) {
    L_wheel_front_meshes.forEach(wheel => {
        // L_wheel은 Y축 양수 회전 (전진), 음수 회전 (후진)
        // L_wheel_1~4는 전진/후진에 따라 일반적인 바퀴처럼 회전
        if (isForward) {
            wheel.rotation.y += speed * factor;
        } else {
            wheel.rotation.y -= speed * factor;
        }
    });
}

function rotateLWheelsRear(speed, factor, isForward) {
    L_wheel_rear_meshes.forEach(wheel => {
        // L_wheel_5~7은 전진/후진 시 1~4와 반대 방향으로 회전 (문제 설명에 따라)
        if (isForward) {
            wheel.rotation.y -= speed * factor; // 전진 시 음수 회전
        } else {
            wheel.rotation.y += speed * factor; // 후진 시 양수 회전
        }
    });
}

function rotateRWheelsFront(speed, factor, isForward) {
    R_wheel_front_meshes.forEach(wheel => {
        // R_wheel은 Y축 음수 회전 (전진), 양수 회전 (후진)
        // R_wheel_1~4는 전진/후진에 따라 일반적인 바퀴처럼 회전
        if (isForward) {
            wheel.rotation.y -= speed * factor;
        } else {
            wheel.rotation.y += speed * factor;
        }
    });
}

function rotateRWheelsRear(speed, factor, isForward) {
    R_wheel_rear_meshes.forEach(wheel => {
        // R_wheel_5~7은 전진/후진 시 1~4와 반대 방향으로 회전 (문제 설명에 따라)
        if (isForward) {
            wheel.rotation.y += speed * factor; // 전진 시 양수 회전
        } else {
            wheel.rotation.y -= speed * factor; // 후진 시 음수 회전
        }
    });
}

// --- 애니메이션 루프 ---
function animate() {
    requestAnimationFrame(animate);

    if (world) {
        world.step();

        if (tankRigidBody && tankMesh) {
            const position = tankRigidBody.translation();
            const rotation = tankRigidBody.rotation();

            tankMesh.position.set(position.x, position.y, position.z);
            tankMesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

            const maxSpeed = 10; // 탱크의 최대 속도 (조절 가능)
            const accelerationForce = 50000; // 가속을 위한 기본 힘 (조절 가능)
            const rotationForce = 500000; // 회전을 위한 토크 힘 (조절 가능)

            const currentLinearVelocity = tankRigidBody.linvel(); // 현재 선형 속도
            const currentHorizontalSpeed = Math.sqrt(currentLinearVelocity.x * currentLinearVelocity.x + currentLinearVelocity.z * currentLinearVelocity.z);
            const currentAngularVelocity = tankRigidBody.angvel(); // 현재 각속도 (회전 속도)

            // --- 전진/후진 (Linear Movement) --- //
            const wheelRotationFactor = 0.1; // 바퀴 회전 속도 조절 계수 (조절 가능)
            if (keys.w) {
                // W 키: 로컬 -X 방향으로 힘 가하기 (전진)
                const forwardDirection = new THREE.Vector3(-1, 0, 0);
                forwardDirection.applyQuaternion(tankMesh.quaternion);

                if (currentHorizontalSpeed < maxSpeed) {
                    const forceMagnitude = accelerationForce * (1 - (currentHorizontalSpeed / maxSpeed));
                    const force = new RAPIER.Vector3(
                        forwardDirection.x * forceMagnitude,
                        forwardDirection.y * forceMagnitude,
                        forwardDirection.z * forceMagnitude
                    );
                    tankRigidBody.addForce(force, true);
                }

                // 바퀴 회전 함수 호출 (전진)
                rotateLWheelsFront(currentHorizontalSpeed * 0.1, wheelRotationFactor, true);
                rotateLWheelsRear(currentHorizontalSpeed * 0.1, wheelRotationFactor, true);
                rotateRWheelsFront(currentHorizontalSpeed * 0.1, wheelRotationFactor, true);
                rotateRWheelsRear(currentHorizontalSpeed * 0.1, wheelRotationFactor, true);

                // wasWPressed = true;
                // wasSPressed = false;
            } else if (keys.s) { // S 키: 로컬 +X 방향으로 힘 가하기 (후진)
                const backwardDirection = new THREE.Vector3(1, 0, 0); // 로컬 +X 방향
                backwardDirection.applyQuaternion(tankMesh.quaternion); // 월드 좌표계로 변환

                if (currentHorizontalSpeed < maxSpeed) { // 후진도 최대 속도 제한
                    const forceMagnitude = accelerationForce * (1 - (currentHorizontalSpeed / maxSpeed));
                    const force = new RAPIER.Vector3(
                        backwardDirection.x * forceMagnitude,
                        backwardDirection.y * forceMagnitude,
                        backwardDirection.z * forceMagnitude
                    );
                    tankRigidBody.addForce(force, true);
                }

                // 바퀴 회전 함수 호출 (후진)
                rotateLWheelsFront(currentHorizontalSpeed * 0.1, wheelRotationFactor, false);
                rotateLWheelsRear(currentHorizontalSpeed * 0.1, wheelRotationFactor, false);
                rotateRWheelsFront(currentHorizontalSpeed * 0.1, wheelRotationFactor, false);
                rotateRWheelsRear(currentHorizontalSpeed * 0.1, wheelRotationFactor, false);

                // wasSPressed = true;
                // wasWPressed = false;
            } else {
                // W, S 키를 모두 놓았을 때: 현재 이동 방향의 반대 방향으로 제동력 가하기
                const brakingForce = 200000;

                if (currentHorizontalSpeed > 0.003) {
                    const currentVel = tankRigidBody.linvel();
                    const brakeDirection = new THREE.Vector3(-currentVel.x, 0, -currentVel.z).normalize();

                    const brakeForce = new RAPIER.Vector3(
                        brakeDirection.x * brakingForce,
                        0,
                        brakeDirection.z * brakingForce
                    );
                    tankRigidBody.addForce(brakeForce, true);
                } else {
                    const currentVel = tankRigidBody.linvel();
                    tankRigidBody.setLinvel(new RAPIER.Vector3(0, currentVel.y, 0), true);
                    // 이동 키를 놓으면 바퀴 회전 업데이트를 멈춰서 자연스럽게 정지하도록 합니다.
                    // (별도의 회전 정지 로직 없이, 속도가 0이 되면 회전도 멈춥니다.)
                }
            }

            // --- 제자리 회전 (Angular Movement) ---
            // 물리 엔진 기반의 토크 적용 및 각속도 제한 로직은 제거합니다.
            // 대신 직접 바퀴의 rotation.y 값을 조절합니다.

            // 회전 시 바퀴 회전 속도를 위한 별도의 계수 (조절 가능)
            const turningWheelRotationFactor = 0.05;

            if (keys.a) {
                // A 키: 왼쪽으로 제자리 회전 (오른쪽 바퀴 전진 메커니즘, 왼쪽 바퀴 후진 메커니즘)

                // 오른쪽 바퀴 그룹은 전진 메커니즘
                rotateRWheelsFront(0.5, turningWheelRotationFactor, true); // 속도는 1 (상대적), 전진
                rotateRWheelsRear(0.5, turningWheelRotationFactor, true); // 속도는 1 (상대적), 전진

                // 왼쪽 바퀴 그룹은 후진 메커니즘
                rotateLWheelsFront(0.5, turningWheelRotationFactor, false); // 속도는 1 (상대적), 후진
                rotateLWheelsRear(0.5, turningWheelRotationFactor, false); // 속도는 1 (상대적), 후진

                // Rapier 물리 바디의 각속도 직접 변경 (시각적 회전과 물리적 회전 동기화)
                // 이 부분은 탱크 본체 자체의 회전을 담당합니다.
                const turnSpeed = 0.3; // 탱크 본체가 회전하는 속도 (조절 가능)
                tankRigidBody.setAngvel(new RAPIER.Vector3(currentAngularVelocity.x, turnSpeed, currentAngularVelocity.z), true);

            } else if (keys.d) {
                // D 키: 오른쪽으로 제자리 회전 (왼쪽 바퀴 전진 메커니즘, 오른쪽 바퀴 후진 메커니즘)

                // 왼쪽 바퀴 그룹은 전진 메커니즘
                rotateLWheelsFront(0.5, turningWheelRotationFactor, true); // 속도는 1 (상대적), 전진
                rotateLWheelsRear(0.5, turningWheelRotationFactor, true); // 속도는 1 (상대적), 전진

                // 오른쪽 바퀴 그룹은 후진 메커니즘
                rotateRWheelsFront(0.5, turningWheelRotationFactor, false); // 속도는 1 (상대적), 후진
                rotateRWheelsRear(0.5, turningWheelRotationFactor, false); // 속도는 1 (상대적), 후진

                // Rapier 물리 바디의 각속도 직접 변경
                const turnSpeed = -0.3; // 탱크 본체가 회전하는 속도 (조절 가능, D키는 음수)
                tankRigidBody.setAngvel(new RAPIER.Vector3(currentAngularVelocity.x, turnSpeed, currentAngularVelocity.z), true);

            } else {
                // A, D 키를 모두 놓았을 때:
                // 탱크 본체의 각속도를 즉시 0으로 설정하여 회전 급정거
                if (Math.abs(currentAngularVelocity.y) > 0.001) { // 아주 미세한 회전도 멈추기 위해 임계값 설정
                    const currentAngVel = tankRigidBody.angvel();
                    tankRigidBody.setAngvel(new RAPIER.Vector3(currentAngVel.x, 0, currentAngVel.z), true);
                }
                // 바퀴 자체의 시각적 회전은 W/S가 눌리지 않을 때와 마찬가지로,
                // A/D를 놓으면 `rotate*Wheels*` 함수가 호출되지 않으므로 자연스럽게 멈춥니다.
                // 만약 제자리 회전 시 바퀴가 계속 미끄러지는 듯한 움직임을 멈추고 싶다면
                // 이 곳에서 각 바퀴의 rotation.y를 고정하거나 서서히 줄이는 로직을 추가할 수 있습니다.
                // 예: L_wheel_front_meshes.forEach(wheel => wheel.rotation.y = wheel.rotation.y); // 현재 각도 유지
            }

            // --- Potap 오브젝트 회전 (Q, E 키) ---
            if (potapMesh) { // Potap 메쉬가 로드되었는지 확인
                const potapRotationSpeed = 0.01; // Potap 회전 속도 (조절 가능)
                // 현재 로컬 회전만 하므로, 제한을 두지 않으면 계속 회전합니다.

                if (keys.q) {
                    // Q 키: Potap 로컬 Y축을 중심으로 왼쪽 회전
                    // rotation.y를 직접 조작
                    potapMesh.rotation.y += potapRotationSpeed;

                } else if (keys.e) {
                    // E 키: Potap 로컬 Y축을 중심으로 오른쪽 회전
                    // rotation.y를 직접 조작
                    potapMesh.rotation.y -= potapRotationSpeed;

                } else {
                    // Q, E 키를 모두 놓았을 때:
                    // Potap 회전 정지 - 키를 놓으면 더 이상 rotation 값을 업데이트하지 않으므로 자연스럽게 멈춥니다.
                    // 만약 회전을 원래 위치로 서서히 돌리고 싶다면 추가 로직이 필요합니다.
                }
            }
        }
    }
    controls.update();
    renderer.render(scene, camera);
}

animate();

// --- 화면 크기 변경 시 렌더러 및 카메라 업데이트 ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});