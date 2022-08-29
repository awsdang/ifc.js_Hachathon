
import { MathUtils } from "three";
import { Color, LineBasicMaterial, MeshBasicMaterial, SphereGeometry, Mesh , ShaderMaterial, DoubleSide, Vector2, Raycaster} from "three";
import { IfcViewerAPI } from "web-ifc-viewer";
import { unzip } from "unzipit";
import Preload from "preload-it";
import CameraControls from "camera-controls";
import nipplejs from "nipplejs";
import {CSS2DRenderer, CSS2DObject} from "three/examples/jsm/renderers/CSS2DRenderer"


let model;

const preload2 = Preload();
const container = document.getElementById("viewer-container");
const viewer = new IfcViewerAPI({
  container,
  backgroundColor: new Color(0xffffff),
});
const scene = viewer.context.getScene();
const URLs = [wasmPath, workerPath, projectPath];
fetchURLs(URLs);
const camera = viewer.context.ifcCamera

const controls = camera.cameraControls;


function fetchURLs(URLs, subsets) {
  preload2.fetch(URLs);
  preload2.onprogress = (event) => {
    document.getElementById("filesProgress").innerHTML = event.progress;
  };
  preload2.oncomplete = async (items) => {
    setUpMultiThreading(items[1].blobUrl, items[0].xhr.responseURL);
    init(items[2].blobUrl, subsets);
    setupProgressNotification();
  };
}

async function setUpMultiThreading(ifcWorker, wasmPath) {
  await viewer.IFC.loader.ifcManager.useWebWorkers(true, ifcWorker);
  await viewer.IFC.loader.ifcManager.setWasmPath(wasmPath);
}

async function init(zipURL) {
  const { entries } = await unzip(zipURL);
  const fileNames = Object.keys(entries);
  const geometryName = fileNames[0];
  const geometry = await entries[geometryName].blob();
  const geometryURL = URL.createObjectURL(geometry);
  model = await viewer.IFC.loadIfcUrl(geometryURL);
  setupPostProduction(model);
  backgroundSphere(model.geometry.boundingSphere.radius);
  createPlans(model)
  commentsTool(model)



}

function setupProgressNotification() {
  viewer.IFC.loader.ifcManager.setOnProgress((event) => {
    const progressed = Math.trunc((event.loaded / event.total) * 100);
    document.getElementById("UnzipProgress").innerHTML = progressed;
    if (progressed == 100) {
      document.getElementById("progress-loader").classList.add("hidden");
      clearInterval(progressInterval);
      exitInstructions(welcomeBg);
    }
  });
}

async function setupPostProduction(model) {
  const lineMaterial = new LineBasicMaterial({ color: "black" });
  const baseMaterial = new MeshBasicMaterial({
    polygonOffset: true,
    polygonOffsetFactor: 1, // positive value pushes polygon further away
    polygonOffsetUnits: 1,
  });
  viewer.edges.create("example", model.modelID, lineMaterial, baseMaterial);
  await viewer.shadowDropper.renderShadow(model.modelID);
  viewer.context.renderer.postProduction.active = true;
  viewer.context.renderer.postProduction.sao.saoScale = 85;
  viewer.context.renderer.postProduction.setSize(
    container.clientWidth * 1.3,
    container.clientHeight * 1.3
  );
}

function backgroundSphere(radius) {
  const upperShpere = new SphereGeometry( (radius * 15), 32, 16, 0, 2*Math.PI, 0, 0.5 * Math.PI );
  const belowShpere = new SphereGeometry( (radius * 15), 32, 16, 0, 2 *Math.PI, 1.5, .55 * Math.PI );
  upperShpere.computeBoundingBox();
  var material = new ShaderMaterial({
    uniforms: {
      color1: {
        value: new Color(0xbfbfbf)
      },
      color2: {
        value: new Color(0xdbe2fb)
      },
      bboxMin: {
        value: upperShpere.boundingBox.min
      },
      bboxMax: {
        value: upperShpere.boundingBox.max
      }
    },
    vertexShader: `
      uniform vec3 bboxMin;
      uniform vec3 bboxMax;
    
      varying vec2 vUv;
  
      void main() {
        vUv.y = (position.y - bboxMin.y) / (bboxMax.y - bboxMin.y);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color1;
      uniform vec3 color2;
    
      varying vec2 vUv;
      
      void main() {
        
        gl_FragColor = vec4(mix(color1, color2, vUv.y), 1.0);
      }
    `,
    side: DoubleSide
  });
  const sphere1 = new Mesh( upperShpere, material );
  const sphere2 = new Mesh( belowShpere, material );
  scene.add( sphere1 );
  scene.add( sphere2 );
}



