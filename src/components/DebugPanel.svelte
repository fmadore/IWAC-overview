<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { dumpLogs, exportLogs, logDebug } from '../utils/debug';
    
    const COMPONENT_ID = 'DebugPanel';
    let visible = false;
    let logs: any[] = [];
    let filterText = '';
    let filterComponent = '';
    let autoRefresh = false;
    let refreshInterval: number | undefined;
    
    function toggleVisibility() {
        visible = !visible;
        logDebug(COMPONENT_ID, `Debug panel ${visible ? 'shown' : 'hidden'}`);
    }
    
    function refreshLogs() {
        if (typeof window !== 'undefined' && window.__IWAC_DEBUG) {
            logs = [...window.__IWAC_DEBUG.logs];
            logDebug(COMPONENT_ID, `Refreshed logs, count: ${logs.length}`);
        }
    }
    
    function downloadLogs() {
        const logData = typeof window !== 'undefined' && window.__IWAC_DEBUG 
            ? JSON.stringify(window.__IWAC_DEBUG.logs, null, 2)
            : exportLogs();
            
        const blob = new Blob([logData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `iwac-debug-logs-${new Date().toISOString().replace(/:/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        logDebug(COMPONENT_ID, 'Logs downloaded');
    }
    
    function clearLogs() {
        if (typeof window !== 'undefined' && window.__IWAC_DEBUG) {
            window.__IWAC_DEBUG.logs.length = 0;
            refreshLogs();
            logDebug(COMPONENT_ID, 'Logs cleared');
        }
    }
    
    function toggleAutoRefresh() {
        autoRefresh = !autoRefresh;
        
        if (autoRefresh) {
            refreshInterval = window.setInterval(refreshLogs, 1000);
            logDebug(COMPONENT_ID, 'Auto-refresh enabled');
        } else {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
            logDebug(COMPONENT_ID, 'Auto-refresh disabled');
        }
    }
    
    function getFilteredLogs() {
        return logs.filter(log => {
            const matchesText = filterText === '' || 
                JSON.stringify(log).toLowerCase().includes(filterText.toLowerCase());
                
            const matchesComponent = filterComponent === '' || 
                log.component.toLowerCase().includes(filterComponent.toLowerCase());
                
            return matchesText && matchesComponent;
        });
    }
    
    onMount(() => {
        logDebug(COMPONENT_ID, 'Debug panel mounted');
        refreshLogs();
        
        // Add keyboard shortcut (Ctrl+Shift+D) to toggle panel
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                toggleVisibility();
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };
    });
    
    onDestroy(() => {
        logDebug(COMPONENT_ID, 'Debug panel destroyed');
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
    });
</script>

<div 
    class="debug-toggle cursor-pointer z-tooltip fixed" 
    on:click={toggleVisibility} 
    on:keydown={(e) => e.key === 'Enter' && toggleVisibility()}
    role="button"
    tabindex="0"
    title="Toggle Debug Panel (Ctrl+Shift+D)"
>
    🐞
</div>

{#if visible}
<div class="debug-panel fixed z-modal">
    <div class="debug-header flex justify-between items-center border-b">
        <h2 class="m-0 text-lg">IWAC Debug Panel</h2>
        <div class="debug-controls flex gap-xs">
            <button on:click={refreshLogs} title="Refresh Logs" class="cursor-pointer rounded transition">🔄</button>
            <button on:click={toggleAutoRefresh} class="cursor-pointer rounded transition {autoRefresh ? 'active' : ''}" title="Auto Refresh">
                {autoRefresh ? '⏸️' : '▶️'}
            </button>
            <button on:click={downloadLogs} title="Download Logs" class="cursor-pointer rounded transition">💾</button>
            <button on:click={clearLogs} title="Clear Logs" class="cursor-pointer rounded transition">🗑️</button>
            <button on:click={toggleVisibility} title="Close" class="cursor-pointer rounded transition">❌</button>
        </div>
    </div>
    
    <div class="debug-filters flex gap-md border-b">
        <input 
            type="text" 
            bind:value={filterText} 
            placeholder="Filter logs..." 
            title="Filter by any text"
            class="flex-1 rounded"
        />
        <input 
            type="text" 
            bind:value={filterComponent} 
            placeholder="Filter by component..." 
            title="Filter by component name"
            class="flex-1 rounded"
        />
    </div>
    
    <div class="debug-content flex flex-col">
        <div class="log-count text-sm text-tertiary mb-sm">
            Showing {getFilteredLogs().length} of {logs.length} logs
        </div>
        
        <div class="log-list flex flex-col gap-xs">
            {#each getFilteredLogs().slice().reverse() as log}
                <div class="log-entry rounded">
                    <div class="log-timestamp text-tertiary text-xs">{new Date(log.timestamp).toLocaleTimeString()}</div>
                    <div class="log-component">{log.component}</div>
                    <div class="log-action">{log.action}</div>
                    {#if log.details}
                        <div class="log-details rounded mt-xs">
                            <pre class="m-0 text-xs">{JSON.stringify(log.details, null, 2)}</pre>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</div>
{/if}

<style>
    .debug-toggle {
        bottom: 10px;
        right: 10px;
        width: 40px;
        height: 40px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        user-select: none;
    }
    
    .debug-panel {
        bottom: 0;
        right: 0;
        width: 80%;
        height: 70%;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        display: flex;
        flex-direction: column;
        font-family: monospace;
        border-top-left-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    }
    
    .debug-header {
        padding: 10px;
        border-bottom: 1px solid #444;
    }
    
    .debug-controls button {
        background: transparent;
        border: none;
        color: white;
        font-size: 16px;
        padding: 5px;
    }
    
    .debug-controls button:hover {
        background: rgba(255, 255, 255, 0.1);
    }
    
    .debug-controls button.active {
        background: rgba(0, 255, 0, 0.2);
    }
    
    .debug-filters {
        padding: 10px;
        border-bottom: 1px solid #444;
    }
    
    .debug-filters input {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid #444;
        color: white;
        padding: 5px 10px;
    }
    
    .debug-content {
        flex: 1;
        overflow: auto;
        padding: 10px;
    }
    
    .log-entry {
        padding: 5px;
        background: rgba(255, 255, 255, 0.05);
        display: grid;
        grid-template-columns: 100px 120px 1fr;
        gap: 10px;
        align-items: start;
    }
    
    .log-entry:hover {
        background: rgba(255, 255, 255, 0.1);
    }
    
    .log-component {
        color: #6cf;
        font-weight: bold;
    }
    
    .log-action {
        color: #fff;
    }
    
    .log-details {
        grid-column: 1 / span 3;
        margin-top: 5px;
        padding: 5px;
        background: rgba(0, 0, 0, 0.3);
        max-height: 200px;
        overflow: auto;
    }
</style> 