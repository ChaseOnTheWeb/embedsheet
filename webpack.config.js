var path = require('path');

module.exports = (env, argv) => ({
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'embedsheet.js',
    library: 'EmbedSheet',
    libraryExport: 'default'
  },
  // required for xlsx to work with webpack
  // https://github.com/SheetJS/js-xlsx/issues/467
  node: {
    fs: 'empty'
  },
  resolve: {
    // cpexcel.js is an optional dependency for i18n of Excel files; it balloons
    // the payload size by a lot, so prevent it from being bundled.
    // https://github.com/SheetJS/js-xlsx/issues/694
    alias: { './dist/cpexcel.js': '' }
  },
  devtool: argv.mode == 'production' ? 'source-map' : 'cheap-eval-source-map',
  devServer: {
    contentBase: './examples'
  }
})