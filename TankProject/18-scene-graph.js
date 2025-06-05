import * as THREE from 'three';  
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { initOrbitControls } from './util.js';

let base, shoulder, elbow, wrist, hand;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 20, 50);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const orbitControls = initOrbitControls(camera, renderer);

const params = {
    shoulderRotation: 0,
    elbowRotation: 0,
    wristRotation: 0
};

createRobotArm();

const light = new THREE.DirectionalLight(0xffffff, 10);
light.position.set(10, 20, 10);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const gui = new GUI();
gui.add(params, 'shoulderRotation', -90, 90, 1).onChange(() => {
    shoulder.rotation.z = THREE.MathUtils.degToRad(params.shoulderRotation);
});
gui.add(params, 'elbowRotation', -90, 90, 1).onChange(() => {
    elbow.rotation.z = THREE.MathUtils.degToRad(params.elbowRotation);
});
gui.add(params, 'wristRotation', -90, 90, 1).onChange(() => {
    wrist.rotation.z = THREE.MathUtils.degToRad(params.wristRotation);
});

render();

// Scene Graph
// scene
//   |-- base
//        |-- shoulder
//               |-- elbow
//                      |-- wrist
//                             |-- hand
function createRobotArm() {
    const material = new THREE.MeshStandardMaterial({ color: 0x0077ff, metalness: 0.5, roughness: 0.3 });

    // base
    base = new THREE.Object3D();
    scene.add(base);

    // cylinderGeometry: radiusTop, radiusBottom, height, radial segments
    const baseGeometry = new THREE.CylinderGeometry(4, 4, 2, 32); 
    const baseMesh = new THREE.Mesh(baseGeometry, material);
    base.add(baseMesh);

    // shoulder
    shoulder = new THREE.Object3D();
    shoulder.position.y = 3;
    base.add(shoulder);

    const shoulderGeometry = new THREE.BoxGeometry(6, 2, 2);
    const shoulderMesh = new THREE.Mesh(shoulderGeometry, material);
    shoulder.add(shoulderMesh);

    // elbow
    elbow = new THREE.Object3D();
    elbow.position.x = 4; // 어깨에서 x축 방향으로 이동
    shoulder.add(elbow);

    const elbowGeometry = new THREE.BoxGeometry(4, 2, 2);
    const elbowMesh = new THREE.Mesh(elbowGeometry, material);
    elbowMesh.position.x = 2; // 팔꿈치 중심
    elbow.add(elbowMesh);

    // **손목 (Wrist)**
    wrist = new THREE.Object3D();
    wrist.position.x = 4;
    elbow.add(wrist);

    const wristGeometry = new THREE.BoxGeometry(2, 2, 2);
    const wristMesh = new THREE.Mesh(wristGeometry, material);
    wristMesh.position.x = 1; // 손목 중심
    wrist.add(wristMesh);

    // **손 (Hand)**
    hand = new THREE.Object3D();
    hand.position.x = 2;
    wrist.add(hand);

    const handGeometry = new THREE.BoxGeometry(2, 1, 3);
    const handMesh = new THREE.Mesh(handGeometry, material);
    hand.add(handMesh);
}

function render() {
    orbitControls.update();
    requestAnimationFrame(render);
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});