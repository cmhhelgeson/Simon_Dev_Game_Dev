/* eslint-disable compat/compat */
import * as THREE from 'three/webgpu';
import { WebGPURenderer } from 'three/webgpu';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { deinterleaveAttribute } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Scene Graph: Basic data strucutre to manage complexity of scene
// Graph represents everything in scene and everythign that scene
// depends on for renderers.
// Scene Graph exists in a tree structure:
//	Nodes with children
//	       	[]
// 	        /\
// 	      []  []
//        /\  /\
//			 [][][][]
// Includes meshes, particle systems, lights, cameras, etc
// Tree forms a transform hierarchy
// Each parent's transform applies to the child's transform as well
// So if the top most node rotates 21 degrees, all it's children will rotate
// 21 degrees as well, then the children's indivudal transforms will be applied.

interface Planet {
	distance: number,
	color: THREE.Color,
	size: number,
	name: string,
	moons: Planet[],
	speed: number,
}

class App {

	#renderer: WebGPURenderer;
	#camera: THREE.PerspectiveCamera;
	#scene: THREE.Scene;
	#clock: THREE.Clock = new THREE.Clock( true );
	#controls: OrbitControls;
	#mesh: THREE.Mesh;
	#debugUI: GUI;
	#debugUIMap = {};
	#rendererSettings = {
		// Time Settings
		useDeltaTime: true,
		useFixedFrameRate: false,
		fixedTimeStep: 0.03,
		fixedUnifiedFPS: 30,
		fixedCPUFPS: 30,
		fixedGPUFPS: 30,
		// Time Values
		clampMin: 0.01,
		clampMax: 0.5,
		// Canvas Settings,
		resizeCanvas: true,
		cameraResizeUpdate: true,
		useFixedAspectRatio: false,
		useDPR: true,
		// Canvas Values
		fixedAspectController: '16:9',
		aspectWidth: 16,
		aspectHeight: 9,
		dprValue: 'Device',
	};

	#orbits: Group[] = [];


	#settings = {
		rotateEarth: true,
		rotateMoon: true,
		earthOrbitalPlane: 0.0,
	};


	#timeSinceLastUpdate = 0;
	#timeSinceLastRender = 0;

	constructor() {

		window.addEventListener( 'resize', () => {

			this.#onWindowResize();

		} );

	}


	initialize() {

		this.#renderer = new THREE.WebGPURenderer( { canvas: document.getElementById( 'c' ) } );
		this.#renderer.setSize( window.innerWidth, window.innerHeight );
		this.#renderer.setClearColor( 0x000000 );
		document.body.appendChild( this.#renderer.domElement );

		const aspect = window.innerWidth / window.innerHeight;
		this.#camera = new THREE.PerspectiveCamera( 50, aspect, 0.1, 2000 );
		this.#camera.position.z = 200;

		this.#controls = new OrbitControls( this.#camera, this.#renderer.domElement );
		// Smooths camera movement
		this.#controls.enableDamping = true;
		// Explicitly set camera's target to the default of 0, 0, 0
		this.#controls.target.set( 0, 0, 0 );
		this.#controls.update();

		this.#scene = new THREE.Scene();

		const planets: Planet[] = [
			{
				name: 'earth',
				size: 5,
				distance: 60,
				color: new THREE.Color( 0x0000ff ),
				speed: 1,
				moons: [
					{
						name: 'moon',
						distance: 8,
						size: 1,
						speed: 3,
						color: new THREE.Color( 0x888888 ),
						moons: [],
					}
				]
			}, {
				name: 'mars',
				size: 4,
				color: new THREE.Color( 0xff0000 ),
				distance: 100,
				speed: 0.5,
				moons: [
					{
						name: 'phobos',
						size: 1,
						color: new THREE.Color( 0x888888 ),
						distance: 7,
						speed: 3,
						moons: [],
					}, {
						name: 'delmos',
						size: 1,
						color: new THREE.Color( 0x888888 ),
						distance: 11,
						speed: 4,
						moons: [],
					}
				]
			}
		];

		this.#createSolarSystem3( planets );

		this.#debugUI = new GUI();
		//this.#addRendererDebugGui();

		this.#raf();

	}

	/*#createSolarSystem() {

		const sunGeo = new THREE.SphereGeometry( 40, 32, 32 );
		const sunMaterial = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
		this.#sun = new THREE.Mesh( sunGeo, sunMaterial );

		const earthGeo = new THREE.SphereGeometry( 5, 32, 32 );
		const earthMaterial = new THREE.MeshBasicMaterial( { color: 0x0000ff } );
		this.#earth = new THREE.Mesh( earthGeo, earthMaterial );
		this.#earth.position.set( 60, 0, 0 );

		const moonGeo = new THREE.SphereGeometry( 1, 32, 32 );
		const moonMaterial = new THREE.MeshBasicMaterial( { color: 0x888888 } );
		const moon = new THREE.Mesh( moonGeo, moonMaterial );
		moon.position.set( 8, 0, 0 );
		this.#earth.add( moon );

		this.#sun.add( this.#earth );
		this.#scene.add( this.#sun );

	}

	#createSolarSystem2() {

		// Create new mesh.
		const moonGeo = new THREE.SphereGeometry( 1, 32, 32 );
		const moonMaterial = new THREE.MeshBasicMaterial( { color: 0x888888 } );
		const moon = new THREE.Mesh( moonGeo, moonMaterial );
		moon.position.set( 8, 0, 0 );

		// Create a group that is inserted in lieu of the object itself.
		this.#moonOrbit = new THREE.Group();
		this.#moonOrbit.add( moon );

		// Create new mesh.
		const earthGeo = new THREE.SphereGeometry( 5, 32, 32 );
		const earthMaterial = new THREE.MeshBasicMaterial( { color: 0x0000ff } );
		this.#earth = new THREE.Mesh( earthGeo, earthMaterial );
		this.#earth.position.set( 60, 0, 0 );

		// Create group
		this.#earthOrbit = new THREE.Group();
		this.#earthOrbit.add( this.#earth );

		// Add orbit from one layer down.
		this.#earth.add( this.#moonOrbit );

		// Create new mesh
		const sunGeo = new THREE.SphereGeometry( 40, 32, 32 );
		const sunMaterial = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
		this.#sun = new THREE.Mesh( sunGeo, sunMaterial );

		// Create group
		//na

		// Add orbit from one layer down
		this.#sun.add( this.#earthOrbit );
		this.#scene.add( this.#sun );

		// From here, in the step function, we rotate the orbits themselves rather than the object

	} */

	#createCelestialBody( parent: THREE.Mesh, planet: Planet ) {

		const geo = new THREE.SphereGeometry( planet.size, 32, 32 );
		const material = new THREE.MeshBasicMaterial( { color: planet.color } );
		const planetMesh = new THREE.Mesh( geo, material );
		planetMesh.position.set( planet.distance, 0, 0 );

		const planetOrbit = new THREE.Group();
		planetOrbit.add( planetMesh );

		this.#orbits.push( { target: planetOrbit, speed: planet.speed } );
		parent.add( planetOrbit );

		for ( const moon of planet.moons ) {

			this.#createCelestialBody( planetMesh, moon );

		}

	}

	#createSolarSystem3( planetData: Planet[] ) {

		const sunGeo = new THREE.SphereGeometry( 40, 32, 32 );
		const sunMaterial = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
		const sun = new THREE.Mesh( sunGeo, sunMaterial );

		this.#scene.add( sun );

		for ( const planet of planetData ) {

			this.#createCelestialBody( sun, planet );

		}

	}

	#addRendererDebugGui() {

		this.#debugUIMap[ 'Time Settings' ] = this.#debugUI.addFolder( 'Time Settings' );
		this.#debugUIMap[ 'Time Settings' ].add( this.#rendererSettings, 'useDeltaTime' );
		this.#debugUIMap[ 'Time Settings' ].add( this.#rendererSettings, 'useFixedFrameRate' );
		this.#debugUIMap[ 'Time Values' ] = this.#debugUI.addFolder( 'Time Values' );
		this.#debugUIMap[ 'Time Values' ].add( this.#rendererSettings, 'fixedTimeStep', 0.01, 0.5 );
		const fixedCPU = this.#debugUIMap[ 'Time Values' ].add( this.#rendererSettings, 'fixedCPUFPS', 1, 60 ).step( 1 );
		const fixedGPU = this.#debugUIMap[ 'Time Values' ].add( this.#rendererSettings, 'fixedGPUFPS', 1, 60 ).step( 1 );
		// Set CPU and GPU to run at same rate when useFixedFrameRate === true
		this.#debugUIMap[ 'Time Values' ].add( this.#rendererSettings, 'fixedUnifiedFPS', 1, 60 ).step( 1 ).onChange( () => {

			this.#rendererSettings.fixedCPUFPS = this.#rendererSettings.fixedUnifiedFPS;
			fixedCPU.setValue( this.#rendererSettings.fixedUnifiedFPS );
			this.#rendererSettings.fixedGPUFPS = this.#rendererSettings.fixedUnifiedFPS;
			fixedGPU.setValue( this.#rendererSettings.fixedUnifiedFPS );

		} );
		this.#debugUIMap[ 'Time Values' ].add( this.#rendererSettings, 'clampMin', 0.01, 1.0 );
		this.#debugUIMap[ 'Time Values' ].add( this.#rendererSettings, 'clampMax', 0.01, 1.0 );
		this.#debugUIMap[ 'Resize Settings' ] = this.#debugUI.addFolder( 'Resize Settings' );
		this.#debugUIMap[ 'Resize Settings' ].add( this.#rendererSettings, 'resizeCanvas' ).onChange( () => {

			this.#onWindowResize();

		} );
		this.#debugUIMap[ 'Resize Settings' ].add( this.#rendererSettings, 'cameraResizeUpdate' ).onChange( () => {

			this.#onWindowResize();

		} );
		this.#debugUIMap[ 'Resize Settings' ].add( this.#rendererSettings, 'useFixedAspectRatio' ).onChange( () => {

			this.#onWindowResize();

		} );
		this.#debugUIMap[ 'Resize Settings' ].add( this.#rendererSettings, 'useDPR' ).onChange( () => {

			this.#onWindowResize();

		} );
		this.#debugUIMap[ 'Resize Values' ] = this.#debugUI.addFolder( 'Resize Values' );
		this.#debugUIMap[ 'Resize Values' ].add( this.#rendererSettings, 'fixedAspectController', [
			'16:9 (HD)',
			'4:3 (CRT)',
			'1:85:1 (Standard)',
			'2.39:1 (Anamorphic)',
			'2.76:1 (Ultra Panavasion)',
			'1.90:1 ("Imax")',
			'1.43:1 (Imax Film)',
			'4:1 (Gance)',
			'1:1'
		] ).onChange( () => {

			// Lazy way, no parsing
			switch ( this.#rendererSettings.fixedAspectController ) {

				case '16:9 (HD)': {

					this.#rendererSettings.aspectWidth = 16;
					this.#rendererSettings.aspectHeight = 9;
					break;

				}

				case '4:3 (CRT)': {

					this.#rendererSettings.aspectWidth = 4;
					this.#rendererSettings.aspectHeight = 3;
					break;

				}

				case '1:85:1 (Standard)': {

					this.#rendererSettings.aspectWidth = 1.85;
					this.#rendererSettings.aspectHeight = 1;
					break;

				}

				case '2.39:1 (Anamorphic)': {

					this.#rendererSettings.aspectWidth = 2.39;
					this.#rendererSettings.aspectHeight = 1;
					break;

				}

				case '2.76:1 (Ultra Panavasion)': {

					this.#rendererSettings.aspectWidth = 2.76;
					this.#rendererSettings.aspectHeight = 1;
					break;

				}

				case '1.90:1 ("Imax")': {

					this.#rendererSettings.aspectWidth = 1.90;
					this.#rendererSettings.aspectHeight = 1;
					break;

				}

				case '1.43:1 (Imax Film)': {

					this.#rendererSettings.aspectWidth = 1.43;
					this.#rendererSettings.aspectHeight = 1;
					break;

				}

				case '4:1 (Gance)': {

					this.#rendererSettings.aspectWidth = 4.0;
					this.#rendererSettings.aspectHeight = 1;
					break;

				}

				case '1:1': {

					this.#rendererSettings.aspectWidth = 1.0;
					this.#rendererSettings.aspectHeight = 1.0;
					break;

				}

			}

			this.#onWindowResize();

		} ).name( 'Fixed Aspect Ratio' );

		this.#debugUIMap[ 'Resize Values' ].add( this.#rendererSettings, 'dprValue', [ 'Device', '0.1', '0.5', '1.0', '2.0', '3.0' ] ).onChange( () => {

			this.#onWindowResize();

		} );

		for ( const folderName in this.#debugUIMap ) {

			this.#debugUIMap[ folderName ].close();

		}

	}


	#raf() {

		requestAnimationFrame( () => {

			const { useDeltaTime, clampMin, clampMax, fixedTimeStep, useFixedFrameRate, fixedCPUFPS, fixedGPUFPS } = this.#rendererSettings;

			const timeElapsed = this.#clock.getDelta();
			const deltaTime = useDeltaTime ? Math.min( Math.max( timeElapsed, clampMin ), clampMax ) : fixedTimeStep;

			// We're still calculating literal time even when deltaTime is set arbitrarily
			this.#timeSinceLastRender += timeElapsed;
			this.#timeSinceLastUpdate += timeElapsed;

			if ( useFixedFrameRate ) {

				// # of times per second to update the state
				const cpuFrameInterval = 1 / fixedCPUFPS;
				// # of times per second to render a frame
				const gpuFrameInterval = 1 / fixedGPUFPS;

				if ( this.#timeSinceLastRender >= cpuFrameInterval ) {

					this.#step( useDeltaTime ? this.#timeSinceLastUpdate : fixedTimeStep );
					this.#timeSinceLastUpdate = 0;

				}

				if ( this.#timeSinceLastRender >= gpuFrameInterval ) {

					this.#render();
					this.#timeSinceLastRender = 0;

				}

			} else {

				this.#step( deltaTime );
				this.#render( deltaTime );

			}

			this.#raf();

		} );

	}

	// State update function
	#step( deltaTime: number ) {

		const { rotateEarth, rotateMoon } = this.#settings;

		for ( const orbit of this.#orbits ) {

			orbit.target.rotateY( deltaTime );

		}

		// Version 1: Parent can only rotate children
		// this.#sun.rotate()

		// Version 2: Orbits can work separately
		// Earth can rotate separately from moon
		/*if ( rotateEarth ) {

			this.#earthOrbit.rotateY( deltaTime );

		}

		if ( rotateMoon ) {

			this.#moonOrbit.rotateY( deltaTime * 5 );

		} */

		// Version 3:

		this.#controls.update( deltaTime );

	}

	#render( ) {

		this.#renderer.render( this.#scene, this.#camera );

	}

	#onWindowResize() {

		const { cameraResizeUpdate, useFixedAspectRatio, aspectWidth, aspectHeight, dprValue } = this.#rendererSettings;

		// NOTE how the mesh distorts when either projection updates and canvas resizing are off.
		// Proper perspective is maintained when both are turned off, but parts of the image get cut off.
		// (technically the image changes as we resize [there is no letterboxing or aspect ratio maintenance])
		// maintaining an image with the same amount of pixel area, even if the perspective of the elements
		// in the image are the same. For that, we need to maintain a fixed aspect ratio
		let canvasWidth = window.innerWidth;
		let canvasHeight = window.innerHeight;

		const dpr = dprValue === 'Device' ? window.devicePixelRatio : parseFloat( dprValue );

		if ( useFixedAspectRatio ) {

			// Aspect ratio of your browser window
			const windowAspect = window.innerWidth / window.innerHeight;
			// Target aspect ratio of your image
			const targetAspect = aspectWidth / aspectHeight;

			// When window size is wider than target, limit the width to a factor of the height
			if ( windowAspect > targetAspect ) {

				// Window is too wide, limit width
				canvasHeight = window.innerHeight;
				canvasWidth = canvasHeight * targetAspect;

				// Otherwise limit the height

			} else {

				// Window is too tall, limit height
				canvasWidth = window.innerWidth;
				canvasHeight = canvasWidth / targetAspect;

			}

		}

		if ( cameraResizeUpdate ) {

			this.#camera.aspect = useFixedAspectRatio ?
				aspectWidth / aspectHeight :
				window.innerWidth / window.innerHeight;
			this.#camera.updateProjectionMatrix();

		}


		// Arguments: Width, height, and whether to resize the canvas
		this.#renderer.setSize( canvasWidth, canvasHeight, this.#rendererSettings.resizeCanvas );
		console.log( this.#rendererSettings.useDPR );
		if ( this.#rendererSettings.useDPR ) {

			this.#renderer.setPixelRatio( dpr );

		} else {

			this.#renderer.setPixelRatio( 1 );

		}

	}

}

// While this will produce identical output to the code below, tidy code
// and encapsulation is the key to preventing sprawl.
const app = new App();
app.initialize();
