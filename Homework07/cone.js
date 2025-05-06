/*--------------------------------------------------------------------------------
    Homework 07

    <21조>
    2020142149 김사윤
    2021119047 한민석

    (FLAT) 외적 결과를 활용하여 법선 벡터로 사용 
        const nx = z1_bot - z0_bot;
        const ny = x0_bot * z1_bot - z0_bot * x1_bot;
        const nz = x0_bot - x1_bot;

    (SMOOTH) cylinder.js과 마찬가지로 해당 vertex의 좌표를 활용해서 법선벡터로 이용
        직각삼각형 닮음을 이용해 해당 vertex의 x, z 좌표에서 y 성분은 0.5의 절반인 0.25임을 확인
        꼭짓점의 normal이 (0,1,0)임을 고려하여 코드 작성
    
    texture는 사용하지 않으므로 주석처리하였음.
----------------------------------------------------------------------------------*/


export class Cone {
    /**
     * @param {WebGLRenderingContext} gl         - WebGL 렌더링 컨텍스트
     * @param {number} segments                 - 옆면 세그먼트 수 (원 둘레를 몇 등분할지)
     * @param {object} options
     *        options.color : [r, g, b, a] 형태의 색상 (기본 [0.8, 0.8, 0.8, 1.0])
     */
    constructor(gl, segments = 32, options = {}) {
        this.gl = gl;

        // VAO, VBO, EBO 생성
        this.vao = gl.createVertexArray();
        this.vbo = gl.createBuffer();
        this.ebo = gl.createBuffer();

        // 파라미터 설정
        const radius = 0.5;     // 원뿔 반지름
        const halfH = 0.5;      // 높이의 절반 (y=-0.5 ~ y=0.5)
        this.segments = segments;

        // 세그먼트별 각도 간격
        const angleStep = (2 * Math.PI) / segments;

        // 정점/법선/색상/텍스처좌표/인덱스 데이터를 담을 임시 배열
        const positions = [];
        const normals = [];
        const colors = [];
        const indices = [];

        // 옵션에서 color가 있으면 사용, 없으면 기본값 사용
        const defaultColor = [0.8, 0.8, 0.8, 1.0];
        const colorOption = options.color || defaultColor;

        // 각 세그먼트별로 삼각형(face)을 만든다.
        // 삼각형 정점 순서(외부에서 본 CCW): top -> bot0 -> bot1
        //  - bot1: angle1, y= -0.5
        //  - bot0: angle0, y= -0.5
        for (let i = 0; i < segments; i++) {
            const angle0 = i * angleStep;
            const angle1 = (i + 1) * angleStep;

            const x_top = 0
            const z_top = 0
            const x0_bot = radius * Math.cos(angle0);
            const z0_bot = radius * Math.sin(angle0);
            const x1_bot = radius * Math.cos(angle1);
            const z1_bot = radius * Math.sin(angle1);

            // 각 face의 3개 정점 (CCW) 9개의 값
            positions.push(
                // top0
                x_top, halfH, z_top,
                // bot0
                x0_bot, -halfH, z0_bot,
                // bot1
                x1_bot, -halfH, z1_bot
            );

            // 외적 결과를 활용하여 법선 벡터로 사용
            const nx = z1_bot - z0_bot;
            const ny = x0_bot * z1_bot - z0_bot * x1_bot;
            const nz = x0_bot - x1_bot;
            const len = Math.sqrt(nx * nx + nz * nz + ny * ny);
            for (let k = 0; k < 3; k++) {
                normals.push(nx / len, ny / len, nz / len);
            }

            // 색상도 마찬가지로 4정점 동일
            for (let k = 0; k < 3; k++) {
                colors.push(
                    colorOption[0],
                    colorOption[1],
                    colorOption[2],
                    colorOption[3]
                );
            }

            // 인덱스 (삼각형)
            // 이번 face가 i번째면, 정점 baseIndex = i*3
            const base = i * 3;
            indices.push(
                base, base + 1, base + 2,
            );
        }

        // Float32Array/Uint16Array에 담기
        this.vertices = new Float32Array(positions);
        this.normals = new Float32Array(normals);
        this.colors = new Float32Array(colors);
        //this.texCoords= new Float32Array(texCoords);
        this.indices = new Uint16Array(indices);

        // backup normals (for flat/smooth shading)
        this.faceNormals = new Float32Array(this.normals);
        this.vertexNormals = new Float32Array(this.normals);
        this.computeVertexNormals();
        console.log(this.normals);
        // WebGL 버퍼 초기화
        this.initBuffers();
    }

