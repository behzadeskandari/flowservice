// export function mergeFields(fieldsA = [], fieldsB = []) {
//   // Keep order: A fields then B fields. If keys clash, suffix B keys with _b (simple strategy).
//   const seen = new Set()
//   const merged = []

//   fieldsA.forEach((f) => {
//     merged.push({ ...f })
//     seen.add(f.key)
//   })

//   fieldsB.forEach((f) => {
//     if (!seen.has(f.key)) {
//       merged.push({ ...f })
//     } else {
//       // conflict: create a unique key for B
//       const newKey = `${f.key}_b`
//       merged.push({ ...f, key: newKey, label: `${f.label} (from B)` })
//     }
//   })

//   return {
//     serviceA: fieldsA.map((f) => ({ ...f })),
//     serviceB: fieldsB.map((f) => ({ ...f })),
//     merged,
//   }
// }


const suffixes = ['_b', '_c', '_d', '_e', '_f', '_g', '_h', '_i', '_j'];

export function mergeNFields(...servicesFields) {
  // servicesFields: array of arrays of fields, e.g. [fieldsA, fieldsB, fieldsC, ...]

  const merged = [];
  const seen = new Set(); // track keys to detect conflicts

  // Store copy of each service fields to return as well
  const servicesCopy = servicesFields.map(fields => fields.map(f => ({ ...f })));

  servicesFields.forEach((fields, index) => {
    const suffix = index === 0 ? '' : (suffixes[index - 1] || `_x${index}`); // suffix for keys (no suffix for first service)

    fields.forEach(field => {
      if (!seen.has(field.key)) {
        merged.push({ ...field }); // no conflict, add as is
        seen.add(field.key);
      } else {
        // conflict: create a new key with suffix for this service
        const newKey = `${field.key}${suffix}`;
        merged.push({
          ...field,
          key: newKey,
          label: `${field.label} (from service ${index + 1})`
        });
      }
    });
  });

  // Return object with original fields per service plus merged
  return {
    services: servicesCopy,
    merged,
  };
}