async function createPlans(model) {
  await viewer.plans.computeAllPlanViews(model.modelID);
  const lineMaterial = new LineBasicMaterial({ color: 'black' });
	const baseMaterial = new MeshBasicMaterial({
		polygonOffset: true,
		polygonOffsetFactor: 1, // positive value pushes polygon further away
		polygonOffsetUnits: 1,
	});
	 viewer.edges.create('example', model.modelID, lineMaterial, baseMaterial);
  
  const allPlans = viewer.plans.getAll(model.modelID);

  const container = document.getElementById("planTool");
  
  var floorNumber = 0
  for (const plan of allPlans) { 
    const button = document.createElement("div");
    const tooltip = document.createElement("span")

    button.classList.add("icon")
    button.classList.add("group")
    tooltip.classList.add("sidebar-tooltip")
    tooltip.classList.add("group-hover:lg:scale-100")
    
    button.appendChild(tooltip)
    container.appendChild(button);
    button.textContent = floorNumber;
    tooltip.innerHTML = "View " + floorNumber + " Floor"

    floorNumber = floorNumber + 1
   
    button.onclick = () => {
      viewer.edges.toggle('example', true);
      viewer.plans.goTo(model.modelID, plan);
      viewer.context.ifcCamera.setNavigationMode(2);
      viewer.context.renderer.postProduction.active = false;   
    };
  }
  const button = document.createElement("div");
  button.classList.add("icon")
  button.classList.add("group")
  container.appendChild(button);
  button.textContent = "X";
  button.onclick = () => {
    viewer.plans.exitPlanView();
    viewer.edges.toggle('example', false);

  };
}


// Camera Controls
camera.setNavigationMode(1);
cameraStuff()

