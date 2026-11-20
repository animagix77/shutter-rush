// Judge Dean LLC
import * as THREE from 'three';
import { ESTATE_MAP } from './estate-layout.js';

const roofKinds=new Set(['building','pavilion','glasshouse']);
const roofs=ESTATE_MAP.areas.filter(area=>roofKinds.has(area.kind))
  .map(({x,z,w,d})=>new THREE.Vector4(x,z,w*.5+.1,d*.5+.1));
export function underRoof(x,z){
  return roofs.some(r=>Math.abs(x-r.x)<r.z&&Math.abs(z-r.y)<r.w);
}
export function rainAt(t){
  return THREE.MathUtils.smoothstep(t,543,550)*(1-THREE.MathUtils.smoothstep(t,565,587));
}

export function buildWeddingWeather(scene){
  const uniforms={clock:{value:0}, rain:{value:0}, origin:{value:new THREE.Vector2()}, roofs:{value:roofs}};
  const common=`
    uniform float clock, rain;
    uniform vec2 origin;
    uniform vec4 roofs[${roofs.length}];
    varying float alpha;
    bool sheltered(vec2 p){
      for(int i=0;i<${roofs.length};i++){
        if(all(lessThan(abs(p-roofs[i].xy),roofs[i].zw)))return true;
      }
      return false;
    }
  `;
  const fragment=`varying float alpha;
    void main(){
      if(alpha<.015)discard;
      gl_FragColor=vec4(.65,.76,.84,alpha);
      #include <colorspace_fragment>
    }`;
  // Two batched line draws. The coordinates tile in world space so walking and
  // panning the camera don't drag the rain or the splashes along with the lens.
  let seed=47853;
  function random(){seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;}
  function lines(points,seeds,vertexShader,name){
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    geometry.setAttribute('drop',new THREE.Float32BufferAttribute(seeds,3));
    const mesh=new THREE.LineSegments(geometry,new THREE.ShaderMaterial({
      uniforms,vertexShader:common+vertexShader,fragmentShader:fragment,transparent:true,depthWrite:false
    }));
    mesh.name=name;mesh.frustumCulled=false;mesh.renderOrder=3;scene.add(mesh);return mesh;
  }
  const points=[],seeds=[];
  for(let i=0;i<4200;i++){
    const x=random()*48,z=random()*48,phase=random(),length=.20+.26*random();
    points.push(0,0,0,.091,length,.027);seeds.push(x,z,phase,x,z,phase);
  }
  const drops=lines(points,seeds,`
    attribute vec3 drop;
    void main(){
      float y=14.*fract(drop.z-clock*(.68+.18*drop.z));
      vec2 p=origin+mod(drop.xy+vec2(.22,.065)*y-origin+24.,48.)-24.;
      vec3 world=vec3(p.x,y,p.y)+position;
      float edge=1.-smoothstep(17.,24.,length(p-origin));
      alpha=(.24+.3*drop.z)*rain*edge*step(drop.z,rain*.87+.13);
      if(world.y<7.&&sheltered(p))alpha=0.;
      gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
    }`,'Rain over the estate');
  const ring=[],sites=[];
  for(let i=0;i<170;i++){
    const x=random()*22,z=random()*22,phase=random();
    for(let j=0;j<8;j++)for(const k of [j,j+1]){
      const a=k*Math.PI/4;ring.push(Math.cos(a),0,Math.sin(a));sites.push(x,z,phase);
    }
  }
  const splashes=lines(ring,sites,`
    attribute vec3 drop;
    void main(){
      vec2 p=origin+mod(drop.xy-origin+11.,22.)-11.;
      float age=fract(clock*(.97+.7*drop.z)+drop.z);
      float radius=.018+.13*age;
      alpha=rain*(1.-age)*.58*(1.-smoothstep(7.,11.,length(p-origin)));
      if(sheltered(p))alpha=0.;
      gl_Position=projectionMatrix*viewMatrix*vec4(p.x+position.x*radius,.082,p.y+position.z*radius,1.);
    }`,'Rain splashes on the paving');
  function update(time,intensity,player,reduced){
    drops.visible=splashes.visible=intensity>.004;
    uniforms.origin.value.set(player.x,player.z);
    uniforms.clock.value=reduced?0:time;
    uniforms.rain.value=reduced?intensity*.55:intensity;
  }
  update(0,0,{x:0,z:0},false);
  return {update};
}
