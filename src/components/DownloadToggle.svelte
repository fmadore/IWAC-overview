<script lang="ts">
    import { onMount } from 'svelte';
    import { t } from '../stores/translationStore';
    
    // Function to download the current visualization
    function downloadVisualization() {
        // Get the SVG element from the document
        const svg = document.querySelector('.visualization-content svg');
        
        if (!svg) {
            console.error('No SVG found to download');
            return;
        }
        
        try {
            // Clone the SVG to avoid modifying the original
            const clonedSvg = svg.cloneNode(true) as SVGElement;
            
            // Get visualization title
            const titleElement = document.querySelector('.visualization-header h2');
            let title = '';
            
            if (titleElement) {
                // Handle potential HTML in title (like <i> tags)
                title = titleElement.textContent?.trim() || '';
                
                // Use innerText as a fallback which handles HTML better
                if (!title) {
                    // Cast to HTMLElement which has innerText property
                    title = (titleElement as HTMLElement).innerText?.trim() || '';
                }
                
                // If there's still HTML, create a temporary div to extract plain text
                if (title.includes('<') && title.includes('>')) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = (titleElement as HTMLElement).innerHTML;
                    title = tempDiv.textContent?.trim() || '';
                }
            }
            
            // Add CSS styles inline to the SVG 
            inlineStyles(clonedSvg);
            
            // Add title to the SVG if it exists
            if (title) {
                addTitleToSvg(clonedSvg, title);
            }
            
            // Serialize the SVG to a string
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(clonedSvg);
            
            // Create a blob URL
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            
            // Create a download link and trigger click
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            
            // Use both the visualization title and tab name for the filename
            const tabElement = document.querySelector('.tab-item.active');
            const tabName = tabElement ? tabElement.textContent?.trim() : 'visualization';
            
            // Sanitize the title for use in filename
            const sanitizedTitle = sanitizeFilename(title || tabName || 'visualization');
            const fileName = `iwac-${sanitizedTitle}`;
            
            downloadLink.download = `${fileName}.svg`;
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            // Clean up
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading visualization:', error);
        }
    }
    
    // Helper function to inline styles for the SVG
    function inlineStyles(svg: SVGElement) {
        // Get all stylesheets from the document
        const styleSheets = Array.from(document.styleSheets);
        
        // Create a style element to add to the SVG
        const svgStyle = document.createElement('style');
        
        // Collect CSS rules from all stylesheets
        let cssRules = '';
        styleSheets.forEach(sheet => {
            try {
                // Type assertion to access cssRules
                const rules = sheet.cssRules || (sheet as any).rules;
                
                if (rules) {
                    for (let i = 0; i < rules.length; i++) {
                        const rule = rules[i];
                        // Only add rules that could apply to SVG elements
                        if (rule instanceof CSSStyleRule) {
                            const selector = rule.selectorText;
                            if (selector && (
                                selector.includes('svg') || 
                                selector.includes('g') || 
                                selector.includes('path') || 
                                selector.includes('rect') || 
                                selector.includes('circle') || 
                                selector.includes('text') || 
                                selector.includes('line')
                            )) {
                                cssRules += rule.cssText + '\n';
                            }
                        }
                    }
                }
            } catch (e) {
                // Skip cross-origin stylesheets
                console.warn('Could not access stylesheet rules', e);
            }
        });
        
        // Add CSS variables for proper styling
        cssRules += `
            :root {
                --color-primary: ${getComputedStyle(document.documentElement).getPropertyValue('--color-primary')};
                --color-primary-dark: ${getComputedStyle(document.documentElement).getPropertyValue('--color-primary-dark')};
                --color-primary-300: ${getComputedStyle(document.documentElement).getPropertyValue('--color-primary-300')};
                --color-text-light: ${getComputedStyle(document.documentElement).getPropertyValue('--color-text-light')};
                --color-text-dark: ${getComputedStyle(document.documentElement).getPropertyValue('--color-text-dark')};
            }
        `;
        
        // Set the style content
        svgStyle.textContent = cssRules;
        
        // Add the style to the SVG
        if (svg.firstChild) {
            svg.insertBefore(svgStyle, svg.firstChild);
        } else {
            svg.appendChild(svgStyle);
        }
        
        // Add specific attributes for better rendering
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('version', '1.1');
        svg.setAttribute('width', svg.getAttribute('width') || '800');
        svg.setAttribute('height', svg.getAttribute('height') || '600');
    }
    
    // Helper function to add a title to the SVG
    function addTitleToSvg(svg: SVGElement, title: string) {
        // Create a title element for the SVG (this is for accessibility)
        const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        titleElement.textContent = title;
        
        // Add the title as the first element in the SVG
        if (svg.firstChild) {
            svg.insertBefore(titleElement, svg.firstChild);
        } else {
            svg.appendChild(titleElement);
        }
        
        // Calculate SVG dimensions
        const width = parseInt(svg.getAttribute('width') || '800');
        const height = parseInt(svg.getAttribute('height') || '600');
        
        // Add a visible title text at the top of the SVG
        const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textElement.setAttribute('x', (width / 2).toString());
        textElement.setAttribute('y', '24');
        textElement.setAttribute('text-anchor', 'middle');
        textElement.setAttribute('font-family', 'Arial, sans-serif');
        textElement.setAttribute('font-size', '16px');
        textElement.setAttribute('font-weight', 'bold');
        textElement.setAttribute('fill', 'var(--color-primary, #333)');
        textElement.textContent = title;
        
        // Add the text to the SVG
        svg.appendChild(textElement);
    }
    
    // Helper function to sanitize a string for use as a filename
    function sanitizeFilename(name: string): string {
        // Replace invalid filename characters with a dash
        let sanitized = name.toLowerCase()
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-') // Remove invalid filename chars
            .replace(/\s+/g, '-')                   // Replace spaces with dashes
            .replace(/&/g, 'and')                   // Replace ampersand with 'and'
            .replace(/--+/g, '-')                   // Collapse multiple dashes to single dash
            .replace(/^-+|-+$/g, '');               // Remove leading/trailing dashes
            
        // Trim the length to avoid too long filenames
        if (sanitized.length > 50) {
            sanitized = sanitized.substring(0, 50);
        }
        
        // Ensure we don't end with a dash
        return sanitized.replace(/-+$/g, '');
    }
</script>

<button 
    class="btn btn-primary btn-icon"
    on:click={downloadVisualization} 
    title={t('ui.download_visualization')}
    aria-label={t('ui.download_visualization')}
>
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
</button>

<style>
    /* Button styling */
    :global(.btn.btn-primary) {
        background-color: var(--color-primary);
        color: var(--color-text-light);
    }
    
    :global(.btn.btn-primary:hover) {
        background-color: var(--color-primary-dark);
    }
    
    :global(.btn.btn-primary:focus) {
        outline: none;
        box-shadow: 0 0 0 2px var(--color-primary-300);
    }
    
    :global(.btn-icon) {
        min-width: 36px;
        min-height: 36px;
    }
    
    /* Only keep styles that can't be achieved with utility classes */
    svg {
        display: block;
    }
    
    /* Mobile optimizations */
    @media (max-width: 768px) {
        :global(.btn-icon) {
            min-width: 42px;
            min-height: 42px;
            padding: var(--spacing-sm);
        }
    }
</style> 