#version 300 es

layout (location = 0) in vec3 aPos;

uniform float moveX;
uniform float moveY;

void main() {
    gl_Position = vec4(aPos[0] + moveX, aPos[1] + moveY, aPos[2], 1.0);
} 