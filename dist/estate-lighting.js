// Judge Dean LLC
import * as THREE from 'three';
import { ESTATE_MAP } from './estate-layout.js';

const {clamp, smoothstep, lerp, degToRad}=THREE.MathUtils;
const color=value=>new THREE.Color(value);
const otherInteriors=ESTATE_MAP.areas.filter(a=>a.kind==='building'&&a.name!=='Reception hall');
const palette={
  sun:color(0xffedcf),gold:color(0xffbc7f),moon:color(0xc1d8fb),
  sky:color(0xcddff5),blueHour:color(0xa8bfdf),overcast:color(0xa4b8ce),
  ground:color(0xb5a18d),duskGround:color(0x938b97),wetGround:color(0x858d98),
  mist:color(0xe5cfb9),eveningMist:color(0x817e95),rainMist:color(0x71869e),
  lamp:color(0xffc385),warmFill:color(0xe5cdb1),woodBounce:color(0xaa866b)
};

// One shadow map follows the photographer. The sky, ground bounce, and rig use
// the same sun direction, even when the day is paused and the camera changes.
export function createEstateLighting(scene){
  const fill=new THREE.HemisphereLight(0xffffff,0xffffff,1);
  const sun=new THREE.DirectionalLight(0xffffff,1);
  scene.add(fill,sun,sun.target);sun.castShadow=true;
  const span=44,resolution=2048,texel=span/resolution;
  sun.shadow.mapSize.set(resolution,resolution);
  Object.assign(sun.shadow.camera,{left:-span/2,right:span/2,top:span/2,bottom:-span/2,near:.5,far:105});
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias=.012;sun.shadow.bias=-.00017;
  const direction=new THREE.Vector3(),worldUp=new THREE.Vector3(0,1,0);
  const right=new THREE.Vector3(),up=new THREE.Vector3(),center=new THREE.Vector3();
  const lampDirection=new THREE.Vector3();
  const rigLight={
    keyDirection:new THREE.Vector3(),keyColor:new THREE.Color(),skyColor:new THREE.Color(),
    groundColor:new THREE.Color(),keyIntensity:1,fillIntensity:1
  };

  function update(t,player,rain,hall){
    const hours=t<0?15.6:9+15*t;
    const dusk=smoothstep(hours,17.0,20.45),night=smoothstep(hours,18.4,20.55);
    const gold=smoothstep(hours,14.8,18.2)*(1-night);
    const azimuth=(hours-12)*.258;
    const altitude=degToRad(Math.max(6,64*Math.cos((hours-12.4)*.195))+night*28);
    direction.set(Math.sin(azimuth)*Math.cos(altitude),Math.sin(altitude),Math.cos(azimuth)*Math.cos(altitude));
    sun.color.copy(palette.sun).lerp(palette.gold,gold).lerp(palette.moon,night);
    sun.intensity=lerp(3.18,.74,dusk)*(1-.89*rain);
    fill.color.copy(palette.sky).lerp(palette.blueHour,dusk).lerp(palette.overcast,rain);
    fill.groundColor.copy(palette.ground).lerp(palette.duskGround,dusk).lerp(palette.wetGround,rain);
    fill.intensity=lerp(1.54,1.35,dusk)*(1-.04*rain);

    // Snap the light's projected center to whole shadow pixels, so the shade
    // under a shoe stays put when the photographer inches toward a subject.
    center.set(player?.x??0,1.45,player?.z??0);
    right.crossVectors(worldUp,direction).normalize();
    up.crossVectors(direction,right);
    const horizontal=center.dot(right),vertical=center.dot(up);
    center.addScaledVector(right,Math.round(horizontal/texel)*texel-horizontal);
    center.addScaledVector(up,Math.round(vertical/texel)*texel-vertical);
    sun.target.position.copy(center);sun.position.copy(center).addScaledVector(direction,54);

    scene.fog.density=t<0?.010:.0065+.003*dusk+.010*rain;
    scene.fog.color.copy(palette.mist).lerp(palette.eveningMist,dusk).lerp(palette.rainMist,.86*rain);
    hall.light(dusk,rain);
    const x=player?.x??0,z=player?.z??0;
    // Soft transitions at open doors keep the lens and hands in the same
    // lighting as the people the player is photographing.
    const indoor=smoothstep(Math.min(x-14.8,32.8-x,z+8.5,11.5-z),-.22,1.65);
    let otherCover=0;
    for(const room of otherInteriors){
      const edge=Math.min(room.w*.5-Math.abs(x-room.x),room.d*.5-Math.abs(z-room.z));
      otherCover=Math.max(otherCover,smoothstep(edge,-.12,1.4));
    }
    const lampX=lerp(19.25,27.9,smoothstep(x,21,28));
    lampDirection.set(lampX-x,3.70-(player?.y??1.65),1.95-z).normalize();
    rigLight.keyDirection.copy(direction).lerp(lampDirection,indoor).normalize();
    rigLight.keyColor.copy(sun.color).lerp(palette.lamp,indoor);
    rigLight.skyColor.copy(fill.color).lerp(palette.warmFill,indoor*.57);
    rigLight.groundColor.copy(fill.groundColor).lerp(palette.woodBounce,indoor*.8);
    rigLight.keyIntensity=lerp(sun.intensity*(1-.68*otherCover),1.45+.62*dusk,indoor);
    rigLight.fillIntensity=lerp(fill.intensity,1.22,indoor);
    return dusk;
  }
  return {update,direction,rigLight};
}

// A single camera-facing batch for the small luminous envelopes around candle
// wicks. Depth testing naturally hides flames behind guests and furniture.
export function makeCandleGlows(scene,flames){
  const geometry=new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0],3));
  geometry.setIndex([0,1,2,0,2,3]);
  geometry.setAttribute('wick',new THREE.InstancedBufferAttribute(new Float32Array(flames.flat()),4));
  geometry.instanceCount=flames.length;
  const material=new THREE.ShaderMaterial({
    uniforms:{strength:{value:1}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`attribute vec4 wick; varying vec2 radial; void main(){
      radial=position.xy*2.;
      vec4 center=modelViewMatrix*vec4(wick.xyz,1.);
      center.xy+=position.xy*wick.w; gl_Position=projectionMatrix*center;
    }`,
    fragmentShader:`uniform float strength; varying vec2 radial; void main(){
      float r=length(radial); float falloff=max(0.,1.-r);
      float a=pow(falloff,3.1)*.39*strength;
      gl_FragColor=vec4(1.,.50+.25*falloff,.17,a);
    }`
  });
  const mesh=new THREE.Mesh(geometry,material);mesh.name='Candlelight';mesh.renderOrder=2;
  // A manual bound keeps the batch out of the render list across the estate.
  geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(23.8,2.6,1.5),14);
  scene.add(mesh);
  return material.uniforms.strength;
}
