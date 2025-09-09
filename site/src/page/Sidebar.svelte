<script lang="ts">
    import { globalContext } from '@hotsixman/xvelte/client';
    import { writable } from 'svelte/store';
    import type { Writable } from 'svelte/store';

    export interface SelectedDoc {
        lang: string;
        file: string;
    }

    // Get or create the shared store in the global context
    if (!globalContext.has('selectedDocStore')) {
        globalContext.set('selectedDocStore', writable<SelectedDoc | null>(null));
    }
    const selectedDocStore = globalContext.get('selectedDocStore') as Writable<SelectedDoc | null>;

    let docList = $state({ en: [] as string[], ko: [] as string[] });
    let isLoading = $state(true);

    $effect(() => {
        (async () => {
            try {
                const response = await fetch('/api/docs');
                if (response.ok) {
                    const data = await response.json();
                    docList.en = data.en;
                    docList.ko = data.ko;
                }
            } catch (error) {
                console.error('Failed to fetch doc list:', error);
            } finally {
                isLoading = false;
            }
        })();
    });

    function selectDocument(event: MouseEvent, lang: string, file: string) {
        event.preventDefault();
        selectedDocStore.set({ lang, file });
    }
</script>

{#if isLoading}
    <p>Loading docs...</p>
{:else}
    <h2>English</h2>
    <ul>
        {#each docList.en as doc}
            <li><a href="#" onclick={(event) => selectDocument(event, 'en', doc)}>{doc}</a></li>
        {/each}
    </ul>
    
    <h2>한국어</h2>
    <ul>
        {#each docList.ko as doc}
            <li><a href="#" onclick={(event) => selectDocument(event, 'ko', doc)}>{doc}</a></li>
        {/each}
    </ul>
{/if}

<style>
    h2 {
        font-size: 1.2em;
        margin-top: 1em;
        margin-bottom: 0.5em;
    }
    ul {
        list-style: none;
        padding: 0;
    }
    li a {
        text-decoration: none;
        color: #333;
        display: block;
        padding: 4px 0;
    }
    li a:hover {
        background-color: #e9e9e9;
    }
</style>