    /**
     * Smooth Shading
     */

    // vertex => face normal들의 average를 담아놓는거가 smooth
    // 여기서는 편의를 위해 각 vertex의 성분을 활용하여 계산에 사용용
    computeVertexNormals() {
        const vCount = this.vertices.length / 3;
        // 새로 계산된 smooth 노말을 담을 버퍼 (vertices와 동일 크기)
        this.vertexNormals = new Float32Array(this.vertices.length);
        for (let i = 0; i < vCount; i++) {
            const x = this.vertices[i * 3 + 0];
            const y = 0.25;
            const z = this.vertices[i * 3 + 2];

            // 정규화를 위한 길이
            const len = Math.sqrt(x * x + y * y + z * z);

            if (i % 3 == 0) { // 꼭짓점은 0, 3, 6, ... 에 위치하므로
                this.vertexNormals[i * 3 + 0] = 0;
                this.vertexNormals[i * 3 + 1] = 1; // 그냥 y축 위로
                this.vertexNormals[i * 3 + 2] = 0;
            }
            if (len > 0) {
                this.vertexNormals[i * 3 + 0] = x / len;
                this.vertexNormals[i * 3 + 1] = y / len;
                this.vertexNormals[i * 3 + 2] = z / len;
            } else {
                // 혹시 모를 예외 상황(정말로 x=z=0이라면)
                this.vertexNormals[i * 3 + 0] = 0;
                this.vertexNormals[i * 3 + 1] = 1; // 그냥 y축 위로
                this.vertexNormals[i * 3 + 2] = 0;
            }


        }
        console.log(this.vertexNormals);
    }


    // faceNormals -> normals 복사
    copyFaceNormalsToNormals() {
        this.normals.set(this.faceNormals);
    }

    // vertexNormals -> normals 복사
    copyVertexNormalsToNormals() {
        this.normals.set(this.vertexNormals);
    }

    initBuffers() {
        const gl = this.gl;

        // 배열 크기 측정
        const vSize = this.vertices.byteLength;
        const nSize = this.normals.byteLength;
        const cSize = this.colors.byteLength;
        //const tSize = this.texCoords.byteLength;
        const totalSize = vSize + nSize + cSize;// + tSize;

        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, totalSize, gl.STATIC_DRAW);

        // 순서대로 복사 (positions -> normals -> colors -> texCoords)
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize, this.colors);
        //gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize + cSize, this.texCoords);

        // 인덱스 버퍼 (EBO)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        // vertexAttribPointer 설정
        // (shader의 layout: 0->pos, 1->normal, 2->color, 3->texCoord)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);  // positions
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, vSize); // normals
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, vSize + nSize); // colors
        //gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, vSize + nSize + cSize); // texCoords

        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.enableVertexAttribArray(2);
        //gl.enableVertexAttribArray(3);

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    /**
     * normals 배열 일부만 업데이트하고 싶을 때 (ex: Face/Vertex normal 토글 후)
     */
    updateNormals() {
        const gl = this.gl;
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        const vSize = this.vertices.byteLength;
        // normals 부분만 다시 업로드
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }

    /**
     * 그리기
     * @param {Shader} shader - 사용할 셰이더
     */
    draw(shader) {
        const gl = this.gl;
        shader.use();
        gl.bindVertexArray(this.vao);
        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }

    /**
     * 리소스 해제
     */
    delete() {
        const gl = this.gl;
        gl.deleteBuffer(this.vbo);
        gl.deleteBuffer(this.ebo);
        gl.deleteVertexArray(this.vao);
    }
}
