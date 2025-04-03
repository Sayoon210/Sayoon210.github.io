#version 300 es

precision mediump float;
in vec4 v_color;
out vec4 fragColor;
uniform vec4 b_color;

void main() {
    fragColor = v_color;
} 