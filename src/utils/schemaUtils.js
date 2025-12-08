
/**
 * Merges fields from multiple services
 * Ensures no duplicate keys - if a key appears in multiple services, it gets a suffix
 * @param {Array}fieldsA fieldsB , - Variable number of field arrays, one per service
  *@param {Array}fieldsB fieldsA , - Variable number of field arrays, one per service
 * @returns {Object} Object with 'services' (array of serviceA field  serviceB field) and 'merged' (merged fields array)
 */
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


const suffixes = ['_b', '_c', '_d', '_e', '_f', '_g', '_h', '_i', '_j', '_k', '_l', '_m', '_n', '_o', '_p'];

/**
 * Merges fields from multiple services
 * Ensures no duplicate keys - if a key appears in multiple services, it gets a suffix
 * @param {...Array} servicesFields - Variable number of field arrays, one per service
 * @returns {Object} Object with 'services' (array of original field arrays) and 'merged' (merged fields array)
 */
export function mergeNFields(...servicesFields) {
  // servicesFields: array of arrays of fields, e.g. [fieldsA, fieldsB, fieldsC, ...]
  if (servicesFields.length === 0) {
    return {
      services: [],
      merged: [],
    }
  }

  const merged = [];
  const seen = new Set(); // track keys to detect conflicts and ensure no duplicates

  // Store copy of each service fields to return as well
  const servicesCopy = servicesFields.map(fields =>
    Array.isArray(fields) ? fields.map(f => ({ ...f })) : []
  );

  servicesFields.forEach((fields, index) => {
    if (!Array.isArray(fields)) {
      console.warn(`Service ${index} fields is not an array, skipping`)
      return
    }

    const suffix = index === 0 ? '' : (suffixes[index - 1] || `_x${index}`); // suffix for keys (no suffix for first service)

    fields.forEach(field => {
      if (!field || !field.key) {
        console.warn(`Invalid field in service ${index}, skipping`)
        return
      }

      if (!seen.has(field.key)) {
        // No conflict - add field as is
        merged.push({ ...field });
        seen.add(field.key);
      } else {
        // Conflict detected - create a new key with suffix for this service
        const newKey = `${field.key}${suffix}`;
        // Ensure the new key is also unique
        let finalKey = newKey;
        let counter = 1;
        while (seen.has(finalKey)) {
          finalKey = `${newKey}_${counter}`;
          counter++;
        }

        merged.push({
          ...field,
          key: finalKey,
          label: `${field.label} (from service ${index + 1})`
        });
        seen.add(finalKey);
      }
    });
  });

  // Return object with original fields per service plus merged
  return {
    services: servicesCopy,
    merged,
  };
}

/**
 * Merges two service node objects into one, merging their data.fields, positions, and labels.
 * - Both nodes must have .data.fields (arrays of fields)
 * - The merged node combines fields via mergeFields, averages position, and merges originalLabels
 * - The label is joined as 'labelA + labelB'
 */
export function mergeServiceNodes(nodeA, nodeB) {
  if (!nodeA || !nodeB || !nodeA.data || !nodeB.data) throw new Error('Both nodes must have .data');

  // Merge fields with conflict-resolving logic
  const mergedFieldsObj = mergeFields(nodeA.data.fields || [], nodeB.data.fields || []);

  // Combine originalLabels
  const originalLabels = Array.from(
    new Set([
      ...(nodeA.data.originalLabels || [nodeA.data.label || nodeA.label]),
      ...(nodeB.data.originalLabels || [nodeB.data.label || nodeB.label]),
    ])
  );

  // Average position
  const posA = nodeA.position || { x: 100, y: 100 };
  const posB = nodeB.position || { x: 100, y: 100 };
  const position = {
    x: Math.round((posA.x + posB.x) / 2),
    y: Math.round((posA.y + posB.y) / 2),
  };

  // Merge/compose label
  const label = originalLabels.join(' + ');

  // Merge ids (mark new, leave id generation to caller)
  return {
    ...nodeA, // carry over any custom properties
    type: 'serviceNode',
    position,
    data: {
      ...nodeA.data,
      label,
      originalLabels,
      fields: mergedFieldsObj.merged,
    },
  };
}
