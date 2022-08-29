import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'apps.js',
  output: [
    {
      format: 'esm',
      file: 'bundle.js'
    },
  ],
  plugins: [
    resolve(),
  ]
};
