<template>
  <div class="flex-1 overflow-hidden w-full" style="background-color: #0a0a0a;">
    <svg 
      ref="canvasRef"
      class="w-full h-full"
      :class="[ isPanning || isDragging ? 'cursor-grabbing' : 'cursor-grab' ]"
      :viewBox="`${panX} ${panY} ${viewWidth / zoomLevel} ${viewHeight / zoomLevel}`"
      @mousedown="startPan"
      @mousemove="handlePan"
      @mouseup="endPan"
      @mouseleave="endPan"
      @wheel="handleWheel"
    >
      <!--------------------->
      <!-- Grid background -->
      <!--------------------->
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="#0a0a0a" />
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#374151" stroke-width="0.5" opacity="0.3"/>
        </pattern>
      </defs>
      <rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#grid)" />

      <!--------------------------------->
      <!-- Connection points and lines -->
      <!--------------------------------->
      <g class="connections">
        <!-- Connection lines -->
        <line 
          v-for="connection in connections" 
          :key="connection.id"
          :x1="connection.fromX" 
          :y1="connection.fromY"
          :x2="connection.toX" 
          :y2="connection.toY"
          stroke="#60a5fa" 
          stroke-width="2"
          opacity="0.8"
        />

        <!-- Connection points (semicircles) -->
        <circle 
          v-for="point in connectionPoints" 
          :key="point.id"
          :cx="point.x" 
          :cy="point.y" 
          r="8"
          :fill="getConnectionPointColor(point)"
          stroke="#1f2937"
          stroke-width="1"
        />
        
      </g>

      <!------------>
      <!-- Tables -->
      <!------------>
      <g v-for="table in props.tables" :key="table.id">
        <!-- Table container -->
        <g 
          :transform="`translate(${table.x}, ${table.y})`"
          @mousedown.stop="startDrag(table, $event)"
          @click.stop="selectTable(table.name)"
          class="cursor-move"
        >
          <!-- Table background -->
          <rect 
            width="200" 
            :height="getTableHeight(table)"
            fill="#10102E" 
            rx="8"
          />
          
          <!-- Table header -->
          <rect 
            width="200" 
            height="40" 
            fill="#15163E" 
            rx="8"
          />

          <!-- Table outline -->
          <rect 
            width="200" 
            :height="getTableHeight(table)"
            rx="8"
            fill="none"
            stroke-width="2"
            :class="{ 'stroke-blue-400': props.selectedTable === table.name }"
          />

          <!-- Table name -->
          <foreignObject x="8" y="8" width="184" height="24">
            <div 
              class="text-white font-semibold text-sm px-2 py-1"
              @dblclick.stop="selectTable(table.name)"
            >
              {{ table.name }}
            </div>
          </foreignObject>

          <!-- Columns -->
          <foreignObject x="8" y="48" width="184" :height="getColumnsHeight(table)">
            <div>
              <div v-for="column in table.columns" :key="column.name" 
                class="flex justify-between items-center h-5 py-0.5"
              >
              <span class="flex items-center gap-1">
                <UIcon v-if="column.constraint === 'primary'" name="i-lucide-key" class="w-3 h-3 text-yellow-400" />
                <UIcon v-else-if="column.constraint === 'unique'" name="i-lucide-fingerprint" class="w-3 h-3 text-blue-400" />
                <UIcon v-else-if="column.datatype === 'Foreign Key'" name="i-lucide-link" class="w-3 h-3 text-green-400" />
                <div v-else class="w-3 h-3"></div>
                <UIcon v-if="column.isRequired" name="i-lucide-asterisk" class="w-2 h-2 text-red-400" />
                <div v-else class="w-2 h-3"></div>
                <span class="text-sm text-white">{{ column.name }}</span>
              </span>
              <span class="text-gray-400 text-xs">{{ column.datatype }}</span>
              </div>
              
              <div v-if="table.columns.length === 0" 
                   class="text-gray-500 italic text-xs py-2">
                No columns
              </div>
            </div>
          </foreignObject>
        </g>
      </g>

    </svg>
  </div>
</template>

<script setup lang="ts">
// Props
const props = defineProps<{
  tables: any[]
  selectedTable: string | null
  zoomLevel: number
}>()

