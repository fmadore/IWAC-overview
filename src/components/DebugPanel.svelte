<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { dumpLogs, exportLogs, logDebug } from '../utils/debug';
    
    const COMPONENT_ID = 'DebugPanel';
    let visible = false;
    let logs = [];
    let filterText = '';
    let filterComponent = '';
    let autoRefresh = false;
    let refreshInterval;
    
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
            refreshInterval = setInterval(refreshLogs, 1000);
            logDebug(COMPONENT_ID, 'Auto-refresh enabled');
        } else {
            clearInterval(refreshInterval);
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
        const handleKeyDown = (e) => {
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
    class="debug-toggle" 
    on:click={toggleVisibility} 
    on:keydown={(e) => e.key === 'Enter' && toggleVisibility()}
    role="button"
    tabindex="0"
    title="Toggle Debug Panel (Ctrl+Shift+D)"
>
    🐞
</div>

{#if visible}
<div class="debug-panel">
    <div class="debug-header">
        <h2>IWAC Debug Panel</h2>
        <div class="debug-controls">
            <button on:click={refreshLogs} title="Refresh Logs">🔄</button>
            <button on:click={toggleAutoRefresh} class:active={autoRefresh} title="Auto Refresh">
                {autoRefresh ? '⏸️' : '▶️'}
            </button>
            <button on:click={downloadLogs} title="Download Logs">💾</button>
            <button on:click={clearLogs} title="Clear Logs">🗑️</button>
            <button on:click={toggleVisibility} title="Close">❌</button>
        </div>
    </div>
    
    <div class="debug-filters">
        <input 
            type="text" 
            bind:value={filterText} 
            placeholder="Filter logs..." 
            title="Filter by any text"
        />
        <input 
            type="text" 
            bind:value={filterComponent} 
            placeholder="Filter by component..." 
            title="Filter by component name"
        />
    </div>
    
    <div class="debug-content">
        <div class="log-count">
            Showing {getFilteredLogs().length} of {logs.length} logs
        </div>
        
        <div class="log-list">
            {#each getFilteredLogs().slice().reverse() as log}
                <div class="log-entry">
                    <div class="log-timestamp">{new Date(log.timestamp).toLocaleTimeString()}</div>
                    <div class="log-component">{log.component}</div>
                    <div class="log-action">{log.action}</div>
                    {#if log.details}
                        <div class="log-details">
                            <pre>{JSON.stringify(log.details, null, 2)}</pre>
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
        position: fixed;
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
        cursor: pointer;
        font-size: 20px;
        z-index: 9999;
        user-select: none;
    }
    
    .debug-panel {
        position: fixed;
        bottom: 0;
        right: 0;
        width: 80%;
        height: 70%;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        z-index: 9998;
        display: flex;
        flex-direction: column;
        font-family: monospace;
        border-top-left-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    }
    
    .debug-header {
        padding: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #444;
    }
    
    .debug-header h2 {
        margin: 0;
        font-size: 16px;
    }
    
    .debug-controls {
        display: flex;
        gap: 5px;
    }
    
    .debug-controls button {
        background: transparent;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 16px;
        padding: 5px;
        border-radius: 4px;
    }
    
    .debug-controls button:hover {
        background: rgba(255, 255, 255, 0.1);
    }
    
    .debug-controls button.active {
        background: rgba(0, 255, 0, 0.2);
    }
    
    .debug-filters {
        padding: 10px;
        display: flex;
        gap: 10px;
        border-bottom: 1px solid #444;
    }
    
    .debug-filters input {
        flex: 1;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid #444;
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
    }
    
    .debug-content {
        flex: 1;
        overflow: auto;
        padding: 10px;
        display: flex;
        flex-direction: column;
    }
    
    .log-count {
        font-size: 12px;
        color: #aaa;
        margin-bottom: 10px;
    }
    
    .log-list {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }
    
    .log-entry {
        padding: 5px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.05);
        display: grid;
        grid-template-columns: 100px 120px 1fr;
        gap: 10px;
        align-items: start;
    }
    
    .log-entry:hover {
        background: rgba(255, 255, 255, 0.1);
    }
    
    .log-timestamp {
        color: #aaa;
        font-size: 12px;
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
        border-radius: 4px;
        max-height: 200px;
        overflow: auto;
    }
    
    .log-details pre {
        margin: 0;
        white-space: pre-wrap;
        font-size: 12px;
        color: #aaa;
    }
</style> 