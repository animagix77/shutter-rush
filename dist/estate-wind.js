// Judge Dean LLC
import * as THREE from 'three';

// A broad gust travels across the estate, with smaller eddies passing through it.
export function windAt(x, z, seconds) {
  const along = x * .93 + z * .37;
  return .64 * Math.sin(seconds * .91 - along * .17)
    + .24 * Math.sin(seconds * 1.67 - along * .28 + z * .08)
    + .12 * Math.sin(seconds * 2.47 - along * .43 - x * .12);
}

export function createEstateWind() {
  const time = {value:0}, strength = {value:1};
  const staticMaterials = new Map(), propMaterials = new Map();
  const depth = new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
  const bendShader = `
    uniform float estateTime;
    uniform float estateStrength;
    attribute vec3 estateFlex;
    vec3 estateOffset(vec3 p) {
      float weight = max(0.0, (p.y - estateFlex.x) * estateFlex.y + estateFlex.z);
      if (weight == 0.0 || estateStrength == 0.0) return vec3(0.0);
      float along = dot(p.xz, vec2(.93,.37));
      float gust = .64*sin(estateTime*.91-along*.17)
        + .24*sin(estateTime*1.67-along*.28+p.z*.08)
        + .12*sin(estateTime*2.47-along*.43-p.x*.12);
      float flutter = .19*sin(estateTime*2.58-along*.68+p.y*1.3);
      return estateStrength * weight * vec3(.93*gust-.37*flutter, -.08*gust*gust, .37*gust+.93*flutter);
    }
  `;
  function bind(shader) {
    shader.uniforms.estateTime = time;
    shader.uniforms.estateStrength = strength;
  }
  function movingMaterial(base, movingObject) {
    const materials = movingObject ? propMaterials : staticMaterials;
    if (materials.has(base)) return materials.get(base);
    const material = base.clone();
    material.onBeforeCompile = shader => {
      bind(shader);
      // Static estate batches are already in world coordinates. A loose prop
      // samples its current world position and bends along the same world axis,
      // even after a collision rolls it over.
      const project = movingObject
        ? `vec3 estateDelta = estateOffset((modelMatrix * mvPosition).xyz);
           mvPosition = modelViewMatrix * mvPosition;
           mvPosition.xyz += mat3(viewMatrix) * estateDelta;`
        : `vec3 estateDelta = estateOffset(mvPosition.xyz);
           mvPosition.xyz += estateDelta;
           mvPosition = modelViewMatrix * mvPosition;`;
      shader.vertexShader = bendShader + shader.vertexShader
        .replace('#include <project_vertex>', THREE.ShaderChunk.project_vertex.replace(
          'mvPosition = modelViewMatrix * mvPosition;', project))
        .replace('#include <worldpos_vertex>', THREE.ShaderChunk.worldpos_vertex.replace(
          'worldPosition = modelMatrix * worldPosition;', '$&\n worldPosition.xyz += estateDelta;'));
    };
    material.customProgramCacheKey = () => movingObject ? 'estate-prop-flex-v1' : 'estate-flex-v1';
    materials.set(base, material);
    return material;
  }
  function dress(mesh, flex, movingObject=false) {
    mesh.geometry.setAttribute('estateFlex', flex);
    mesh.material = movingMaterial(mesh.material, movingObject);
    mesh.customDepthMaterial = movingMaterial(depth, movingObject);
  }
  // The supplied weight is the maximum tip displacement in metres. Ties and
  // hems are defined on the original mesh, keeping the silhouette photographic.
  function cloth(mesh, weight, movingObject=false) {
    const points = mesh.geometry.attributes.position;
    const values = new Float32Array(points.count * 3);
    for (let i = 0; i < points.count; i++)
      values[i * 3 + 2] = weight(i, points.getX(i), points.getY(i), points.getZ(i));
    dress(mesh, new THREE.BufferAttribute(values,3), movingObject);
    mesh.geometry.computeBoundingSphere();
    mesh.geometry.boundingSphere.radius += .35;
  }
  function water(scene, x, y, z, width, depth, color) {
    const surface = new THREE.PlaneGeometry(width, depth);
    surface.rotateX(-Math.PI / 2);
    surface.translate(x, y, z);
    const material = new THREE.MeshStandardMaterial({color, roughness:.42});
    material.onBeforeCompile = shader => {
      bind(shader);
      shader.vertexShader = 'varying vec2 estateWaterXZ;\n' + shader.vertexShader
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n estateWaterXZ = position.xz;');
      shader.fragmentShader = 'uniform float estateTime;\n uniform float estateStrength;\n varying vec2 estateWaterXZ;\n' + shader.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec2 p = estateWaterXZ;
          float t = estateTime * estateStrength;
          float across = dot(p, vec2(.93,.37));
          float crossWind = dot(p, vec2(-.37,.93));
          float broad = sin(across*2.7-t*1.16+sin(crossWind*.91)*.64);
          float narrow = sin(across*7.3-t*2.25+sin(crossWind*1.1+t*.23)*1.3);
          float breakUp = .5+.5*sin(crossWind*2.6+.9*sin(across*1.38)+t*.22);
          float glints = smoothstep(1.22,1.82,broad+narrow) * smoothstep(.23,.88,breakUp);
          diffuseColor.rgb *= 1.0+.045*broad+.038*narrow;
          diffuseColor.rgb += vec3(.105,.125,.105)*glints;
        `);
    };
    material.customProgramCacheKey = () => 'estate-ripples-v1';
    const mesh = new THREE.Mesh(surface, material);
    mesh.name='Rippling water';
    mesh.receiveShadow=true;
    scene.add(mesh);
  }
  function update(seconds, {reduced=false} = {}) {
    time.value = Number.isFinite(seconds) ? seconds : 0;
    strength.value = reduced ? 0 : 1;
  }
  return {dress, cloth, water, update};
}
