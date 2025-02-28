// Debug utility for tracking component lifecycles and reactive statements
export const DEBUG = true;

export function logDebug(component: string, action: string, details?: any): void {
  if (DEBUG) {
    const message = `[${component}] ${action}`;
    if (details !== undefined) {
      console.log(message, details);
    } else {
      console.log(message);
    }
  }
}

// Track mounted components to help debug orphaned effects
const mountedComponents = new Set<string>();

export function trackMount(componentId: string): void {
  if (DEBUG) {
    mountedComponents.add(componentId);
    logDebug('DEBUG', `Component mounted: ${componentId}`, 
      { total: mountedComponents.size, all: Array.from(mountedComponents) });
  }
}

export function trackUnmount(componentId: string): void {
  if (DEBUG) {
    mountedComponents.delete(componentId);
    logDebug('DEBUG', `Component unmounted: ${componentId}`, 
      { total: mountedComponents.size, all: Array.from(mountedComponents) });
  }
}

// For tracking reactive statements
export function trackReactive(componentId: string, statementId: string, value: any): void {
  if (DEBUG) {
    logDebug('DEBUG', `Reactive statement in ${componentId}: ${statementId}`, value);
  }
} 