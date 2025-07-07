<script lang="ts">
    import { translate } from '../../stores/translationStore';
    import type { HierarchyNode } from 'd3-hierarchy'; // Import specific type
    import type { TreemapNode } from '../../services/treemap/index'; // Assuming TreemapNode is the data type

    // Props for the summary component
    export let totalItems: number;
    export let totalWordCount: number;
    export let zoomedNode: HierarchyNode<TreemapNode> | null;
    export let formatNumber: (num: number) => string;

    // Reactive translations
    const summaryText = translate('viz.summary');
    const totalItemsWithWordCountText = translate('viz.total_items_with_word_count');
    const totalWordsText = translate('viz.total_words');
    const avgWordsPerItemText = translate('viz.avg_words_per_item');
    const currentlyViewingText = translate('viz.currently_viewing');
    const clickBackText = translate('viz.click_back_to_return');
    const clickZoomInText = translate('viz.click_zoom_in');

</script>

<div class="p-md bg-card rounded shadow mt-md">
    <div>
        <h3 class="mt-0 mb-sm text-primary text-md font-medium border-b border-solid border-default pb-xs">{$summaryText}</h3>
        <p class="my-xs text-sm text-secondary">{$totalItemsWithWordCountText}: <strong class="font-medium">{formatNumber(totalItems)}</strong></p>
        <p class="my-xs text-sm text-secondary">{$totalWordsText}: <strong class="font-medium">{formatNumber(totalWordCount)}</strong></p>
        {#if totalItems > 0}
            <p class="my-xs text-sm text-secondary">{$avgWordsPerItemText}: <strong class="font-medium">{formatNumber(Math.round(totalWordCount / totalItems))}</strong></p>
        {/if}
        {#if zoomedNode}
            <p class="my-xs text-sm text-secondary">{$currentlyViewingText}: <strong class="font-medium">{zoomedNode.data.name}</strong></p>
            <p class="my-xs text-sm text-secondary">{$clickBackText}</p>
        {:else}
            <p class="my-xs text-sm text-secondary">{$clickZoomInText}</p>
        {/if}
    </div>
</div> 