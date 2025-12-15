# Vue 3 + VueFlow Backend Integration Guide

This document explains how the Vue 3 frontend integrates with the backend API at `/api/flow/*` endpoints.

## Overview

The integration uses:
- **ServiceAggregatorClient** (`src/utils/service-aggregator-client.js`) - Axios-based client for API calls
- **flowStore** (`src/stores/flowStore.js`) - Pinia store managing VueFlow state and backend sync
- **AppFlow.vue** - Main VueFlow component
- **ServiceModal.vue** - Modal for editing services

## API Endpoints Used

All endpoints are prefixed with `/api/flow/`:

- `POST /api/aggregate/create-service` - Create a new service
- `POST /api/aggregate/update-service` - Update an existing service
- `POST /api/aggregate/add-aggregate-step` - Create a step (edge connection)
- `POST /api/aggregate/create-aggregate` - Create an aggregate
- `POST /api/aggregate/update-aggregate` - Update an aggregate
- `GET /api/aggregate/get-aggregates` - Get all aggregates
- `GET /api/aggregate/get-aggregate/:id` - Get single aggregate with steps

## Key Integration Points

### 1. Loading Aggregates on Mount

**Location:** `src/components/AppFlow.vue`

```javascript
onMounted(async () => {
  // ... theme setup ...
  await store.loadAggregates()  // Fetches aggregates and converts to nodes/edges
})
```

**Flow:**
1. `loadAggregates()` calls `GET /api/aggregate/get-aggregates`
2. Selects first aggregate (or creates one if none exists)
3. Calls `loadAggregateFlow(aggregateId)` to fetch full aggregate data
4. Converts aggregate steps and services to VueFlow nodes and edges
5. Updates `nodes` and `edges` reactive refs

### 2. Adding a New Service Node

**Location:** `src/components/AppFlow.vue` → `onAddService()`

```javascript
async function onAddService() {
  const position = { x: 200 + Math.random() * 60, y: 150 + Math.random() * 60 }
  try {
    const newNode = await store.addNode({
      position,
      label: 'سرویس ' + (store.nodes.length + 1),
      serviceName: 'سرویس ' + (store.nodes.length + 1),
      url: '',
      method: 'GET',
      type: 'REST',
      fields: [],
    })
    store.setSelectedNode(newNode.id, 'edit')
  } catch (error) {
    // Error handling
  }
}
```

**Flow:**
1. User clicks "Add Service" button
2. `store.addNode()` is called
3. `ensureAggregate()` ensures an aggregate exists (creates one if needed)
4. `POST /api/flow/create-service` is called with service data
5. Node is added to VueFlow with backend-generated `serviceId`
6. Modal opens for editing

### 3. Connecting Nodes (Creating Edges/Steps)

**Location:** `src/components/AppFlow.vue` → `onConnect()`

```javascript
function onConnect(evt) {
  store.handleConnect(evt)  // Async function that calls backend
}
```

**Flow in `handleConnect()`:**
1. Validates source and target nodes exist
2. Ensures aggregate exists
3. Finds source step ID (if edge has a source)
4. Calls `POST /api/aggregate/add-aggregate-step` with:
   ```javascript
   {
     aggregateId: currentAggregateId.value,
     serviceId: targetNode.data.serviceId,
     nextStepId: null,
     sourceStepId: sourceStepId || null,
     condition: ''
   }
   ```
5. Creates edge in VueFlow with `aggregateStepId` in edge.data
6. Edge appears in the flow diagram

### 4. Updating a Service Node

**Location:** `src/components/modals/ServiceModal.vue` → `save()`

```javascript
async function save() {
  if (!node.value) return
  const id = node.value.id
  await store.updateNode(id, {
    data: {
      label: local.label,
      serviceName: local.serviceName,
      url: local.url || node.value.data.url || '',
      method: local.method || node.value.data.method || 'GET',
      type: local.type || node.value.data.type || 'REST',
      status: node.value.data.status !== undefined ? node.value.data.status : true,
      fields: local.fields,
    },
  })
  store.clearSelected()
}
```

**Flow in `updateNode()`:**
1. Finds node in store
2. If node has `serviceId`, calls `POST /api/aggregate/update-service` with:
   ```javascript
   {
     id: node.data.serviceId,
     name: updatedData.serviceName,
     url: updatedData.url,
     method: updatedData.method,
     type: updatedData.type,
     status: updatedData.status
   }
   ```
3. Updates local node data
4. VueFlow reactively updates the UI

### 5. Updating an Edge (Step)

**Location:** `src/components/AppFlow.vue` → `onEdgesChange()`

```javascript
async function onEdgesChange(changes) {
  for (const change of changes) {
    if (change.type === 'remove') {
      await store.deleteEdge(change.id)
    } else if (change.type === 'update') {
      await store.updateEdge(change.id, change.data || {})
    }
  }
}
```

