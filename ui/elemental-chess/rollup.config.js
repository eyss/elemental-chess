import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import builtins from 'rollup-plugin-node-builtins';
import globals from 'rollup-plugin-node-globals';

import babel from '@rollup/plugin-babel';
import html from '@web/rollup-plugin-html';
import { importMetaAssets } from '@web/rollup-plugin-import-meta-assets';
import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-copy';

export default {
  input: 'index.html',
  output: {
    entryFileNames: '[hash].js',
    chunkFileNames: '[hash].js',
    assetFileNames: '[hash][extname]',
    format: 'es',
    dir: 'dist',
  },
  preserveEntrySignatures: false,

  plugins: [
    /** Enable using HTML as rollup entrypoint */
    html({
      minify: true,
    }),
    /** Resolve bare module imports */
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    replace({
      "const srcSquareRect = srcSquare.getBoundingClientRect();": "if(!srcSquare) return {};const srcSquareRect = srcSquare.getBoundingClientRect();",
      "this._draggedPieceElement.addEventListener('transitionend', transitionComplete);": "this._draggedPieceElement.addEventListener('transitionend', transitionComplete);resolve();",
      'process.env.ENV': `"${process.env.ENV}"`,
      'process.env.HC_PORT': `"${process.env.HC_PORT}"`,
      "COMB = require('@holo-host/comb').COMB":
        "window.COMB = require('@holo-host/comb').COMB",
    }),
    builtins(),
    commonjs({}),
    globals(),
    /** Minify JS */
    terser(),
    /** Bundle assets references via import.meta.url */
    importMetaAssets(),
    copy({
      targets: [{ src: 'assets/**/*', dest: 'dist/' }],
    }),
    /** Compile JS to a lower language target */
    babel({
      babelHelpers: 'bundled',
      exclude: /node_modules/,
      presets: [
        [
          require.resolve('@babel/preset-env'),
          {
            targets: [
              'last 3 Chrome major versions',
              'last 3 Firefox major versions',
              'last 3 Edge major versions',
              'last 3 Safari major versions',
            ],
            modules: false,
            bugfixes: true,
          },
        ],
      ],
      plugins: [
        [
          require.resolve('babel-plugin-template-html-minifier'),
          {
            modules: { lit: ['html', { name: 'css', encapsulation: 'style' }] },
            failOnError: false,
            strictCSS: true,
            htmlMinifier: {
              collapseWhitespace: true,
              conservativeCollapse: true,
              removeComments: true,
              caseSensitive: true,
              minifyCSS: true,
            },
          },
        ],
      ],
    }),
  ],
};
