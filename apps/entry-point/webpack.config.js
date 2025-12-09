const { join } = require('node:path')
const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin')
const { PinoWebpackPlugin } = require('pino-webpack-plugin')

module.exports = (_env, argv) => {
  const isDev = argv.mode === 'development'

  return {
    output: {
      path: join(__dirname, 'dist')
    },
    plugins: [
      new NxAppWebpackPlugin({
        target: 'node',
        compiler: 'tsc',
        main: './src/main.ts',
        tsConfig: './tsconfig.app.json',
        optimization: false,
        outputHashing: 'none',
        externalDependencies: 'all',
        generatePackageJson: false,
        deleteOutputPath: true,
        watch: isDev,
        watchDependencies: isDev
      }),
      new PinoWebpackPlugin({ transports: isDev ? ['pino-pretty'] : [] })
    ],
    ignoreWarnings: [/Failed to parse source map/]
  }
}
