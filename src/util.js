import { getValueByPath } from 'element-ui/lib/utils/util'
import flatMap from 'lodash/flatMap'

export const getCell = function (event) {
  let cell = event.target

  while (cell && cell.tagName.toUpperCase() !== 'HTML') {
    if (cell.tagName.toUpperCase() === 'TD') {
      return cell
    }
    cell = cell.parentNode
  }

  return null
}

const isObject = function (obj) {
  return obj !== null && typeof obj === 'object'
}

export const orderBy = function (array, sortKey, reverse, sortMethod, sortBy) {
  if (!sortKey && !sortMethod && (!sortBy || (Array.isArray(sortBy) && !sortBy.length))) {
    return array
  }
  if (typeof reverse === 'string') {
    reverse = reverse === 'descending' ? -1 : 1
  } else {
    reverse = reverse && reverse < 0 ? -1 : 1
  }
  const getKey = sortMethod
    ? null
    : function (value, index) {
        if (sortBy) {
          if (!Array.isArray(sortBy)) {
            sortBy = [sortBy]
          }
          return sortBy.map(function (by) {
            if (typeof by === 'string') {
              return getValueByPath(value, by)
            }
            return by(value, index, array)
          })
        }
        if (sortKey !== '$key') {
          if (isObject(value) && '$value' in value) value = value.$value
        }
        return [isObject(value) ? getValueByPath(value, sortKey) : value]
      }
  const compare = function (a, b) {
    if (sortMethod) {
      return sortMethod(a.value, b.value)
    }
    for (let i = 0, len = a.key.length; i < len; i++) {
      if (a.key[i] < b.key[i]) {
        return -1
      }
      if (a.key[i] > b.key[i]) {
        return 1
      }
    }
    return 0
  }
  return array
    .map(function (value, index) {
      return {
        value,
        index,
        key: getKey ? getKey(value, index) : null,
      }
    })
    .sort(function (a, b) {
      let order = compare(a, b)
      if (!order) {
        // make stable https://en.wikipedia.org/wiki/Sorting_algorithm#Stability
        order = a.index - b.index
      }
      return order * reverse
    })
    .map((item) => item.value)
}

export const getColumnById = function (table, columnId) {
  let column = null
  table.columns.forEach(function (item) {
    if (item.id === columnId) {
      column = item
    }
  })
  return column
}

export const getColumnByKey = function (table, columnKey) {
  let column = null
  for (let i = 0; i < table.columns.length; i++) {
    const item = table.columns[i]
    if (item.columnKey === columnKey) {
      column = item
      break
    }
  }
  return column
}

export const getColumnByCell = function (table, cell) {
  const matches = (cell.className || '').match(/el-table_[^\s]+/gm)
  if (matches) {
    return getColumnById(table, matches[0])
  }
  return null
}

export const getRowIdentity = (row, rowKey) => {
  if (!row) throw new Error('row is required when get row identity')
  if (typeof rowKey === 'string') {
    if (rowKey.indexOf('.') < 0) {
      return row[rowKey]
    }
    const key = rowKey.split('.')
    let current = row
    for (let i = 0; i < key.length; i++) {
      current = current[key[i]]
    }
    return current
  }
  if (typeof rowKey === 'function') {
    // eslint-disable-next-line no-useless-call
    return rowKey.call(null, row)
  }
}

