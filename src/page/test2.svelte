<script>
    let isOpen = $state(false);
</script>

아니용
<button onclick={() => isOpen = !isOpen}>{isOpen ? '닫기' : '열기'}</button>