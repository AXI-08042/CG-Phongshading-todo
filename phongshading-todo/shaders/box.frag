#version 300 es
precision mediump float;

out vec4 FragColor;

// 保留所有原有uniform和in变量
uniform float ambientStrength, specularStrength, diffuseStrength, shininess;
in vec3 Normal;
in vec3 FragPos;
in vec2 TexCoord;
in vec4 FragPosLightSpace;
uniform vec3 viewPos;
uniform vec4 u_lightPosition;
uniform vec3 lightColor;
uniform sampler2D diffuseTexture;
uniform sampler2D depthTexture;
uniform samplerCube cubeSampler;

// 新增：半透明相关uniform变量
uniform float transparency;  // 透明度因子(0.0-1.0)
uniform bool isTransparent;  // 是否启用半透明效果

float shadowCalculation(vec4 fragPosLightSpace, vec3 normal, vec3 lightDir)
{
    float shadow = 0.0;

    vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
    projCoords = projCoords * 0.5 + 0.5;

    if (projCoords.z > 1.0) {
        return shadow;
    }

    // 修复：将textureSize的整数向量转换为浮点向量后再做除法
    ivec2 depthTexSize = textureSize(depthTexture, 0); // 返回ivec2（整数向量）
    vec2 texelSize = 1.0 / vec2(depthTexSize); // 转换为vec2（浮点向量）后计算

    float bias = max(0.01 * (1.0 - dot(normal, lightDir)), 0.001);
    for(int x = -1; x <= 1; x++) {
        for(int y = -1; y <= 1; y++) {
            float pcfDepth = texture(depthTexture, projCoords.xy + vec2(x, y) * texelSize).r;
            shadow += (projCoords.z - bias > pcfDepth) ? 1.0 : 0.0;
        }
    }
    shadow /= 9.0;

    return shadow;
}   

void main()
{
    // 纹理采样
    vec3 TextureColor = texture(diffuseTexture, TexCoord).xyz;

    // 光照方向计算
    vec3 norm = normalize(Normal);
    vec3 lightDir = (u_lightPosition.w == 1.0) ? normalize(u_lightPosition.xyz - FragPos) : normalize(u_lightPosition.xyz);
    vec3 viewDir = normalize(viewPos - FragPos);

    // Phong光照计算
    vec3 ambient = ambientStrength * lightColor;
    float diff = max(dot(norm, lightDir), 0.0);
    vec3 diffuse = diffuseStrength * diff * lightColor;
    vec3 reflectDir = reflect(-lightDir, norm);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
    vec3 specular = specularStrength * spec * lightColor;
    vec3 lightReflectColor = ambient + diffuse + specular;

    // 调用PCF软阴影计算
    float shadow = shadowCalculation(FragPosLightSpace, norm, lightDir);
    
    // 标准阴影混合公式
    vec3 resultColor = ambient * TextureColor + (1.0 - shadow) * (diffuse + specular) * TextureColor;

    // 新增：半透明效果处理
    if (isTransparent) {
        FragColor = vec4(resultColor, transparency);  // 使用透明度因子
    } else {
        FragColor = vec4(resultColor, 1.0);  // 保持原有不透明效果
    }
}