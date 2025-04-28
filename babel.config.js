module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          browsers: ['> 1%', 'last 2 versions', 'not dead']
        },
        modules: false
      }
    ]
  ],
  plugins: [
    'babel-plugin-syntax-jsx',
    ['babel-plugin-transform-vue-jsx', {
      // 使用Vue内建的helpers
      useBuiltIns: true,
    }]
  ],
  // 忽略某些模块
  ignore: [/[\/\\]core-js/, /@babel[\/\\]runtime/]
}; 