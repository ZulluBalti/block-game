import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import "./style.css";
import * as dat from "dat.gui";
import * as cannon from "cannon-es";

const scoreCon = document.querySelector(".score_container span");
const gui = new dat.GUI();

let scene, camera, renderer, controls, gameOver;
let speed, direction, boxes, topBox, hangBoxes;
let world, dirLight;
const sizes = { width: window.innerWidth, height: window.innerHeight };
let isPaused = false;

const start = () => {
  window.focus();
  init();

  scene = new THREE.Scene();
  world = new cannon.World({ gravity: new cannon.Vec3(0, -9.82, 0) });

  // light
  dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
  dirLight.position.set(10, 10, 0);
  dirLight.shadow = true;
  dirLight.lookAt(0, 0, 0);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);

  scene.add(ambientLight);
  scene.add(dirLight);

  // camera

  camera = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.1, 1000);
  camera.position.set(10, 10, 10);
  // camera.lookAt(0, 0, 0);
  scene.add(camera);

  const guiCamera = gui.addFolder("Camera");
  guiCamera.add(camera.position, "x", -100, 100, 1);
  guiCamera.add(camera.position, "y", -100, 100, 1);
  guiCamera.add(camera.position, "z", -100, 100, 1);

  const guiCameraRot = gui.addFolder("Camera Rot");

  guiCameraRot.add(camera.rotation, "x", -Math.PI, Math.PI, 0.1);
  guiCameraRot.add(camera.rotation, "y", -Math.PI, Math.PI, 0.1);
  guiCameraRot.add(camera.rotation, "z", -Math.PI, Math.PI, 0.1);

  const cameraHelper = new THREE.CameraHelper(camera);
  scene.add(cameraHelper);

  // axes helper
  const axesHelper = new THREE.AxesHelper();
  scene.add(axesHelper);

  // basic object
  addBox();
  addBox();

  // renderer
  const canvas = document.querySelector("canvas#game_container");
  renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  renderer.render(scene, camera);
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));

  controls = new OrbitControls(camera, canvas);
  controls.update();

  animate();
};

function init() {
  boxes = [];
  topBox = undefined;
  hangBoxes = [];
  speed = 0.2;
  direction = "x";
  removeAllBoxes();
  gameOver = false;
  updateScore();
  toggleGameOverCon();
}

const clock = new THREE.Clock();

const animate = () => {
  renderer.render(scene, camera);
  controls.update();
  const timePassed = clock.getDelta();

  if (!isPaused) {
    world.step(1 / 60);
    if (!gameOver && topBox) {
      topBox.threejs.position[direction] += speed;
      topBox.cannonjs.position[direction] += speed;

      for (let i = 0; i < hangBoxes.length; i++) {
        const box = hangBoxes[i];

        box.threejs.position.y = box.cannonjs.position.y;
        if (box.cannonjs.position.y < -100) {
          world.removeBody(box.cannonjs);
          scene.remove(box.threejs); // this could fuck it up for some strange reasons about indexes
          hangBoxes.splice(i, 1);
          i--;
        }
      }

      isGameOver();
    }

    if (gameOver && topBox) {
      const { y } = topBox.cannonjs.position;
      topBox.threejs.position.y = y;

      if (y < -100) {
        scene.remove(topBox.threejs);
        world.removeBody(topBox.cannonjs);
        topBox = undefined;
      }
    }

    if (camera.position.y < (boxes.length - 2) * 3 + 10) {
      camera.position.y += 1;
      dirLight.position.y += 1;
    }
  }

  window.requestAnimationFrame(animate);
};

const addBox = () => {
  let width = 10;
  let height = 3;
  let depth = 10;

  if (topBox) {
    width = topBox.width;
    height = topBox.height;
    depth = topBox.depth;
  }

  const geometry = new THREE.BoxBufferGeometry(width, height, depth);
  const material = new THREE.MeshLambertMaterial({
    color: new THREE.Color(`hsl(${30 + (boxes.length % 10) * 2} , 100%, 50%)`),
    // wireframe: true,
    shadowSide: true,
    clipShadows: true,
  });

  const mesh = new THREE.Mesh(geometry, material);

  const shape = new cannon.Box(
    new cannon.Vec3(width / 2, height / 2, depth / 2)
  );
  const body = new cannon.Body({
    mass: 0,
    shape,
    type: cannon.Body.DYNAMIC,
  });

  if (boxes.length === 0) {
    mesh.position.set(0, 0, 0);
    body.position.set(0, 0, 0);
  } else {
    topBox = boxes[boxes.length - 1];
    let { x, y, z } = topBox.threejs.position;
    x = direction === "z" ? -30 : x;
    z = direction === "x" ? -30 : z;

    mesh.position.set(x, y + 3, z);
    body.position.set(x, y + 3, z);
  }

  scene.add(mesh);
  world.addBody(body);
  boxes.push({ threejs: mesh, cannonjs: body, width, height, depth });

  topBox = boxes[boxes.length - 1];
  direction = direction === "x" ? "z" : "x";
  updateScore();
};

