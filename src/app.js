import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import "./style.css";
import * as dat from "dat.gui";
import * as cannon from "cannon-es";

const scoreCon = document.querySelector(".score_container span");
const gui = new dat.GUI();

let scene, camera, renderer, controls, gameOver;
let speed, direction, boxes, topBox, hangBox;
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
  hangBox = undefined;
  speed = 0.05;
  direction = "x";
  removeAllBoxes();
  gameOver = false;
  updateScore();
  toggleGameOverCon();
}

const animate = () => {
  renderer.render(scene, camera);
  controls.update();

  if (!gameOver && topBox) {
    world.step(1 / 60);

    topBox.threejs.position[direction] += speed;
    topBox.cannonjs.position[direction] += speed;

    if (hangBox) hangBox.threejs.position.y = hangBox.cannonjs.position.y;

    isGameOver();
  }

  window.requestAnimationFrame(animate);
};

const addBox = () => {
  const geometry = new THREE.BoxBufferGeometry(10, 3, 10);
  const material = new THREE.MeshLambertMaterial({ color: 0xff00ff });
  const mesh = new THREE.Mesh(geometry, material);

  const shape = new cannon.Box(new cannon.Vec3(10 / 2, 3 / 2, 10 / 2));
  const body = new cannon.Body({ mass: 0, shape });

  if (boxes.length === 0) {
    mesh.position.set(0, 0, 0);
    body.position.set(0, 0, 0);
  } else {
    topBox = boxes[boxes.length - 1];
    const { y } = topBox.threejs.position;
    let x = direction === "z" ? -30 : 0;
    let z = direction === "x" ? -30 : 0;

    mesh.position.set(x, y + 3, z);
    body.position.set(x, y + 3, z);
  }

  scene.add(mesh);
  world.addBody(body);
  boxes.push({ threejs: mesh, cannonjs: body });

  topBox = boxes[boxes.length - 1];
  direction = direction === "x" ? "z" : "x";
  updateScore();
};

const addHangBox = (width, height, depth, x, y, z) => {
  const geometry = new THREE.BoxBufferGeometry(width, height, depth);
  const material = new THREE.MeshLambertMaterial({ color: 0xff00ff });
  const mesh = new THREE.Mesh(geometry, material);

  const shape = new cannon.Box(
    new cannon.Vec3(width / 2, height / 2, depth / 2)
  );
  const body = new cannon.Body({ mass: 1, shape });
  mesh.position.set(x, y, z);
  body.position.set(x, y, z);

  scene.add(mesh);
  world.addBody(body);
  hangBox = { threejs: mesh, cannonjs: body };
};

const removeAllBoxes = () => {
  // remove all boxes
  for (let i = scene?.children.length - 1; i >= 0; i--) {
    console.log(scene.children[i].type);
    if (scene.children[i].type === "Mesh") scene.remove(scene.children[i]);
  }
};

const isGameOver = () => {
  if (topBox.threejs.position[direction] >= 30) {
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

    if (direction === "x") {
      const topX = topBox.threejs.position.x;
      console.log(topX, topBox.threejs.scale);
      if (topX <= -10 || topX >= 10) {
        console.log("this should go down");
      }

      let hX, hY, hZ;
      let hWidth,
        hDepth = 10;

      const scaleX = (10 - Math.abs(topX)) / 10;
      hWidth = Math.abs(topX);
      hX = topBox.threejs.position.x;
      hZ = topBox.threejs.position.z;
      hY = topBox.threejs.position.y;

      topBox.threejs.scale.x = scaleX;
      if (topX < 0) {
        topBox.threejs.position.x = -5 + scaleX * 5;
        hX -= scaleX * 5;
      } else {
        topBox.threejs.position.x = 5 - scaleX * 5;
        hX += scaleX * 5;
      }

      addHangBox(hWidth, 3, hDepth, hX, hY, hZ);
    } else {
      const topZ = topBox.threejs.position.z;
      if (topZ <= -10 || topZ >= 10) {
        console.log("this should go down too");
      }
    }
  }
  setTimeout(() => {
    // debugger;
  }, 50);

  addBox();
};

const updateScore = () => {
  scoreCon.textContent = "Score: " + (boxes.length - 1);
};

start();
