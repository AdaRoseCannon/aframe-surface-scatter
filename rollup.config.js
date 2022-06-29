import { terser } from "rollup-plugin-terser";
import strip from '@rollup/plugin-strip';
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default [
	{	
		input: "src/aframe-surface-scatter.js",
		external: ['three'],
		output: {
			format: "iife",
			sourcemap: true,
			file: 'build/aframe-surface-scatter.js',
			globals: {
				three: 'THREE'
			}
		},
		plugins: [
			resolve(),
			commonjs({
				include: ["node_modules/**"],
			}),
			// replace({ varType: 'const', replacementLookup: globals }),
			strip({labels: ['documentation']}),
			// replace({ varType: 'const', replacementLookup: globals })
		]
	},
	{
		input: "src/aframe-surface-scatter.js",
		external: ['three'],
		output: {
			format: "iife",
			sourcemap: true,
			file: 'build/aframe-surface-scatter.min.js',
			globals: {
				three: 'THREE'
			}
		},
		plugins: [
			resolve(),
			commonjs({
				include: ["node_modules/**"],
			}),
			// replace({ varType: 'const', replacementLookup: globals }),
			strip({labels: ['documentation']}),
			terser()
		]
	},
];
