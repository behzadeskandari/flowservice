import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useFlowStore } from '../flowStore'

// Deterministic backend API client for load/restore assertions.
vi.mock('@/utils/service-aggregator-client', () => ({
  default: {
    getAggregateByid: vi.fn(),
    getServiceMappingsByServiceId: vi.fn(),
    addAggregateStepMapping: vi.fn(),
    deleteAggregateStepMapping: vi.fn(),
    updateAggregateStepMapping: vi.fn(),
  },
}))
vi.mock('@kyvg/vue3-notification', () => ({ notify: vi.fn() }))

import serviceAggregatorClient from '@/utils/service-aggregator-client'

const SRC_STEP = 'src-step-1'
const TGT_STEP = 'tgt-step-1'
const SRC_NODE = `node-${SRC_STEP}`
const TGT_NODE = `node-${TGT_STEP}`

function buildAggregate(mappings) {
  return {
    id: 'agg-1',
    name: 'Test Aggregate',
    firstStepId: SRC_STEP,
    steps: [
      {
        id: SRC_STEP,
        stepName: 'Source',
        serviceId: 'svc-src',
        service: { id: 'svc-src', name: 'SourceSvc', url: 'https://src', method: 'GET', type: 'REST', status: true, mappings: [] },
        nextStepId: TGT_STEP,
        mappings: [],
        positionX: 100,
        positionY: 100,
      },
      {
        id: TGT_STEP,
        stepName: 'Target',
        serviceId: 'svc-tgt',
        service: { id: 'svc-tgt', name: 'TargetSvc', url: 'https://tgt', method: 'POST', type: 'REST', status: true, mappings: [] },
        nextStepId: null,
        mappings,
        positionX: 400,
        positionY: 100,
      },
    ],
  }
}

// Direction 1 = Input, 2 = Output (matches backend MappingDirection enum).
const serviceFieldDefs = {
  'svc-src': [
    { id: 'out-orderId', name: 'orderId', type: 'string', direction: 2, description: '' },
    { id: 'out-total', name: 'total', type: 'number', direction: 2, description: '' },
  ],
  'svc-tgt': [
    { id: 'in-inputId', name: 'inputId', type: 'string', direction: 1, description: '' },
    { id: 'in-qty', name: 'qty', type: 'number', direction: 1, description: '' },
  ],
}

function wireMocks(mappings = []) {
  serviceAggregatorClient.getAggregateByid.mockResolvedValue(buildAggregate(mappings))
  serviceAggregatorClient.getServiceMappingsByServiceId.mockImplementation((sid) =>
    Promise.resolve(serviceFieldDefs[sid] || []),
  )
}

describe('flowStore: grey property-connection (AggregateStepMapping) restoration', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFlowStore()
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('rebuilds both control-flow (Next) and grey field-mapping edges after load', async () => {
    wireMocks([
      { id: 'map-1', inputStepId: SRC_STEP, source: 'StepOutput', sourceField: 'orderId', targetField: 'inputId', value: '', valueType: 'string', status: true, mappingType: 'Body' },
    ])

    await store.loadSingleAggregateFlow('agg-1')
    await nextTick()

    // Dotted/solid control-flow (Next) edge is preserved untouched.
    const controlEdge = store.edges.value.find((e) => e.id === `edge-${SRC_STEP}-next-${TGT_STEP}`)
    expect(controlEdge).toBeTruthy()
    expect(controlEdge.data.aggregateStepId).toBe(SRC_STEP)
    expect(controlEdge.animated).toBe(true)

    // Grey solid field-mapping edge reconstructed from step.mappings.
    const fieldEdge = store.edges.value.find((e) => e.data?.fieldMapping)
    expect(fieldEdge).toBeTruthy()
    expect(fieldEdge.id).toBe(`e-field-${SRC_NODE}-output-out-orderId-${TGT_NODE}-input-in-inputId`)
    expect(fieldEdge.source).toBe(SRC_NODE)
    expect(fieldEdge.target).toBe(TGT_NODE)
    expect(fieldEdge.sourceHandle).toBe('output-out-orderId')
    expect(fieldEdge.targetHandle).toBe('input-in-inputId')
    expect(fieldEdge.data.sourceField).toBe('orderId')
    expect(fieldEdge.data.targetField).toBe('inputId')
    expect(fieldEdge.data.inputStepId).toBe(SRC_STEP)
    expect(fieldEdge.data.aggregateStepId).toBe(TGT_STEP)
    expect(fieldEdge.data.valueType).toBe('string')
    expect(fieldEdge.data.mappingId).toBe('map-1')
        expect(fieldEdge.animated).toBe(false)
  })

  it('restores multiple independent property connections', async () => {
    wireMocks([
      { id: 'map-1', inputStepId: SRC_STEP, source: 'StepOutput', sourceField: 'orderId', targetField: 'inputId', value: '', valueType: 'string', status: true, mappingType: 'Body' },
      { id: 'map-2', inputStepId: SRC_STEP, source: 'StepOutput', sourceField: 'total', targetField: 'qty', value: '', valueType: 'number', status: true, mappingType: 'Body' },
    ])

    await store.loadSingleAggregateFlow('agg-1')
    await nextTick()

    const fieldEdges = store.edges.value.filter((e) => e.data?.fieldMapping)
    expect(fieldEdges).toHaveLength(2)
    const ids = new Set(fieldEdges.map((e) => e.id))
    expect(ids.has(`e-field-${SRC_NODE}-output-out-orderId-${TGT_NODE}-input-in-inputId`)).toBe(true)
    expect(ids.has(`e-field-${SRC_NODE}-output-out-total-${TGT_NODE}-input-in-qty`)).toBe(true)
  })

  it('does not duplicate edges when the aggregate is reloaded', async () => {
    wireMocks([
      { id: 'map-1', inputStepId: SRC_STEP, source: 'StepOutput', sourceField: 'orderId', targetField: 'inputId', value: '', valueType: 'string', status: true, mappingType: 'Body' },
    ])

    await store.loadSingleAggregateFlow('agg-1')
    await nextTick()
    const first = store.edges.value.filter((e) => e.data?.fieldMapping).length

    await store.loadSingleAggregateFlow('agg-1')
    await nextTick()
    const second = store.edges.value.filter((e) => e.data?.fieldMapping).length

    expect(first).toBe(1)
    expect(second).toBe(1)
  })
})
