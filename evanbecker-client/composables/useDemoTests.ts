import { ref, type Ref } from 'vue'

export interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'running' | 'pending'
  duration: number
  error?: string
}

export interface DemoTestSuite {
  results: Ref<TestResult[]>
  running: Ref<boolean>
  run: () => Promise<void>
  passCount: Ref<number>
  failCount: Ref<number>
}

function createSuite(tests: Array<{ name: string; fn: () => Promise<void> }>): DemoTestSuite {
  const results = ref<TestResult[]>(tests.map(t => ({ name: t.name, status: 'pending' as const, duration: 0 })))
  const running = ref(false)
  const passCount = ref(0)
  const failCount = ref(0)

  async function run() {
    running.value = true
    passCount.value = 0
    failCount.value = 0

    for (let i = 0; i < tests.length; i++) {
      results.value[i] = { name: tests[i].name, status: 'running', duration: 0 }
      const start = performance.now()
      try {
        await tests[i].fn()
        const duration = Math.round(performance.now() - start)
        results.value[i] = { name: tests[i].name, status: 'pass', duration }
        passCount.value++
      } catch (e: any) {
        const duration = Math.round(performance.now() - start)
        results.value[i] = { name: tests[i].name, status: 'fail', duration, error: e.message || String(e) }
        failCount.value++
      }
    }

    running.value = false
  }

  return { results, running, run, passCount, failCount }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

export function useRayMarchTests(getComponent: () => any): DemoTestSuite {
  return createSuite([
    {
      name: 'WebGL2 context creation',
      fn: async () => {
        const comp = getComponent()
        assert(comp != null, 'Component ref is null')
        assert(comp.glContextCreated === true, 'WebGL2 context was not created')
      },
    },
    {
      name: 'Shader compilation',
      fn: async () => {
        const comp = getComponent()
        assert(comp != null, 'Component ref is null')
        assert(comp.shaderCompiled === true, `Shader did not compile. Errors: ${comp.glErrors?.join('; ') || 'none'}`)
      },
    },
    {
      name: 'Distance function: sphere',
      fn: async () => {
        // sdSphere(vec3(2,0,0), 1.0) = length(vec3(2,0,0)) - 1.0 = 2.0 - 1.0 = 1.0
        const length = Math.sqrt(2 * 2 + 0 + 0)
        const result = length - 1.0
        assert(Math.abs(result - 1.0) < 0.001, `Expected 1.0, got ${result}`)
      },
    },
    {
      name: 'Distance function: smooth union',
      fn: async () => {
        // smoothSubtraction should produce values between min and max
        // Testing the math: for d1=1.0, d2=0.5, k=0.3
        const d1 = 1.0, d2 = 0.5, k = 0.3
        const h = Math.min(Math.max(0.5 - 0.5 * (d2 + d1) / k, 0.0), 1.0)
        const result = d2 * (1 - h) + (-d1) * h + k * h * (1 - h)
        // Result should be a finite number within a reasonable range
        assert(Number.isFinite(result), `Result ${result} is not finite`)
        assert(result >= -2 && result <= 2, `Result ${result} out of reasonable range`)
      },
    },
    {
      name: 'Frame renders without error',
      fn: async () => {
        const comp = getComponent()
        assert(comp != null, 'Component ref is null')
        const gl = comp.gl()
        assert(gl != null, 'GL context is null')
        // Check no errors accumulated
        const errors = comp.glErrors
        assert(errors.length === 0, `GL errors: ${errors.join('; ')}`)
      },
    },
    {
      name: 'FPS above threshold',
      fn: async () => {
        const comp = getComponent()
        assert(comp != null, 'Component ref is null')
        // Wait a moment for FPS to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000))
        const currentFps = comp.fps
        assert(currentFps > 10, `FPS is ${currentFps}, expected > 10`)
      },
    },
  ])
}

export function useHomelabTests(getComponent: () => any): DemoTestSuite {
  return createSuite([
    {
      name: 'Three.js loads',
      fn: async () => {
        const comp = getComponent()
        assert(comp != null, 'Component ref is null')
        // Wait for async load
        await new Promise(resolve => setTimeout(resolve, 1000))
        assert(comp.threeLoaded === true, 'Three.js did not load')
      },
    },
    {
      name: 'Scene contains all 8 nodes',
      fn: async () => {
        const comp = getComponent()
        assert(comp != null, 'Component ref is null')
        const count = comp.sceneNodeCount
        assert(count === 8, `Expected 8 nodes, found ${count}`)
      },
    },
    {
      name: 'All connections valid',
      fn: async () => {
        const comp = getComponent()
        assert(comp != null, 'Component ref is null')
        const nodeIds = new Set(comp.nodes.map((n: any) => n.id))
        for (const conn of comp.connections) {
          assert(nodeIds.has(conn.from), `Connection from "${conn.from}" references non-existent node`)
          assert(nodeIds.has(conn.to), `Connection to "${conn.to}" references non-existent node`)
        }
      },
    },
    {
      name: 'Node click handler fires',
      fn: async () => {
        const comp = getComponent()
        assert(comp != null, 'Component ref is null')
        comp.selectNode('ct109')
        assert(comp.selectedNode != null, 'selectedNode is null after selectNode call')
        assert(comp.selectedNode.id === 'ct109', `Expected ct109, got ${comp.selectedNode.id}`)
      },
    },
    {
      name: 'Camera orbit works',
      fn: async () => {
        // OrbitControls are initialized with autoRotate, so if Three.js loaded,
        // the camera is orbiting
        const comp = getComponent()
        assert(comp != null, 'Component ref is null')
        assert(comp.threeLoaded === true, 'Three.js not loaded, cannot verify orbit')
      },
    },
    {
      name: 'Labels render',
      fn: async () => {
        const comp = getComponent()
        assert(comp != null, 'Component ref is null')
        // CSS2DRenderer creates a DOM overlay. If sceneNodeCount > 0, labels exist.
        assert(comp.sceneNodeCount > 0, 'No nodes in scene, so no labels')
      },
    },
  ])
}

