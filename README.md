# 光栅化渲染 3D 场景（含半透明效果）

# 光栅化渲染3D场景项目（含半透明效果）

## 项目简介

本项目基于WebGL 2.0实现光栅化渲染3D场景，核心功能涵盖**纹理映射、Phong光照模型、ShadowMap软阴影**，并新增**物体半透明效果**，可直观展示3D场景中光照、阴影与透明质感的交互逻辑，适用于计算机图形学课程作业或WebGL入门实践。

## 核心功能清单

|功能模块|实现细节|
|---|---|
|纹理映射|支持2D纹理加载与采样，配置MIP映射优化不同距离纹理清晰度，支持重复环绕模式|
|Phong光照|计算环境光、漫反射光、镜面反射光三部分分量，与纹理色融合生成基础光照效果|
|ShadowMap阴影|基于深度纹理实现PCF软阴影，动态偏移解决阴影锯齿（Shadow Acne）问题|
|半透明效果（新增）|支持开关控制与透明度调节，Alpha混合模式确保透明物体与背景自然叠加，保留阴影交互|
|场景交互|支持视角旋转、光源位置调整，自适应窗口大小渲染|
## 项目结构

```Plain Text
├── index.html                # 入口页面，场景初始化与DOM配置
├── shaders/                  # 着色器文件目录
│   ├── box.vert              # 物体顶点着色器（传递法向量、纹理坐标、光源空间位置）
│   ├── box.frag              # 物体片元着色器（光照、阴影、半透明计算核心）
│   ├── depth.vert/depth.frag # 深度纹理生成着色器（ShadowMap专用）
│   ├── skybox.vert/skybox.frag # 天空盒着色器
│   └── lamp.vert/lamp.frag   # 光源物体着色器
├── js/                       # 逻辑脚本目录
│   ├── Phongshading.js       # 核心渲染逻辑（场景绘制、半透明物体渲染、矩阵变换）
│   ├── configTexture.js      # 纹理配置脚本（创建纹理对象、加载纹理图片）
│   ├── initShaders.js        # 着色器初始化脚本（编译、链接着色器程序）
│   └── gl-matrix.js          # 矩阵运算库（提供向量、矩阵操作API）
├── textures/                 # 纹理图片目录
│   ├── cubeTexture.jpg       # 普通立方体纹理
│   ├── planeTexture.jpg      # 地面纹理
│   └── skybox/               # 天空盒纹理（6个方向）
└── README.md                 # 项目说明文档（本文件）
```

## 环境要求

