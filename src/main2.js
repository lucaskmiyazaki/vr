import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { PCDLoader } from 'three/addons/loaders/PCDLoader.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory';
THREE.ColorManagement.enabled = false; // TODO: Consider enabling color management.

let camera, scene, renderer, controllers, markers, oldMarkers, positionOffset;
let pcd;
let pcdName;
let skeletonIndex;
const markerGeometry = new THREE.BoxGeometry( 0.03, 0.03, 0.03 ); 
const markerMaterial = new THREE.MeshStandardMaterial( { color: 0x0000ff } );
const oldMarkerMaterial = new THREE.MeshStandardMaterial( { color: 0x00ff00 } );

let pcdNames;

fetch("data")
.then(response => response.json())
.then(data => {
	pcdNames = data.fileNames;
}).then(() => {
	init()
	animate()
})

function onControllerSelectStart() {
    this.userData.selectPressed = true;
}

function onControllerSelectEnd() {
  	this.userData.selectPressed = false;
}

function onControllerSqueezeStart() {
    this.userData.squeezePressed = true;
}

function onControllerSqueezeEnd() {
  	this.userData.squeezePressed = false;
}

function buildControllers() {
	const controllerModelFactory = new XRControllerModelFactory();
	controllers = [];
  
	for (let i = 0; i < 2; i++) {
	  	const controller = renderer.xr.getController(i);

	  	controller.userData.selectPressed = false;
	  	controller.userData.selectPressedPrev = false;
	  	controller.addEventListener('selectstart', onControllerSelectStart);
		controller.addEventListener('selectend', onControllerSelectEnd);

		controller.userData.squeezePressed = false;
		controller.userData.squeezePressedPrev = false;
		controller.addEventListener('squeezestart', onControllerSqueezeStart);
	  	controller.addEventListener('squeezeend', onControllerSqueezeEnd);

		controller.addEventListener('connected', e => {
			controller.gamepad = e.data.gamepad;
		});
		controller.userData.btnAPressedPrev = false;
		controller.userData.btnBPressedPrev = false;
		controller.userData.thumbstickActivePrev = false;

	  	scene.add(controller);
	  	controllers.push(controller);
  
	  	const grip = renderer.xr.getControllerGrip(i);
	  	grip.add(controllerModelFactory.createControllerModel(grip));
	  	scene.add(grip);
	}
}

function moveThumbstick(axis, value){
	pcd.position[axis] += value
	markers.forEach(marker => marker.position[axis] += value)
	oldMarkers.forEach(marker => marker.position[axis] += value)
	positionOffset[axis] += value
}

function handleController(controller){
	let gamepad = controller.gamepad
	if (!gamepad) return

	if (controller.userData.selectPressed){
		if (!controller.userData.selectPressedPrev){
            let marker = new THREE.Mesh( markerGeometry, markerMaterial );
            marker.position.set( controller.position.x, controller.position.y, controller.position.z );
            scene.add( marker );
			markers.push(marker);
		}
	}
	controller.userData.selectPressedPrev = controller.userData.selectPressed

	let thumbstick = gamepad.axes;
	if ((thumbstick[2] !== 0 || thumbstick[3] !== 0) && !controller.userData.thumbstickActivePrev){
		moveThumbstick('x', thumbstick[2] * 0.1)
		if (controller.userData.squeezePressed){
			moveThumbstick('y', thumbstick[3] * 0.1)
	} else {
			moveThumbstick('z', thumbstick[3] * 0.1)
		} 
		controller.userData.thumbstickActivePrev = true
	} else{
		controller.userData.thumbstickActivePrev = false
	} 

	let btnA = gamepad.buttons[4]
	let btnB = gamepad.buttons[5]
	if ((btnB.value > 0 || btnB.pressed) && !controller.userData.btnBPressedPrev) {
		let lastMarker = markers.pop()
		if (lastMarker) scene.remove(lastMarker)
	}
	controller.userData.btnBPressedPrev = btnB.pressed
	if ((btnA.value > 0 || btnA.pressed) && !controller.userData.btnAPressedPrev) {
		if (markers.length === 0) {
			scene.remove(pcd)
			oldMarkers.forEach(marker => scene.remove(marker))
			addPoints()
		} else{
			let points = markers.map(marker => {
				let point = [marker.position.x - positionOffset.x, marker.position.y - positionOffset.y, marker.position.z - positionOffset.z]
				oldMarkers.push(marker)
				marker.material = oldMarkerMaterial
				return point
			})
			markers = []
			let data = {
				points: points,
				fileName: pcdName.slice(0, -4),
				index: skeletonIndex++,
			}
			fetch("annotation", {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept':'application/json'
				},
				body: JSON.stringify(data),
			})	
		}
	}
	controller.userData.btnAPressedPrev = btnA.pressed
}

function addPoints(){
    const loader = new PCDLoader();
	markers = [];
	oldMarkers = [];
	skeletonIndex = 0;
	pcdName = pcdNames? pcdNames.pop():'';
	positionOffset = {x: 0, y: 0, z: 0};
	console.log(pcdName)

    // load a resource
    if (pcdName) loader.load(
    	pcdName,
    	function ( points ) {
			pcd = points;
    		scene.add( points );
    	},
    	function ( xhr ) {
    		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
    	},
    	function ( error ) {
    		console.log( error );
    	}
    );
}

function init() {
    // Prepare Environment
	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x000000 );
	camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 10 );
	camera.position.set( 0, 1.6, 10 );
    // Prepare Floor
	const floorGeometry = new THREE.PlaneGeometry( 4, 4 );
	const floorMaterial = new THREE.MeshStandardMaterial( { color: 0x222222 } );
	const floor = new THREE.Mesh( floorGeometry, floorMaterial );
	floor.rotation.x = - Math.PI / 2;
	scene.add( floor );	
    // Prepare Lights
	const light = new THREE.AmbientLight( 0x404040 ); // soft white light
	scene.add( light );
	// Renderer
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	window.addEventListener( 'resize', onWindowResize );
	// VR
	renderer.xr.enabled = true;
	container.appendChild( renderer.domElement );
	document.body.appendChild( VRButton.createButton( renderer ) );
	buildControllers();
    // Add objects
    addPoints()
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
	renderer.setAnimationLoop( render );
}

function render() {
	if (controllers){
		controllers.forEach(controller => {
			handleController(controller)
		})
	}

	renderer.render( scene, camera );
}