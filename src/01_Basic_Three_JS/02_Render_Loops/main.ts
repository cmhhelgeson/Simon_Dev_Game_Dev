/* eslint-disable compat/compat */
import * as THREE from 'three/webgpu';
import { WebGPURenderer } from 'three/webgpu';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// Render Loop
// Continuous Cycle updating the game state and rendering the result on screen
// Takes in inputs from player and system, outputs a graphical result that is
// rendererd to the screen.
// Key Responsibilities:
//	1. Update State (Player Movements, Game Environment, AI Systems, Physics)
//		 All Game Systems
// 	2. Display the visual result of those systems interacting.
// 	3. Manage time between each iteration of the update -> draw process,
// 		 and pass that on to each iteration of the render loop.
// 	4. Maintain good game feel
//	Example:
//	void main() {
//		// Initialization step
//		initGame()
//		// Update state and render infinitely
//		while (true)
//			// Logic, Input, Physics, Loading Assets
//			updateState();
//			// Speak to graphics API
//			renderGroup();
//			if (isFinished()) {
//				break;
//			}

// In many game development environments, the loop is obfuscated for ease of use
// Unity: Using GameObject derives from MonoBehavior's Update() function
//	and tends to simply loop through all the extant entities and components
//	(NOTE: Not sure if Simon is talking about pre-ECS Unity or not).

// Frame Deltas
// Helps maintain cosnsitency of gameplay on disparate devices,
// even if each device takes different legnths of time
// to render and update the state of a scene.
// A game running at 60fps versus 30fps should generally look the same
// 1. frameDelta/deltaTime/dt: time elapsed between the current frame and the next frame.
// 		Example: Object moves at 1 meter per second
//			Machine #1 (Slow): Render Loop runs at 1fps -> Update called once per second
//						w/o dt: Moves 1 m per frame, 1 m per second
//						w/ 	dt: Moves 1/1 per frame, 1 m per second
// 			Machine #2 (Fast): Render Loop runs at 2fps -> Update called twice per second
//						w/o dt: Moves 1 m per frame, 2 m per second
//						w/ dt : Moves 1/2 (0.5) m per frame, 1 m per second
//			Machine #3 (30fps) -> Update called 30 times per second
//						w/ dt : Moves 1/30 = 0.03 m per frame, 1 m per second
// 			Machine #4 (60 fps) -> Update called 60 times per second
//						w/ dt : Moves 1/60 = 0.016 m per frame, 1 m per second
// 2. Problems with deltaTime
//		a. Variable Time Steps: In Complex Physics simulations, it's often preferable to have
//			 fixed time steps to prevent non-deterministic behavior. If your game has complex physics simulations,
//			 you may want to separate gameplay render loop behavior from physics render loop behavior.
//		b. Spikes: Large spikes in deltaTime cause jumps in gameplay behavior, which can be mitigated with smoothing.
//			 Can fix by capping frame rate, or ignoring spike.
//		c. Spiral of death: Frame rate drops significantly on frame 1, increasing deltaTime for frame 2.
//			 Frame 2 calculates gameplay with absurdly high deltaTime, and so on. Fix with clamp dt to max.

const frenchFlag = '\uD83C\uDDEB\uD83C\uDDF7';

class App {

