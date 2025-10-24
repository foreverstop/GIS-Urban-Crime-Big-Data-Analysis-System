import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default [{
    input: './lib/browser.js',
    plugins: [
        nodeResolve({ browser: true })
    ],
    output: [{
        file: './dist/shp.js',
        format: 'umd',
        name: 'shp'
    }, {
        file: './dist/shp.min.js',
        format: 'umd',
        name: 'shp',
        plugins: [terser()]
    }]
}, {
    input: './lib/index.js',
    plugins: [
        nodeResolve({ browser: true })
    ],
    output: [{
        file: './dist/shp.esm.js',
        format: 'esm'
    }, {
        file: './dist/shp.esm.min.js',
        format: 'esm',
        plugins: [terser()]
    }]
}]