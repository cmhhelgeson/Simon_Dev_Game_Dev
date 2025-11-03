import * as THREE from 'three';


// Taken from https://github.com/mrdoob/three.js/issues/758
function _GetImageData( image ) {

	const canvas = document.createElement( 'canvas' );
	canvas.width = image.width;
	canvas.height = image.height;

	const context = canvas.getContext( '2d' );
	context.translate( 0, image.height );
	context.scale( 1, - 1 );
	context.drawImage( image, 0, 0 );

	return context.getImageData( 0, 0, image.width, image.height );

}

class TextureArrayLoader {

	constructor() {
	}

	load( names, callback ) {

		const manager = new THREE.LoadingManager();
		const loader = new THREE.TextureLoader( manager );

		const textures = names.map( n => loader.load( n ) );

		manager.onLoad = () => {

			const textureArray = this.#onLoad_( textures );
			callback( textureArray );

		};

	}

	async loadAsync( names ) {

		return new Promise( ( resolve, reject ) => {

			this.load( names, ( textureArray ) => {

				resolve( textureArray );

			} );

		} );

	}

	#onLoad_( textures ) {

		let X = null;
		let Y = null;
		let data = null;

		for ( let t = 0; t < textures.length; t ++ ) {

			const curData = _GetImageData( textures[ t ].image );

			const h = curData.height;
			const w = curData.width;

			if ( X === null ) {

				X = w;
				Y = h;
				data = new Uint8Array( textures.length * 4 * X * Y );

			}

			if ( w !== X || h !== Y ) {

				console.error( 'Texture dimensions do not match' );
				return;

			}

			const offset = t * ( 4 * w * h );

			data.set( curData.data, offset );

		}

		const diffuse = new THREE.DataArrayTexture( data, X, Y, textures.length );
		diffuse.format = THREE.RGBAFormat;
		diffuse.type = THREE.UnsignedByteType;
		diffuse.minFilter = THREE.LinearMipMapLinearFilter;
		diffuse.magFilter = THREE.LinearFilter;
		diffuse.wrapS = THREE.ClampToEdgeWrapping;
		diffuse.wrapT = THREE.ClampToEdgeWrapping;
		diffuse.generateMipmaps = true;
		diffuse.needsUpdate = true;

		return diffuse;

	}

}

export { TextureArrayLoader };
