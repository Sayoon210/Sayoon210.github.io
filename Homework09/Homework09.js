/*--------------------------------------------------------------------------------
Homework 09

<21조> - 1인 조입니다.
2020142149 김사윤

1. sun은 아래와 같이 point light + emmision으로 발광 효과를 주었음.
    const color = 0xFFFFFF; // 빛의 색상 (흰색 또는 노란색 계열)
    const intensity = 1000; // 빛의 강도 (조절해서 밝기를 설정)
    const light = new THREE.PointLight(color, intensity);
    light.position.set(0, 0, 0); // 구의 중심에 위치
    light.castShadow = true;
    scene.add(light);
    const sunMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFCC00,
        emissive: 0xFFCC00, // 발광 색상 (더 밝은 노란색)
        emissiveIntensity: 3 // 발광 강도 (기본값은 1)
    });

2. GUI는 folder를 통해 분리하였으며 control(최상위 default folder) 내부에 전부 분리되어 위치하였음.

3. ortbit과 stat을 추가함.

4. orbit rotation은 아래와 같이 pivot dummy object를 각 행성마다 추가해 parent로 지정하고 rotation을 걸어주었음.
    const pivotMercury = new THREE.Object3D(); // rotation의 중심이 될 parent object (dummy)
    pivotMercury.position.set(0, 0, 0);
    scene.add(pivotMercury);
    pivotMercury.add(Mercury);

5. rotation은 gui에서 값을 변경하여 아래와 같이 반영됨.
    Mercury.rotation.y += mercuryGUI.rotationSpeed;
    pivotMercury.rotation.y += mercuryGUI.orbitSpeed;

----------------------------------------------------------------------------------*/

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

const scene = new THREE.Scene();

let camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.x = -120;
camera.position.y = 160;
camera.position.z = 120;
camera.lookAt(scene.position);
scene.add(camera);

// renderer
const renderer = new THREE.WebGLRenderer();
renderer.setClearColor(new THREE.Color(0x000000));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// stats
const stats = new Stats();
document.body.appendChild(stats.dom);

// orbit controls
let orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;

// add subtle ambient lighting
const ambientLight = new THREE.AmbientLight(0x7D7D7D);
scene.add(ambientLight);

const textureLoader = new THREE.TextureLoader();

// Sun
const color = 0xFFFFFF; // 빛의 색상 (흰색 또는 노란색 계열)
const intensity = 1000; // 빛의 강도 (조절해서 밝기를 설정)
const light = new THREE.PointLight(color, intensity);
light.position.set(0, 0, 0); // 구의 중심에 위치
light.castShadow = true;
scene.add(light);
const sunMaterial = new THREE.MeshStandardMaterial({
    color: 0xFFCC00,
    emissive: 0xFFCC00, // 발광 색상 (더 밝은 노란색)
    emissiveIntensity: 3 // 발광 강도 (기본값은 1)
});
const geomSun = new THREE.SphereGeometry(10); // radius
const sun = new THREE.Mesh(geomSun, sunMaterial);
sun.position.set(0, 0, 0); // initial position (0, 4, 0)
sun.castShadow = true;
scene.add(sun);

// Mercury
const MercuryTexture = textureLoader.load(`Mercury.jpg`);
const MercuryMaterial = new THREE.MeshStandardMaterial({
    color: 0xa6a6a6,
    map: MercuryTexture,
    roughness: 0.8,
    metalness: 0.2
});
const geomMercury = new THREE.SphereGeometry(1.5); // radius
const Mercury = new THREE.Mesh(geomMercury, MercuryMaterial);
Mercury.position.set(20, 0, 0); // initial position (0, 4, 0)
Mercury.castShadow = true;
scene.add(Mercury);
const pivotMercury = new THREE.Object3D(); // rotation의 중심이 될 parent object (dummy)
pivotMercury.position.set(0, 0, 0);
scene.add(pivotMercury);
pivotMercury.add(Mercury);

// Venus
const VenusTexture = textureLoader.load(`Venus.jpg`);
const VenusMaterial = new THREE.MeshStandardMaterial({
    color: 0xe39e1c,
    map: VenusTexture,
    roughness: 0.8,
    metalness: 0.2
});
const geomVenus = new THREE.SphereGeometry(3); // radius
const Venus = new THREE.Mesh(geomVenus, VenusMaterial);
Venus.position.set(35, 0, 0); // initial position (0, 4, 0)
Venus.castShadow = true;
scene.add(Venus);
const pivotVenus = new THREE.Object3D(); // rotation의 중심이 될 parent object (dummy)
pivotVenus.position.set(0, 0, 0);
scene.add(pivotVenus);
pivotVenus.add(Venus);

