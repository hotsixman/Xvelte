<script lang="ts">
    import { marked } from 'marked';
    import { globalContext } from '@hotsixman/xvelte/client';
    import { writable } from 'svelte/store';
    import type { Writable } from 'svelte/store';

    interface SelectedDoc {
        lang: string;
        file: string;
    }

    // Get or create the shared store in the global context
    // This ensures it exists if this component loads first, though less likely.
    if (!globalContext.has('selectedDocStore')) {
        globalContext.set('selectedDocStore', writable<SelectedDoc | null>(null));
    }
    const selectedDoc = globalContext.get('selectedDocStore') as Writable<SelectedDoc | null>;

    let currentContent = $state('<p>Select a document to view its content.</p>');
    let currentTitle = $state('Welcome');

    $effect(() => {
        const doc = $selectedDoc;
        if (doc) {
            (async () => {
                try {
                    currentTitle = doc.file;
                    const response = await fetch(`/api/doc/${doc.lang}/${doc.file}`);
                    if (response.ok) {
                        const markdown = await response.text();
                        currentContent = await marked.parse(markdown);
                    } else {
                        const errorText = await response.text();
                        console.error('Failed to load document:', errorText);
                        currentContent = `<p style="color: red;">Failed to load document: ${response.statusText}</p><pre>${errorText}</pre>`;
                    }
                } catch (error) {
                    console.error(`Failed to fetch doc content for ${doc.lang}/${doc.file}:`, error);
                    currentContent = '<p style="color: red;">An error occurred while loading the document.</p>';
                }
            })();
        }
    });
</script>

<div class="doc-content">
    <h1>{currentTitle}</h1>
    {@html currentContent}
</div>

<style>
    .doc-content {
        font-family: sans-serif;
        line-height: 1.6;
    }
</style>
