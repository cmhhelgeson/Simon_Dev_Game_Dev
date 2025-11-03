import * as THREE from 'three';

class ManagedGroup extends THREE.Group {

	#disposeMaterials_ = true;
	#disposeTextures_ = true;
	#disposeGeometries_ = true;

	constructor( shallow ) {

		super();

		if ( shallow ) {

			this.#disposeMaterials_ = true;
			this.#disposeTextures_ = false;
			this.#disposeGeometries_ = false;

		}

	}

	get IsManagedGroup() {

		return true;

	}

	dispose() {

		for ( let i = 0; i < this.children.length; i ++ ) {

			const child = this.children[ i ];

			if ( child.IsManagedGroup ) {

				child.dispose();

			} else {

				this.#disposeChild_( child );

			}

		}

	}

	#disposeChild_( node ) {

		node.traverse( ( c ) => {

			if ( c instanceof THREE.Mesh ) {

				for ( const k in c.material ) {

					if ( this.#disposeTextures_ ) {

						if ( c.material[ k ] instanceof THREE.Texture ) {

							const tex = c.material[ k ];

							if ( tex.source.data instanceof ImageBitmap ) {

								tex.source.data.close();

							}

							tex.dispose();

						}

					}

				}

				if ( this.#disposeGeometries_ ) {

					c.geometry.dispose();

				}

				if ( this.#disposeMaterials_ ) {

					c.material.dispose();

				}

			}

		} );

	}

}

export { ManagedGroup };