function cameraStuff() {
  camera.perspectiveCamera.near = 0.01;
  controls.mouseButtons.wheel = CameraControls.ACTION.ZOOM;
  controls.touches.one = CameraControls.ACTION.TOUCH_ROTATE;
  controls.touches.two = CameraControls.ACTION.NONE;
  controls.touches.three = CameraControls.ACTION.NONE;
  
  if (localStorage.getItem("speedMultiplier") !== null) {
    speedMultiplier = localStorage.getItem("speedMultiplier");
  } else {
    speedMultiplier = 1;
  }
  
  wasdSpeed = speedMultiplier * 0.003;
  hArrows = speedMultiplier * 0.08;
  vArrows = speedMultiplier * 0.04;
  joystickSpeed = speedMultiplier * 0.0005;
  controls.azimuthRotateSpeed = 0.5 * speedMultiplier ;
  controls.polarRotateSpeed = 0.25 * speedMultiplier;
  
  function speedControl() {
    range = document.getElementById("speedRange");
    range.value = speedMultiplier * 10;
  
    var slow = document.getElementById("slower");
    slow.addEventListener("click", function () {
      if (speedMultiplier > 0.15) {
        range.value = (speedMultiplier * 1000 - 50) / 100;
        speedMultiplier = (speedMultiplier * 1000 - 50) / 1000;
        wasdSpeed = speedMultiplier * 0.007;
        hArrows = speedMultiplier * 0.08;
        vArrows = speedMultiplier * 0.05;
        joystickSpeed = speedMultiplier * 0.001;
        document.getElementById("speed").innerText = speedMultiplier + "x";
        localStorage.setItem("speedMultiplier", speedMultiplier);
      }
    });
    var fast = document.getElementById("faster");
    fast.addEventListener("click", function () {
      if (speedMultiplier < 4) {
        range.value = (speedMultiplier * 1000 + 50) / 100;
        speedMultiplier = (speedMultiplier * 1000 + 50) / 1000;
        wasdSpeed = speedMultiplier * 0.007;
        hArrows = speedMultiplier * 0.08;
        vArrows = speedMultiplier * 0.05;
        joystickSpeed = speedMultiplier * 0.001;
        document.getElementById("speed").innerText = speedMultiplier + "x";
        localStorage.setItem("speedMultiplier", speedMultiplier);
      }
    });
  
    range.addEventListener("change", function () {
      speedMultiplier = range.value / 10;
      wasdSpeed = speedMultiplier * 0.007;
      hArrows = speedMultiplier * 0.08;
      vArrows = speedMultiplier * 0.05;
      joystickSpeed = speedMultiplier * 0.001;
      document.getElementById("speed").innerText = speedMultiplier + "x";
      localStorage.setItem("speedMultiplier", speedMultiplier);
    });
    document.getElementById("speed").innerText = speedMultiplier + "x";
  }
  
  speedControl();

  controls.zoomTo(1, true);
  
  controls.moveTo(cam.camX, cam.camY, cam.camZ, true)
  controls.rotateTo(cam.camAZ, cam.camPO, true)




  //ADD Keyboard fucntionality
  const KEYCODE = {
    W: 87,
    A: 65,
    S: 83,
    D: 68,
    Q: 81,
    E: 69,
    ARROW_LEFT: 37,
    ARROW_UP: 38,
    ARROW_RIGHT: 39,
    ARROW_DOWN: 40,
  };
  
  function disablePostProduction() {
    viewer.context.renderer.postProduction.active = false;
  }
  
  function enablePostproduction() {
    viewer.context.renderer.postProduction.active = true;
  }
  const wKey = new holdEvent.KeyboardKeyHold(KEYCODE.W, 10);
  const aKey = new holdEvent.KeyboardKeyHold(KEYCODE.A, 10);
  const sKey = new holdEvent.KeyboardKeyHold(KEYCODE.S, 10);
  const dKey = new holdEvent.KeyboardKeyHold(KEYCODE.D, 10);
  const qKey = new holdEvent.KeyboardKeyHold(KEYCODE.Q, 10);
  const eKey = new holdEvent.KeyboardKeyHold(KEYCODE.E, 10);
  
  aKey.addEventListener("holding", function (event) {
    disablePostProduction();
    controls.truck(-wasdSpeed * event.deltaTime, 0, true);
    enablePostproduction();
  });
  dKey.addEventListener("holding", function (event) {
    disablePostProduction();
    controls.truck(wasdSpeed * event.deltaTime, 0, true);
    enablePostproduction();
  });
  wKey.addEventListener("holding", function (event) {
    disablePostProduction();
    controls.forward(wasdSpeed * event.deltaTime, true);
    enablePostproduction();
  });
  sKey.addEventListener("holding", function (event) {
    disablePostProduction();
    controls.forward(-wasdSpeed * event.deltaTime, true);
    enablePostproduction();
  });
  qKey.addEventListener("holding", function (event) {
    disablePostProduction();
    old = controls.getPosition();
    oldTar = controls.getTarget();
    controls.setLookAt(
      old.x,
      +wasdSpeed * event.deltaTime + old.y,
      old.z,
      oldTar.x,
      +wasdSpeed * event.deltaTime + oldTar.y,
      oldTar.z,
      true
    );
    enablePostproduction();
  });
  eKey.addEventListener("holding", function (event) {
    disablePostProduction();
    old = controls.getPosition();
    oldTar = controls.getTarget();
    controls.setLookAt(
      old.x,
      -wasdSpeed * event.deltaTime + old.y,
      old.z,
      oldTar.x,
      -wasdSpeed * event.deltaTime + oldTar.y,
      oldTar.z,
      true
    );
    enablePostproduction();
  });
  
  const leftKey = new holdEvent.KeyboardKeyHold(KEYCODE.ARROW_LEFT, 10);
  const rightKey = new holdEvent.KeyboardKeyHold(KEYCODE.ARROW_RIGHT, 10);
  const upKey = new holdEvent.KeyboardKeyHold(KEYCODE.ARROW_UP, 10);
  const downKey = new holdEvent.KeyboardKeyHold(KEYCODE.ARROW_DOWN, 10);
  
  leftKey.addEventListener("holding", function (event) {
    disablePostProduction();
    controls.rotate(hArrows * MathUtils.DEG2RAD * event.deltaTime, 0, true);
    enablePostproduction();
  });
  rightKey.addEventListener("holding", function (event) {
    disablePostProduction();
    controls.rotate(-hArrows * MathUtils.DEG2RAD * event.deltaTime, 0, true);
    enablePostproduction();
  });
  upKey.addEventListener("holding", function (event) {
    disablePostProduction();
    controls.rotate(0, vArrows * MathUtils.DEG2RAD * event.deltaTime, true);
    enablePostproduction();
  });
  downKey.addEventListener("holding", function (event) {
    disablePostProduction();
    controls.rotate(0, -vArrows * MathUtils.DEG2RAD * event.deltaTime, true);
    enablePostproduction();
  });
  


  //joystick
  if (
    window.navigator.userAgent.match(/Android/i) ||
    window.navigator.userAgent.match(/iPhone/i) ||
    window.navigator.userAgent.match(/iPad/i) ||
    window.navigator.maxTouchPoints >= 1
  ) {
    var joystick01 = {
      zone: document.getElementById("joystickLeft"), // active zone
      multitouch: true,
      maxNumberOfNipples: 1, // when multitouch, what is too many?
      fadeTime: 500,
      mode: "semi",
      catchDistance: 70,
      restJoystick: true, 
      restOpacity: 0.1
    };
  
    var joystick02 = {
      zone: document.getElementById("joystickRight"), // active zone
      multitouch: true,
      maxNumberOfNipples: 1, // when multitouch, what is too many?
      shape: "square",
      lockY: true,
      fadeTime: 500, // only move on the Y axis
      mode: "semi",
      catchDistance: 70,
      restJoystick: true, 
      restOpacity: 0.1
    };
    xAxis = 0;
    yAxis = 0;
    var manager = nipplejs.create(joystick01);
    var interval1 = null;
    manager.on("added", function (evt, nipple1) {
      nipple1.on("start move end dir plainmove", function (evt) {
        if (evt.type == "start") {
          disablePostProduction();
          interval1 = setInterval(joystickLeftFunc, 4);
        }
        if (evt.type == "move") {
          xAxis1 = nipple1.frontPosition.x;
          yAxis1 = nipple1.frontPosition.y;
        } else if (evt.type == "end") {
          clearInterval(interval1);
          enablePostproduction();
        }
      });
    });
  
    yAxis2 = 0;
    var manager2 = nipplejs.create(joystick02);
    var interval2 = null;
    manager2.on("added", function (evt, nipple2) {
      nipple2.on("start move end dir plainmove", function (evt) {
        if (evt.type == "start") {
          disablePostProduction();
          interval2 = setInterval(joystickRightFunc, 4);
        }
        if (evt.type == "move") {
          yAxis2 = nipple2.frontPosition.y;
        } else if (evt.type == "end") {
          clearInterval(interval2);
          enablePostproduction();
        }
      });
    });
  
    function joystickLeftFunc() {
      controls.truck(joystickSpeed * xAxis1, 0, true);
      controls.truck(0, 0, true);
      controls.forward(-joystickSpeed * yAxis1, 0, true);
      controls.forward(0, 0, true);
    }
  
    function joystickRightFunc() {
      old = controls.getPosition();
      oldTar = controls.getTarget();
      controls.setLookAt(
        old.x,
        (+joystickSpeed / 2) * -yAxis2 + old.y,
        old.z,
        oldTar.x,
        (+joystickSpeed / 2) * -yAxis2 + oldTar.y,
        oldTar.z,
        true
      );
    }
  }


}
dimensionTool()


