import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDuck} from '../src/duck.js';
import {createWorld} from '../src/world.js';
import {interpolatePose} from '../src/camera.js';

test('idle, waddle, swimming and flapping animate locally without moving the world anchor',()=>{
  const duck=createDuck();duck.setAltitude(8.3);
  for(const mode of ['idle','waddle','swim','fly']) {
    duck.state.swimming=mode==='swim';
    for(let i=0;i<120;i++) {
      duck.update(1/120,mode!=='idle',mode==='fly',.8);
      assert.equal(duck.root.position.y,8.3);
    }
  }
  const before=duck.root.toJSON();duck.update(0,true,true,.8);
  assert.deepEqual(duck.root.toJSON(),before,'paused pose must not drift per render frame');
  duck.dispose();
});
test('sun and shadow projection do not follow character animation or movement',()=>{
  const scene=new THREE.Scene(),world=createWorld(scene);
  const sun=scene.children.find(c=>c.isDirectionalLight),before=sun.position.clone(),target=sun.target.position.clone();
  for(let i=0;i<90;i++)world.update(i/60,1/60,new THREE.Vector3(i*.1,Math.sin(i)*.1,7),true,true);
  assert.deepEqual(sun.position,before);assert.deepEqual(sun.target.position,target);
});
test('render interpolation fills high refresh steps and uses shortest yaw path',()=>{
  const a={x:0,y:0,z:0,yaw:Math.PI-.1},b={x:.1,y:.1,z:.2,yaw:-Math.PI+.1};
  assert.equal(interpolatePose(a,b,.5).x,.05);
  assert.ok(Math.abs(interpolatePose(a,b,.5).yaw-Math.PI)<1e-8);
  assert.equal(interpolatePose(a,{...b,x:80},.2).x,80,'respawn must not sweep across obstacles');
});
test('thin feather surfaces have outward normals rather than inverted bevel shading',()=>{
  const duck=createDuck();let checked=0;
  duck.root.traverse(mesh=>{
    if(!mesh.isMesh||mesh.userData.colorKey!=='eye')return;
    mesh.geometry.computeBoundingBox();const bounds=mesh.geometry.boundingBox;
    const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
    for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i)-bounds.max.x)<1e-5){assert.ok(n.getX(i)>.5);checked++;}
  });
  assert.ok(checked>0);duck.dispose();
});

test('walking keeps a visible bouncy waddle while its world anchor stays fixed',()=>{
  for(const hz of [30,60,120]) {
    const duck=createDuck();duck.setAltitude(8.3);
    let minRoll=Infinity,maxRoll=-Infinity,minY=Infinity,maxY=-Infinity,minScale=1;
    for(let i=0;i<hz*2;i++) {
      duck.update(1/hz,true);
      minRoll=Math.min(minRoll,duck.tilt.rotation.z);maxRoll=Math.max(maxRoll,duck.tilt.rotation.z);
      minY=Math.min(minY,duck.pose.position.y);maxY=Math.max(maxY,duck.pose.position.y);
      minScale=Math.min(minScale,duck.pose.scale.y);
      assert.equal(duck.root.position.y,8.3);
      assert.equal(duck.root.position.x,0);
    }
    assert.ok(maxRoll-minRoll>.25,`${hz} Hz: visible side-to-side sway`);
    assert.ok(maxY-minY>.05,`${hz} Hz: visible step bounce`);
    assert.ok(minScale<.93,`${hz} Hz: soft squash on each step`);
    duck.dispose();
  }
});