**Flow in `updateEdge()`:**
1. Finds edge by ID
2. Extracts source and target nodes
3. Finds related step IDs (sourceStepId, nextStepId)
4. Calls `POST /api/aggregate/update-aggregate-step` with:
   ```javascript
   {
     id: edge.data.aggregateStepId,
     aggregateId: edge.data.aggregateId,
     serviceId: targetNode.data.serviceId,
     nextStepId: nextStepId || null,
     sourceStepId: sourceStepId || null,
     condition: updates.condition || edge.data.condition,
     status: updates.status !== undefined ? updates.status : true
   }
   ```
5. Updates edge.data with new values

### 6. Deleting a Node (Service)

**Location:** `src/stores/flowStore.js` → `deleteNode()`

```javascript
async function deleteNode(nodeId) {
  const node = nodes.value.find((n) => n.id === nodeId)
  
  if (node && node.data.serviceId) {
    await serviceAggregatorClient.deleteService(node.data.serviceId)
  }
  
  // Remove from UI
  nodes.value = nodes.value.filter((n) => n.id !== nodeId)
  edges.value = edges.value.filter((e => e.source !== nodeId && e.target !== nodeId))
}
```

### 7. Deleting an Edge (Step)

**Location:** `src/stores/flowStore.js` → `deleteEdge()`

```javascript
async function deleteEdge(edgeId) {
  const edge = edges.value.find(e => e.id === edgeId)
  
  if (edge && edge.data.aggregateStepId) {
    await serviceAggregatorClient.deleteAggregateStep(edge.data.aggregateStepId)
  }
  
  edges.value = edges.value.filter(e => e.id !== edgeId)
}
```

## Data Structure

### Node Data Structure
```javascript
{
  id: 'node-uuid',              // VueFlow node ID
  type: 'serviceNode',
  position: { x: 100, y: 100 },
  data: {
    id: 'node-uuid',
    serviceId: 'backend-service-id',  // Backend service UUID
    aggregateId: 'aggregate-uuid',   // Backend aggregate UUID
    label: 'Service Name',
    serviceName: 'Service Name',
    url: 'https://api.example.com',
    method: 'POST',
    type: 'REST',
    status: true,
    fields: []
  }
}
```

### Edge Data Structure
```javascript
{
  id: 'edge-uuid',
  source: 'node-source-id',
  target: 'node-target-id',
  animated: true,
  type: 'default',
  data: {
    aggregateStepId: 'backend-step-id',  // Backend step UUID
    aggregateId: 'aggregate-uuid',
    condition: 'status === "success"',
    mappings: []  // Array of mapping objects
  }
}
```

## Error Handling

All API calls are wrapped in try-catch blocks with user notifications:

```javascript
try {
  await serviceAggregatorClient.createService(data)
  notify({ title: 'موفق', text: 'سرویس ایجاد شد', type: 'success' })
} catch (error) {
  console.error('Failed to create service:', error)
  notify({ title: 'خطا', text: 'خطا در ایجاد سرویس', type: 'error' })
}
```

## State Synchronization

The store maintains consistency between UI and backend:

1. **Optimistic Updates**: UI updates immediately for better UX
2. **Backend Sync**: API calls happen asynchronously
3. **Error Rollback**: On error, UI can revert or show error state
4. **Reactive Updates**: Vue 3 reactivity ensures UI stays in sync

## Example: Complete Flow

1. **Page Load:**
   - `loadAggregates()` → Fetches aggregates → Converts to nodes/edges → Renders in VueFlow

2. **Add Service:**
   - User clicks "Add Service" → `onAddService()` → `addNode()` → `POST /api/aggregate/create-service` → Node appears

3. **Connect Services:**
   - User drags from node A to node B → `onConnect()` → `handleConnect()` → `POST /api/aggregate/add-aggregate-step` → Edge appears

4. **Edit Service:**
   - User double-clicks node → Modal opens → User edits → `save()` → `updateNode()` → `POST /api/aggregate/update-service` → Node updates

5. **Delete Service:**
   - User deletes node → `deleteNode()` → `POST /api/aggregate/delete-service` → Node removed from UI

## Testing

To test the integration:

1. Open browser DevTools → Network tab
2. Perform actions (add node, connect, update, delete)
3. Verify API calls are made to `/api/flow/*` endpoints
4. Check request/response payloads match expected format
5. Verify UI updates correctly after API responses

## Troubleshooting

**Issue:** Nodes/edges not loading on mount
- Check browser console for API errors
- Verify backend is running at `http://192.168.140.172:8099`
- Check authentication token is valid

**Issue:** Changes not saving
- Check Network tab for failed API calls
- Verify request payload format matches backend expectations
- Check backend error responses

**Issue:** UI out of sync with backend
- Refresh page to reload from backend
- Check if API calls are completing successfully
- Verify error handling is working correctly

