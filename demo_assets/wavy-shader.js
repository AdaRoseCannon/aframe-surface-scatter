/* jshint esversion: 9 */
/* For dealing with covering one object in another curves */
/* global THREE, AFRAME */


AFRAME.registerComponent('wavy-shader', {
	schema: {
		default: ''
	},
	init() {
		this.uniforms = [];
		this.elements = [];
		this.elementRadius = [];
		this.setup = this.setup.bind(this);
		this.onBeforeCompile = this.onBeforeCompile.bind(this);
		this.el.addEventListener('object3dset', this.setup);
		this.setup();
	},
	update() {
		this.elements.splice(0);
		if (this.data) {
			const els = document.querySelectorAll(this.data);
			let i=0;
			for (const el of els) {
				this.elements.push(el);
				this.elementRadius[i++] = Number(el.dataset.radius || 0.1);
			}
		}
		this.elementCount = this.elements.length;
	},
	onBeforeCompile( shader ) {
		const partHeight = '0.1';
		let grassTouchParams = '';
		let grassTouchFn = '';
		shader.uniforms.time = new THREE.Uniform( 0 );
		for (let i=0; i<this.elementCount;i++) {
			const name = 'grass_touch_' + i;
			shader.uniforms[name] = new THREE.Uniform( new THREE.Vector4() );
			grassTouchParams = grassTouchParams + 'uniform vec4 ' + name + ';\n';
			grassTouchFn = grassTouchFn + `
			v = mvPosition.xyz - ${name}.xyz;
			d = length(v);
			r = ${name}.w;
			mvPosition.xyz += smoothstep(0.,r*0.9,d) * (1.-smoothstep(r*0.9,r*1.2,d))* bendAmount * (v/d) * r;
			`;
		}
		this.uniforms.push( shader.uniforms );
		shader.vertexShader = shader.vertexShader.replace('void main() {', `
uniform float time;
${grassTouchParams}
void main() {
		`);
		shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
			vec4 mvPosition = vec4( transformed, 1.0 );

			// In local space
			float bendAmount = smoothstep(0., ${partHeight}, mvPosition.y);

			#ifdef USE_INSTANCING
				mvPosition = instanceMatrix * mvPosition;
			#endif

			// In world space
			mvPosition = modelMatrix * mvPosition;

			vec2 offset = vec2(
				0.1 * bendAmount * sin(time * 0.001 + 1.1 * mvPosition.x),
				0.1 * bendAmount * cos(time * 0.001 + 1.1 * mvPosition.x)
			);
			mvPosition.xz += offset;

			vec3 v;
			float d;
			float r;
			${grassTouchFn}

			// In view space
			mvPosition = viewMatrix * mvPosition;
			// In screenspace
			gl_Position = projectionMatrix * mvPosition;
		`);
	},
	setup() {
		this.uniforms.splice(0);
		this.el.object3D.traverse(object => {
			if (object.material) {
				object.material.onBeforeCompile = this.onBeforeCompile;
			}
		});
	},
	tick: (function () {
		const tempVector3 = new THREE.Vector3();
		return function (time, delta) {
			for (const uniform of this.uniforms) {
				uniform.time.value += delta;
				for (let i=0; i<this.elementCount;i++) {
					const name = 'grass_touch_' + i;
					const el = this.elements[i];
					el.object3D.getWorldPosition(tempVector3);
					uniform[name].value.x = tempVector3.x;
					uniform[name].value.y = tempVector3.y;
					uniform[name].value.z = tempVector3.z;
					uniform[name].value.w = this.elementRadius[i] || 0.1;
				}
			}
		};
	}())
});