function dimensionTool() {
  const dimension =  document.getElementById("rulerToggle")
  const body = document.getElementsByTagName("body")[0];
  var clicked = false
  var dimInstructions = document.createElement("div")
  dimension.onclick = () => {
    dimensions()
    if (clicked) {
      dimInstructions.remove() 
      dimension.classList.remove("clicked")
      viewer.dimensions.active = false;
      viewer.dimensions.previewActive = false;
      clicked = false
  }
  else {
    dimension.classList.add("clicked")
    viewer.dimensions.active = true;
    viewer.dimensions.previewActive = true;
    clicked = true 
    dimInstructions.classList.add("toolInstructions")
    dimInstructions.innerHTML = "Double-Click to add new, Right-Click to Delete"
    body.appendChild(dimInstructions)
  }
  }

}

function dimensions() {
  window.ondblclick = () => {
    viewer.dimensions.create();
    viewer.context.renderer.postProduction.update();
  };
  window.onauxclick = () => {
    if(camera.currentNavMode.mode === 1){
      viewer.dimensions.delete();
    }
    viewer.dimensions.cancelDrawing();
    viewer.context.renderer.postProduction.update();
  };
  window.onkeydown = (event) => {
    if (event.code === "Delete") {
      viewer.dimensions.delete();
      viewer.context.renderer.postProduction.update();
    }
  };
}


