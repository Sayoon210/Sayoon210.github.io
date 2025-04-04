/*-------------------------------------------------------------------------

Homework 04

<21조>
2021119047 한민석
2020142149 김사윤
2021147557 이재근

---------------------------------------------------------------------------*/

import { resizeAspectRatio, setupText, updateText, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

let isInitialized = false;
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let axesVAO;
let cubeVAO;
let finalTransform;
let finalTransformEarth;
let rotationAngle = 0;
//let currentTransformType = null;
let isAnimating = true;
let lastTime = 0;
// let textOverlay;

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log("Already initialized");
        return;
    }

    main().then(success => {
        if (!success) {
            console.log('프로그램을 종료합니다.');
            return;
        }
        isInitialized = true;
        requestAnimationFrame(animate);
    }).catch(error => {
        console.error('프로그램 실행 중 오류 발생:', error);
    });
});

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.2, 0.3, 0.4, 1.0);

    return true;
}

function setupAxesBuffers(shader) {
    axesVAO = gl.createVertexArray();
    gl.bindVertexArray(axesVAO);

    const axesVertices = new Float32Array([
        -1.0, 0.0, 1.0, 0.0,  // x축
        0.0, -1.0, 0.0, 1.0   // y축
    ]);

    const axesColors = new Float32Array([
        1.0, 0.3, 0.0, 1.0, 1.0, 0.3, 0.0, 1.0,  // x축 색상
        0.0, 1.0, 0.5, 1.0, 0.0, 1.0, 0.5, 1.0   // y축 색상
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, axesVertices, gl.STATIC_DRAW);
    shader.setAttribPointer("a_position", 2, gl.FLOAT, false, 0, 0);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, axesColors, gl.STATIC_DRAW);
    shader.setAttribPointer("a_color", 4, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
}

function setupCubeBuffers(shader) {
    const cubeVertices = new Float32Array([
        -0.5, 0.5,  // 좌상단
        -0.5, -0.5,  // 좌하단
        0.5, -0.5,  // 우하단
        0.5, 0.5   // 우상단
    ]); // scale 을 해라

    const indices = new Uint16Array([
        0, 1, 2,    // 첫 번째 삼각형
        0, 2, 3     // 두 번째 삼각형
    ]);

    const cubeColors = new Float32Array([
        1.0, 0.0, 0.0, 1.0,  // 빨간색
        1.0, 0.0, 0.0, 1.0,
        1.0, 0.0, 0.0, 1.0,
        1.0, 0.0, 0.0, 1.0
    ]);

    cubeVAO = gl.createVertexArray();
    gl.bindVertexArray(cubeVAO);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);
    shader.setAttribPointer("a_position", 2, gl.FLOAT, false, 0, 0);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeColors, gl.STATIC_DRAW);
    shader.setAttribPointer("a_color", 4, gl.FLOAT, false, 0, 0);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
}


///////////////////////////////////////////////////////////
///////모든 Matrix는 원점 기준으로 생각해서 적용함!!!/////////
///////////////////////////////////////////////////////////

function applyTransformSun() {
    finalTransform = mat4.create();
    const S = mat4.create();
    const R = mat4.create();
    mat4.scale(S, S, [0.2, 0.2, 1]);
    mat4.multiply(finalTransform, S, finalTransform);
    mat4.rotate(R, R, rotationAngle / 4, [0, 0, 1]);
    mat4.multiply(finalTransform, R, finalTransform);
}

function applyTransformEarth() {
    finalTransform = mat4.create();
    const S = mat4.create();
    const T = mat4.create();
    const R_s = mat4.create();
    const R_a = mat4.create();

    mat4.rotate(R_s, R_s, rotationAngle, [0, 0, 1]);
    mat4.multiply(finalTransform, R_s, finalTransform);
    mat4.scale(S, S, [0.1, 0.1, 1]);
    mat4.multiply(finalTransform, S, finalTransform);
    mat4.translate(T, T, [0.7, 0.0, 0.0]);
    mat4.multiply(finalTransform, T, finalTransform);
    mat4.rotate(R_a, R_a, rotationAngle / 6, [0, 0, 1]);
    mat4.multiply(finalTransform, R_a, finalTransform);
}

