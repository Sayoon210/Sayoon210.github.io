/*-----------------------------------------------------------------------------
class regularOctahedron

Homework06
<21조>
2020142149 김사윤
2021119047 한민석

2021147557 이재근
-----------------------------------------------------------------------------*/

export class regularOctahedron {
    constructor(gl, options = {}) {
        this.gl = gl;
        
        // Creating VAO and buffers
        this.vao = gl.createVertexArray();
        this.vbo = gl.createBuffer();
        this.ebo = gl.createBuffer();

        // Initializing data
        this.vertices = new Float32Array([
           
            0.5, 0, 0.5,   -0.5, 0, 0.5,  0, 0.707, 0,
            0.5, 0, 0.5,   -0.5, 0, 0.5,  0, -0.707, 0,

            -0.5, 0, 0.5,   -0.5, 0, -0.5,  0, 0.707, 0,
            -0.5, 0, 0.5,   -0.5, 0, -0.5,  0, -0.707, 0,

            -0.5, 0, -0.5,   0.5, 0, -0.5,  0, 0.707, 0,
            -0.5, 0, -0.5,   0.5, 0, -0.5,  0, -0.707, 0,

            0.5, 0, -0.5,   0.5, 0, 0.5,  0, 0.707, 0,
            0.5, 0, -0.5,   0.5, 0, 0.5,  0, -0.707, 0,
            
          ]);

        this.texCoords = new Float32Array([

            // right face (014 015)
            0.75,0.5, 0.25,0.5, 0.5,1.0,
            0.75,0.5, 0.25,0.5, 0.5,0.0,

            0.25,0.5, 0.0,0.75, 0.5,1.0,
            0.25,0.5, 0.0,0.75, 0.5,0.0,

            0.0,0.75, 0.75,0.75, 0.5,1.0,
            0.0,0.75, 0.75,0.75, 0.5,0.0,

            0.75, 0.75,  0.75,0.5,  0.5,1.0,
            0.75, 0.75,  0.75,0.5,  0.5,0.0,

        ]);

        this.indices = new Uint16Array([
            0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24
        ]);

        this.initBuffers();
    }

    initBuffers() {
        const gl = this.gl;

        // 버퍼 크기 계산
        const vSize = this.vertices.byteLength;
        const tSize = this.texCoords.byteLength;
        const totalSize = vSize + tSize;

        gl.bindVertexArray(this.vao);

        // VBO에 데이터 복사
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, totalSize, gl.STATIC_DRAW);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.texCoords);

        // EBO에 인덱스 데이터 복사
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        // vertex attributes 설정
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);  // position
        gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, vSize);

        // vertex attributes 활성화
        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(3);

        // 버퍼 바인딩 해제
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }

    draw(shader) {

        const gl = this.gl;
        shader.use();
        gl.bindVertexArray(this.vao);
        gl.drawElements(gl.TRIANGLES, 24, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }

    delete() {
        const gl = this.gl;
        gl.deleteBuffer(this.vbo);
        gl.deleteBuffer(this.ebo);
        gl.deleteVertexArray(this.vao);
    }
} 