// src/policies/profileUpdate/engine.js
// Build a consolidated allowed patch by running pure rules that return patch objects.
// The engine is generic and does not import or know about specific rules.
export function buildAllowedPatch({ payload, perms, PERMISSIONS, rules }) {
  // Normalize perms to a Set for O(1) checks
  const permSet = perms instanceof Set ? perms : new Set(perms || []);

  const ctx = {
    payload: payload || {},
    permSet,
    PERMISSIONS,
  };

  const allowed = {};

  // Deep-merge helper: merges plain objects, replaces arrays and primitives.
  const deepMerge = (target, patch) => {
    if (!patch || typeof patch !== "object") return target;
    for (const [k, v] of Object.entries(patch)) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        target[k] = deepMerge(target[k] || {}, v);
      } else {
        target[k] = v;
      }
    }
    return target;
  };

  for (const rule of rules) {
    const patch = rule(ctx);
    deepMerge(allowed, patch);
  }

  return allowed;
}