function applyTransformMoon() {
    finalTransform = mat4.create();
    const S = mat4.create();
    const T = mat4.create();
    const R_s = mat4.create();
    const R_a = mat4.create();
    const R_e = mat4.create();

    mat4.rotate(R_s, R_s, rotationAngle, [0, 0, 1]);
    mat4.multiply(finalTransform, R_s, finalTransform);
    mat4.scale(S, S, [0.05, 0.05, 1]);
    mat4.multiply(finalTransform, S, finalTransform);
    mat4.translate(T, T, [0.2, 0.0, 0]);
    mat4.multiply(finalTransform, T, finalTransform);
    mat4.rotate(R_a, R_a, rotationAngle * 2, [0, 0, 1]);
    mat4.multiply(finalTransform, R_a, finalTransform);
    // follow earth
    mat4.translate(T, T, [0.5, 0, 0]);
    mat4.multiply(finalTransform, T, finalTransform);
    mat4.rotate(R_e, R_e, rotationAngle / 6, [0, 0, 1]);
    mat4.multiply(finalTransform, R_e, finalTransform);
}

function render() {
    const cubeColors1 = new Float32Array([
        1.0, 0.0, 0.0, 1.0,  // 빨간색
        1.0, 0.0, 0.0, 1.0,
        1.0, 0.0, 0.0, 1.0,
        1.0, 0.0, 0.0, 1.0
    ]);

    const cubeColors2 = new Float32Array([
        0.0, 0.0, 1.0, 1.0,  // blue
        0.0, 0.0, 1.0, 1.0,
        0.0, 0.0, 1.0, 1.0,
        0.0, 0.0, 1.0, 1.0
    ]);

    const cubeColors3 = new Float32Array([
        1.0, 1.0, 0.0, 1.0,  // yellow
        1.0, 1.0, 0.0, 1.0,
        1.0, 1.0, 0.0, 1.0,
        1.0, 1.0, 0.0, 1.0
    ]);

    gl.clear(gl.COLOR_BUFFER_BIT);

    shader.use();

    // 축 그리기
    shader.setMat4("u_transform", mat4.create());
    gl.bindVertexArray(axesVAO);
    gl.drawArrays(gl.LINES, 0, 4);


    ///////////////
    ///// SUN /////
    ///////////////
    applyTransformSun();
    shader.setMat4("u_transform", finalTransform);
    gl.bindVertexArray(cubeVAO);
    ///////// bind 이후에 버퍼를 수정 /////////
    const colorBuffer1 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer1);
    gl.bufferData(gl.ARRAY_BUFFER, cubeColors1, gl.STATIC_DRAW);
    shader.setAttribPointer("a_color", 4, gl.FLOAT, false, 0, 0);
    ///////// bind 끝난 이후에 draw를 수행 /////////
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);



    ///////////////
    //// Earth ////
    ///////////////
    applyTransformEarth();
    shader.setMat4("u_transform", finalTransform);
    finalTransformEarth = finalTransform;
    gl.bindVertexArray(cubeVAO);
    ///////// bind 이후에 버퍼를 수정 /////////
    const colorBuffer2 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer2);
    gl.bufferData(gl.ARRAY_BUFFER, cubeColors2, gl.STATIC_DRAW);
    shader.setAttribPointer("a_color", 4, gl.FLOAT, false, 0, 0);
    ///////// bind 끝난 이후에 draw를 수행 /////////
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);


    ///////////////
    //// Moon  ////
    ///////////////
    applyTransformMoon();
    shader.setMat4("u_transform", finalTransform);
    gl.bindVertexArray(cubeVAO);
    ///////// bind 이후에 버퍼를 수정 /////////
    const colorBuffer3 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer3);
    gl.bufferData(gl.ARRAY_BUFFER, cubeColors3, gl.STATIC_DRAW);
    shader.setAttribPointer("a_color", 4, gl.FLOAT, false, 0, 0);
    ///////// bind 끝난 이후에 draw를 수행 /////////
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

// 이미 설정을 다 해놓고 렌더링링
function animate(currentTime) {
    if (!lastTime) { lastTime = currentTime; rotationAngle = 0; } // if lastTime == 0
    // deltaTime: 이전 frame에서부터의 elapsed time (in seconds)
    let deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    if (isAnimating) {
        rotationAngle += Math.PI * deltaTime;
        //console.log('rotate: ' + deltaTime);
    }
    render();

    requestAnimationFrame(animate);
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    return new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }

        finalTransform = mat4.create();

        shader = await initShader();
        setupAxesBuffers(shader);
        setupCubeBuffers(shader);
        // textOverlay = setupText(canvas, 'NO TRANSFORMATION', 1);
        // setupText(canvas, 'press 1~7 to apply different order of transformations', 2);
        // setupKeyboardEvents();
        shader.use();
        rotationAngle = 0;
        animate();
        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}
