// Debug utility for tracking component lifecycles and reactive statements
// Set to true for development, false for production
export const DEBUG = false;

// Store logs in memory for export
const logHistory: Array<{timestamp: string, component: string, action: string, details?: any}> = [];
const MAX_LOG_HISTORY = 1000; // Limit to prevent memory issues

// Format timestamp for logs
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString();
}

export function logDebug(component: string, action: string, details?: any): void {
  const timestamp = getTimestamp();
  const logEntry = { timestamp, component, action, details };
  
  // Add to history
  logHistory.push(logEntry);
  if (logHistory.length > MAX_LOG_HISTORY) {
    logHistory.shift(); // Remove oldest entry
  }
  
  if (DEBUG) {
    const message = `[${timestamp}] [${component}] ${action}`;
    if (details !== undefined) {
      console.log(message, details);
    } else {
      console.log(message);
    }
  }
}

// Track mounted components to help debug orphaned effects
const mountedComponents = new Set<string>();
// Track component hierarchy
const componentHierarchy: Record<string, string[]> = {};

export function trackMount(componentId: string, parentId?: string): void {
  if (DEBUG) {
    mountedComponents.add(componentId);
    
    // Track parent-child relationship if provided
    if (parentId) {
      if (!componentHierarchy[parentId]) {
        componentHierarchy[parentId] = [];
      }
      componentHierarchy[parentId].push(componentId);
    }
    
    logDebug('DEBUG', `Component mounted: ${componentId}`, { 
      total: mountedComponents.size, 
      all: Array.from(mountedComponents),
      parent: parentId || 'none'
    });
  }
}

export function trackUnmount(componentId: string): void {
  if (DEBUG) {
    mountedComponents.delete(componentId);
    
    // Remove from hierarchy
    Object.keys(componentHierarchy).forEach(parentId => {
      const index = componentHierarchy[parentId].indexOf(componentId);
      if (index !== -1) {
        componentHierarchy[parentId].splice(index, 1);
      }
    });
    
    // Remove any children this component might have had
    delete componentHierarchy[componentId];
    
    logDebug('DEBUG', `Component unmounted: ${componentId}`, { 
      total: mountedComponents.size, 
      all: Array.from(mountedComponents),
      hierarchy: componentHierarchy
    });
  }
}

// For tracking reactive statements
export function trackReactive(componentId: string, statementId: string, value: any): void {
  if (DEBUG) {
    logDebug('DEBUG', `Reactive statement in ${componentId}: ${statementId}`, value);
  }
}

// Export logs to console in a more readable format
export function dumpLogs(): void {
  console.group('IWAC Debug Logs');
  logHistory.forEach(entry => {
    console.groupCollapsed(`${entry.timestamp} - ${entry.component} - ${entry.action}`);
    console.log('Component:', entry.component);
    console.log('Action:', entry.action);
    if (entry.details) console.log('Details:', entry.details);
    console.groupEnd();
  });
  console.groupEnd();
}

// Export logs as JSON string that can be saved to a file
export function exportLogs(): string {
  return JSON.stringify(logHistory, null, 2);
}

// Add to window for easy access from browser console
if (typeof window !== 'undefined') {
  (window as any).__IWAC_DEBUG = {
    logs: logHistory,
    dumpLogs,
    exportLogs,
    mountedComponents: () => Array.from(mountedComponents),
    hierarchy: componentHierarchy
  };
} 