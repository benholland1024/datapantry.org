<template>
  <div class="flex-1 relative"  
    @mousemove="handleMouse"
    @mouseleave="resetMouse"
  >
    <!-- <div id="landing-gradient"></div> -->
    
    <div class="flex justify-around items-center min-h-[calc(100vh-4rem)] relative">
      <div class="max-w-[50%]">
        <p style="color:var(--blue); font-style: italic;">Turn schemas into real databases</p>
        <h2 class="text-8xl bold mb-4">Easy, visual, secure database mgmt.</h2>
        <p style="font-size: 1.5em;">
          DataPantry is still in beta testing. 
          <br/>Send feedback to <a href="mailto:benholland1024@gmail.com">benholland1024@gmail.com</a>.
        </p>
        <br/>
        <div class="flex gap-4 mb-8">
          <UButton color="bg3" class="text-white" onclick="render_register_input()" 
            v-if="!currentUser" to="/sign-up"
          >
            Register to create a database!
          </UButton>
          <UButton color="bg3" class="text-white" onclick="boot_side_bar();" 
            v-else to="/dashboard"
          >
            Go to your dashboard!
          </UButton>
        </div>
      </div>
      <div id="landing-image" class="relative" ref="landing-image">
        <!-- SVG background -->
        <svg
          class="absolute inset-0 pointer-events-none z-0
            -left-[150px] -top-[150px]"
          :width="width + 10"
          :height="height + 10"
        >
          <g>
            <line
              v-for="(conn, i) in connections"
              :key="'l'+i"
              :x1="points[conn[0]]?.x"
              :y1="points[conn[0]]?.y"
              :x2="points[conn[1]]?.x"
              :y2="points[conn[1]]?.y"
              stroke="#6b7581"
              stroke-width="2"
            />
            <circle
              v-for="(pt, i) in points"
              :key="'c'+i"
              :cx="pt.x"
              :cy="pt.y"
              r="3"
              fill="#ffffff"
            />
          </g>
        </svg>
        <img src="/can-only.png" alt="Landing Image" class="z-100 relative" />
        <!-- <Logo class="w-96 h-96" /> -->
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { useDatabase } from '@/composables/useDatabase';

const { currentUser } = useDatabase();

const width = 400
const height = 600
const numPoints = 32
const pointsHome = ref<{ x: number, y: number, vx: number, vy: number }[]>([])
const points = ref<{ x: number, y: number, vx: number, vy: number }[]>([])
const connections = ref<[number, number][]>([])
const mouse = ref<{ x: number, y: number } | null>(null)

function initPoints() {

  // Calculate grid size for roughly even distribution
  const cols = Math.ceil(Math.sqrt(numPoints * width / height));
  const rows = Math.ceil(numPoints / cols);

  const xSpacing = width / (cols + 1);
  const ySpacing = height / (rows + 1);

  let pts: { x: number, y: number, vx: number, vy: number }[] = [];
  let count = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (count >= numPoints) break;
      // Offset every other row for hex grid effect
      const xOffset = (row % 2 === 0) ? xSpacing / 2 : 0;
      const x = (col + 1) * xSpacing + xOffset + (Math.random() - 0.5) * xSpacing * 0.4;
      const y = (row + 1) * ySpacing + (Math.random() - 0.5) * ySpacing * 0.4;
      pts.push({
        x: x,
        y,
        vx: 0,
        vy: 0
      });
      count++;
    }
  }
  points.value = pts;
  pointsHome.value = JSON.parse(JSON.stringify(pts));

  // Connect each point to its 2 nearest neighbors (unchanged)
  connections.value = [];
  for (let i = 0; i < numPoints; i++) {
    let xConn = points.value[i]?.x ?? 0;
    let yConn = points.value[i]?.y ?? 0;
    const dists = points.value.map((pt, j) => ({
      j,
      dist: Math.hypot(pt.x - xConn, pt.y - yConn)
    }));
    dists.sort((a, b) => a.dist - b.dist);
    for (let k = 1; k <= 2; k++) {
      const neighbor = dists[k]?.j;
      if (!connections.value.some(([a, b]) => (a === i && b === neighbor) || (a === neighbor && b === i))) {
        connections.value.push([i, neighbor ?? 0]);
      }
    }
  }
}

let frameId: number

function animate() {
  for (const pt of points.value) {
    if (
      mouse.value &&
      typeof mouse.value.x === 'number' &&
      typeof mouse.value.y === 'number' &&
      mouse.value.x < pt.x + 20 && mouse.value.x > pt.x - 20 &&
      mouse.value.y < pt.y + 20 && mouse.value.y > pt.y - 20
    ) {
      // Repel point from mouse
      const dx = pt.x - mouse.value.x
      const dy = pt.y - mouse.value.y
      const dist = Math.hypot(dx, dy)
      if (dist < 60) {
        pt.vx += dx / dist * 0.1
        pt.vy += dy / dist * 0.1
      }
    } else {
      // Spring back to home position
      const home = pointsHome.value[points.value.indexOf(pt)]
      if (home) {
        pt.vx += (home.x - pt.x) * 0.002
        pt.vy += (home.y - pt.y) * 0.002
      }
    }
    pt.x += pt.vx
    pt.y += pt.vy
    // Bounce off edges
    if (pt.x < 0 || pt.x > width) pt.vx *= -1
    if (pt.y < 0 || pt.y > height) pt.vy *= -1
    // Mouse repulsion
    if (mouse.value) {
      const dx = pt.x - mouse.value.x
      const dy = pt.y - mouse.value.y
      const dist = Math.hypot(dx, dy)
      if (dist < 60) {
        pt.vx += dx / dist * 0.04
        pt.vy += dy / dist * 0.04
      }
    }
    pt.vx *= 0.98
    pt.vy *= 0.98
  }
  frameId = requestAnimationFrame(animate)
}

function handleMouse(e: MouseEvent) {
  const landingImageRef = document.getElementById('landing-image') as HTMLElement
  const rect = landingImageRef.getBoundingClientRect()
  mouse.value = {
    x: e.clientX - rect.left + 150,
    y: e.clientY - rect.top + 150
  }
}

function resetMouse() {
  mouse.value = null
}

function auto_move() {
  if (!mouse.value) {
    mouse.value = {
      x: Math.random() * width,
      y: Math.random() * height
    }
  } else {
    mouse.value.x += (Math.random() - 0.5) * 200
    mouse.value.y += (Math.random() - 0.5) * 200
    if (mouse.value.x < 0) mouse.value.x = 0
    if (mouse.value.x > width) mouse.value.x = width
    if (mouse.value.y < 0) mouse.value.y = 0
    if (mouse.value.y > height) mouse.value.y = height
  }
}

const interval = ref<any>(null);
onMounted(() => {
  console.log("Testing the Git hook!")
  initPoints()
  animate()
  interval.value = setInterval(auto_move, 1000)
})

onUnmounted(() => {
  cancelAnimationFrame(frameId)
  clearInterval(interval.value)
})


</script>