import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const vShader = `varying vec2 vUv;
void main() 
{ vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const fSahder = `uniform sampler2D map;
uniform vec3 fogColor; 
uniform float fogNear; 
uniform float fogFar; 
varying vec2 vUv; 
void main() 
{ float depth = gl_FragCoord.z / gl_FragCoord.w; 
  float fogFactor = smoothstep( fogNear, fogFar, depth ); 
  gl_FragColor = texture2D(map, vUv );
  gl_FragColor.w *= pow( gl_FragCoord.z, 20.0 ); 
  gl_FragColor = mix( gl_FragColor, vec4( fogColor, gl_FragColor.w ), fogFactor ); 
}`;

//if (!Detector.webgl) Detector.addGetwebGLMessage();

var container;
var camera, scene, sky, sun, renderer;
var mesh, material, group;
let eagleMesh = new THREE.Group();
let mixer;
let modelReady = false;
const clock = new THREE.Clock();
let view = new THREE.Vector3();

var mouseX = 0;
var mouseY = 0;
var start_time = Date.now();

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;
init();
initClouds();
loadEagle();
animate();
function initSky() {
  // Add Sky
  sky = new Sky();
  sky.scale.setScalar(450000);
  scene.add(sky);

  sun = new THREE.Vector3();

  const effectController = {
    turbidity: 10,
    rayleigh: 0.45,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.96,
    elevation: 17.5,
    azimuth: 180,
    exposure: renderer.toneMappingExposure,
  };

  const uniforms = sky.material.uniforms;
  uniforms['turbidity'].value = effectController.turbidity;
  uniforms['rayleigh'].value = effectController.rayleigh;
  uniforms['mieCoefficient'].value = effectController.mieCoefficient;
  uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;
  const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
  const theta = THREE.MathUtils.degToRad(effectController.azimuth);

  sun.setFromSphericalCoords(1, phi, theta);

  uniforms['sunPosition'].value.copy(sun);

  renderer.toneMappingExposure = effectController.exposure;
}
function initClouds() {
  var texture = new THREE.TextureLoader().load(
    'cloud1.png',
    function (texture) {
      texture.magFilter = THREE.LinearMipMapLinearFilter;
      texture.minFilter = THREE.LinearMipMapLinearFilter;
    }
  );
  var fog = new THREE.Fog(0xffffff, -100, 3000);

  material = new THREE.ShaderMaterial({
    uniforms: {
      map: {
        type: 't',
        value: texture,
      },
      fogColor: {
        type: 'c',
        value: fog.color,
      },
      fogNear: {
        type: 'f',
        value: fog.near,
      },
      fogFar: {
        type: 'f',
        value: fog.far,
      },
    },
    vertexShader: vShader,
    fragmentShader: fSahder,
    depthWrite: false,
    depthTest: false,
    transparent: true,
  });

  group = new THREE.Group();
  var plane = new THREE.PlaneGeometry(64, 64);

  for (var i = 0; i < 80000; i++) {
    mesh = new THREE.Mesh(plane, material);
    mesh.position.x = Math.random() * 1000 - 500;
    mesh.position.y = -Math.random() * Math.random() * 200 - 15;
    mesh.position.z = i;
    mesh.rotation.z = Math.random() * Math.PI;
    mesh.scale.x = plane.scale.y = Math.random() * Math.random() * 1.5 + 0.5;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    group.add(mesh);
  }

  scene.add(group);

  group = new THREE.Group();
  group.position.z = -8000;
  scene.add(group);
}

let z =990
function init() {
  container = document.createElement('div');
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(
    30,
    window.innerWidth / window.innerHeight,
    1,
    3000
  );
  camera.position.z =1000;

  /*
  camera = new THREE.PerspectiveCamera(
    30,
    window.innerWidth / window.innerHeight,
    1,
    3000
  );
  camera.position.z = 1000;
*/
  scene = new THREE.Scene();

  const light1 = new THREE.PointLight(0xffffff, 1);
  light1.position.set(2.5, 2.5, 990 + 2.5);
  scene.add(light1);
  
  const light2 = new THREE.PointLight(0xffffff, 1);
  light2.position.set(-2.5, 2.5, 990+ 2.5);
  scene.add(light2);

  renderer = new THREE.WebGL1Renderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.27;
  document.body.appendChild(renderer.domElement);
  initSky();

  document.addEventListener('mousemove', onDocumentMouseMove, false);
  window.addEventListener('resize', onWindowResize, false);
}
function loadEagle() {
  const gltfLoader = new GLTFLoader();

  gltfLoader.load(
    '../models/nnn.gltf',
    (gltf) => {
      eagleMesh = gltf.scene;
      eagleMesh.position.z= z ;
      eagleMesh.rotateY(Math.PI)

      mixer = new THREE.AnimationMixer(eagleMesh);

      scene.add(eagleMesh);

      const flyAction = gltf.animations[2]; // walk
      mixer.clipAction(flyAction).play();

      modelReady = true;
    },
    (xhr) => {
      console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (error) => {
      console.log(error);
    }
  );
}
function onDocumentMouseMove(event) {
  mouseX = (event.clientX - windowHalfX) * 0.25;
  mouseY = (event.clientY - windowHalfY) * 0.15;
}

function onWindowResize(event) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}
function updateEaglePosition() {
  // camera.getWorldPosition(view);
  // view.add(new THREE.Vector3(0, 50, -100));
  // eagleMesh.position.copy(view);
}
function animate() {
  requestAnimationFrame(animate);
  updateEaglePosition();
  if (modelReady) mixer.update(clock.getDelta());

  render();
}
function cameraMotion() {
  let position = ((Date.now() - start_time) * 0.03) % 8000;

  camera.position.x += (mouseX - camera.position.x) * 0.01;
  camera.position.y += (-mouseY - camera.position.y) * 0.01;
  camera.position.z = -position + 8000;
  eagleMesh.position.copy(camera.position)
  eagleMesh.position.z = (camera.position.z-10)
}
function render() {
  cameraMotion();
  renderer.render(scene, camera);
}
