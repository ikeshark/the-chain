<script>
  import Confirm from './Confirm.svelte';
  import { themes, theme, themeName, toasts } from '../stores.js';

  let isConfirming = false;
  let message = '';

  function changeTheme({ target }) {
    themeName.set(target.value);
  }
  function setTheme({ target }) {
    var data = new FormData(target);
    // should i see if theme has changed?
    localStorage.setItem('theme', data.get('theme'));
    toasts.create('New Theme Successfully Saved')
  }
  function clearStorage() {
    localStorage.clear();
    location.reload();
  }
  function confirmDelete() {
    message = 'Are you sure you want to clear you’re data? This can’t be undone';
    isConfirming = true;
  }
</script>

<div class="{$theme.invertBorder} border-2 p-2 shadow-lg z-10 {$theme.invertBg} relative">
  <h2 class="{$theme.invertText} text-2xl text-center">Themes</h2>
  <form
    class="{$theme.text} {$theme.bg} p-2"
    on:submit|preventDefault={setTheme}
  >
    <div class="flex flex-col flex-wrap h-48">
    {#each Object.values(themes) as { name, bg, border, invertBg }}
      <label class="w-50 mb-1 py-1 px-4 text-center text-xl font-bold {(theme.name === name) && theme.border} border-2 border-solid">
        {name} <br />
        <input
          class="sr-only"
          name="theme"
          type="radio"
          value={name}
          on:change={changeTheme}>
        <span class="{bg} w-10 h-10 inline-block border border-solid border-black"></span>
        <span class="{invertBg} w-10 h-10 inline-block border border-solid border-black"></span>
      </label>
    {/each}
    </div>
    <button
      class="block mx-auto my-4 p-4 text-xl font-bold border-double border-8 {$theme.border}"
      type="submit"
    >
      Set preference
    </button>
  </form>
  <button
    type="button"
    class="block mx-auto my-4 p-4 text-xl font-bold border-double border-8 border-black {$theme.invertText}"
    on:click={confirmDelete}
  >
    Clear All Data
  </button>

  {#if isConfirming}
    <Confirm
      {message}
      on:confirm={clearStorage}
      on:dismiss={() => isConfirming = false}
    />
  {/if}
</div>
