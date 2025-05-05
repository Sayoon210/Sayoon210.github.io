#version 300 es

precision highp float;

flat in vec3 lightingColor;

in vec3 normView; // test
in vec3 fragPos;  
in vec3 normal;  
out vec4 FragColor;

struct Material {
    vec3 diffuse;       // surface's diffuse color
    vec3 specular;      // surface's specular color
    float shininess;    // specular shininess
};

struct Light {
    vec3 position;      // light position
    vec3 ambient;       // ambient strength
    vec3 diffuse;       // diffuse strength
    vec3 specular;      // specular strength
};

uniform Material material;
uniform Light light;
uniform vec3 u_viewPos;

// 셰이더 변경용 변수
uniform int uMode;

void main() {


    // key change block
    if (uMode == 1) {
    // ambient
        vec3 rgb = material.diffuse;
        vec3 ambient = light.ambient * rgb;
        
        // diffuse 
        vec3 norm = normalize(normal);
        vec3 lightDir = normalize(light.position - fragPos);
        float dotNormLight = dot(norm, lightDir);
        float diff = max(dotNormLight, 0.0);
        vec3 diffuse = light.diffuse * diff * rgb;  
        
        // specular
        vec3 viewDir = normalize(u_viewPos - fragPos);
        vec3 reflectDir = reflect(lightDir, norm);
        float spec;
        if (dotNormLight > 0.0) {
            spec = pow(max(dot(viewDir, reflectDir), 0.0), material.shininess);
        }
        else spec = 0.0f;
        vec3 specular = light.specular * (spec * material.specular);  
            
        vec3 result = ambient + diffuse;// + specular;
        FragColor = vec4(result, 1.0);
    }
    else {
        //FragColor = vec4(normView * 0.5 + 0.5, 1.0); // color test
        FragColor = vec4(lightingColor, 1.0);
    }
}