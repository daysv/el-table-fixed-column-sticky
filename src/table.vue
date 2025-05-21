<template>
  <div
    ref="tableWrapper"
    class="el-table el-table-v2"
    :class="[
      {
        'el-table--fit': fit,
        'el-table--striped': stripe,
        'el-table--border': border || isGroup,
        'el-table--hidden': isHidden,
        'el-table--group': isGroup,
        'el-table--fluid-height': maxHeight,
        'el-table--scrollable-x': layout.scrollX,
        'el-table--scrollable-y': layout.scrollY,
        'el-table--enable-row-hover': !store.states.isComplex,
        // 'el-table--enable-row-transition': (store.states.data || []).length !== 0 && (store.states.data || []).length < 100
      },
      tableSize ? `el-table--${tableSize}` : '',
    ]"
    @mouseleave="handleMouseLeave($event)"
  >
    <div ref="hiddenColumns" class="hidden-columns"><slot></slot></div>
    <div
      v-if="showHeader"
      ref="headerWrapper"
      v-mousewheel="handleHeaderFooterMousewheel"
      class="el-table__header-wrapper"
      :class="[layout.scrollX ? `is-scrolling-${scrollPosition}` : 'is-scrolling-none']"
    >
      <table-header
        ref="tableHeader"
        :store="store"
        :border="border"
        :default-sort="defaultSort"
        :style="{
          width: layout.bodyWidth ? layout.bodyWidth + 'px' : '',
        }"
      >
      </table-header>
    </div>
    <div
      ref="bodyWrapper"
      class="el-table__body-wrapper"
      :class="[layout.scrollX ? `is-scrolling-${scrollPosition}` : 'is-scrolling-none']"
      :style="[bodyHeight]"
    >
      <table-body
        :context="context"
        :store="store"
        :stripe="stripe"
        :row-class-name="rowClassName"
        :row-style="rowStyle"
        :highlight="highlightCurrentRow"
        :style="{
          width: bodyWidth,
        }"
      >
      </table-body>
      <div
        v-if="!data || data.length === 0"
        ref="emptyBlock"
        class="el-table__empty-block"
        :style="emptyBlockStyle"
      >
        <span class="el-table__empty-text">
          <slot name="empty">{{ emptyText || t('el.table.emptyText') }}</slot>
        </span>
      </div>
      <div v-if="$slots.append" ref="appendWrapper" class="el-table__append-wrapper">
        <slot name="append"></slot>
      </div>
    </div>
    <div
      v-if="showSummary"
      v-show="data && data.length > 0"
      ref="footerWrapper"
      v-mousewheel="handleHeaderFooterMousewheel"
      class="el-table__footer-wrapper"
    >
      <table-footer
        :store="store"
        :border="border"
        :sum-text="sumText || t('el.table.sumText')"
        :summary-method="summaryMethod"
        :default-sort="defaultSort"
        :style="{
          width: layout.bodyWidth ? layout.bodyWidth + 'px' : '',
        }"
      >
      </table-footer>
    </div>
    <div v-show="resizeProxyVisible" ref="resizeProxy" class="el-table__column-resize-proxy"></div>
  </div>
</template>

<script type="text/babel">
import { debounce, throttle } from 'throttle-debounce'
import { addResizeListener, removeResizeListener } from 'element-ui/lib/utils/resize-event'
import Mousewheel from 'element-ui/lib/directives/mousewheel'
import Locale from 'element-ui/lib/mixins/locale'
import Migrating from 'element-ui/lib/mixins/migrating'
import { createStore, mapStates } from './store/helper'
import TableLayout from './table-layout'
import TableBody from './table-body'
import TableHeader from './table-header'
import TableFooter from './table-footer'
import { parseHeight } from './util'

let tableIdSeed = 1

