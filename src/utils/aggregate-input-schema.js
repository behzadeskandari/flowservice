/**
 * Aggregate Input Schema Utilities
 *
 * Defines the data model and validation helpers for the Aggregate input
 * schema metadata. This schema describes the contract of an Aggregate's
 * input JSON: every field's name, data type, required/optional status,
 * description, and nested structure.
 *
 * This is distinct from the runtime input JSON payload: the runtime JSON
 * contains values, while this schema declares the contract the values must
 * conform to. Neither is inserted into the other.
 *
 * Field data types are intentionally the same set the Aggregate input UI
 * supports. Each field definition mirrors the UI's type picker.
 */

export const AGGREGATE_INPUT_TYPES = Object.freeze({
  String: 'String',
  Integer: 'Integer',
  Double: 'Double',
  Decimal: 'Double', // alias kept for UI compat
  Boolean: 'Boolean',
  Object: 'Object',
  Array: 'Array',
  Date: 'Date',
  DateTime: 'DateTime',
})

/**
 * The set of data types the Aggregate input schema supports.
 * `Double` is used for floating point numbers; `Decimal` is an alias.
 */
export const AGGREGATE_INPUT_TYPE_VALUES = Object.values(AGGREGATE_INPUT_TYPES)

/** Default field definition with all required metadata. */
export function createFieldSchema({
  name = '',
  dataType = 'String',
  isRequired = false,
  description = '',
  children = [],
  parent = null,
} = {}) {
  return {
    name,
    dataType,
    isRequired,
    description,
    children,
    parent,
  }
}

/**
 * Validate a single field definition.
 * Returns an array of error strings (empty if valid).
 */
export function validateFieldSchema(field) {
  const errors = []

  if (field === null || typeof field !== 'object') {
    return ['Field definition must be an object']
  }

  if (field.name === undefined || field.name === null || typeof field.name !== 'string') {
    errors.push('Field "name" must be a non-empty string')
  } else if (field.name.trim() === '') {
    errors.push('Field "name" must not be empty')
  }

  if (
    field.dataType === undefined ||
    typeof field.dataType !== 'string' ||
    !AGGREGATE_INPUT_TYPE_VALUES.includes(field.dataType)
  ) {
    errors.push(`Field "dataType" must be one of ${AGGREGATE_INPUT_TYPE_VALUES.join(', ')}`)
  }

  if (typeof field.isRequired !== 'boolean') {
    errors.push('Field "isRequired" must be a boolean')
  }

  if (
    field.description !== undefined &&
    field.description !== null &&
    typeof field.description !== 'string'
  ) {
    errors.push('Field "description" must be a string')
  }

  if (field.children !== undefined && field.children !== null && !Array.isArray(field.children)) {
    errors.push('Field "children" must be an array')
  }

  return errors
}

/**
 * Create a schema from an existing runtime input JSON object.
 * Infers field names and data types from the JSON.
 * Nested objects/arrays become Object/Array fields with children inferred
 * recursively. This is used for backward compatibility with Aggregates that
 * have an input JSON but no persisted schema.
 */
export function schemaFromInputJson(value, parentPath = '') {
  const fields = []

  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    // Root is a scalar; represent it as a single unnamed String field.
    fields.push(createFieldSchema({ name: 'value', dataType: 'String' }))
    return fields
  }

  for (const [key, val] of Object.entries(value)) {
    const path = parentPath ? `${parentPath}.${key}` : key
    fields.push(schemaFieldFromValue(key, val, path))
  }

  return fields
}

/**
 * Infer a field definition from a JSON value's runtime type.
 */
function schemaFieldFromValue(name, value, path) {
  let dataType
  const children = []

  if (value === null) {
    dataType = 'String'
  } else if (typeof value === 'string') {
    dataType = 'String'
  } else if (typeof value === 'number') {
    dataType = Number.isInteger(value) ? 'Integer' : 'Double'
  } else if (typeof value === 'boolean') {
    dataType = 'Boolean'
  } else if (Array.isArray(value)) {
    dataType = 'Array'
    if (value.length > 0) {
      children.push(...schemaFieldFromValue('item', value[0], `${path}[0]`))
    }
  } else if (typeof value === 'object') {
    dataType = 'Object'
    children.push(...schemaFromInputJson(value, path))
  } else {
    dataType = 'String'
  }

  return createFieldSchema({
    name,
    dataType,
    isRequired: false,
    description: '',
    children,
    parent: null,
  })
}
