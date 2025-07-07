<script lang="ts">
    // Component props
    export let title: string = '';
    export let description: string = '';
    export let variant: 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' = 'default';
    export let elevated: boolean = false;
    export let className: string = '';
</script>

<div class="card {variant} {elevated ? 'card--elevated' : ''} {className}">
    {#if title}
        <h3 class="card__title">{title}</h3>
    {/if}
    
    {#if description}
        <p class="card__description">{description}</p>
    {/if}
    
    <div class="card__content">
        <slot></slot>
    </div>
    
    {#if $$slots.footer}
        <div class="card__footer">
            <slot name="footer"></slot>
        </div>
    {/if}
</div>

<style>
    /* Base Card Component */
    .card {
        background-color: var(--color-bg-card);
        color: var(--color-text-primary);
        border-radius: var(--radius-md);
        border: var(--border-width-thin) solid var(--color-border-light);
        padding: var(--spacing-md);
        margin-bottom: var(--spacing-md);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }
    
    /* Elevated Card */
    .card--elevated {
        box-shadow: var(--shadow-md);
        border: none;
    }
    
    /* Card Variants */
    .card.primary {
        border-left: var(--border-width-thick) solid var(--color-primary);
        background-color: var(--color-primary-50);
    }
    
    .card.success {
        border-left: var(--border-width-thick) solid var(--color-success);
        background-color: var(--color-success-light);
    }
    
    .card.error {
        border-left: var(--border-width-thick) solid var(--color-error);
        background-color: var(--color-error-light);
    }
    
    .card.warning {
        border-left: var(--border-width-thick) solid var(--color-warning);
        background-color: var(--color-warning-light);
    }
    
    .card.info {
        border-left: var(--border-width-thick) solid var(--color-info);
        background-color: var(--color-info-light);
    }
    
    /* Card Elements */
    .card__title {
        color: var(--color-text-primary);
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-medium);
        margin: 0;
        padding-bottom: var(--spacing-xs);
        border-bottom: var(--border-width-thin) solid var(--color-border-light);
    }
    
    .card.primary .card__title {
        color: var(--color-primary-dark);
    }
    
    .card.success .card__title {
        color: var(--color-success);
    }
    
    .card.error .card__title {
        color: var(--color-error);
    }
    
    .card.warning .card__title {
        color: var(--color-warning);
    }
    
    .card.info .card__title {
        color: var(--color-info);
    }
    
    .card__description {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
        margin: 0;
        line-height: var(--line-height-normal);
    }
    
    .card__content {
        flex: 1;
    }
    
    .card__footer {
        margin-top: var(--spacing-sm);
        padding-top: var(--spacing-sm);
        border-top: var(--border-width-thin) solid var(--color-border-light);
        display: flex;
        justify-content: flex-end;
        gap: var(--spacing-sm);
    }
</style> 