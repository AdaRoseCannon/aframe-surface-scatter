/* jshint esversion: 9 */
/* For dealing with covering one object in another curves */
/* global THREE, AFRAME */


AFRAME.registerComponent('wavy-shader', {
	init() {
		this.uniforms = [];
		this.setup = this.setup.bind(this);
		this.onBeforeCompile = this.onBeforeCompile.bind(this);
		this.el.addEventListener('object3dset', this.setup);
		this.setup();
	},
	onBeforeCompile( shader ) {
		shader.vertexShader = shader.vertexShader.replace('void main() {', `
			uniform float time;
			void main() {
		`);
		shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
			vec4 mvPosition = vec4( transformed, 1.0 );
			vec4 originalPosition = mvPosition;
			#ifdef USE_INSTANCING
				originalPosition = instanceMatrix * originalPosition;
			#endif
			originalPosition = modelMatrix * originalPosition;

			mvPosition.x += 0.2 * mvPosition.z * sin(time * 0.001 + 1.1 * originalPosition.x);
			mvPosition.y += 0.2 * mvPosition.z * cos(time * 0.001 + 1.1 * originalPosition.x);

			#ifdef USE_INSTANCING
				mvPosition = instanceMatrix * mvPosition;
			#endif
			mvPosition = modelViewMatrix * mvPosition;
			gl_Position = projectionMatrix * mvPosition;
		`);
		shader.uniforms.time = {value:0};
		this.uniforms.push(shader.uniforms);
	},
	setup() {
		this.uniforms.splice(0);
		this.el.object3D.traverse(object => {
			if (object.material) {
				object.material.onBeforeCompile = this.onBeforeCompile;
			}
		});
	},
	tick(time, delta) {
		for (const uniform of this.uniforms) {
			uniform.time.value += delta
		}
	}
});
