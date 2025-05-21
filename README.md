Element UI自带的el-table实现固定列的方式比较冗余，影响性能是次要的，但会引起单元格内部组件的渲染出现多次，导致一些逻辑 问题，故有此修改版本。

源码来自Element UI最新版，手动修改为css transform方式实现fixed column，版本号与Element UI保持一致

📌 注意：此仓库 Fork 自 [el-table-fixed-column-sticky](https://github.com/cfancc/el-table-fixed-column-sticky)，并进行了自定义修改，具体变更请查看提交记录。