// Emits
const emit = defineEmits<{
  selectTable: [tableId: string]
  deselectTable: []
  updateTable: [tableId: string, updates: any]
  createTable: []
  updateZoom: [zoomLevel: number]
}>()

// Canvas state
const canvasRef = ref<SVGElement>()
const panX = ref(0)
const panY = ref(0)
const viewWidth = ref(800)
const viewHeight = ref(600)

// Pan state
const isPanning = ref(false)
const lastPanX = ref(0)
const lastPanY = ref(0)

// Drag state
const isDragging = ref(false)
const dragTable = ref<any>(null)
const dragOffsetX = ref(0)
const dragOffsetY = ref(0)

// Constants
const MAX_PAN = 2000
const MIN_ZOOM = 0.25
const MAX_ZOOM = 3

// Helper functions
const getTableHeight = (table: any) => {
  const headerHeight = 48
  const columnHeight = 24
  const minColumnsDisplay = 3
  const actualColumns = Math.max(table.columns.length, minColumnsDisplay)
  return headerHeight + (actualColumns * columnHeight)
}

const getColumnsHeight = (table: any) => {
  const columnHeight = 24
  const minColumnsDisplay = 3
  const actualColumns = Math.max(table.columns.length, minColumnsDisplay)
  return actualColumns * columnHeight
}

// Helper to check if a primary key is connected
const isPrimaryKeyConnected = (tableId: string, columnName: string) => {
  return props.tables.some(table => 
    table.columns.some((column: any) => 
      column.datatype === 'Foreign Key' && 
      column.foreignKey?.tableId === tableId && 
      column.foreignKey?.columnName === columnName
    )
  )
}

// Connection point calculation
const getConnectionPoints = () => {
  const points: Array<{
    id: string
    x: number
    y: number
    type: 'primary' | 'foreign'
    tableId: string
    columnName: string
    isConnected?: boolean 
  }> = []

  props.tables.forEach(table => {
    table.columns.forEach((column: any, columnIndex: number) => {
      const columnY = table.y + 48 + (columnIndex * 21) + 8 // Center of column row
      
      // Primary key connection point (left side)
      if (column.constraint === 'primary') {
        points.push({
          id: `pk-${table.id}-${column.name}`,
          x: table.x,
          y: columnY,
          type: 'primary',
          tableId: table.id,
          columnName: column.name,
          isConnected: isPrimaryKeyConnected(table.id, column.name) // Check if connected
        })
      }
      
      // Foreign key connection point (right side)
      if (column.datatype === 'Foreign Key') {
        points.push({
          id: `fk-${table.id}-${column.name}`,
          x: table.x + 200, // right of table edge (table width is 200)
          y: columnY,
          type: 'foreign',
          tableId: table.id,
          columnName: column.name,
          isConnected: true // always connected by definition
        })
      }
    })
  })

  return points
}
const connectionPoints = computed(() => getConnectionPoints())

// Calculate connection lines
const getConnections = () => {
  const connections: Array<{
    id: string
    fromX: number
    fromY: number
    toX: number
    toY: number
  }> = []

  const connectionPoints = getConnectionPoints()

  props.tables.forEach(table => {
    table.columns.forEach((column: any, columnIndex: number) => {
      if (column.datatype === 'Foreign Key' && column.foreignKey) {
        // Find the FK connection point (right side of this table)
        const fkPoint = connectionPoints.find(p => 
          p.tableId === table.id && 
          p.columnName === column.name && 
          p.type === 'foreign'
        )

        // Find the PK connection point (left side of referenced table)
        const pkPoint = connectionPoints.find(p => 
          p.tableId === column.foreignKey.tableId && 
          p.columnName === column.foreignKey.columnName && 
          p.type === 'primary'
        )

        if (fkPoint && pkPoint) {
          connections.push({
            id: `connection-${table.id}-${column.name}`,
            fromX: fkPoint.x,
            fromY: fkPoint.y,
            toX: pkPoint.x,
            toY: pkPoint.y
          })
        }
      }
    })
  })

  return connections
}
const connections = computed(() => getConnections())

