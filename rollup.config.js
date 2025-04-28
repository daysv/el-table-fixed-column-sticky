const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const vue = require('rollup-plugin-vue');
const babel = require('@rollup/plugin-babel');
const terser = require('@rollup/plugin-terser');
const replace = require('@rollup/plugin-replace');
const path = require('path');
const sass = require('sass');
const pkg = require('./package.json');

module.exports = {
  input: 'index.js',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      exports: 'auto'
    },
    {
      file: pkg.module,
      format: 'es'
    },
    {
      file: pkg.unpkg,
      format: 'umd',
      name: 'ElTableSticky',
      globals: {
        vue: 'Vue',
        'element-ui': 'ELEMENT',
        'lodash/flatMap': 'lodash.flatMap',
        'element-ui/lib/utils/resize-event': 'ELEMENT.utils.resizeEvent',
        'element-ui/lib/directives/mousewheel': 'ELEMENT.directives.mousewheel',
        'element-ui/lib/mixins/locale': 'ELEMENT.mixins.locale',
        'element-ui/lib/mixins/migrating': 'ELEMENT.mixins.migrating',
        'element-ui/lib/utils/merge': 'ELEMENT.utils.merge',
        'element-ui/lib/utils/util': 'ELEMENT.utils.util',
        'element-ui/lib/utils/scrollbar-width': 'ELEMENT.utils.scrollbarWidth',
        'element-ui/lib/utils/dom': 'ELEMENT.utils.dom',
        'element-ui/lib/checkbox': 'ELEMENT.Checkbox',
        'element-ui/lib/tooltip': 'ELEMENT.Tooltip',
        'element-ui/lib/utils/vue-popper': 'ELEMENT.utils.VuePopper',
        'element-ui/lib/utils/popup': 'ELEMENT.utils.popup',
        'element-ui/lib/utils/clickoutside': 'ELEMENT.utils.clickoutside',
        'element-ui/lib/checkbox-group': 'ELEMENT.CheckboxGroup',
        'element-ui/lib/scrollbar': 'ELEMENT.Scrollbar'
      }
    }
  ],
  external: [
    'vue', 
    'element-ui', 
    /^element-ui\/.+$/, 
    'lodash/flatMap'
  ],
  plugins: [
    // 设置环境变量
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      preventAssignment: true
    }),
    // Vue组件处理
    vue({
      css: true,
      compileTemplate: true,
      template: {
        isProduction: true,
        compilerOptions: { preserveWhitespace: false }
      },
      // 使用Dart Sass处理scss文件
      style: {
        preprocessOptions: {
          scss: {
            implementation: sass,
            sassOptions: {
              outputStyle: 'compressed'
            }
          }
        }
      }
    }),
    // 解析模块
    resolve({
      extensions: ['.js', '.jsx', '.vue'],
      mainFields: ['module', 'main', 'browser']
    }),
    // CommonJS模块转换
    commonjs({
      include: 'node_modules/**',
      transformMixedEsModules: true
    }),
    // Babel转换
    babel({
      babelHelpers: 'bundled',
      exclude: ['node_modules/**', '**/*.vue'],
      extensions: ['.js'],
      // 构建特定的配置
      assumptions: {
        noDocumentAll: true
      }
    }),
    // 代码压缩
    terser({
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    })
  ]
}; 