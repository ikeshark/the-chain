<script>
  import { scale } from 'svelte/transition';
  import { backInOut } from 'svelte/easing';

  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let isMobile;
  export let theme;
  export let tab;

  function changeTab(e) {
    dispatch('changeTab', { value: e.target.value || e.target.parentNode.value })
  }
</script>

<nav
  class="{isMobile ? 'mobileNav rounded-full fixed' : 'hidden md:block desktopNav'} z-10 {theme.invertBg} border-4 border-solid {theme.invertBorder} shadow-lg"
  in:scale={{ start: 0.2, easing: backInOut }}
  out:scale={{ start: 0.2, easing: backInOut }}
>
  <button
    type="button" value="today"
    on:click={changeTab}
    class="menuBtn block today font-bold"
  >
    {#if !isMobile}<span class="leading-tight {theme.invertText}">HOME</span>{/if}
    <span class="menuIcon block {tab === 'today' ? 'bg-gray-700' : 'bg-white'}">🏠</span>
  </button>
  <button
    type="button" value="edit"
    on:click={changeTab}
    class="menuBtn block edit font-bold"
  >
    {#if !isMobile}<span class="leading-tight {theme.invertText}">EDIT CHAIN</span>{/if}
    <span class="menuIcon block {tab === 'edit' ? 'bg-gray-700' : 'bg-white'}">✏️</span>
  </button>
  <button
    type="button" value="calendar"
    on:click={changeTab}
    class="menuBtn block calendar font-bold"
  >
    {#if !isMobile}<span class="leading-tight {theme.invertText}">YOUR HISTORY</span>{/if}
    <span class="menuIcon block {tab === 'calendar' ? 'bg-gray-700' : 'bg-white'}">📅</span>
  </button>
  <button
    type="button" value="user"
    on:click={changeTab}
    class="menuBtn block user font-bold"
  >
    {#if !isMobile}<span class="leading-tight {theme.invertText}">BADGES AND SETTINGS</span>{/if}
    <span class="menuIcon block {tab === 'user' ? 'bg-gray-700' : 'bg-white'}">👤</span>
  </button>
</nav>

<style>
  .desktopNav {
    height: 100%;
    width: 200px;
    text-align: center;
    padding: 1rem 0.75rem;
  }

  .mobileNav {
    width: 25rem;
    height: 25rem;
    bottom: -11rem;
    right: -11rem;
  }

  button {
    border: none;
  }

  .menuIcon {
    font-size: 2.5rem;
    border: 2px solid black;
    border-radius: 50%;
    width: 3rem;
    height: 3rem;
    margin: 0 auto;
  }

  .mobileNav .menuBtn {
    position: absolute;
  }

  .desktopNav .menuBtn {
    position: relative;
    margin: 0 auto 2.5rem auto;
  }

  .mobileNav .today { top: 10rem; left: 1rem; }
  .mobileNav .edit { top: 5.4rem; left: 2.1rem; }
  .mobileNav .calendar { top: 2rem; left: 5.6rem; }
  .mobileNav .user { top: .5rem; left: 10rem; }
</style>
