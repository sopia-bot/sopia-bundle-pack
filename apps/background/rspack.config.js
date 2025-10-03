const { resolve } = require('path');

const includeNodeModules = [];

module.exports = {
  target: 'node',
  entry: {
    main: './src/index.ts',
  },
  output: {
    path: resolve(__dirname, '../../dist/apps/background'),
    filename: 'index.js',
    library: {
      type: 'commonjs2',
      export: 'default',
    },
  },
  ignoreWarnings: [/the request of a dependency is an expression/],
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: [/node_modules/],
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            target: 'es5',
            parser: {
              syntax: 'typescript',
              tsx: false,
              decorators: true,
              dynamicImport: true,
            },
            transform: {
              legacyDecorator: true,
              decoratorMetadata: true,
            },
            keepClassNames: true,
            externalHelpers: false,
            minify: {
              compress: false,
              mangle: false,
            },
          },
          module: {
            type: 'commonjs',
          },
          sourceMaps: true,
          exclude: [
            'jest.config.ts',
            '.*\\.spec.tsx?$',
            '.*\\.test.tsx?$',
            './src/jest-setup.ts$',
            './**/jest-setup.ts$',
            '.*.js$',
          ],
        },
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  externals: [
    // node-youtube-music를 제외한 모든 node_modules를 외부화
    ({ request }, callback) => {
      if (includeNodeModules.includes(request)) {
        return callback();
      }
      if (/^[a-zA-Z0-9@][^:]*$/.test(request)) {
        // request가 상대 경로 또는 절대 경로가 아닌 경우(node_modules 모듈)
        return callback(null, `commonjs ${request}`);
      }
      callback();
    },
  ],
  mode: 'production', // 'production', 또는 'development'
};
