/*-------------------------------------------------------------------------
Homework 02
---------------------------------------------------------------------------*/

// 6) Shader 들은 독립된 파일로 저장하여 읽어 들여야 합니다. 
import { resizeAspectRatio, setupText, updateText } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;   // shader program
let vao;      // vertex array object
let textOverlay3; // for text output third line (see util.js)

// shVert 내에 있는 Uniform 바꾸는 역할
// 4) 이동된 사각형의 좌표는 vertex shader에서 uniform variable을 이용하여 수정합니다.
let moveX = 0;
let moveY = 0;

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    // 1) 처음 실행했을 때, canvas의 크기는 600 x 600 이어야 합니다.  
    canvas.width = 600;
    canvas.height = 600;

    // 8) resizeAspectRatio() utility function을 이용하여 가로와 세로의 비율이 1:1 을 항상 유지하도록 합니다.
    resizeAspectRatio(gl, canvas);

    // Initialize
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0, 0, 1.0);

    return true;
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

// 3) 화살표 key를 한번 누를 때 x 또는 y 방향으로 +0.01 또는 -0.01씩 이동합니다. 
// 사각형이 canvas 밖으로 벗어나지 않도록 이동 범위가 제한되어야 합니다. 
function setupKeyboardEvents() {
    document.addEventListener('keydown', (event) => {
        if (event.key == 'ArrowUp') {
            if (moveY < 0.9) {
                moveY = moveY + 0.01;
            }
        }
        else if (event.key == 'ArrowDown') {
            if (moveY > -0.9) {
                moveY = moveY - 0.01;
            }
        }
        else if (event.key == 'ArrowRight') {
            if (moveX < 0.9) {
                moveX = moveX + 0.01;
            }
        }
        else if (event.key == 'ArrowLeft') {
            if (moveX > -0.9) {
                moveX = moveX - 0.01;
            }
        }
    });
}

function setupBuffers() {

    // 2) 처음 실행했을 때, 정사각형의 한 변의 길이는 0.2 이며, 정사각형은 canvas 중앙에 위치 합니다
    const vertices = new Float32Array([
        -0.1, -0.1, 0.0,  // Bottom left
        0.1, -0.1, 0.0,  // Bottom right
        0.1, 0.1, 0.0,  // Top right
        -0.1, 0.1, 0.0   // Top left
    ]);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    shader.setAttribPointer('aPos', 3, gl.FLOAT, false, 0, 0);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    let color = [1.0, 0.0, 0.0, 1.0];

    shader.setVec4("uColor", color);
    shader.setFloat("moveY", moveY);
    shader.setFloat("moveX", moveX);

    // 5) 정사각형은 index를 사용하지 않고 draw하며 primitive는 TRIANGLE_FAN을 사용합니다. 
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    requestAnimationFrame(() => render());
}

async function main() {
    try {

        // WebGL 초기화
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }

        // 셰이더 초기화
        await initShader();

        // 7) “Use arrow keys to move the rectangle” message를 canvas 위에 표시합니다. 
        textOverlay3 = setupText(canvas, "Use arrow keys to move the rectangle", 1);

        // 키보드 이벤트 설정
        setupKeyboardEvents();

        // 나머지 초기화
        setupBuffers(shader);
        shader.use();

        // 렌더링 시작
        render();

        return true;

    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}

// call main function
main().then(success => {
    if (!success) {
        console.log('프로그램을 종료합니다.');
        return;
    }
}).catch(error => {
    console.error('프로그램 실행 중 오류 발생:', error);
});
