let counter = 0

export function uniqueId(prefix = 'id') {
  counter++
  return `${prefix}-${Date.now()}-${counter}`
}
