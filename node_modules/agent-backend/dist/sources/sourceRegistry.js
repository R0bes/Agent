const adapters = new Map();
export function registerSourceAdapter(adapter) {
    const key = `${adapter.kind}`;
    adapters.set(key, adapter);
}
export function getSourceAdapter(kind) {
    return adapters.get(kind);
}
/**
 * Helper to build a simple SourceDescriptor.
 */
export function makeSourceDescriptor(kind, id, label, meta) {
    return { kind, id, label, meta };
}
