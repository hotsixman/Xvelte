<script lang="ts">
    import logo from "./logo.svg";

    let doRotate = $state(false);

    function toggle() {
        doRotate = !doRotate;
    }
</script>

<img
    class="logo"
    class:rotate={doRotate}
    src={logo}
    alt="logo"
    onclick={toggle}
    role="presentation"
/>

<style>
    .logo {
        width: 200px;
        max-width: calc(100% - 30px);
        cursor: pointer;
    }

    .rotate {
        animation: rotate 0.8s linear infinite;
    }

    @keyframes rotate {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
</style>
