<div class="container">
    <aside class="sidebar">
        <slot name="sidebar"></slot>
    </aside>
    <main class="content">
        <slot></slot>
    </main>
</div>

<style>
    .container {
        display: flex;
        height: 100vh;
    }

    .sidebar {
        width: 250px;
        padding: 20px;
        background-color: #f4f4f4;
        border-right: 1px solid #ddd;
        overflow-y: auto;
    }

    .content {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
    }
</style>