	#renderer: WebGPURenderer;
	#camera: THREE.PerspectiveCamera;
	#scene: THREE.Scene;
	#clock: THREE.Clock = new THREE.Clock( true );
	#controls: OrbitControls;
	#mesh: THREE.Mesh;
	#debugUI: GUI;
	#settings = {
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
		// Canvas Values
		fixedAspectController: '16:9',
		fixedAspect: 16 / 9,
	};

	#timeSinceLastUpdate = 0;
	#timeSinceLastRender = 0;

	constructor() {

		window.addEventListener( 'resize', () => {

			this.#onWindowResize();

		} );

	}


	initialize() {

		this.#renderer = new THREE.WebGPURenderer();
		this.#renderer.setSize( window.innerWidth, window.innerHeight );
		this.#renderer.setClearColor( 0x000000 );
		document.body.appendChild( this.#renderer.domElement );

		const aspect = window.innerWidth / window.innerHeight;
		this.#camera = new THREE.PerspectiveCamera( 50, aspect, 0.1, 2000 );
		this.#camera.position.z = 5;

		this.#controls = new OrbitControls( this.#camera, this.#renderer.domElement );
		// Smooths camera movement
		this.#controls.enableDamping = true;
		// Explicitly set camera's target to the default of 0, 0, 0
		this.#controls.target.set( 0, 0, 0, );
		this.#controls.update();

		this.#scene = new THREE.Scene();

		this.#mesh = new THREE.Mesh(
			new THREE.BoxGeometry(),
			new THREE.MeshBasicMaterial( {
				color: 0xff0000,
				wireframe: true,
			} )
		);

		this.#scene.add( this.#mesh );

		this.#debugUI = new GUI();
		const settingsFolder = this.#debugUI.addFolder( 'Time Settings' );
		settingsFolder.add( this.#settings, 'useDeltaTime' );
		settingsFolder.add( this.#settings, 'useFixedFrameRate' );
		const valuesFolder = this.#debugUI.addFolder( 'Values' );
		valuesFolder.add( this.#settings, 'fixedTimeStep', 0.01, 0.5 );
		const fixedCPU = valuesFolder.add( this.#settings, 'fixedCPUFPS', 1, 60 ).step( 1 );
		const fixedGPU = valuesFolder.add( this.#settings, 'fixedGPUFPS', 1, 60 ).step( 1 );
		// Set CPU and GPU to run at same rate when useFixedFrameRate === true
		valuesFolder.add( this.#settings, 'fixedUnifiedFPS', 1, 60 ).step( 1 ).onChange( () => {

			this.#settings.fixedCPUFPS = this.#settings.fixedUnifiedFPS;
			fixedCPU.setValue( this.#settings.fixedUnifiedFPS );
			this.#settings.fixedGPUFPS = this.#settings.fixedUnifiedFPS;
			fixedGPU.setValue( this.#settings.fixedUnifiedFPS );

		} );
		valuesFolder.add( this.#settings, 'clampMin', 0.01, 1.0 );
		valuesFolder.add( this.#settings, 'clampMax', 0.01, 1.0 );
		const resizeSettingsFolder = this.#debugUI.addFolder( 'Resize Settings' );
		resizeSettingsFolder.add( this.#settings, 'resizeCanvas' );
		resizeSettingsFolder.add( this.#settings, 'cameraResizeUpdate' );
		resizeSettingsFolder.add( this.#settings, 'useFixedAspectRatio' );
		const resizeValuesFolder = this.#debugUI.addFolder( 'Resize Values' );
		resizeValuesFolder.add( this.#settings, 'fixedAspectController', [
			'16:9 (HD)',
			'4:3 (CRT)',
			'1:85:1 (Standard)',
			'2.39:1 (Anamorphic)',
			'2.76:1 (Ultra Panavasion)',
			'1.90:1 ("Imax")',
			'1.43:1 (Imax Film)',
			'4:1 (Gance)'
		] ).onChange( () => {

			// Lazy way, no parsing
			switch ( this.#settings.fixedAspectController ) {


				case '4:3 (CRT)': {

					this.#settings.fixedAspect = 4 / 3;
					break;

				}

				case '1:85:1 (Standard)': {

					this.#settings.fixedAspect = 1.85;
					break;

				}

				case '2.39:1 (Anamorphic)': {

					this.#settings.fixedAspect = 2.39;
					break;

				}

				case '2.76:1 (Ultra Panavasion)': {

					this.#settings.fixedAspect = 2.76;
					break;

				}

				case '1.90:1 ("Imax")': {

					this.#settings.fixedAspect = 1.90;
					break;

				}

				case '1.43:1 (Imax Film)': {

					this.#settings.fixedAspect = 1.43;
					break;

				}

				case '4:1 (Gance)': {

					this.#settings.fixedAspect = 4.0;
					break;

				}


			}

		} ).name( 'Fixed Aspect Ratio' );

		this.#raf();

	}


	#raf() {

		requestAnimationFrame( () => {

			const { useDeltaTime, clampMin, clampMax, fixedTimeStep, useFixedFrameRate, fixedCPUFPS, fixedGPUFPS } = this.#settings;

			const deltaTime = useDeltaTime ? Math.min( Math.max( this.#clock.getDelta(), clampMin ), clampMax ) : fixedTimeStep;

			this.#timeSinceLastRender += deltaTime;
			this.#timeSinceLastUpdate += deltaTime;

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

		this.#controls.update( deltaTime );
		this.#mesh.rotation.y += deltaTime;

	}

	#render( ) {

		this.#renderer.render( this.#scene, this.#camera );

	}

	#onWindowResize() {

		// NOTE how the mesh distorts when either projection updates and canvas resizing are off.
		// Proper perspective is maintained when both are turned off, but parts of the image get cut off.
		// (technically the image changes as we resize [there is no letterboxing or aspect ratio maintenance])
		// maintaining an image with the same amount of pixel area, even if the perspective of the elements
		// in the image are the same. For that, we need to maintain a fixed aspect ratio

		if ( this.#settings.cameraResizeUpdate ) {

			this.#camera.aspect = this.#settings.useFixedAspectRatio ? this.#settings.fixedAspect : window.innerWidth / window.innerHeight;
			this.#camera.updateProjectionMatrix();

		}

		this.#renderer.setSize( 2.7 * 500, 1 * 500, this.#settings.resizeCanvas );

	}

}

// While this will produce identical output to the code below, tidy code
// and encapsulation is the key to preventing sprawl.
const app = new App();
app.initialize();
