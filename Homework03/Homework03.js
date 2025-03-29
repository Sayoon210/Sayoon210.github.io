/*-------------------------------------------------------------------------
Homework03

<21조>
2021119047 한민석
2020142149 김사윤
2021147557 이재근
---------------------------------------------------------------------------*/
import { resizeAspectRatio, setupText, updateText, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

// Global variables
let isInitialized = false; // global variable로 event listener가 등록되었는지 확인
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let vao;
let positionBuffer; // 2D 버텍스 버퍼
let RADIUS;
let isDrawing = false; // 마우스 버튼을 누르고 있느냐 판단
let isDrawingCircle = true;
let startPoint = null; // 첫 시작 점 (마우스 누른 시점)
let tempEndPoint = null; // 끝점을 계속 업데이트해서 임시 선을 띄우는 역할

let center = [];

let lines = []; // 과제3에서는 원을 저장하는 array
let lines_2 = [];
let textOverlay; // 1st Line Segment
let textOverlay2; // 2nd Line Segment
let textOverlay3;
let axes = new Axes(gl, 0.85); // x, y 축 그려주는 부분
let lineIndex = 0;

const SEGMENT = 100;


// DOMContentLoaded event
// 1) 모든 HTML 문서가 완전히 load되고 parsing된 후 발생
// 2) 모든 resource (images, css, js 등) 가 완전히 load된 후 발생
// 3) 모든 DOM 요소가 생성된 후 발생
// DOM: Document Object Model로 HTML의 tree 구조로 표현되는 object model 
// 모든 code를 이 listener 안에 넣는 것은 mouse click event를 원활하게 처리하기 위해서임

// mouse 쓸 때 main call 방법
document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log("Already initialized");
        return;
    }

    main().then(success => { // call main function
        if (!success) {
            console.log('프로그램을 종료합니다.');
            return;
        }
        isInitialized = true;
    }).catch(error => {
        console.error('프로그램 실행 중 오류 발생:', error);
    });
});

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.7, 0.8, 0.9, 1.0);

    return true;
}

function setupCanvas() {
    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.2, 0.3, 1.0);
}

