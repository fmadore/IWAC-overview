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
            
            // Fix any visualization-specific styling
            fixVisualizationStyling(clonedSvg);
            
            // Ensure the background is visible when saved
            ensureSvgBackground(clonedSvg);
            
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
        
        // Get computed font styles from the document
        const docStyles = getComputedStyle(document.documentElement);
        const fontFamily = docStyles.getPropertyValue('--font-family-base') || 
                          docStyles.fontFamily || "'Arial', sans-serif";
        
        // Add base font styling for the SVG
        cssRules += `
            svg {
                font-family: ${fontFamily};
                font-size: ${docStyles.fontSize || '14px'};
                line-height: ${docStyles.lineHeight || '1.5'};
            }
        `;
        
        // Collect font face rules
        let fontFaceRules = '';
        
        // Process all stylesheets
        styleSheets.forEach(sheet => {
            try {
                // Type assertion to access cssRules
                const rules = sheet.cssRules || (sheet as any).rules;
                
                if (rules) {
                    for (let i = 0; i < rules.length; i++) {
                        const rule = rules[i];
                        // Include more selectors that might be relevant for graph visualization
                        if (rule instanceof CSSStyleRule) {
                            const selector = rule.selectorText;
                            if (selector && (
                                // SVG elements
                                selector.includes('svg') || 
                                selector.includes('g') || 
                                selector.includes('path') || 
                                selector.includes('rect') || 
                                selector.includes('circle') || 
                                selector.includes('text') || 
                                selector.includes('line') ||
                                selector.includes('polyline') ||
                                selector.includes('polygon') ||
                                // Graph-specific elements likely used in visualizations
                                selector.includes('axis') ||
                                selector.includes('tick') ||
                                selector.includes('label') ||
                                selector.includes('legend') ||
                                selector.includes('chart') ||
                                selector.includes('bar') ||
                                selector.includes('plot') ||
                                selector.includes('point') ||
                                selector.includes('marker') ||
                                selector.includes('grid') ||
                                selector.includes('visualization') ||
                                // Classes typically used for styling graph elements
                                selector.includes('.graph') ||
                                selector.includes('.data') ||
                                selector.includes('.series') ||
                                // D3.js and common visualization library class names
                                selector.includes('.node') ||
                                selector.includes('.link') ||
                                selector.includes('.arc') ||
                                selector.includes('.slice') ||
                                selector.includes('.area') ||
                                selector.includes('.line') ||
                                selector.includes('.dot') ||
                                selector.includes('.bubble') ||
                                selector.includes('.tooltip') ||
                                selector.includes('.domain') ||
                                selector.includes('.tick') ||
                                // Generically include any visualization, chart, or graph related selectors
                                /\b(vis|chart|graph|plot|axis|legend|tooltip)\b/i.test(selector)
                            )) {
                                cssRules += rule.cssText + '\n';
                            }
                        } else if (rule instanceof CSSFontFaceRule) {
                            // Collect all font-face rules to ensure fonts are properly embedded
                            fontFaceRules += rule.cssText + '\n';
                        } else if (rule instanceof CSSImportRule) {
                            // Try to process imported stylesheets if possible
                            try {
                                const importedRules = rule.styleSheet?.cssRules;
                                if (importedRules) {
                                    for (let j = 0; j < importedRules.length; j++) {
                                        if (importedRules[j] instanceof CSSStyleRule) {
                                            const importedSelector = (importedRules[j] as CSSStyleRule).selectorText;
                                            if (importedSelector && (
                                                /\b(svg|g|path|rect|circle|text|line|axis|chart|graph|vis)\b/i.test(importedSelector)
                                            )) {
                                                cssRules += importedRules[j].cssText + '\n';
                                            }
                                        } else if (importedRules[j] instanceof CSSFontFaceRule) {
                                                    fontFaceRules += importedRules[j].cssText + '\n';
                                                }
                                    }
                                }
                            } catch (e) {
                                console.warn('Could not process imported stylesheet', e);
                            }
                        }
                    }
                }
            } catch (e) {
                // Skip cross-origin stylesheets
                console.warn('Could not access stylesheet rules', e);
            }
        });
        
        // Get all CSS variables defined in the document
        let cssVars = ':root {\n';
        const computedStyles = getComputedStyle(document.documentElement);
        
        // Core variables we know are essential
        const essentialVars = [
            '--color-primary',
            '--color-primary-dark',
            '--color-primary-300',
            '--color-text-light',
            '--color-text-dark',
            '--color-bg-page',
            '--font-family-base',
            '--font-size-base',
            '--font-size-sm',
            '--font-size-lg',
            '--font-weight-normal',
            '--font-weight-bold',
            '--spacing-sm',
            '--spacing-md',
            '--spacing-lg',
            '--color-text-primary',
            '--color-border',
            '--color-border-light',
        ];
        
        // Add all essential variables 
        essentialVars.forEach(varName => {
            const value = computedStyles.getPropertyValue(varName);
            if (value) {
                cssVars += `    ${varName}: ${value};\n`;
            }
        });
        
        // Try to find any other CSS variables that might be used in the document
        // This approach scans stylesheet rules for var() usage
        styleSheets.forEach(sheet => {
            try {
                const rules = sheet.cssRules || (sheet as any).rules;
                if (rules) {
                    for (let i = 0; i < rules.length; i++) {
                        if (rules[i] instanceof CSSStyleRule) {
                            const cssText = rules[i].cssText;
                            // Look for var(--something) patterns
                            const varMatches = cssText.match(/var\(--[a-zA-Z0-9_-]+/g);
                            if (varMatches) {
                                varMatches.forEach(match => {
                                    // Extract variable name from var(--name)
                                    const varName = match.substring(4); // Remove "var("
                                    if (!cssVars.includes(varName)) {
                                        const value = computedStyles.getPropertyValue(varName);
                                        if (value) {
                                            cssVars += `    ${varName}: ${value};\n`;
                                        }
                                    }
                                });
                            }
                        }
                    }
                }
            } catch (e) {
                // Skip inaccessible stylesheets
            }
        });
        
        cssVars += '}\n';
        
        // Add all the collected styles
        const finalCss = fontFaceRules + cssVars + cssRules;
        svgStyle.textContent = finalCss;
        
        // Add the style to the SVG
        if (svg.firstChild) {
            svg.insertBefore(svgStyle, svg.firstChild);
        } else {
            svg.appendChild(svgStyle);
        }
        
        // Ensure SVG has the right attributes for standalone rendering
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('version', '1.1');
        svg.setAttribute('width', svg.getAttribute('width') || '800');
        svg.setAttribute('height', svg.getAttribute('height') || '600');
        
        // Ensure fonts are properly embedded
        svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        
        // Ensure background is set if it isn't already
        if (!svg.style.backgroundColor) {
            const bgColor = docStyles.getPropertyValue('--color-bg-page') || '#ffffff';
            svg.style.backgroundColor = bgColor;
        }
        
        // Try to embed web fonts used in the SVG
        embedWebFonts(svg);
    }
    
    // Helper function to embed web fonts in the SVG
    function embedWebFonts(svg: SVGElement) {
        try {
            // Find all potentially used fonts in the SVG
            const svgTextElements = svg.querySelectorAll('text');
            const fontFamilies = new Set<string>();
            
            // Collect all font families used in text elements
            svgTextElements.forEach(text => {
                const fontFamily = text.getAttribute('font-family') || 
                                  window.getComputedStyle(text).fontFamily;
                
                if (fontFamily) {
                    // Split and clean font family names
                    fontFamily.split(',').forEach(font => {
                        const cleanFont = font.trim().replace(/['"]/g, '');
                        if (cleanFont && !cleanFont.includes('serif') && !cleanFont.includes('sans') && 
                            !cleanFont.includes('mono') && !cleanFont.includes('Arial') && 
                            !cleanFont.includes('Helvetica')) {
                            fontFamilies.add(cleanFont);
                        }
                    });
                }
            });
            
            // If we found potential web fonts, try to add them inline if they're from Google Fonts
            if (fontFamilies.size > 0) {
                // Check for Google Fonts in document
                const googleFontsLinks = Array.from(document.querySelectorAll('link'))
                    .filter(link => 
                        link.href && 
                        (link.href.includes('fonts.googleapis.com') || 
                         link.href.includes('fonts.gstatic.com'))
                    );
                
                if (googleFontsLinks.length > 0) {
                    // Add a comment indicating fonts are embedded
                    const fontComment = document.createComment(
                        ` Embedded fonts: ${Array.from(fontFamilies).join(', ')} `
                    );
                    svg.insertBefore(fontComment, svg.firstChild);
                    
                    // Add font links
                    googleFontsLinks.forEach(link => {
                        const fontLink = document.createElementNS('http://www.w3.org/2000/svg', 'style');
                        fontLink.textContent = `@import url('${link.href}');`;
                        svg.insertBefore(fontLink, svg.firstChild);
                    });
                }
            }
        } catch (e) {
            console.warn('Could not embed web fonts:', e);
        }
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
    
    // Helper function to fix specific visualization styling issues
    function fixVisualizationStyling(svg: SVGElement) {
        // Apply a consistent styling to all graph elements
        const allElements = svg.querySelectorAll('*');
        const docStyles = getComputedStyle(document.documentElement);
        
        // Extract font info from document
        const fontFamily = docStyles.getPropertyValue('--font-family-base') || 
                          docStyles.fontFamily || "'Arial', sans-serif";
        
        // Handle text elements
        const textElements = svg.querySelectorAll('text');
        textElements.forEach(text => {
            // Apply font family if not specified
            if (!text.hasAttribute('font-family')) {
                text.setAttribute('font-family', fontFamily.replace(/['"]/g, ''));
            }
            
            // Apply text color if not specified or transparent
            const fill = text.getAttribute('fill');
            if (!fill || fill === 'none' || fill === 'transparent') {
                text.setAttribute('fill', docStyles.getPropertyValue('--color-text-primary') || '#333333');
            }
            
            // Ensure text has proper font size
            if (!text.hasAttribute('font-size')) {
                text.setAttribute('font-size', docStyles.getPropertyValue('--font-size-base') || '14px');
            }
        });
        
        // Fix specific CSS classes commonly used in visualization libraries
        // D3.js axis related elements
        svg.querySelectorAll('.axis path, .axis line, .domain').forEach(el => {
            if (el instanceof SVGElement) {
                if (!el.hasAttribute('stroke')) {
                    el.setAttribute('stroke', docStyles.getPropertyValue('--color-border') || '#cccccc');
                }
            }
        });
        
        // Grid lines
        svg.querySelectorAll('.grid line, .grid path, .tick line').forEach(el => {
            if (el instanceof SVGElement) {
                if (!el.hasAttribute('stroke')) {
                    el.setAttribute('stroke', docStyles.getPropertyValue('--color-border-light') || '#e5e5e5');
                }
            }
        });
        
        // Chart elements like bars, lines, areas
        svg.querySelectorAll('.bar, .line, .area, .point, .mark').forEach(el => {
            if (el instanceof SVGElement && !el.hasAttribute('fill') && el.tagName.toLowerCase() !== 'line') {
                // For unfilled elements, use the default primary color
                el.setAttribute('fill', docStyles.getPropertyValue('--color-primary') || '#4299e1');
            }
        });
        
        // Fix viewBox if it doesn't exist
        if (!svg.hasAttribute('viewBox') && svg.hasAttribute('width') && svg.hasAttribute('height')) {
            const width = svg.getAttribute('width') || '800';
            const height = svg.getAttribute('height') || '600';
            svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }
        
        // Make sure the SVG has a background if needed
        if (!svg.style.backgroundColor) {
            svg.style.backgroundColor = docStyles.getPropertyValue('--color-bg-page') || '#ffffff';
        }
    }
    
    // Helper function to ensure the SVG has a visible background when saved
    function ensureSvgBackground(svg: SVGElement) {
        // Get dimensions
        const width = parseInt(svg.getAttribute('width') || '800');
        const height = parseInt(svg.getAttribute('height') || '600');
        
        // Get background color from the document or use white as default
        const docStyles = getComputedStyle(document.documentElement);
        const bgColor = docStyles.getPropertyValue('--color-bg-page') || 
                       docStyles.getPropertyValue('--color-bg-primary') || 
                       '#ffffff';
        
        // Create a background rectangle
        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('width', width.toString());
        bgRect.setAttribute('height', height.toString());
        bgRect.setAttribute('x', '0');
        bgRect.setAttribute('y', '0');
        bgRect.setAttribute('fill', bgColor);
        
        // Insert the background rect as the first child of the SVG
        // This ensures it's behind all other elements
        const firstChild = svg.firstChild;
        if (firstChild) {
            svg.insertBefore(bgRect, firstChild);
        } else {
            svg.appendChild(bgRect);
        }
        
        // Also set the background color on the SVG element to ensure compatibility
        svg.style.backgroundColor = bgColor;
        
        // Add a comment for clarity
        const comment = document.createComment(' Background rectangle added for proper rendering ');
        svg.insertBefore(comment, bgRect);
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