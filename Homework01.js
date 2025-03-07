const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');

if (!gl) {
    console.error('WebGL 2 is not supported by your browser.');
}

// Set canvas size: 500x500
canvas.width = 500;
canvas.height = 500;

// Initialize WebGL settings: viewport and clear color
gl.viewport(0, 0, canvas.width, canvas.height);
gl.clearColor(0,0,0, 1.0);

// Start rendering
render();

// Render loop
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);    
    // Draw something here
}

// Resize viewport when window size changes
window.addEventListener('resize', () => {
    let minLength = Math.min(window.innerWidth, window.innerHeight);
    canvas.width = minLength;
    canvas.height = minLength;
    gl.viewport(0, 0, canvas.width, canvas.height);
    render();
});

