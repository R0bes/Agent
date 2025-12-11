/**
 * Component Registry
 * 
 * Re-exports registry functions from legacy for backward compatibility
 * These functions are still used by non-legacy components
 */

export {
  registerComponent,
  getComponent,
  getAllComponents,
  getServices,
  getTools,
  getToolByName,
  getSources,
  getSourceById,
  getSourceByKind,
  getAllToolsWithStatus,
  shutdownAll
} from "../legacy/components/registry";

