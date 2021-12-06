import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import "./style.css";
import * as dat from "dat.gui";
import * as cannon from "cannon-es";

const scoreCon = document.querySelector(".score_container span");
const gui = new dat.GUI();

let scene, camera, renderer, controls, gameOver;
let speed, direction, boxes, topBox, hangBoxes;
let world;

const start = () => {
  init();

  scene = new THREE.Scene();
  world = new cannon.World({ gravity: new cannon.Vec3(0, -9.82, 0) });

  // light
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
  dirLight.position.set(10, 10, 0);
  dirLight.lookAt(0, 0, 0);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);

  scene.add(ambientLight);
  scene.add(dirLight);

  // camera
  camera = new THREE.OrthographicCamera(-15, 15, 15, -15, 0.1, 1000);

  camera.position.set(10, 10, 10);
  // camera.lookAt(0, 0, 0);
  scene.add(camera);

  const guiCamera = gui.addFolder("Camera");
  guiCamera.add(camera.position, "x", -300, 300, 1);
  guiCamera.add(camera.position, "y", -300, 300, 1);
  guiCamera.add(camera.position, "z", -300, 300, 1);

  guiCamera.add(camera.rotation, "x", -Math.PI, Math.PI, 0.1);
  guiCamera.add(camera.rotation, "y", -Math.PI, Math.PI, 0.1);
  guiCamera.add(camera.rotation, "z", -Math.PI, Math.PI, 0.1);

  const cameraHelper = new THREE.CameraHelper(camera);
  scene.add(cameraHelper);

  // basic object
  addBox();
  addBox();

  // renderer
  const canvas = document.querySelector("canvas#game_container");
  renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  renderer.render(scene, camera);
  renderer.setSize(window.innerWidth, window.innerHeight);
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

const animate = () => {
  renderer.render(scene, camera);
  controls.update();

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
    console.log(y);
    topBox.threejs.position.y = y;

    if (y < -100) {
      scene.remove(topBox.threejs);
      world.removeBody(topBox.cannonjs);
      topBox = undefined;
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
    color: 0xff00ff,
    // wireframe: true,
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
    let { y, x, z } = topBox.threejs.position;
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

const addHangBox = (width, height, depth, x, y, z) => {
  const geometry = new THREE.BoxBufferGeometry(width, height, depth);
  const material = new THREE.MeshLambertMaterial({
    color: 0xff00ff,
    // wireframe: true,
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

const removeAllBoxes = () => {
  // remove all boxes
  for (let i = scene?.children.length - 1; i >= 0; i--) {
    console.log(scene.children[i].type);
    if (scene.children[i].type === "Mesh") scene.remove(scene.children[i]);
  }
};

const isGameOver = () => {
  if (topBox.threejs.position[direction] >= 30 || gameOver === true) {
    console.log("game over");
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
  } else if (e.code === "KeyR") {
    init();
    addBox();
    addBox();
  }
});

const stopBox = () => {
  if (boxes.length > 1) {
    const bottomBox = boxes[boxes.length - 2];

    const topP = topBox.threejs.position[direction] - 0;
    // bottomBox.threejs.position[direction];

    const bottomP = bottomBox.threejs.position[direction];
    const bottomW = bottomBox.width;
    const bottomD = bottomBox.depth;
    let isOutside = false;
    const bSize = direction === "x" ? bottomW : bottomD;
    const topPosi = topBox.threejs.position[direction];

    isOutside = topPosi <= bottomP - bSize || topPosi >= bottomP + bSize;

    if (isOutside) {
      topBox.cannonjs.mass = 1;
      topBox.cannonjs.updateMassProperties();
      gameOver = true;
      isGameOver();
      return;
    }

    let hX, hY, hZ;
    let hWidth = topBox.width;
    let hDepth = topBox.depth;
    let size = direction === "x" ? topBox.width : topBox.depth;

    const scaleP = (size - Math.abs(topP)) / size;

    if (direction === "x") hWidth = Math.abs(topP);
    else if (direction === "z") hDepth = Math.abs(topP);

    hX = topBox.threejs.position.x;
    hZ = topBox.threejs.position.z;
    hY = topBox.threejs.position.y;

    topBox.threejs.scale[direction] = scaleP;

    if (topP < 0) {
      topBox.threejs.position[direction] = -size / 2 + scaleP * (size / 2);
      if (direction === "z") hZ -= (scaleP * size) / 2;
      else hX -= (scaleP * size) / 2;
    } else {
      topBox.threejs.position[direction] = size / 2 - (scaleP * size) / 2;

      if (direction === "z") hZ += (scaleP * size) / 2;
      else hX += (scaleP * size) / 2;
    }

    addHangBox(hWidth, 3, hDepth, hX, hY, hZ);
    slicePhysicsBox(scaleP * size);

    if (direction === "x") topBox.width -= Math.abs(topP);
    else topBox.depth -= Math.abs(topP);
  }

  addBox();
};

const slicePhysicsBox = (scale) => {
  const { x, y, z } = topBox.threejs.position;
  console.log(topBox.cannonjs);
  let { x: width, y: height, z: depth } = topBox.cannonjs.shapes[0].halfExtents;

  if (direction === "x") width = scale / 2;
  else if (direction === "z") depth = scale / 2;

  const shape = new cannon.Box(new cannon.Vec3(width, height, depth));
  const body = new cannon.Body({
    mass: 0,
    shape,
    type: cannon.Body.DYNAMIC,
  });
  body.position.set(x, y, z);

  world.removeBody(topBox.cannonjs);
  world.addBody(body);
  topBox.cannonjs = body;
};

const updateScore = () => {
  scoreCon.textContent = "Score: " + (boxes.length - 1);
};

start();
