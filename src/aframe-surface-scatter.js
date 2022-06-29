/* jshint esversion: 9 */
/* For dealing with covering one object in another curves */
/* global THREE, AFRAME */

import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';

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

documentation:
(function () {
	schema.object.description = `Object to place on the surface of this object`;
	schema.count.description = `Amount of objects`
	schema.weightAttribute.description = `Specifies a vertex attribute to be used as a weight when sampling from the surface. Faces with higher weights are more likely to be sampled, and those with weights of zero will not be sampled at all. For vector attributes, only .x is used in sampling. If no weight attribute is selected, sampling is randomly distributed by area.`;
	schema.scale.description = `Amount to scale the objects by`;
	schema.scaleJitter.description = `Add randomness to the scaling`;
	schema.uniformJitter.description = `Scale x,y,z together (true) or each independently (false)`;
}());

const _position = new THREE.Vector3();
const up = new THREE.Vector3(0,0,-1);
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
			]
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
		this.el.removeEventListener('object3dset', resample);
		this.data.object.removeEventListener('object3dset', this.update);
	}
});