export default {
  name: 'ElTable',

  directives: {
    Mousewheel,
  },

  components: {
    TableHeader,
    TableFooter,
    TableBody,
  },

  mixins: [Locale, Migrating],

  props: {
    data: {
      type: Array,
      default() {
        return []
      },
    },

    size: String,

    width: [String, Number],

    height: [String, Number],

    maxHeight: [String, Number],

    fit: {
      type: Boolean,
      default: true,
    },

    stripe: Boolean,

    border: Boolean,

    rowKey: [String, Function],

    context: {},

    showHeader: {
      type: Boolean,
      default: true,
    },

    showSummary: Boolean,

    sumText: String,

    summaryMethod: Function,

    rowClassName: [String, Function],

    rowStyle: [Object, Function],

    cellClassName: [String, Function],

    cellStyle: [Object, Function],

    headerRowClassName: [String, Function],

    headerRowStyle: [Object, Function],

    headerCellClassName: [String, Function],

    headerCellStyle: [Object, Function],

    highlightCurrentRow: Boolean,

    highlightSelectionRow: {
      type: Boolean,
      default: false,
    },

    currentRowKey: [String, Number],

    emptyText: String,

    expandRowKeys: Array,

    defaultExpandAll: Boolean,

    defaultSort: Object,

    tooltipEffect: String,

    spanMethod: Function,

    selectOnIndeterminate: {
      type: Boolean,
      default: true,
    },

    indent: {
      type: Number,
      default: 16,
    },

    treeProps: {
      type: Object,
      default() {
        return {
          hasChildren: 'hasChildren',
          children: 'children',
        }
      },
    },

    lazy: Boolean,

    load: Function,
  },

  methods: {
    getMigratingConfig() {
      return {
        events: {
          expand: 'expand is renamed to expand-change',
        },
      }
    },

    setCurrentRow(row) {
      this.store.commit('setCurrentRow', row)
    },

    toggleRowSelection(row, selected) {
      this.store.toggleRowSelection(row, selected, false)
      this.store.updateAllSelected()
    },

    toggleRowExpansion(row, expanded) {
      this.store.toggleRowExpansionAdapter(row, expanded)
    },

    clearSelection() {
      this.store.clearSelection()
    },

    clearFilter(columnKeys) {
      this.store.clearFilter(columnKeys)
    },

    clearSort() {
      this.store.clearSort()
    },

    handleMouseLeave() {
      this.store.commit('setHoverRow', null)
      if (this.hoverState) this.hoverState = null
    },

    updateScrollY() {
      const changed = this.layout.updateScrollY()
      if (changed) {
        this.layout.notifyObservers('scrollable')
        this.layout.updateColumnsWidth()
      }
    },

    handleFixedMousewheel(event, data) {
      const { bodyWrapper } = this
      if (Math.abs(data.spinY) > 0) {
        const currentScrollTop = bodyWrapper.scrollTop
        if (data.pixelY < 0 && currentScrollTop !== 0) {
          event.preventDefault()
        }
        if (
          data.pixelY > 0 &&
          bodyWrapper.scrollHeight - bodyWrapper.clientHeight > currentScrollTop
        ) {
          event.preventDefault()
        }
        bodyWrapper.scrollTop += Math.ceil(data.pixelY / 5)
      } else {
        bodyWrapper.scrollLeft += Math.ceil(data.pixelX / 5)
      }
    },

    handleHeaderFooterMousewheel(event, data) {
      const { pixelX, pixelY } = data
      if (Math.abs(pixelX) >= Math.abs(pixelY)) {
        this.bodyWrapper.scrollLeft += data.pixelX / 5
      }
    },

    // TODO 使用 CSS transform
    syncPosition() {
      const { scrollLeft, scrollTop, offsetWidth, scrollWidth } = this.bodyWrapper
      const { headerWrapper, footerWrapper, fixedBodyWrapper, rightFixedBodyWrapper } = this.$refs
      if (headerWrapper) headerWrapper.scrollLeft = scrollLeft
      if (footerWrapper) footerWrapper.scrollLeft = scrollLeft
      if (fixedBodyWrapper) fixedBodyWrapper.scrollTop = scrollTop
      if (rightFixedBodyWrapper) rightFixedBodyWrapper.scrollTop = scrollTop
      const maxScrollLeftPosition = scrollWidth - offsetWidth - 1
      if (scrollLeft >= maxScrollLeftPosition) {
        this.scrollPosition = 'right'
      } else if (scrollLeft === 0) {
        this.scrollPosition = 'left'
      } else {
        this.scrollPosition = 'middle'
      }

      if (this.$refs.tableWrapper) {
        const offsetScreen = scrollWidth - offsetWidth
        this.$refs.tableWrapper.style.setProperty(`--scroll-left`, `${scrollLeft}px`)
        this.$refs.tableWrapper.style.setProperty(
          `--scroll-right`,
          `-${offsetScreen - scrollLeft}px`
        )
      }
    },

    throttleSyncPosition: throttle(16, function () {
      this.syncPosition()
    }),

    raf(cb) {
      if (!this.ticking) {
        window.requestAnimationFrame(() => {
          this.ticking = false
          cb()
        })
        this.ticking = true
      }
    },

    onScroll(evt) {
      if (!window.requestAnimationFrame) {
        this.throttleSyncPosition()
      } else {
        this.raf(this.syncPosition)
      }
    },

    bindEvents() {
      this.bodyWrapper.addEventListener('scroll', this.onScroll, { passive: true })
      if (this.fit) {
        addResizeListener(this.$el, this.resizeListener)
      }
    },

    unbindEvents() {
      this.bodyWrapper.removeEventListener('scroll', this.onScroll, { passive: true })
      if (this.fit) {
        removeResizeListener(this.$el, this.resizeListener)
      }
    },

    resizeListener() {
      if (!this.$ready) return
      let shouldUpdateLayout = false
      const el = this.$el
      const { width: oldWidth, height: oldHeight } = this.resizeState

      const width = el.offsetWidth
      if (oldWidth !== width) {
        shouldUpdateLayout = true
      }

      const height = el.offsetHeight
      if ((this.height || this.shouldUpdateHeight) && oldHeight !== height) {
        shouldUpdateLayout = true
      }

      if (shouldUpdateLayout) {
        this.resizeState.width = width
        this.resizeState.height = height
        this.doLayout()
        this.$nextTick(() => {
          this.$refs.tableWrapper.querySelectorAll('tr').forEach((el) => {
            const { height } = el.getBoundingClientRect()
            const calcHeight = Math.round(height)
            const r = `${calcHeight}px`
            el.style.height = r
            el.style.containIntrinsicHeight = r
          })
        })
      }
    },

    doLayout() {
      if (this.shouldUpdateHeight) {
        this.layout.updateElsHeight()
      }
      this.layout.updateColumnsWidth()
      this.onScroll()
    },

    sort(prop, order) {
      this.store.commit('sort', { prop, order })
    },

    toggleAllSelection() {
      this.store.commit('toggleAllSelection')
    },
  },

  computed: {
    tableSize() {
      return this.size || (this.$ELEMENT || {}).size
    },

    bodyWrapper() {
      return this.$refs.bodyWrapper
    },

    shouldUpdateHeight() {
      return (
        this.height ||
        this.maxHeight ||
        this.fixedColumns.length > 0 ||
        this.rightFixedColumns.length > 0
      )
    },

    bodyWidth() {
      const { bodyWidth, scrollY, gutterWidth } = this.layout
      return bodyWidth ? `${bodyWidth - (scrollY ? gutterWidth : 0)}px` : ''
    },

    bodyHeight() {
      const { headerHeight = 0, bodyHeight, footerHeight = 0 } = this.layout
      if (this.height) {
        return {
          height: bodyHeight ? `${bodyHeight}px` : '',
        }
      }
      if (this.maxHeight) {
        const maxHeight = parseHeight(this.maxHeight)
        if (typeof maxHeight === 'number') {
          return {
            'max-height': `${maxHeight - footerHeight - (this.showHeader ? headerHeight : 0)}px`,
          }
        }
      }
      return {}
    },

    fixedBodyHeight() {
      if (this.height) {
        return {
          height: this.layout.fixedBodyHeight ? `${this.layout.fixedBodyHeight}px` : '',
        }
      }
      if (this.maxHeight) {
        let maxHeight = parseHeight(this.maxHeight)
        if (typeof maxHeight === 'number') {
          maxHeight = this.layout.scrollX ? maxHeight - this.layout.gutterWidth : maxHeight
          if (this.showHeader) {
            maxHeight -= this.layout.headerHeight
          }
          maxHeight -= this.layout.footerHeight
          return {
            'max-height': `${maxHeight}px`,
          }
        }
      }
      return {}
    },

    fixedHeight() {
      if (this.maxHeight) {
        if (this.showSummary) {
          return {
            bottom: 0,
          }
        }
        return {
          bottom: this.layout.scrollX && this.data.length ? `${this.layout.gutterWidth}px` : '',
        }
      }
      if (this.showSummary) {
        return {
          height: this.layout.tableHeight ? `${this.layout.tableHeight}px` : '',
        }
      }
      return {
        height: this.layout.viewportHeight ? `${this.layout.viewportHeight}px` : '',
      }
    },

    emptyBlockStyle() {
      if (this.data && this.data.length) return null
      let height = '100%'
      if (this.layout.appendHeight) {
        height = `calc(100% - ${this.layout.appendHeight}px)`
      }
      return {
        width: this.bodyWidth,
        height,
      }
    },

    ...mapStates({
      selection: 'selection',
      columns: 'columns',
      tableData: 'data',
      fixedColumns: 'fixedColumns',
      rightFixedColumns: 'rightFixedColumns',
    }),
  },

  watch: {
    height: {
      immediate: true,
      handler(value) {
        this.layout.setHeight(value)
      },
    },

    maxHeight: {
      immediate: true,
      handler(value) {
        this.layout.setMaxHeight(value)
      },
    },

    currentRowKey: {
      immediate: true,
      handler(value) {
        if (!this.rowKey) return
        this.store.setCurrentRowKey(value)
      },
    },

    data: {
      immediate: true,
      handler(value) {
        this.store.commit('setData', value)
      },
    },

    expandRowKeys: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.store.setExpandRowKeysAdapter(newVal)
        }
      },
    },
  },

  created() {
    this.tableId = `el-table_${tableIdSeed++}`
    this.debouncedUpdateLayout = debounce(50, () => this.doLayout())
  },

  mounted() {
    this.bindEvents()
    this.store.updateColumns()
    this.doLayout()

    this.resizeState = {
      width: this.$el.offsetWidth,
      height: this.$el.offsetHeight,
    }

    // init filters
    this.store.states.columns.forEach((column) => {
      if (column.filteredValue && column.filteredValue.length) {
        this.store.commit('filterChange', {
          column,
          values: column.filteredValue,
          silent: true,
        })
      }
    })

    this.$ready = true
  },

  destroyed() {
    this.unbindEvents()
  },

  data() {
    const { hasChildren = 'hasChildren', children = 'children' } = this.treeProps
    this.store = createStore(this, {
      rowKey: this.rowKey,
      defaultExpandAll: this.defaultExpandAll,
      selectOnIndeterminate: this.selectOnIndeterminate,
      // TreeTable 的相关配置
      indent: this.indent,
      lazy: this.lazy,
      lazyColumnIdentifier: hasChildren,
      childrenColumnName: children,
    })
    const layout = new TableLayout({
      store: this.store,
      table: this,
      fit: this.fit,
      showHeader: this.showHeader,
    })
    return {
      layout,
      isHidden: false,
      renderExpanded: null,
      resizeProxyVisible: false,
      resizeState: {
        width: null,
        height: null,
      },
      // 是否拥有多级表头
      isGroup: false,
      scrollPosition: 'left',
    }
  },
}
</script>