// Earth
const EarthTexture = textureLoader.load(`Earth.jpg`);
const EarthMaterial = new THREE.MeshStandardMaterial({
    color: 0x3498db,
    map: EarthTexture,
    roughness: 0.8,
    metalness: 0.2
});
const geomEarth = new THREE.SphereGeometry(3.5); // radius
const Earth = new THREE.Mesh(geomEarth, EarthMaterial);
Earth.position.set(50, 0, 0); // initial position (0, 4, 0)
Earth.castShadow = true;
scene.add(Earth);
const pivotEarth = new THREE.Object3D(); // rotation의 중심이 될 parent object (dummy)
pivotEarth.position.set(0, 0, 0);
scene.add(pivotEarth);
pivotEarth.add(Earth);

// Mars
const MarsTexture = textureLoader.load(`Mars.jpg`);
const MarsMaterial = new THREE.MeshStandardMaterial({
    color: 0xc0392b,
    map: MarsTexture,
    roughness: 0.8,
    metalness: 0.2
});
const geomMars = new THREE.SphereGeometry(2.5); // radius
const Mars = new THREE.Mesh(geomMars, MarsMaterial);
Mars.position.set(65, 0, 0); // initial position (0, 4, 0)
Mars.castShadow = true;
scene.add(Mars);
const pivotMars = new THREE.Object3D(); // rotation의 중심이 될 parent object (dummy)
pivotMars.position.set(0, 0, 0);
scene.add(pivotMars);
pivotMars.add(Mars);


// GUI
const gui = new GUI();

const mercuryGUI = new function () {
    this.rotationSpeed = 0.02;
    this.orbitSpeed = 0.02;
}

const venusGUI = new function () {
    this.rotationSpeed = 0.015;
    this.orbitSpeed = 0.015;
}

const earthGUI = new function () {
    this.rotationSpeed = 0.01;
    this.orbitSpeed = 0.01;
}

const marsGUI = new function () {
    this.rotationSpeed = 0.008;
    this.orbitSpeed = 0.008;
}

const controls = new function () {
    this.perspective = "Perspective";
    this.switchCamera = function () {
        if (camera instanceof THREE.PerspectiveCamera) {
            scene.remove(camera);
            camera = null; // 기존의 camera 제거    
            // OrthographicCamera(left, right, top, bottom, near, far)
            camera = new THREE.OrthographicCamera(window.innerWidth / -16,
                window.innerWidth / 16, window.innerHeight / 16, window.innerHeight / -16, -200, 500);
            camera.position.x = 120;
            camera.position.y = 60;
            camera.position.z = 180;
            camera.lookAt(scene.position);
            orbitControls.dispose(); // 기존의 orbitControls 제거
            orbitControls = null;
            orbitControls = new OrbitControls(camera, renderer.domElement);
            orbitControls.enableDamping = true;
            this.perspective = "Orthographic";
        } else {
            scene.remove(camera);
            camera = null;
            camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.x = 120;
            camera.position.y = 60;
            camera.position.z = 180;
            camera.lookAt(scene.position);
            orbitControls.dispose(); // 기존의 orbitControls 제거
            orbitControls = null;
            orbitControls = new OrbitControls(camera, renderer.domElement);
            orbitControls.enableDamping = true;
            this.perspective = "Perspective";
        }
    };
};

const guiCamera = gui.addFolder('Camera');
guiCamera.add(controls, 'switchCamera').name('Change Camera Type');
guiCamera.add(controls, 'perspective').listen().name('Current Camera');

const guiMercury = gui.addFolder('Mercury');
guiMercury.add(mercuryGUI, 'rotationSpeed', 0, 0.1).name('Rotation Speed');
guiMercury.add(mercuryGUI, 'orbitSpeed', 0, 0.1).name('Orbit Speed');

const guiVenus = gui.addFolder('Venus');
guiVenus.add(venusGUI, 'rotationSpeed', 0, 0.1).name('Rotation Speed');
guiVenus.add(venusGUI, 'orbitSpeed', 0, 0.1).name('Orbit Speed');

const guiEarth = gui.addFolder('Earth');
guiEarth.add(earthGUI, 'rotationSpeed', 0, 0.1).name('Rotation Speed');
guiEarth.add(earthGUI, 'orbitSpeed', 0, 0.1).name('Orbit Speed');

const guiMars = gui.addFolder('Mars');
guiMars.add(marsGUI, 'rotationSpeed', 0, 0.1).name('Rotation Speed');
guiMars.add(marsGUI, 'orbitSpeed', 0, 0.1).name('Orbit Speed');

render();

function render() {

    orbitControls.update();
    stats.update();

    Mercury.rotation.y += mercuryGUI.rotationSpeed;
    pivotMercury.rotation.y += mercuryGUI.orbitSpeed;

    Venus.rotation.y += venusGUI.rotationSpeed;
    pivotVenus.rotation.y += venusGUI.orbitSpeed;

    Earth.rotation.y += earthGUI.rotationSpeed;
    pivotEarth.rotation.y += earthGUI.orbitSpeed;

    Mars.rotation.y += marsGUI.rotationSpeed;
    pivotMars.rotation.y += marsGUI.orbitSpeed;

    renderer.render(scene, camera);
    requestAnimationFrame(render);
}