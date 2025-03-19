<script lang="ts">
    import CardComponent from '../components/examples/CardComponent.svelte';
</script>

<div class="style-guide">
    <h1>IWAC Application Style Guide</h1>
    
    <section class="section">
        <h2>Typography</h2>
        
        <div class="demo-section">
            <h1>Heading 1</h1>
            <h2>Heading 2</h2>
            <h3>Heading 3</h3>
            <h4>Heading 4</h4>
            <h5>Heading 5</h5>
            <h6>Heading 6</h6>
            <p>This is a paragraph with <button type="button" class="demo-link">a link</button> inside it.</p>
            <p class="text-sm">This is small text</p>
            <p class="text-lg">This is large text</p>
            <p class="font-bold">This is bold text</p>
            <p class="font-medium">This is medium weight text</p>
        </div>
    </section>
    
    <section class="section">
        <h2>Colors</h2>
        
        <div class="demo-section">
            <h3>Text Colors</h3>
            <p class="text-primary">Primary Text</p>
            <p class="text-secondary">Secondary Text</p>
            <p class="text-tertiary">Tertiary Text</p>
            <p class="text-muted">Muted Text</p>
            <p class="text-brand">Brand Color Text</p>
            <p class="text-success">Success Text</p>
            <p class="text-error">Error Text</p>
            <p class="text-warning">Warning Text</p>
            <p class="text-info">Info Text</p>
            
            <h3 class="mt-lg">Background Colors</h3>
            <div class="color-sample bg-page">Page Background</div>
            <div class="color-sample bg-card">Card Background</div>
            <div class="color-sample bg-card-alt">Alternative Card Background</div>
            <div class="color-sample bg-primary text-light">Primary Background</div>
            <div class="color-sample bg-primary-light">Primary Light Background</div>
            <div class="color-sample bg-secondary text-light">Secondary Background</div>
            <div class="color-sample bg-success-light">Success Light Background</div>
            <div class="color-sample bg-error-light">Error Light Background</div>
            <div class="color-sample bg-warning-light">Warning Light Background</div>
            <div class="color-sample bg-info-light">Info Light Background</div>
        </div>
    </section>
    
    <section class="section">
        <h2>Spacing</h2>
        
        <div class="demo-section">
            <div class="spacing-sample p-xs">Extra Small Padding (4px)</div>
            <div class="spacing-sample p-sm">Small Padding (8px)</div>
            <div class="spacing-sample p-md">Medium Padding (16px)</div>
            <div class="spacing-sample p-lg">Large Padding (24px)</div>
            
            <div class="flex gap-xs mt-lg">
                <div class="spacing-box">Gap XS</div>
                <div class="spacing-box">Gap XS</div>
                <div class="spacing-box">Gap XS</div>
            </div>
            
            <div class="flex gap-sm mt-lg">
                <div class="spacing-box">Gap SM</div>
                <div class="spacing-box">Gap SM</div>
                <div class="spacing-box">Gap SM</div>
            </div>
            
            <div class="flex gap-md mt-lg">
                <div class="spacing-box">Gap MD</div>
                <div class="spacing-box">Gap MD</div>
                <div class="spacing-box">Gap MD</div>
            </div>
        </div>
    </section>
    
    <section class="section">
        <h2>Cards</h2>
        
        <div class="demo-section">
            <CardComponent 
                title="Default Card" 
                description="This is a standard card component"
            >
                <p>This is the content of the card.</p>
                <svelte:fragment slot="footer">
                    <button class="btn btn-secondary">Cancel</button>
                    <button class="btn btn-primary">Submit</button>
                </svelte:fragment>
            </CardComponent>
            
            <CardComponent 
                title="Elevated Card" 
                description="This card has elevation (shadow)"
                elevated={true}
            >
                <p>Cards can be elevated with a shadow.</p>
            </CardComponent>
            
            <CardComponent 
                title="Primary Card" 
                description="This is a primary variant card"
                variant="primary"
            >
                <p>The primary card variant can be used for highlighting important content.</p>
            </CardComponent>
            
            <CardComponent 
                title="Success Card" 
                description="This is a success variant card"
                variant="success"
            >
                <p>The success card indicates a completed action or positive status.</p>
            </CardComponent>
            
            <CardComponent 
                title="Error Card" 
                description="This is an error variant card"
                variant="error"
            >
                <p>The error card warns users about issues that need attention.</p>
            </CardComponent>
            
            <CardComponent 
                title="Warning Card" 
                description="This is a warning variant card"
                variant="warning"
            >
                <p>The warning card alerts users to potential issues.</p>
            </CardComponent>
        </div>
    </section>
    
    <section class="section">
        <h2>Badges</h2>
        
        <div class="demo-section">
            <span class="badge">Default Badge</span>
            <span class="badge badge-primary">Primary Badge</span>
            <span class="badge badge-success">Success Badge</span>
            <span class="badge badge-error">Error Badge</span>
        </div>
    </section>
    
    <section class="section">
        <h2>Alerts</h2>
        
        <div class="demo-section">
            <div class="alert alert-info">This is an information alert.</div>
            <div class="alert alert-success">This is a success alert.</div>
            <div class="alert alert-warning">This is a warning alert.</div>
            <div class="alert alert-error">This is an error alert.</div>
        </div>
    </section>
    
    <section class="section">
        <h2>Buttons</h2>
        
        <div class="demo-section">
            <div class="flex gap-sm m-sm">
                <button class="btn btn-primary">Primary</button>
                <button class="btn btn-secondary">Secondary</button>
                <button class="btn btn-success">Success</button>
                <button class="btn btn-error">Error</button>
                <button class="btn btn-warning">Warning</button>
            </div>
            
            <div class="flex gap-sm m-sm">
                <button class="btn btn-outline-primary">Primary Outline</button>
                <button class="btn btn-outline-secondary">Secondary Outline</button>
                <button class="btn btn-outline-success">Success Outline</button>
                <button class="btn btn-outline-error">Error Outline</button>
            </div>
            
            <div class="flex gap-sm m-sm">
                <button class="btn btn-sm">Small</button>
                <button class="btn">Default</button>
                <button class="btn btn-lg">Large</button>
            </div>
        </div>
    </section>