<style lang="scss" scoped>
$shadowLeft: inset 10px 0 10px -10px rgba(0, 0, 0, 0.15) !important;
$shadowRight: inset -10px 0 10px -10px rgba(0, 0, 0, 0.15) !important;

.el-table {
  overflow: clip;

  ::v-deep {
    .fixed-column--left {
      //position: sticky !important;
      background: inherit;
      z-index: 3;
    }
    .fixed-column--right {
      //position: sticky !important;
      background: inherit;
      z-index: 3;
    }

    .el-table__body-wrapper,
    .el-table__header-wrapper,
    .el-table__footer-wrapper {
      width: 100%;
      tr {
        td,
        th {
          overflow: unset !important;
          &.gutter {
            //position: sticky !important;
            z-index: 2;
            background: #fff;
            right: 0;
          }
          &.fixed-column--left,
          &.fixed-column--right {
            //position: sticky !important;
            z-index: 2;
            // background: getCssVar('bg-color');
            &.is-last-column,
            &.is-first-column {
              &::before {
                content: '';
                position: absolute;
                top: 0px;
                width: 10px;
                bottom: -1px;
                overflow-x: hidden;
                overflow-y: hidden;
                box-shadow: none;
                touch-action: none;
                pointer-events: none;
              }
            }
            &.is-first-column {
              &::before {
                left: -10px;
              }
            }
            &.is-last-column {
              &::before {
                right: -10px;
                box-shadow: none;
              }
            }
          }
        }
      }
    }

    .is-scrolling-left {
      .fixed-column--right.is-first-column {
        &::before {
          box-shadow: $shadowRight;
        }
      }
    }

    .is-scrolling-right {
      .fixed-column--left.is-last-column {
        &::before {
          box-shadow: $shadowLeft;
        }
      }
      .fixed-column--left.is-last-column {
        border-right-color: transparent;
      }
    }

    .is-scrolling-middle {
      .fixed-column--left.is-last-column {
        border-right-color: transparent;
      }
      .fixed-column--right.is-first-column {
        &::before {
          box-shadow: $shadowRight;
        }
      }
      .fixed-column--left.is-last-column {
        &::before {
          box-shadow: $shadowLeft;
        }
      }
    }

    .is-scrolling-none {
      .fixed-column--left,
      .fixed-column--right {
        &.is-first-column,
        &.is-last-column {
          &::before {
            box-shadow: none;
          }
        }
      }

      th.fixed-column--left,
      th.fixed-column--right {
        background-color: getCssVar('header-bg-color');
      }
    }
  }
}

// 性能优化
.el-table {
  content-visibility: auto;
  tr {
    content-visibility: auto;
  }
}
</style>
