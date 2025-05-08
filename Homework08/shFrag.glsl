#version 300 es

/*

<21조>
2020142149 김사윤
2021119047 한민석

diffuse 최대 1 최소 0
specular은 최대 1 최소 0

양자화 방법은 (value * level)에 floor를 취해서 (크지 않은 정수 중 가장 큰 정수으로 근사)
그 값을 다시 level로 나누어주면 양자화가 완료됨
ex) 0 ~ 1 사이의 값 0.86을 5단계로 양자화
1. 0.86 * 5 = 4.3
2. floor을 취하면 4로 양자화 (즉, 0.8 ~ 0.999.. 까진 전부 4로 양자화 될 것임)
3. 다시 level로 나누어주면 원래 범위인 0 ~ 1 에서 level만큼 양자화된 값 중 하나로 나옴

*/


precision highp float;

out vec4 FragColor;
in vec3 fragPos;  
in vec3 normal;  
//in vec2 texCoord;

struct Material {
    vec3 diffuse; // diffuse map
    vec3 specular;     // 표면의 specular color
    float shininess;   // specular 반짝임 정도
};

struct Light {
    //vec3 position;
    vec3 direction;
    vec3 ambient; // ambient 적용 strength
    vec3 diffuse; // diffuse 적용 strength
    vec3 specular; // specular 적용 strength
};

uniform Material material;
uniform Light light;
uniform vec3 u_viewPos;

uniform int u_quantLevel;   // quantization 변경 uniform 변수

void main() {
    // ambient
    vec3 rgb = material.diffuse;
    vec3 ambient = light.ambient * rgb;
  	
    // diffuse 
    vec3 norm = normalize(normal);
    //vec3 lightDir = normalize(light.position - fragPos);
    vec3 lightDir = normalize(light.direction); // directional light
    float dotNormLight = dot(norm, lightDir);
    float diff = max(dotNormLight, 0.0);
     
    
    // specular
    vec3 viewDir = normalize(u_viewPos - fragPos);
    vec3 reflectDir = reflect(-lightDir, norm);
    float spec = 0.0;
    if (dotNormLight > 0.0) {
        spec = pow(max(dot(viewDir, reflectDir), 0.0), material.shininess);
    }
    

    //// quantization code////
    int quantLevel = u_quantLevel;
    float fullLevel = float(1 / quantLevel);
    float quantDiff = floor(diff * float(quantLevel)) / float(quantLevel);
    float quantSpec = floor(spec * float(quantLevel)) / float(quantLevel);
    //////////////////////////

    vec3 diffuse = light.diffuse * quantDiff * rgb; 
    vec3 specular = light.specular * quantSpec * material.specular;
    vec3 result = ambient + diffuse + specular;
    FragColor = vec4(result, 1.0);
} 