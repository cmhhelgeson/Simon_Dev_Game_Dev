/* eslint-disable compat/compat */
import * as THREE from 'three/webgpu';
import { WebGPURenderer } from 'three/webgpu';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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
// A game running at 60fps versus 30fps
// 1. frameDelta/deltaTime/dt: time elapsed between the current frame and the next frame.


class App {

	#renderer: WebGPURenderer;
	#camera: THREE.PerspectiveCamera;
	#scene: THREE.Scene;

	constructor() {

	}

	//
	Initialize() {

		this.#renderer = new THREE.WebGPURenderer();
		this.#renderer.setSize( window.innerWidth, window.innerHeight );
		document.body.appendChild( this.#renderer.domElement );

		const aspect = window.innerWidth / window.innerHeight;
		this.#camera = new THREE.PerspectiveCamera( 50, aspect, 0.1, 2000 );
		this.#camera.position.z = 5;

		const controls = new OrbitControls( this.#camera, this.#renderer.domElement );
		// Smooths camera movement
		controls.enableDamping = true;
		// Explicitly set camera's target to the default of 0, 0, 0
		controls.target.set( 0, 0, 0, );
		controls.update();

		this.#scene = new THREE.Scene();

		const mesh = new THREE.Mesh(
			new THREE.BoxGeometry(),
			new THREE.MeshBasicMaterial( {
				color: 0xff0000,
				wireframe: true,
			} )
		);

		this.#scene.add( mesh );

	}

	Run() {

		// The arrow function inherits from the surrounding context of the class
		const render = () => {

			this.#renderer.render( this.#scene, this.#camera );
			requestAnimationFrame( render );

		};

		render();

	}

}

// While this will produce identical output to the code below, tidy code
// and encapsulation is the key to preventing sprawl.
const app = new App();
app.Initialize();
app.Run();
