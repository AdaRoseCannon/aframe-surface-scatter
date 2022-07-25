(function (three) {
	'use strict';

	/**
	 * Utility class for sampling weighted random points on the surface of a mesh.
	 *
	 * Building the sampler is a one-time O(n) operation. Once built, any number of
	 * random samples may be selected in O(logn) time. Memory usage is O(n).
	 *
	 * References:
	 * - http://www.joesfer.com/?p=84
	 * - https://stackoverflow.com/a/4322940/1314762
	 */

	const _face = new three.Triangle();
	const _color = new three.Vector3();

	class MeshSurfaceSampler {

		constructor( mesh ) {

			let geometry = mesh.geometry;

			if ( ! geometry.isBufferGeometry || geometry.attributes.position.itemSize !== 3 ) {

				throw new Error( 'THREE.MeshSurfaceSampler: Requires BufferGeometry triangle mesh.' );

			}

			if ( geometry.index ) {

				geometry = geometry.toNonIndexed();

			}

			this.geometry = geometry;
			this.randomFunction = Math.random;

			this.positionAttribute = this.geometry.getAttribute( 'position' );
			this.colorAttribute = this.geometry.getAttribute( 'color' );
			this.weightAttribute = null;

			this.distribution = null;

		}

		setWeightAttribute( name ) {

			this.weightAttribute = name ? this.geometry.getAttribute( name ) : null;

			return this;

		}

		build() {

			const positionAttribute = this.positionAttribute;
			const weightAttribute = this.weightAttribute;

			const faceWeights = new Float32Array( positionAttribute.count / 3 );

			// Accumulate weights for each mesh face.

			for ( let i = 0; i < positionAttribute.count; i += 3 ) {

				let faceWeight = 1;

				if ( weightAttribute ) {

					faceWeight = weightAttribute.getX( i )
						+ weightAttribute.getX( i + 1 )
						+ weightAttribute.getX( i + 2 );

				}

				_face.a.fromBufferAttribute( positionAttribute, i );
				_face.b.fromBufferAttribute( positionAttribute, i + 1 );
				_face.c.fromBufferAttribute( positionAttribute, i + 2 );
				faceWeight *= _face.getArea();

				faceWeights[ i / 3 ] = faceWeight;

			}

			// Store cumulative total face weights in an array, where weight index
			// corresponds to face index.

			this.distribution = new Float32Array( positionAttribute.count / 3 );

			let cumulativeTotal = 0;

			for ( let i = 0; i < faceWeights.length; i ++ ) {

				cumulativeTotal += faceWeights[ i ];

				this.distribution[ i ] = cumulativeTotal;

			}

			return this;

		}

		setRandomGenerator( randomFunction ) {

			this.randomFunction = randomFunction;
			return this;

		}

		sample( targetPosition, targetNormal, targetColor ) {

			const cumulativeTotal = this.distribution[ this.distribution.length - 1 ];

			const faceIndex = this.binarySearch( this.randomFunction() * cumulativeTotal );

			return this.sampleFace( faceIndex, targetPosition, targetNormal, targetColor );

		}

		binarySearch( x ) {

			const dist = this.distribution;
			let start = 0;
			let end = dist.length - 1;

			let index = - 1;

			while ( start <= end ) {

				const mid = Math.ceil( ( start + end ) / 2 );

				if ( mid === 0 || dist[ mid - 1 ] <= x && dist[ mid ] > x ) {

					index = mid;

					break;

				} else if ( x < dist[ mid ] ) {

					end = mid - 1;

				} else {

					start = mid + 1;

				}

			}

			return index;

		}

		sampleFace( faceIndex, targetPosition, targetNormal, targetColor ) {

			let u = this.randomFunction();
			let v = this.randomFunction();

			if ( u + v > 1 ) {

				u = 1 - u;
				v = 1 - v;

			}

			_face.a.fromBufferAttribute( this.positionAttribute, faceIndex * 3 );
			_face.b.fromBufferAttribute( this.positionAttribute, faceIndex * 3 + 1 );
			_face.c.fromBufferAttribute( this.positionAttribute, faceIndex * 3 + 2 );

			targetPosition
				.set( 0, 0, 0 )
				.addScaledVector( _face.a, u )
				.addScaledVector( _face.b, v )
				.addScaledVector( _face.c, 1 - ( u + v ) );

			if ( targetNormal !== undefined ) {

				_face.getNormal( targetNormal );

			}

			if ( targetColor !== undefined && this.colorAttribute !== undefined ) {

				_face.a.fromBufferAttribute( this.colorAttribute, faceIndex * 3 );
				_face.b.fromBufferAttribute( this.colorAttribute, faceIndex * 3 + 1 );
				_face.c.fromBufferAttribute( this.colorAttribute, faceIndex * 3 + 2 );

				_color
					.set( 0, 0, 0 )
					.addScaledVector( _face.a, u )
					.addScaledVector( _face.b, v )
					.addScaledVector( _face.c, 1 - ( u + v ) );

				targetColor.r = _color.x;
				targetColor.g = _color.y;
				targetColor.b = _color.z;

			}

			return this;

		}

	}

	/* jshint esversion: 9 */

	const schema = {
		object: {
			type: 'selector'
		},
		count: {
			default: 128
		},
		weightAttribute: {
			default: ''
		},
		scale: {
			type: 'vec3',
			default: new THREE.Vector3(1,1,1)
		},
		scaleJitter: {
			type: 'vec3',
			default: new THREE.Vector3()
		},
		uniformJitter: {
			default: true
		}
	};

	const _position = new THREE.Vector3();
	const up = new THREE.Vector3(0,1,0);
	const _quaternion = new THREE.Quaternion();
	const _normal = new THREE.Vector3();
	const _scale = new THREE.Vector3(1,1,1);
	const _matrix = new THREE.Matrix4();
	AFRAME.registerComponent('surface-scatter', {
		schema,
		multiple: true,
		description: `This component uses instancing to cover one object in another.`,
		init() {
			this.instance = [];
			this.update = this.update.bind(this);
			this.buildSampler = this.buildSampler.bind(this);
			this.el.addEventListener('object3dset', this.buildSampler);
			this.buildSampler();
		},
		buildSampler() {
			const geometries = [];
			this.el.object3D.traverse(function (object) {
				if (!object.isInstancedMesh && object.geometry) {
					geometries.push(object.geometry);
				}
			});
			if (!geometries.length) return;

			this.sampler = new MeshSurfaceSampler({
				geometry: THREE.BufferGeometryUtils.mergeBufferGeometries(geometries)
			});
			if (this.data.weightAttribute) {
				this.sampler.setWeightAttribute( this.data.weightAttribute );
			}
			this.sampler.build();
			this.resample();
		},
		resample() {
			if (!this.sampler || !this.scales) return;

			// Sample randomly from the surface, creating an instance of the sample
			// geometry at each sample point.
			for ( let i = 0; i < this.data.count; i ++ ) {

				this.sampler.sample( _position, _normal );
				_quaternion.setFromUnitVectors(up, _normal);
				_scale.fromArray(this.scales[i]);
				_matrix.compose(_position, _quaternion, _scale);
				for (const ins of this.instance) {
					ins.setMatrixAt( i, _matrix );
				}
			}

			for (const ins of this.instance) {
				ins.instanceMatrix.needsUpdate = true;
			}
		},
		update(oldDetails) {
			const data = this.data;
			const instances = this.instance;

			this.scales = [];
			for (let i=0;i<this.data.count;i++) {
				const uniformRandom = Math.random();
				this.scales[i] = [
					this.data.scale.x + (this.data.uniformJitter ? uniformRandom : Math.random()) * this.data.scaleJitter.x,
					this.data.scale.y + (this.data.uniformJitter ? uniformRandom : Math.random()) * this.data.scaleJitter.y,
					this.data.scale.z + (this.data.uniformJitter ? uniformRandom : Math.random()) * this.data.scaleJitter.z,
				];
			}

			if (oldDetails.object) oldDetails.object.removeEventListener('object3dset', this.update);
			data.object.addEventListener('object3dset', this.update);

			const group = new THREE.Group();
			if (this.el.getObject3D('instances')) {
				this.el.removeObject3D('instances');
			}
			instances.splice(0);
			if (data.object) {
				data.object.object3D.traverse(function (object) {
					if (object.geometry && object.material) {
						const instance = new THREE.InstancedMesh(object.geometry, object.material, data.count);
						instances.push(instance);
						group.add(instance);
					}
				});
			}
			this.el.setObject3D('instances', group);
			this.resample();
		},
		remove() {
			this.el.removeObject3D('instances');
			this.el.removeEventListener('object3dset', this.resample);
			this.data.object.removeEventListener('object3dset', this.update);
		}
	});

})(THREE);
//# sourceMappingURL=aframe-surface-scatter.js.map
