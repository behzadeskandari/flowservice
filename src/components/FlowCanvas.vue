<template>
  <VueFlow
    :nodes="nodes"
    :edges="edges"
    @connect="handleConnect"
    @edge-update="handleEdgeUpdate"
    @edge-remove="handleEdgeRemove"
    @node-drag-stop="handleNodeDragStop"
  />
  <ServiceModal
    v-if="serviceModalOpen"
    :service="selectedService"
    @save="handleServiceSave"
    @close="serviceModalOpen = false"
  />
  <MappingModal
    v-if="mappingModalOpen"
    :mapping="selectedMapping"
    :aggregateStepId="selectedEdge?.data.aggregateStepId"
    @save="handleMappingSave"
    @update="handleMappingUpdate"
    @close="mappingModalOpen = false"
  />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import VueFlow from '@vue-flow/core'
import ServiceAggregatorClient from '@/utils/service-aggregator-client'
import ServiceModal from './ServiceModal.vue'
import MappingModal from './MappingModal.vue'

const nodes = ref([])
const edges = ref([])
const serviceModalOpen = ref(false)
const mappingModalOpen = ref(false)
const selectedService = ref(null)
const selectedEdge = ref(null)
const selectedMapping = ref(null)

function convertAggregatesToFlow(aggregates) {
  const flowNodes = []
  const flowEdges = []
  aggregates.forEach(aggregate => {
    aggregate.steps.forEach(step => {
      // Service Node
      flowNodes.push({
        id: step.service.id,
        label: step.service.name,
        position: { x: Math.random() * 400, y: Math.random() * 400 },
        data: {
          serviceId: step.service.id,
          aggregateId: aggregate.id,
          name: step.service.name,
          url: step.service.url,
          method: step.service.method,
          type: step.service.type,
          status: step.service.status
        }
      })
      // Edge
      if (step.nextStepId) {
        flowEdges.push({
          id: step.id,
          source: step.serviceId,
          target: step.nextStepId,
          data: {
            aggregateStepId: step.id,
            aggregateId: aggregate.id,
            condition: step.condition,
            mappings: step.mappings
          }
        })
      }
    })
  })
  nodes.value = flowNodes
  edges.value = flowEdges
}

onMounted(async () => {
  const aggregates = await ServiceAggregatorClient.getAggregates()
  convertAggregatesToFlow(aggregates)
})

async function handleServiceSave(service) {
  if (service.id) {
    const payload = {
      id: service.id,
      name: service.name,
      url: service.url,
      method: service.method,
      type: service.type,
      status: service.status
    }
    const updated = await ServiceAggregatorClient.updateService(payload)
    const node = nodes.value.find(n => n.id === service.id)
    if (node) node.data = { ...payload }
  } else {
    const payload = {
      name: service.name,
      url: service.url,
      method: service.method,
      type: service.type
    }
    const created = await ServiceAggregatorClient.createService(payload)
    nodes.value.push({
      id: created.id,
      label: created.name,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        serviceId: created.id,
        aggregateId: created.aggregateId,
        name: created.name,
        url: created.url,
        method: created.method,
        type: created.type,
        status: created.status
      }
    })
  }
  serviceModalOpen.value = false
}

async function handleConnect({ source, target }) {
  const payload = {
    aggregateId: nodes.value.find(n => n.id === source).data.aggregateId,
    serviceId: source,
    nextStepId: target,
    sourceStepId: source,
    condition: ''
  }
  const step = await ServiceAggregatorClient.addAggregateStep(payload)
  edges.value.push({
    id: step.id,
    source,
    target,
    data: {
      aggregateStepId: step.id,
      aggregateId: payload.aggregateId,
      condition: step.condition,
      mappings: step.mappings
    }
  })
}

async function handleEdgeUpdate({ edge, source, target }) {
  const payload = {
    id: edge.data.aggregateStepId,
    aggregateId: edge.data.aggregateId,
    serviceId: source,
    nextStepId: target,
    sourceStepId: source,
    condition: edge.data.condition,
    status: true
  }
  const updated = await ServiceAggregatorClient.updateAggregateStep(payload)
  edge.source = source
  edge.target = target
  edge.data.condition = updated.condition
}

async function handleEdgeRemove({ edge }) {
  const payload = {
    id: edge.data.aggregateStepId,
    aggregateId: edge.data.aggregateId,
    serviceId: edge.source,
    nextStepId: null,
    sourceStepId: null,
    condition: edge.data.condition,
    status: true
  }
  await ServiceAggregatorClient.updateAggregateStep(payload)
  edges.value = edges.value.filter(e => e.id !== edge.id)
}

function handleNodeDragStop({ node, position }) {
  node.position = position
}

function openMappingModal(edge) {
  selectedEdge.value = edge
  mappingModalOpen.value = true
}

async function handleMappingSave(mapping) {
  const payload = {
    aggregateStepId: selectedEdge.value.data.aggregateStepId,
    inputStepId: mapping.inputStepId,
    source: mapping.source,
    targetField: mapping.targetField,
    sourceField: mapping.sourceField,
    value: mapping.value,
    valueType: mapping.valueType,
    status: mapping.status
  }
  const created = await ServiceAggregatorClient.addAggregateStepMapping(payload)
  selectedEdge.value.data.mappings.push(created)
  mappingModalOpen.value = false
}

async function handleMappingUpdate(mapping) {
  const payload = {
    id: mapping.id,
    aggregateStepId: selectedEdge.value.data.aggregateStepId,
    inputStepId: mapping.inputStepId,
    source: mapping.source,
    targetField: mapping.targetField,
    sourceField: mapping.sourceField,
    value: mapping.value,
    valueType: mapping.valueType,
    status: mapping.status
  }
  const updated = await ServiceAggregatorClient.updateAggregateStepMapping(payload)
  const idx = selectedEdge.value.data.mappings.findIndex(m => m.id === mapping.id)
  if (idx !== -1) selectedEdge.value.data.mappings[idx] = updated
  mappingModalOpen.value = false
}
</script>