</div>

<style>
    .style-guide {
        max-width: var(--container-lg);
        margin: 0 auto;
        padding: var(--spacing-lg);
        background-color: var(--color-bg-page);
        color: var(--color-text-primary);
    }
    
    section {
        margin-bottom: var(--spacing-xl);
    }
    
    h1 {
        color: var(--color-primary);
        margin-bottom: var(--spacing-lg);
        border-bottom: var(--border-width-thin) solid var(--color-border);
        padding-bottom: var(--spacing-sm);
    }
    
    h2 {
        color: var(--color-primary-dark);
        margin-bottom: var(--spacing-md);
    }
    
    h3 {
        color: var(--color-text-primary);
        margin-top: var(--spacing-lg);
        margin-bottom: var(--spacing-sm);
    }
    
    .demo-section {
        background-color: var(--color-bg-card);
        border-radius: var(--radius-md);
        padding: var(--spacing-md);
        box-shadow: var(--shadow-sm);
    }
    
    .color-sample {
        padding: var(--spacing-sm);
        margin-bottom: var(--spacing-xs);
        border-radius: var(--radius-sm);
        border: var(--border-width-thin) solid var(--color-border-light);
    }
    
    .spacing-sample {
        background-color: var(--color-primary-100);
        color: var(--color-primary-dark);
        margin-bottom: var(--spacing-sm);
        border-radius: var(--radius-sm);
        border: var(--border-width-thin) dashed var(--color-primary);
    }
    
    .spacing-box {
        background-color: var(--color-primary-100);
        color: var(--color-primary-dark);
        padding: var(--spacing-sm);
        border-radius: var(--radius-sm);
        border: var(--border-width-thin) dashed var(--color-primary);
    }
    
    /* Additional utility classes */
    .mt-lg {
        margin-top: var(--spacing-lg);
    }
    
    /* Custom button styles for demo */
    .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-xs) var(--spacing-md);
        border-radius: var(--radius-sm);
        font-weight: var(--font-weight-medium);
        border: var(--border-width-thin) solid transparent;
        cursor: pointer;
        transition: all var(--transition-fast);
    }
    
    .btn-primary {
        background-color: var(--color-primary);
        color: var(--color-text-light);
    }
    
    .btn-primary:hover {
        background-color: var(--color-primary-dark);
    }
    
    .btn-secondary {
        background-color: var(--color-secondary);
        color: var(--color-text-light);
    }
    
    .btn-secondary:hover {
        background-color: var(--color-secondary-dark);
    }
    
    .btn-success {
        background-color: var(--color-success);
        color: var(--color-text-light);
    }
    
    .btn-error {
        background-color: var(--color-error);
        color: var(--color-text-light);
    }
    
    .btn-warning {
        background-color: var(--color-warning);
        color: var(--color-text-primary);
    }
    
    .btn-outline-primary {
        border-color: var(--color-primary);
        color: var(--color-primary);
    }
    
    .btn-outline-primary:hover {
        background-color: var(--color-primary-100);
    }
    
    .btn-outline-secondary {
        border-color: var(--color-secondary);
        color: var(--color-secondary);
    }
    
    .btn-outline-success {
        border-color: var(--color-success);
        color: var(--color-success);
    }
    
    .btn-outline-error {
        border-color: var(--color-error);
        color: var(--color-error);
    }
    
    .btn-sm {
        padding: var(--spacing-2xs) var(--spacing-sm);
        font-size: var(--font-size-sm);
    }
    
    .btn-lg {
        padding: var(--spacing-sm) var(--spacing-lg);
        font-size: var(--font-size-lg);
    }
</style> 