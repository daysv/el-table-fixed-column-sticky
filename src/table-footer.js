import LayoutObserver from './layout-observer'
import { mapStates } from './store/helper'
import { getFixedColumnsClass, getStickyCellStyle, isFixedColumn } from './util'

export default {
  name: 'ElTableFooter',

  mixins: [LayoutObserver],

  props: {
    fixed: String,
    store: {
      required: true,
    },
    summaryMethod: Function,
    sumText: String,
    border: Boolean,
    defaultSort: {
      type: Object,
      default() {
        return {
          prop: '',
          order: '',
        }
      },
    },
  },

  render(h) {
    let sums = []
    if (this.summaryMethod) {
      sums = this.summaryMethod({ columns: this.columns, data: this.store.states.data })
    } else {
      this.columns.forEach((column, index) => {
        if (index === 0) {
          sums[index] = this.sumText
          return
        }
        const values = this.store.states.data.map((item) => Number(item[column.property]))
        const precisions = []
        let notNumber = true
        values.forEach((value) => {
          if (!isNaN(value)) {
            notNumber = false
            const decimal = `${value}`.split('.')[1]
            precisions.push(decimal ? decimal.length : 0)
          }
        })
        const precision = Math.max.apply(null, precisions)
        if (!notNumber) {
          sums[index] = values.reduce((prev, curr) => {
            const value = Number(curr)
            if (!isNaN(value)) {
              return parseFloat((prev + curr).toFixed(Math.min(precision, 20)))
            }
            return prev
          }, 0)
        } else {
          sums[index] = ''
        }
      })
    }

    return (
      <table class="el-table__footer" cellspacing="0" cellpadding="0" border="0">
        <colgroup>
          {this.columns.map((column) => (
            <col name={column.id} key={column.id} />
          ))}
          {this.hasGutter ? <col name="gutter" /> : ''}
        </colgroup>
        <tbody class={[{ 'has-gutter': this.hasGutter }]}>
          <tr>
            {this.columns.map((column, cellIndex) => (
              <td
                key={cellIndex}
                colspan={column.colSpan}
                rowspan={column.rowSpan}
                class={[...this.getRowClasses(column, cellIndex), 'el-table__cell']}
                style={this.getCellStyle(column, cellIndex)}
              >
                <div class={['cell', column.labelClassName]}>{sums[cellIndex]}</div>
              </td>
            ))}
            {this.hasGutter ? <th class="el-table__cell gutter"></th> : ''}
          </tr>
        </tbody>
      </table>
    )
  },

  computed: {
    table() {
      return this.$parent
    },

    hasGutter() {
      return !this.fixed && this.tableLayout.gutterWidth
    },

    ...mapStates({
      columns: 'columns',
      isAllSelected: 'isAllSelected',
      leftFixedLeafCount: 'fixedLeafColumnsLength',
      rightFixedLeafCount: 'rightFixedLeafColumnsLength',
      columnsCount: (states) => states.columns.length,
      leftFixedCount: (states) => states.fixedColumns.length,
      rightFixedCount: (states) => states.rightFixedColumns.length,
    }),
  },

  methods: {
    isCellHidden(index, columns, column) {
      if (this.fixed === true || this.fixed === 'left') {
        return index >= this.leftFixedLeafCount
      }
      if (this.fixed === 'right') {
        let before = 0
        for (let i = 0; i < index; i++) {
          before += columns[i].colSpan
        }
        return before < this.columnsCount - this.rightFixedLeafCount
      }
      if (!this.fixed && column.fixed) {
        // hide cell when footer instance is not fixed and column is fixed
        return true
      }
      return index < this.leftFixedCount || index >= this.columnsCount - this.rightFixedCount
    },

    getRowClasses(column, cellIndex) {
      const classes = [column.id, column.align, column.labelClassName]
      if (column.className) {
        classes.push(column.className)
      }
      if (this.isCellHidden(cellIndex, this.columns, column)) {
        // classes.push('is-hidden');
        classes.push(...getFixedColumnsClass(cellIndex, column.fixed, this.store))
      }
      if (!column.children) {
        classes.push('is-leaf')
      }
      return classes
    },
    getCellStyle(rowIndex, columnIndex, row, column) {
      const cellStyle = this.table.cellStyle ?? {}
      let cellStyles = cellStyle ?? {}
      if (typeof cellStyle === 'function') {
        cellStyles = cellStyle.call(null, {
          rowIndex,
          columnIndex,
          row,
          column,
        })
      }

      return { ...cellStyles, ...getStickyCellStyle(columnIndex, this.fixed, this.store) }
    },
  },
}