// Color logic for connection points. Gold for PK if connected, green for FK, gray otherwise
const getConnectionPointColor = (point: any) => {
  if (point.type === 'foreign') {
    return '#10b981' // Green for foreign keys (always connected)
  } else if (point.type === 'primary') {
    return point.isConnected ? '#fbbf24' : '#6b7280' // Gold if connected, gray if not
  }
  return '#6b7280' // Default gray
}

// Table selection
const selectTable = (tableName: string) => {
  emit('selectTable', tableName)
}

// Pan functionality
const startPan = (event: MouseEvent) => {
  if (isDragging.value) return
  isPanning.value = true
  lastPanX.value = event.clientX
  lastPanY.value = event.clientY
  
  emit('deselectTable') // Deselect any selected table when starting to pan
}

const handlePan = (event: MouseEvent) => {
  if (isPanning.value) {
    const deltaX = (event.clientX - lastPanX.value) / props.zoomLevel
    const deltaY = (event.clientY - lastPanY.value) / props.zoomLevel
    
    panX.value = Math.max(-MAX_PAN, Math.min(MAX_PAN, panX.value - deltaX))
    panY.value = Math.max(-MAX_PAN, Math.min(MAX_PAN, panY.value - deltaY))
    
    lastPanX.value = event.clientX
    lastPanY.value = event.clientY
  }
  
  if (isDragging.value && dragTable.value) {
    const rect = canvasRef.value!.getBoundingClientRect()
    const svgX = (event.clientX - rect.left) / props.zoomLevel + panX.value
    const svgY = (event.clientY - rect.top) / props.zoomLevel + panY.value
    
    dragTable.value.x = Math.max(-MAX_PAN + 100, Math.min(MAX_PAN - 200, svgX - dragOffsetX.value))
    dragTable.value.y = Math.max(-MAX_PAN + 100, Math.min(MAX_PAN - 200, svgY - dragOffsetY.value))
  }
}

const endPan = () => {
  isPanning.value = false
  isDragging.value = false
  dragTable.value = null
}

// Drag functionality
const startDrag = (table: any, event: MouseEvent) => {
  isDragging.value = true
  dragTable.value = table
  
  const rect = canvasRef.value!.getBoundingClientRect()
  const svgX = (event.clientX - rect.left) / props.zoomLevel + panX.value
  const svgY = (event.clientY - rect.top) / props.zoomLevel + panY.value
  
  dragOffsetX.value = svgX - table.x
  dragOffsetY.value = svgY - table.y
}

// Zoom functionality
const handleWheel = (event: WheelEvent) => {
  event.preventDefault()

  const zoomFactor = 1.1
  const delta = event.deltaY > 0 ? 1 / zoomFactor : zoomFactor
  const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, props.zoomLevel * delta))

  // Get mouse position relative to SVG
  const rect = canvasRef.value!.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top

  // Convert mouse position to SVG coordinates before zoom
  const svgX = panX.value + mouseX * (viewWidth.value / rect.width) / props.zoomLevel
  const svgY = panY.value + mouseY * (viewHeight.value / rect.height) / props.zoomLevel

  // After zoom, calculate new pan so the point under the mouse stays fixed
  const newPanX = svgX - mouseX * (viewWidth.value / rect.width) / newZoom
  const newPanY = svgY - mouseY * (viewHeight.value / rect.height) / newZoom

  panX.value = Math.max(-MAX_PAN, Math.min(MAX_PAN, newPanX))
  panY.value = Math.max(-MAX_PAN, Math.min(MAX_PAN, newPanY))

  emit('updateZoom', newZoom)
}

watch(() => props.zoomLevel, (newZoom) => {
  if (newZoom < MIN_ZOOM || newZoom > MAX_ZOOM) {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom))
    emit('updateZoom', clampedZoom)
  }
})

// Canvas sizing
const updateSize = () => {
  if (canvasRef.value) {
    const rect = canvasRef.value.getBoundingClientRect()
    viewWidth.value = rect.width
    viewHeight.value = rect.height
  }
}

// Watch for canvas ref and update size
watch(canvasRef, (newRef) => {
  if (newRef) {
    nextTick(() => {
      updateSize()
    })
  }
}, { immediate: true })

onMounted(() => {
  window.addEventListener('resize', updateSize)
  
  onUnmounted(() => {
    window.removeEventListener('resize', updateSize)
  })
})
</script>