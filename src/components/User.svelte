<script>
  import { createEventDispatcher } from 'svelte';
  import Confirm from './Confirm.svelte';
  const dispatch = createEventDispatcher();

  import { theme, themes, isSubmitted }  from '../stores.js'

  export let longestStreak;
  export let badges;

  let myBadges = badges.filter(mark => longestStreak >= mark);

  let isConfirming = false;
  let message = '';
  let tab = 'badges';

  function changeTheme(e) {
    dispatch('changeTheme', { newTheme: e.target.value });
  }
  function setTheme(e) {
    var data = new FormData(e.target);
    dispatch('setTheme', { newTheme: data.get('theme') });
    dispatch('createToast', { message: 'New theme saved' });
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
      class="block mx-auto my-4 p-4 text-xl font-bold border-double border-8 border-black"
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
{:else}
  <div class="scroll overflow-y-scroll h-auto border-double border-8 {$theme.border}">
    {#each myBadges as badge}
      <div class="starOuter relative mx-auto h-32 w-32 my-12 {$isSubmitted && 'animate'}">
        <div class="starInner z-10 absolute top-0 left-0 w-full h-full flex items-center justify-center">
          <span
            class="badge w-full h-full text-5xl z-10 rounded-full text-center {$theme.invertBg} {$theme.invertText} {$theme.invertBorder} font-bold border-8 border-double"
            >
            {badge}
          </span>
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .scroll {
    height: 30.5rem;
  }
  .menuIcon {
    font-size: 2rem;
    border: 2px solid black;
    border-radius: 50% 50% 0 0;
    width: 5rem;
    height: 3rem;
  }
  .badge {
    line-height: 2.125;
    text-shadow: 2px 2px black;
    box-shadow: inset 0px 0px 6px 7px currentColor, 0 0 8px 0.35rem black;
  }
  .starOuter::after, .starOuter::before,
  .starInner::after, .starInner::before {
    width: 100%;
    height: 100%;
    content: '';
    position: absolute;
    top: 0;
    left: 0;
  }
  .animate:first-of-type {
    animation: 3s rotate 2 linear;
  }
  .animate:first-of-type .badge {
    animation: 3s rotate 2 linear reverse;
  }
  @keyframes rotate {
    100% {transform: rotate(360deg)}
  }
  .starOuter::before {
    transform: rotate(45deg)
  }

  .starInner::after {transform:rotate(22.5deg)}
  .starInner::before {transform:rotate(67.5deg)}

  .starInner::after, .starInner::before {
    background-color: white;
    border: 5px solid black;
    width: 8rem;
    height: 8.125rem;
  }
  .starOuter::after, .starOuter::before {
    background-color: black;
  }
  .starOuter:nth-of-type(2) {
    transform: scale(0.875)
  }
  .starOuter:nth-of-type(3) {
    transform: scale(0.75)
  }
  .starOuter:nth-of-type(4) {
    transform: scale(0.675)
  }
  .starOuter:nth-of-type(5), .starOuter:nth-of-type(6),
  .starOuter:nth-of-type(7) {
    transform: scale(0.5)
  }
</style>