const removeAllBoxes = () => {
  // remove all boxes
  for (let i = scene?.children.length - 1; i >= 0; i--) {
    if (scene.children[i].type === "Mesh") scene.remove(scene.children[i]);
  }
};

const isGameOver = () => {
  if (topBox.threejs.position[direction] >= 30 || gameOver === true) {
    gameOver = true;
    toggleGameOverCon();
  }
};

const toggleGameOverCon = () => {
  const gameOverConScore = document.querySelector(".game_over_con span");
  const gameOverCon = document.querySelector(".game_over_con");
  if (gameOver) {
    gameOverCon.classList.add("active");
    gameOverConScore.textContent = "Score: " + (boxes.length - 1);
  } else {
    gameOverCon.classList.remove("active");
    gameOverConScore.textContent = "Score: 0";
  }
};

document.addEventListener("click", () => {
  // stopBox();
});

document.addEventListener("keypress", (e) => {
  if (e.code === "Space") {
    stopBox();
  } else if (e.code === "KeyP") {
    isPaused = !isPaused;
  } else if (e.code === "KeyR") {
    init();
    addBox();
    addBox();
  }
});

const findDistanceBtwTopNBtm = () => {
  const bottomBox = boxes[boxes.length - 2];
  const tpd = topBox.threejs.position[direction];
  const bpd = bottomBox.threejs.position[direction];
  return tpd - bpd;
};

const findScaleDown = () => {
  const distance = findDistanceBtwTopNBtm();
  const size = getCurrentSize();
  return (size - Math.abs(distance)) / size;
};

const getCurrentSize = () => {
  return direction === "x" ? topBox.width : topBox.depth;
};

const setRemainingPart = () => {
  const scale = findScaleDown();
  const distance = findDistanceBtwTopNBtm();
  const updatedSize = getCurrentSize() - Math.abs(distance); // also size - diff
  const updatedPosition = (getCurrentSize() - updatedSize) / 2; // topBox width/2  - remaining width

  topBox.threejs.scale[direction] = scale;

  if (distance > 0) {
    topBox.threejs.position[direction] -= updatedPosition;
  } else {
    topBox.threejs.position[direction] += updatedPosition;
  }

  world.removeBody(topBox.cannonjs);
  let { width, depth, height } = topBox;
  const { x, y, z } = topBox.threejs.position;

  if (direction === "x") {
    width *= scale;
  } else depth *= scale;

  const shape = new cannon.Box(
    new cannon.Vec3(width / 2, height / 2, depth / 2)
  );
  const body = new cannon.Body({ mass: 0, shape });
  body.position.set(x, y, z);
  world.addBody(body);
  topBox.cannonjs = body;
};

const findUpdatedSize = () => {
  let { width, height, depth } = topBox;
  const distance = findDistanceBtwTopNBtm();
  let { x, y, z } = topBox.threejs.position;

  if (direction === "x") {
    x += (width / 2) * (distance > 0 ? 1 : -1);
    width = Math.abs(distance) * 2;
  } else {
    z += (depth / 2) * (distance > 0 ? 1 : -1);
    depth = Math.abs(distance) * 2;
  }

  return { width, height, depth, x, y, z };
};

const setHangingPart = () => {
  let { width, height, depth, x, y, z } = findUpdatedSize();
  const color = `hsl(${30 + (boxes.length % 10) * 2}, 100%, 50%)`;

  const geometry = new THREE.BoxBufferGeometry(width, height, depth);
  const material = new THREE.MeshLambertMaterial({
    color: new THREE.Color(color),
  });
  const mesh = new THREE.Mesh(geometry, material);

  const shape = new cannon.Box(
    new cannon.Vec3(width / 2, height / 2, depth / 2)
  );

  const body = new cannon.Body({ mass: 1, shape });

  mesh.position.set(x, y, z);
  body.position.set(x, y, z);

  scene.add(mesh);
  world.addBody(body);
  const hangBox = { threejs: mesh, cannonjs: body };
  hangBoxes.push(hangBox);
};

const stopBox = () => {
  if (boxes.length > 1) {
    const isOutside = Math.abs(findDistanceBtwTopNBtm()) >= getCurrentSize();

    if (isOutside) {
      topBox.cannonjs.mass = 1;
      topBox.cannonjs.updateMassProperties();
      gameOver = true;
      isGameOver();
      return;
    }

    const remSize = findScaleDown() * getCurrentSize();

    setRemainingPart();
    setHangingPart();

    if (direction === "x") topBox.width = remSize;
    else topBox.depth = remSize;
  }

  addBox();
};

const updateScore = () => {
  scoreCon.textContent = "Score: " + (boxes.length - 1);
};

start();
