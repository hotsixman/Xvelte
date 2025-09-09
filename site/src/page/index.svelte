<script lang="ts">
    import Layout from './layout.svelte';
    import Island from '../../../library/src/components/Island.svelte';
    import Sidebar from './Sidebar.svelte?client';
    import DocContent from './DocContent.svelte?client';
</script>

<Layout>
    <div slot="sidebar">
        <Island component={Sidebar} />
    </div>
    <Island component={DocContent} />
</Layout>
