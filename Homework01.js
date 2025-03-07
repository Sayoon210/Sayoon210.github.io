const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');

if (!gl) {
    console.error('WebGL 2 is not supported by your browser.');
}

canvas.width = 500;
canvas.height = 500;

// Initialize WebGL settings: viewport and clear color
gl.viewport(0, 0, canvas.width, canvas.height);
gl.clearColor(0, 0, 0, 1.0);

render(250, 250);

// 디버깅용 로그
console.log('Initialize Success');

// Scissors를 이용해서 Canvas를 나눈다 <-- 허용되나?
function colorBox(x, y, w, h, c1, c2, c3, opac) {
    gl.enable(gl.SCISSOR_TEST);
    gl.viewport(x, y, w, h);
    gl.scissor(x, y, w, h);
    gl.clearColor(c1, c2, c3, opac);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

// Render loop
function render(w_half, h_half) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    console.log(w_half + ' ' + h_half + ' rendered');
    colorBox(0, 0, w_half, h_half, 0, 0, 1, 1.0);
    colorBox(w_half, 0, w_half, h_half, 1, 1, 0, 1.0);
    colorBox(0, h_half, w_half, h_half, 1, 0, 0, 1.0);
    colorBox(w_half, h_half, w_half, h_half, 0, 1, 0, 1.0);
    gl.disable(gl.SCISSOR_TEST);
}

// Resize viewport when window size changes
window.addEventListener('resize', () => {
    let minLength = Math.min(window.innerWidth, window.innerHeight);
    console.log('min: ' + minLength);
    canvas.width = minLength;
    canvas.height = minLength;
    let w_half = canvas.width / 2;
    let h_half = canvas.height / 2;
    render(w_half, h_half);
});

