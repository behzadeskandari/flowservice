export function mergeFields(fieldsA = [], fieldsB = []) {
  // Keep order: A fields then B fields. If keys clash, suffix B keys with _b (simple strategy).
  const seen = new Set()
  const merged = []

  fieldsA.forEach((f) => {
    merged.push({ ...f })
    seen.add(f.key)
  })

  fieldsB.forEach((f) => {
    if (!seen.has(f.key)) {
      merged.push({ ...f })
    } else {
      // conflict: create a unique key for B
      const newKey = `${f.key}_b`
      merged.push({ ...f, key: newKey, label: `${f.label} (from B)` })
    }
  })

  return {
    serviceA: fieldsA.map((f) => ({ ...f })),
    serviceB: fieldsB.map((f) => ({ ...f })),
    merged,
  }
}
