/**
 * Serialization, deserialization, and merging utilities for the
 * Aggregate input schema. These functions handle conversion between the
 * in-memory field definition objects and plain JSON objects, plus
 * merging of partial schema updates so a full schema is never lost when
 * only some fields change.
 */

import {
  createFieldSchema,
  AGGREGATE_INPUT_TYPE_VALUES,
  validateFieldSchema,
  schemaFromInputJson,
} from './aggregate-input-schema'

/**
 * Convert a field schema back to a plain JSON-serializable object.
 * Used when persisting to the backend.
 */
export function serializeFieldSchema(field) {
  const { parent, ...rest } = field
  return {
    name: field.name,
    dataType: field.dataType,
    isRequired: field.isRequired,
    description: field.description ?? '',
    children: (field.children || []).map(serializeFieldSchema),
  }
}

/**
 * Convert a plain JSON object (as sent by the backend) into a field
 * definition. Accepts both the serialized form and the original runtime
 * JSON (for backward compatibility), returning an inferred schema view.
 */
export function deserializeFieldSchema(payload, path = '') {
  // If the payload looks like a runtime JSON value, derive the schema.
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return { fields: schemaFromInputJson(payload), version: 1 }
  }

  // If the payload is the top-level schema object.
  if (payload.version !== undefined && Array.isArray(payload.fields)) {
    const fields = payload.fields.map((f, i) => {
      const field = deserializeFieldSchema(f, `${path}.fields[${i}]`)
      return field
    })
    return { fields, version: payload.version }
  }

  // Otherwise, treat it as a single field definition.
  if (typeof payload === 'object') {
    const children = (payload.children || [])
      .map((c) => deserializeFieldSchema(c, `${path}.children`))
      .map((d) => d.fields)
      .flat()
    return createFieldSchema({
      name: payload.name || '',
      dataType: payload.dataType || 'String',
      isRequired: payload.isRequired !== undefined ? !!payload.isRequired : false,
      description: payload.description ?? '',
      children,
    })
  }

  return createFieldSchema({ name: '', dataType: 'String' })
}

/**
 * Deep-merge two field definitions, preferring the `source` fields but
 * falling back to `default` for missing keys. This is used when a partial
 * schema update arrives (e.g. only updated the `required` flag) and the
 * rest of the schema should be preserved.
 */
export function mergeFieldSchemas(defaultField, sourceField) {
  if (!sourceField || typeof sourceField !== 'object') {
    return serializeFieldSchema(defaultField)
  }

  const children =
    Array.isArray(sourceField.children) && sourceField.children.length > 0
      ? sourceField.children.map((c) => serializeFieldSchema(c))
      : (defaultField.children || []).map(serializeFieldSchema)

  return createFieldSchema({
    name: sourceField.name !== undefined ? sourceField.name : defaultField.name,
    dataType: sourceField.dataType !== undefined ? sourceField.dataType : defaultField.dataType,
    isRequired:
      sourceField.isRequired !== undefined ? !!sourceField.isRequired : !!defaultField.isRequired,
    description:
      sourceField.description !== undefined ? sourceField.description : defaultField.description,
    children,
  })
}

/**
 * Validate the top-level aggregate input schema.
 * Returns an array of error strings (empty if valid).
 */
export function validateAggregateInputSchema(schema) {
  const errors = []

  if (schema === null || typeof schema !== 'object') {
    return ['Schema must be an object']
  }

  if (schema.version === undefined || schema.version === null) {
    errors.push('Schema "version" is required')
  } else if (typeof schema.version !== 'number') {
    errors.push('Schema "version" must be a number')
  }

  if (!Array.isArray(schema.fields)) {
    errors.push('Schema "fields" must be an array')
  } else {
    schema.fields.forEach((field, index) => {
      const fieldErrors = validateFieldSchema(field)
      if (fieldErrors.length > 0) {
        errors.push(`Field ${index}: ${fieldErrors.join('; ')}`)
      }
    })
  }

  return errors
}
