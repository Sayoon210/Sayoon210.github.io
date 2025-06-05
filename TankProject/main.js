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

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
directionalLight.position.set(5, 5, 5).normalize();
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xffffff, 1.5, 100);
pointLight.position.set(0, 5, 0);
scene.add(pointLight);


// --- Rapier 물리 세계 초기화 변수 ---
let world;
let tankRigidBody = null;
let tankMesh = null;

// --- 키보드 입력 상태 저장 ---
const keys = {
    w: false
};

// 키보드 이벤트 리스너
window.addEventListener('keydown', (event) => {
    if (event.key === 'w' || event.key === 'W') {
        keys.w = true;
    }
});

window.addEventListener('keyup', (event) => {
    if (event.key === 'w' || event.key === 'W') {
        keys.w = false;
    }
});


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
    const modelPath = 'tank2.glb'; 

    loader.load(
        modelPath,
        function (gltf) {
            tankMesh = gltf.scene;
            scene.add(tankMesh);
            console.log('Model loaded successfully:', gltf);

            // 모델 초기 위치 설정 (물리 바닥 위에 있도록 충분히 높게)
            const initialTankYPosition = (groundYPosition + groundHeight / 2) + 5; // 바닥 위 5 유닛에서 시작
            const initialTankPosition = new THREE.Vector3(0, initialTankYPosition, 0);
            tankMesh.position.copy(initialTankPosition);

            // --- 탱크 모델링에 물리 바디 연결 (Rapier) ---
            const box = new THREE.Box3().setFromObject(tankMesh);
            const size = box.getSize(new THREE.Vector3());
            console.log("Tank Mesh Bounding Box Size:", size);

            // 급정거 로직을 직접 구현하므로, Damping과 Friction을 조금 더 일반적인 값으로 되돌립니다.
            // 너무 높은 값은 오히려 다른 물리 현상(예: 충돌)에 이상하게 영향을 줄 수 있습니다.
            const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
                                                        .setTranslation(initialTankPosition.x, initialTankPosition.y, initialTankPosition.z)
                                                        .setLinearDamping(0.8) // 일반적인 감쇠 값으로 조정 (급정거는 직접 로직으로)
                                                        .setAngularDamping(0.5); // 일반적인 각 감쇠 값으로 조정

            tankRigidBody = world.createRigidBody(rigidBodyDesc);

            const colliderHeight = size.y * 0.8; 
            const colliderYOffset = -size.y * 0.1; 

            const colliderDesc = RAPIER.ColliderDesc.cuboid(size.x / 2, colliderHeight / 2, size.z / 2)
                                                .setRestitution(0.0) 
                                                .setFriction(1.0) // 일반적인 마찰 값으로 조정 (급정거는 직접 로직으로)
                                                .setTranslation(0, colliderYOffset, 0) 
                                                .setDensity(10); 

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
            const accelerationForce = 5000; // 가속을 위한 기본 힘 (조절 가능)
            const currentLinearVelocity = tankRigidBody.linvel(); // 현재 선형 속도

            // 현재 속도의 크기를 계산 (Y축 속도 제외)
            const currentHorizontalSpeed = Math.sqrt(currentLinearVelocity.x * currentLinearVelocity.x + currentLinearVelocity.z * currentLinearVelocity.z);

            if (keys.w) {
                // W 키가 눌렸을 때: 로컬 -X 방향으로 힘 가하기 (점진적 가속)
                const negativeXDirection = new THREE.Vector3(-1, 0, 0); 
                negativeXDirection.applyQuaternion(tankMesh.quaternion); 
                
                // 현재 속도가 최대 속도보다 작을 때만 힘을 가하여 가속
                if (currentHorizontalSpeed < maxSpeed) {
                    const forceMagnitude = accelerationForce * (1 - (currentHorizontalSpeed / maxSpeed));
                    
                    const force = new RAPIER.Vector3(
                        negativeXDirection.x * forceMagnitude,
                        negativeXDirection.y * forceMagnitude,
                        negativeXDirection.z * forceMagnitude
                    );
                    tankRigidBody.addForce(force, true);
                }
            } else {
                // W 키를 놓았을 때:
                // 강체의 현재 수평 속도를 강제로 0으로 설정하여 급정거
                // Y축(중력 방향) 속도는 유지하여 공중에 있다면 떨어지도록 함.
                if (currentHorizontalSpeed > 0.01) { // 아주 작은 속도 이상일 때만 정지 적용
                    const currentVel = tankRigidBody.linvel();
                    tankRigidBody.setLinvel(new RAPIER.Vector3(0, currentVel.y, 0), true);
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