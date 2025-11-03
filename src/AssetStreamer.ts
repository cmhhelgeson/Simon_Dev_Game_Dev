import * as THREE from 'three';
import * as LOAD from './asset-streamer.js';
import { ManagedGroup } from './managed-group.js';


class CachedAssetStreamerOptions {

	renderer = null;
	scene = null;
	camera = null;

}

class CachedAssetStreamer {

	#loaded_ = {};
	#loading_ = {};
	#compileOptions_ = null;

	constructor( options ) {

		this.#compileOptions_ = options;

	}

	dispose() {

		for ( const k in this.#loaded_ ) {

			this.#loaded_[ k ].dispose();

		}

		this.#loaded_ = null;

		// TODO: Handle this better
		this.#loading_ = null;

	}

	loadCached( url ) {

		if ( ! this.#loaded_[ url ] ) {

			throw new Error( 'Asset not loaded: ' + url );

		}

		return this.#cloneObject_( url );

	}

	cacheObject( url, object ) {

		const group = new ManagedGroup( false );
		group.add( object );

		this.#loaded_[ url ] = group;

	}

	async warmCache( url ) {

		const model = await this.loadAsync( url );
		model.dispose();

	}

	async loadAsync( url ) {

		// Basically 3 cases you need to handle

		// 1. The asset is already loaded, in which case, you clone it
		// and you can return immediately.
		if ( this.#loaded_[ url ] ) {

			return this.#cloneObject_( url );

		}

		// 2. The asset isn't loaded, and isn't being loaded currently.
		if ( ! this.#loading_[ url ] ) {

			this.#loading_[ url ] = this.#loadGLTF_( url );

			await this.#loading_[ url ];

			this.#loading_[ url ] = null;

			return this.#cloneObject_( url );

		}

		// 3. The asset isn't loaded, but is being loaded currently.
		// In this case, you wait for the loading to finish.
		await this.#loading_[ url ];

		return this.#cloneObject_( url );

	}

	async #loadGLTF_( url ) {

		const model = await LOAD.loadAsync( url );

		model.traverse( ( c ) => {

			if ( c.isMesh ) {

				c.castShadow = true;
				c.receiveShadow = true;

			}

		} );

		await this.#warmAsset_( model );

		const group = new ManagedGroup( false );
		group.add( model );

		this.#loaded_[ url ] = group;

	}

	async #warmAsset_( model ) {

		const renderer = this.#compileOptions_.renderer;
		const scene = this.#compileOptions_.scene;
		const camera = this.#compileOptions_.camera;

		await renderer.compileAsync( model, camera, scene );

		model.traverse( ( c ) => {

			if ( c.isMesh ) {

				for ( const k in c.material ) {

					const t = c.material[ k ];

					if ( t instanceof THREE.Texture ) {

						renderer.initTexture( t );

					}

				}

			}

		} );

	}

	#cloneObject_( url ) {

		const original = this.#loaded_[ url ];
		const cloned = new ManagedGroup( true );
		cloned.add( original.children[ 0 ].clone() );
		return cloned;

	}

}

export { CachedAssetStreamer, CachedAssetStreamerOptions };
