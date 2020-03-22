<script>
  import Badges from './Badges.svelte';
  import Settings from './Settings.svelte';

  let tab = 'badges';
</script>
<nav class="flex justify-around -mb-1">
  <button
    on:click="{e => tab = e.target.value}"
    class="menuIcon {tab === 'badges' ? 'bg-white' : 'bg-gray-400'}"
    type="button"
    value="badges"
  >
    🏅
  </button>
  <button
    on:click="{e => tab = e.target.value}"
    class="menuIcon {tab === 'settings' ? 'bg-white' : 'bg-gray-400'}"
    type="button"
    value="settings"
  >
    ⚙
  </button>
</nav>
{#if tab === 'settings'}
  <Settings />
{:else}
  <Badges />
{/if}

<style>
  .menuIcon {
    font-size: 2rem;
    border: 2px solid black;
    border-radius: 50% 50% 0 0;
    width: 5rem;
    height: 3rem;
  }
</style>