export const getKeysMap = function (array, rowKey) {
  const arrayMap = {}
  ;(array || []).forEach((row, index) => {
    arrayMap[getRowIdentity(row, rowKey)] = { row, index }
  })
  return arrayMap
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

export function mergeOptions(defaults, config) {
  const options = {}
  let key
  for (key in defaults) {
    options[key] = defaults[key]
  }
  for (key in config) {
    if (hasOwn(config, key)) {
      const value = config[key]
      if (typeof value !== 'undefined') {
        options[key] = value
      }
    }
  }
  return options
}

export function parseWidth(width) {
  if (width !== undefined) {
    width = parseInt(width, 10)
    if (isNaN(width)) {
      width = null
    }
  }
  return width
}

export function parseMinWidth(minWidth) {
  if (typeof minWidth !== 'undefined') {
    minWidth = parseWidth(minWidth)
    if (isNaN(minWidth)) {
      minWidth = 80
    }
  }
  return minWidth
}

export function parseHeight(height) {
  if (typeof height === 'number') {
    return height
  }
  if (typeof height === 'string') {
    if (/^\d+(?:px)?$/.test(height)) {
      return parseInt(height, 10)
    }
    return height
  }
  return null
}

// https://github.com/reduxjs/redux/blob/master/src/compose.js
export function compose(...funcs) {
  if (funcs.length === 0) {
    return (arg) => arg
  }
  if (funcs.length === 1) {
    return funcs[0]
  }
  return funcs.reduce(
    (a, b) =>
      (...args) =>
        a(b(...args))
  )
}

export function toggleRowStatus(statusArr, row, newVal) {
  let changed = false
  const index = statusArr.indexOf(row)
  const included = index !== -1

  const addRow = () => {
    statusArr.push(row)
    changed = true
  }
  const removeRow = () => {
    statusArr.splice(index, 1)
    changed = true
  }

  if (typeof newVal === 'boolean') {
    if (newVal && !included) {
      addRow()
    } else if (!newVal && included) {
      removeRow()
    }
  } else if (included) {
    removeRow()
  } else {
    addRow()
  }
  return changed
}

export function walkTreeNode(root, cb, childrenKey = 'children', lazyKey = 'hasChildren') {
  const isNil = (array) => !(Array.isArray(array) && array.length)

  function _walker(parent, children, level) {
    cb(parent, children, level)
    children.forEach((item) => {
      if (item[lazyKey]) {
        cb(item, null, level + 1)
        return
      }
      const children = item[childrenKey]
      if (!isNil(children)) {
        _walker(item, children, level + 1)
      }
    })
  }

  root.forEach((item) => {
    if (item[lazyKey]) {
      cb(item, null, 0)
      return
    }
    const children = item[childrenKey]
    if (!isNil(children)) {
      _walker(item, children, 0)
    }
  })
}

export const objectEquals = function (objectA, objectB) {
  // 取对象a和b的属性名
  const aProps = Object.getOwnPropertyNames(objectA)
  const bProps = Object.getOwnPropertyNames(objectB)
  // 判断属性名的length是否一致
  if (aProps.length !== bProps.length) {
    return false
  }
  // 循环取出属性名，再判断属性值是否一致
  for (let i = 0; i < aProps.length; i++) {
    const propName = aProps[i]
    if (objectA[propName] !== objectB[propName]) {
      return false
    }
  }
  return true
}

function getCurrentColumns(column) {
  if (column.children) {
    return flatMap(column.children, getCurrentColumns)
  }
  return [column]
}

function getColSpan(colSpan, column) {
  return colSpan + column.colSpan
}

export const isFixedColumn = (index, fixed, store, realColumns) => {
  let start = 0
  let after = index
  const { columns } = store.states
  if (realColumns) {
    // fixed column supported in grouped header
    const curColumns = getCurrentColumns(realColumns[index])
    const preColumns = columns.slice(0, columns.indexOf(curColumns[0]))

    start = preColumns.reduce(getColSpan, 0)
    after = start + curColumns.reduce(getColSpan, 0) - 1
  } else {
    start = index
  }
  let fixedLayout
  switch (fixed) {
    case 'left':
      if (after < store.states.fixedLeafColumnsLength) {
        fixedLayout = 'left'
      }
      break
    case 'right':
      if (start >= columns.length - store.states.rightFixedLeafColumnsLength) {
        fixedLayout = 'right'
      }
      break
    default:
      if (after < store.states.fixedLeafColumnsLength) {
        fixedLayout = 'left'
      } else if (start >= columns.length - store.states.rightFixedLeafColumnsLength) {
        fixedLayout = 'right'
      }
  }
  return fixedLayout
    ? {
        direction: fixedLayout,
        start,
        after,
      }
    : {}
}

export const getFixedColumnsClass = (index, fixed, store, realColumns, offset = 0) => {
  const classes = []
  const { direction, start, after } = isFixedColumn(index, fixed, store, realColumns)
  if (direction) {
    const isLeft = direction === 'left'
    classes.push(`fixed-column--${direction}`)
    if (
      isLeft &&
      // @ts-ignore
      after + offset === store.states.fixedLeafColumnsLength - 1
    ) {
      classes.push('is-last-column')
    } else if (
      !isLeft &&
      // @ts-ignore
      start - offset === store.states.columns.length - store.states.rightFixedLeafColumnsLength
    ) {
      classes.push('is-first-column')
    }
  }
  return classes
}

function getOffset(offset, column) {
  return (
    offset +
    (column.realWidth === null || Number.isNaN(column.realWidth)
      ? Number(column.width)
      : column.realWidth)
  )
}

export const getFixedColumnOffset = (index, fixed, store, realColumns, hasGutter) => {
  const gutterWidth = 6
  const { direction, start = 0, after = 0 } = isFixedColumn(index, fixed, store, realColumns)
  if (!direction) {
    return
  }
  const styles = {}
  const isLeft = direction === 'left'
  const { columns } = store.states
  if (isLeft) {
    styles.left = columns.slice(0, start).reduce(getOffset, 0)
  } else {
    let right = columns
      .slice(after + 1)
      .reverse()
      .reduce(getOffset, 0)
    if (hasGutter) {
      right += gutterWidth
    }
    styles.right = right
  }
  return styles
}

export const ensurePosition = (style, key) => {
  if (!style) return
  if (!Number.isNaN(style[key])) {
    if (key === 'left') {
      style.transform = `translateX(${style[key] || 0}px)`
    } else if (key === 'right') {
      style.transform = `translateX(-${style[key] || 0}px)`
    }
  }
}

function checkChromium() {
  // 排除 Firefox 和 Safari
  if (
    navigator.userAgent.includes('Firefox') ||
    (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome'))
  ) {
    return false
  }

  // Chromium 浏览器通常有这些特征
  return (
    window.chrome !== null &&
    typeof window.chrome !== 'undefined' &&
    (navigator.userAgent.includes('Chrome') || navigator.userAgent.includes('Chromium'))
  )
}

export const isChromium = checkChromium()

export const getStickyCellStyle = (index, fixed, store, realColumns, hasGutter) => {
  const { direction, start = 0, after = 0 } = isFixedColumn(index, fixed, store, realColumns)
  const gutterWidth = 6

  const scrollStyles = {}
  if (direction) {
    scrollStyles.zIndex = '4'
    if (isChromium) {
      scrollStyles.contain = 'layout'
      scrollStyles.transformStyle = 'preserve-3d'
      if (direction === 'left') {
        scrollStyles.transform = `translate3d(var(--scroll-left), 0, 0)`
      } else if (direction === 'right') {
        scrollStyles.transform = `translate3d(var(--scroll-right), 0, 0)`
      }
    } else {
      // 火狐等其他浏览器
      scrollStyles.position = 'sticky'

      const { columns } = store.states
      if (direction === 'left') {
        scrollStyles.left = `${columns.slice(0, start).reduce(getOffset, 0)}px`
      } else if (direction === 'right') {
        let right = columns
          .slice(after + 1)
          .reverse()
          .reduce(getOffset, 0)
        if (hasGutter) {
          right += gutterWidth
        }
        scrollStyles.right = `${right}px`
      }
    }
  } else {
    scrollStyles.contain = ''
  }
  return scrollStyles
}
