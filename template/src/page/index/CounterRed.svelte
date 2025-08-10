<script lang="ts">
    let count = $state(0);
</script>

<button onclick={() => count++}>{count}</button>

<style>
    button{
        width: 50px;
        height: 30px;
        font-size: 20px;
        color: red;
    }
</style>