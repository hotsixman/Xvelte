<script>
    let count = $state(0);
</script>

<button onclick={() => (count += 2)}>{count}</button>
누르면 증가하지롱

<style>
    button {
        color: red;
    }
</style>
