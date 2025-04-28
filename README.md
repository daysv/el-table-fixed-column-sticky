Element UI自带的el-table实现固定列的方式比较冗余，影响性能是次要的，但会引起单元格内部组件的渲染出现多次，导致一些逻辑 问题，故有此修改版本。

源码来自Element UI最新版，手动修改为css sticky方式实现fixed column，版本号与Element UI保持一致