function commentAdd() {
  const commentCamera = viewer.context.getCamera()
  const raycaster = new Raycaster();
  const mouse = new Vector2();
  
  mouse.x = viewer.context.mouse.position.x
  mouse.y = viewer.context.mouse.position.y

  raycaster.setFromCamera(mouse, commentCamera);
  const intersects = raycaster.intersectObject(model);

  if(!intersects.length) {
    return;
  };

  const firstIntersection = intersects[0];
  const location =  firstIntersection.point;

  var newComment = null
  if (newComment === null) {
  newComment = document.createElement("div")
  newComment.classList.add("commentAdd")
  newComment.setAttribute("id", "newComment")
  newComment.innerHTML = `
  <textarea id="comment" type="textarea" class="commentInput" placeholder=" Add a New Comment"></textarea>
  <div id="commentButton" class="commentButton">Submit</div>
    `
  body.appendChild(newComment)
  }

  // var result = null

  // document.getElementById("commentButton").addEventListener("click", function(){
  //   result = getElementById("comment").value;
  //   console.log(result)
  // })

  console.log(newComment)
  // if (result.length === 0 || result === null) {
  //   return
  // }

  // const commentContainer = document.createElement( 'div' );
  // commentContainer.className = 'commentDiv';

  // const deleteButton = document.createElement( 'button' );
  // deleteButton.textContent = 'X';
  // deleteButton.className = 'deleteComment deleteHide';
  // commentContainer.appendChild(deleteButton);

  // var click = false
  // commentContainer.onclick = () => {
  // if (click){
  //   click = false
  //   deleteButton.classList.add('deleteHide');
  // } else {
  //   deleteButton.classList.remove('deleteHide');
  //   click = true
  // }}
 


  // const postit = document.createElement( 'div' );
  // postit.className = 'comment';
  // postit.textContent = result;
  // commentContainer.appendChild(postit);

  // const commentTitle = new CSS2DObject( commentContainer );
  // commentTitle.position.copy(location);
  // scene.add(commentTitle);

  // deleteButton.onclick = () => {
  //   commentContainer.remove();
  //   commentTitle.element = null;
  //   commentTitle.removeFromParent();
  // }

}

function commentsTool(model) {
 const comment =  document.getElementById("commentsToggle")
  const body = document.getElementsByTagName("body")[0];
  var clicked = false
  var commentInstruction = document.createElement("div")

    
  comment.onclick = () => {
  if (clicked) {
    clicked = false
    commentInstruction.remove() 
    comment.classList.remove("clicked")
    window.removeEventListener('dblclick', commentAdd)
    document.getElementById("newComment").remove()
  } else {
  clicked = true
  comment.classList.add("clicked")
  commentInstruction.classList.add("toolInstructions")
  commentInstruction.innerHTML = "Double-Click to add new"
  body.appendChild(commentInstruction)
  window.addEventListener('dblclick', commentAdd)
  }

}
}



