import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { PCDLoader } from 'three/addons/loaders/PCDLoader.js';
THREE.ColorManagement.enabled = false; // TODO: Consider enabling color management.

let container;
let camera, scene, renderer;
let points;



init()
animate()

function addPoints2(points){
    // Prepare Object
    fetch("/cotton.ply", {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    })
    .then((response) => response.text())
    .then((text) => {
        let [_header, body] = text.split('end_header')
        let points = body.split('\n').map(line => {
            let matches = line.match(/(\d+)\s(\d+)\s(\d+)\s(\d+)\s\d+\s\d+/)
            return matches? matches.slice(1, 5):null
        })
        return points
    })
    .then((points) => {
        for(let i = 0; i < points.length; i++){
            console.log(`${i} out of ${points.length}`)
            let point = points[i]
            if (point){
                const objGeometry = new THREE.BoxGeometry( 0.1, 0.1, 0.1 ); 
                const objMaterial = new THREE.MeshStandardMaterial( { color: 0x0000ff } );
                const obj = new THREE.Mesh( objGeometry, objMaterial );
                obj.position.set( parseInt(point[0])*0.1, parseInt(point[1])*0.1, parseInt(point[2])*0.1 );
                obj.receiveShadow = true;
                scene.add( obj );
            }
        }
    })
}

function addPoints(){
    const loader = new PCDLoader();

    // load a resource
    loader.load(
    	'cotton50.pcd',
    	function ( points ) {
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
	container = document.createElement( 'div' );
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
	floor.receiveShadow = true;
	scene.add( floor );	
    // Prepare Lights
	scene.add( new THREE.HemisphereLight( 0x808080, 0x606060 ) );
	const light = new THREE.DirectionalLight( 0xffffff );
	light.position.set( 0, 6, 0 );
	light.castShadow = true;
	light.shadow.camera.top = 2;
	light.shadow.camera.bottom = - 2;
	light.shadow.camera.right = 2;
	light.shadow.camera.left = - 2;
	light.shadow.mapSize.set( 4096, 4096 );
	scene.add( light );
	// Renderer
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMap.enabled = true;
	renderer.xr.enabled = true;
	container.appendChild( renderer.domElement );
	document.body.appendChild( VRButton.createButton( renderer ) );
	window.addEventListener( 'resize', onWindowResize );
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
	renderer.render( scene, camera );
}