function setupBuffers(shader) {
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // x, y 2개여서 2를 적어두었음.
    shader.setAttribPointer('a_position', 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
}

// 좌표 변환 함수: 캔버스 좌표를 WebGL 좌표로 변환
// 캔버스 좌표: 캔버스 좌측 상단이 (0, 0), 우측 하단이 (canvas.width, canvas.height)
// WebGL 좌표 (NDC): 캔버스 좌측 상단이 (-1, 1), 우측 하단이 (1, -1)
function convertToWebGLCoordinates(x, y) {
    return [
        (x / canvas.width) * 2 - 1,
        -((y / canvas.height) * 2 - 1)
    ];
}

/* 
    browser window
    +----------------------------------------+
    | toolbar, address bar, etc.             |
    +----------------------------------------+
    | browser viewport (컨텐츠 표시 영역)       | 
    | +------------------------------------+ |
    | |                                    | |
    | |    canvas                          | |
    | |    +----------------+              | |
    | |    |                |              | |
    | |    |      *         |              | |
    | |    |                |              | |
    | |    +----------------+              | |
    | |                                    | |
    | +------------------------------------+ |
    +----------------------------------------+

    *: mouse click position

    event.clientX = browser viewport 왼쪽 경계에서 마우스 클릭 위치까지의 거리
    event.clientY = browser viewport 상단 경계에서 마우스 클릭 위치까지의 거리
    rect.left = browser viewport 왼쪽 경계에서 canvas 왼쪽 경계까지의 거리
    rect.top = browser viewport 상단 경계에서 canvas 상단 경계까지의 거리

    x = event.clientX - rect.left  // canvas 내에서의 클릭 x 좌표
    y = event.clientY - rect.top   // canvas 내에서의 클릭 y 좌표
*/

function setupMouseEvents() {
    function handleMouseDown(event) {
        event.preventDefault(); // 존재할 수 있는 기본 동작을 방지
        event.stopPropagation(); // event가 상위 요소로 전파되지 않도록 방지

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (!isDrawing) { // 1번 또는 2번 선분을 그리고 있는 도중이 아닌 경우
            // 캔버스 좌표를 WebGL 좌표로 변환하여 선분의 시작점을 설정
            let [glX, glY] = convertToWebGLCoordinates(x, y);
            startPoint = [glX, glY];
            if (isDrawingCircle) {
                center = startPoint;
            }
            isDrawing = true; // 이제 mouse button을 놓을 때까지 계속 true로 둠. 
        }
    }

    function handleMouseMove(event) {
        if (isDrawing && isDrawingCircle) { // 1번 또는 2번 선분을 그리고 있는 도중인 경우
            lines = [];
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            let [glX, glY] = convertToWebGLCoordinates(x, y);
            tempEndPoint = [glX, glY];

            let radius = 0;
            radius = ((startPoint[0] - tempEndPoint[0]) ** 2 + (startPoint[1] - tempEndPoint[1]) ** 2) ** 0.5;
            RADIUS = radius;
            let tempPoint = [];
            let nowPoint = [];
            let angle = 2 * Math.PI / SEGMENT;
            for (let i = 0; i < SEGMENT + 1; i++) {
                let circlePointX = startPoint[0] + radius * Math.cos(angle * i);
                let circlePointY = startPoint[1] + radius * Math.sin(angle * i);
                nowPoint = [circlePointX, circlePointY];
                if (i != 0) lines.push([...tempPoint, ...nowPoint]);
                tempPoint = nowPoint;
            }

            render();
        } else if (isDrawing && !isDrawingCircle) {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            let [glX, glY] = convertToWebGLCoordinates(x, y);
            tempEndPoint = [glX, glY]; // 임시 선분의 끝 point
            render();
        }
    }

    function handleMouseUp() {
        if (isDrawing && tempEndPoint) {

            // lines.push([...startPoint, ...tempEndPoint])
            //   : startPoint와 tempEndPoint를 펼쳐서 하나의 array로 합친 후 lines에 추가
            // ex) lines = [] 이고 startPoint = [1, 2], tempEndPoint = [3, 4] 이면,
            //     lines = [[1, 2, 3, 4]] 이 됨
            // ex) lines = [[1, 2, 3, 4]] 이고 startPoint = [5, 6], tempEndPoint = [7, 8] 이면,
            //     lines = [[1, 2, 3, 4], [5, 6, 7, 8]] 이 됨
            //lines.push([...startPoint, ...tempEndPoint]); 
            // if (lines.length == 1) {
            //     updateText(textOverlay, "First line segment: (" + lines[0][0].toFixed(2) + ", " + lines[0][1].toFixed(2) +
            //         ") ~ (" + lines[0][2].toFixed(2) + ", " + lines[0][3].toFixed(2) + ")");
            //     updateText(textOverlay2, "Click and drag to draw the second line segment");
            // }
            // else { // lines.length == 2
            //     updateText(textOverlay2, "Second line segment: (" + lines[1][0].toFixed(2) + ", " + lines[1][1].toFixed(2) +
            //         ") ~ (" + lines[1][2].toFixed(2) + ", " + lines[1][3].toFixed(2) + ")");
            // }
            if (!isDrawingCircle) {
                lines_2.push([...startPoint, ...tempEndPoint]);
            }
            updateText(textOverlay, "Circle: center (" + center[0].toFixed(2) + ", " + center[1].toFixed(2) +
                ") radius = " + RADIUS.toFixed(2));
            isDrawing = false;
            startPoint = null;
            tempEndPoint = null;
            render();
            isDrawingCircle = false;
        }
    }

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
}


function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    shader.use();

    // 저장된 선들 그리기
    let num = 0;
    if (isDrawing && isDrawingCircle) {
        for (let line of lines) {
            if (num <= SEGMENT) {
                shader.setVec4("u_color", [0.5, 0.5, 0.5, 1.0]);
            }
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(line), gl.STATIC_DRAW);
            gl.bindVertexArray(vao);
            gl.drawArrays(gl.LINES, 0, SEGMENT + 1);
            num++;
        }
    }
    else {
        for (let line of lines) {
            if (num <= SEGMENT) {
                shader.setVec4("u_color", [1.0, 1.0, 0.0, 1.0]);
            }
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(line), gl.STATIC_DRAW);
            gl.bindVertexArray(vao);
            gl.drawArrays(gl.LINES, 0, SEGMENT + 1);
            num++;
        }
        //isDrawingCircle = false;
    }
    //if(!isDrawing) 
    num = 0;
    // 임시 선 그리기
    if (!isDrawingCircle) {
        if (isDrawing) {
            shader.setVec4("u_color", [0.5, 0.5, 0.5, 1.0]); // 임시 선분의 color는 회색
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...startPoint, ...tempEndPoint]), gl.STATIC_DRAW);
            gl.bindVertexArray(vao);
            gl.drawArrays(gl.LINES, 0, 2);
        } else {
            console.log("Draw Line");
            shader.setVec4("u_color", [1.0, 0.0, 0.0, 1.0]);
            let line2 = lines_2[lineIndex];
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(line2), gl.STATIC_DRAW);
            gl.bindVertexArray(vao);
            gl.drawArrays(gl.LINES, 0, 2);
            lineIndex++;

            updateText(textOverlay2, "First line segment: (" + line2[0].toFixed(2) + ", " + line2[1].toFixed(2) +
                ") ~ (" + line2[2].toFixed(2) + ", " + line2[3].toFixed(2) + ")");

            // 교점 계산 부분 y=ax+b
            let a = (line2[3] - line2[1]) / (line2[2] - line2[0]);
            let offset = -center[1] + a * center[0];
            let b = line2[1] - a * line2[0] + offset;
            console.log(center);
            let A = a ** 2 + 1;
            let B = 2 * a * b
            let C = b ** 2 - RADIUS ** 2
            let D = B ** 2 - 4 * A * C;

            // 선분 판별 부분
            let min_x = Math.min(line2[0], line2[2]);
            let max_x = Math.max(line2[0], line2[2]);
            let min_y = Math.min(line2[1], line2[3]);
            let max_y = Math.max(line2[1], line2[3]);

            shader.setVec4("u_color", [0.0, 1.0, 1.0, 1.0]);
            if (D > 0) {
                let x1 = (-B + D ** 0.5) / (2 * A) + center[0]; // 큰 x좌표
                let x2 = (-B - D ** 0.5) / (2 * A) + center[0]; // 작은 x좌표
                let y1 = a * (x1 - center[0]) + b + center[1];
                let y2 = a * (x2 - center[0]) + b + center[1];
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y2]), gl.STATIC_DRAW);
                gl.bindVertexArray(vao);



                // 몇개 닿았는지 판별
                let x1_valid = true;
                let x2_valid = true;

                if (x1 > max_x || x1 < min_x) x1_valid = false;
                if (x2 > max_x || x2 < min_x) x2_valid = false;

                if (x1_valid && x2_valid) {
                    console.log("2points");
                    gl.drawArrays(gl.POINTS, 0, 2);
                    updateText(textOverlay3, "Intersection Points: 2  Point 1: (" + x1.toFixed(2) + ", " + y1.toFixed(2) +
                        ") Point 2: (" + x2.toFixed(2) + ", " + y2.toFixed(2) + ")");
                } // 선분이 원에 둘다 닿았을 때
                else if (x1_valid || x2_valid) {
                    console.log("1point");
                    if (x1_valid) {
                        gl.drawArrays(gl.POINTS, 0, 1);
                        updateText(textOverlay3, "Intersection Points: 1  Point 1: (" + x1.toFixed(2) + ", " + y1.toFixed(2) + ")");
                    }
                    else if (x2_valid) {
                        gl.drawArrays(gl.POINTS, 1, 1);
                        updateText(textOverlay3, "Intersection Points: 1  Point 1: (" + x2.toFixed(2) + ", " + y2.toFixed(2) + ")");
                    }
                } else { 
                    console.log("NO DOT but D>0");
                    updateText(textOverlay3, "No Intersection Points."); 
                };





            } else if (D = 0) {
                let x_only = -B / 2 * A + center[0];
                let y_only = a * x_only + b + center[1];
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x_only, y_only]), gl.STATIC_DRAW);
                gl.bindVertexArray(vao);
                gl.drawArrays(gl.POINTS, 0, 1);
            } else { console.log("NODOT") };
        }
    }



    // 임시 선 그리기
    // axes 그리기
    axes.draw(mat4.create(), mat4.create());
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

        // 셰이더 초기화
        shader = await initShader();

        // 나머지 초기화
        setupCanvas();
        setupBuffers(shader);
        shader.use();

        // 텍스트 초기화
        textOverlay = setupText(canvas, "", 1);
        textOverlay2 = setupText(canvas, "", 2);
        textOverlay3 = setupText(canvas, "", 3);

        // 마우스 이벤트 설정
        setupMouseEvents();

        // 초기 렌더링
        render();

        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}