1. **浏览器**：Chrome 80+、Edge 80+（需支持WebGL 2.0，可通过[WebGL检测工具](https://get.webgl.org/webgl2/)验证）

2. **开发工具**：Visual Studio Code（推荐安装「Live Server」插件，解决本地资源跨域问题）

3. **运行方式**：通过Live Server启动HTTP服务，访问`index.html`（本地直接打开HTML会因跨域导致纹理加载失败）

## 快速启动步骤

1. **克隆/下载项目**：将项目文件解压到本地目录，确保文件结构完整（尤其是`textures/`目录下的图片资源）。

2. **启动本地服务**：

    - 用VS Code打开项目根目录；

    - 右键点击`index.html`，选择「Open with Live Server」，自动在浏览器打开页面（默认端口5500）。

3. **查看效果**：

    - 场景默认显示：普通立方体（左）、半透明立方体（右，透明度50%）、地面、天空盒、光源物体；

    - 可通过鼠标拖拽旋转视角，键盘方向键调整光源位置，观察光照、阴影与半透明效果的交互。

## 关键功能实现说明

### 1. 半透明效果核心逻辑

半透明效果通过「Alpha混合」实现，核心修改集中在`box.frag`和`Phongshading.js`两个文件，不影响原有功能：

#### （1）片段着色器（box.frag）

- 新增2个uniform变量，控制透明效果：

    ```OpenGL Shading Language
    uniform float transparency;  // 透明度因子（0.0=完全透明，1.0=不透明）
    uniform bool isTransparent;  // 半透明开关（true=启用，false=禁用）
    ```

- 片元颜色输出逻辑：根据开关决定Alpha通道值：

    ```OpenGL Shading Language
    if (isTransparent) {
    FragColor = vec4(resultColor, transparency);  // 启用透明
    } else {
    FragColor = vec4(resultColor, 1.0);           // 保持不透明
    }
    ```

#### （2）渲染逻辑（Phongshading.js）

- 启用WebGL混合模式，配置混合公式：

    ```JavaScript
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // 标准Alpha混合
    ```

- 半透明物体绘制：单独创建半透明立方体顶点数据，设置独立位置（如右移2单位），传递透明参数：

    ```JavaScript
    // 传递透明度参数
    gl.uniform1f(gl.getUniformLocation(program, "transparency"), 0.5);
    gl.uniform1i(gl.getUniformLocation(program, "isTransparent"), true);
    // 绘制半透明立方体
    gl.drawArrays(gl.TRIANGLES, 半透明物体顶点索引, transparentCubenumPoints);
    ```

### 2. 阴影与半透明的兼容性处理

为避免半透明物体无阴影或阴影异常，在深度图生成阶段同步处理半透明物体：

```JavaScript
// Phongshading.js 中生成深度纹理时，新增半透明物体深度绘制
var transparentModel = mult(translate(2.0, 0.0, 0.0), mat4()); // 半透明物体模型矩阵
gl.uniformMatrix4fv(gl.getUniformLocation(depthProgram,"u_ModelMatrix"), false, flatten(transparentModel));
gl.drawArrays(gl.TRIANGLES, 半透明物体顶点索引, transparentCubenumPoints);
```

## 参数调整指南

### 1. 半透明效果调整

- **修改透明度**：在`Phongshading.js`中找到`gl.uniform1f(gl.getUniformLocation(program, "transparency"), 0.5)`，将`0.5`改为0.0-1.0之间的值（如0.3=更透明，0.8=更不透明）。

- **修改半透明物体位置**：调整`translate(2.0, 0.0, 0.0)`中的`(2.0, 0.0, 0.0)`（x/y/z轴坐标），改变半透明立方体在场景中的位置。

### 2. 光照与阴影调整

- **光照强度**：在`box.frag`中修改`ambientStrength`（环境光）、`diffuseStrength`（漫反射）、`specularStrength`（高光）的默认值。

- **阴影软硬度**：调整`shadowCalculation`函数中`for`循环的采样范围（如将`-1~1`改为`-2~2`增加采样数，阴影更软），或修改`bias`（动态偏移）的计算系数。

## 常见问题解决

1. **纹理加载失败/显示异常**：

    - 原因：本地直接打开HTML导致跨域，或纹理路径错误。

    - 解决：使用Live Server启动服务；核对`configTexture.js`中纹理图片路径（如`textures/cubeTexture.jpg`）与实际文件位置是否一致。

2. **半透明物体显示为完全透明/不透明**：

    - 原因：`transparency`参数未正确传递，或`isTransparent`开关设为`false`。

    - 解决：检查`Phongshading.js`中是否正确调用`gl.uniform1f`和`gl.uniform1i`传递透明参数，确保`isTransparent`设为`true`。

3. **阴影出现锯齿或悬浮**：

    - 原因：`bias`（动态偏移）值过小或过大。

    - 解决：在`box.frag`的`shadowCalculation`函数中调整`bias`的计算逻辑（如将`0.01`改为`0.02`，或`0.001`改为`0.002`）。

## 项目扩展建议

1. **支持多透明物体**：复制半透明物体的绘制逻辑，新增多个顶点数据和模型矩阵，实现场景中多个透明物体并存。

2. **透明纹理支持**：加载带Alpha通道的PNG图片作为半透明物体纹理，在`box.frag`中通过`texture(diffuseTexture, TexCoord).a`获取纹理自身透明度，与`transparency`叠加使用。

3. **渲染顺序优化**：当场景中有多个透明物体时，按“从后到前”的顺序绘制（根据物体与相机的距离排序），避免透明物体间遮挡异常。
