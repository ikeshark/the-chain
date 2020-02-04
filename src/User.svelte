<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let theme;

  function changeTheme(e) {
    dispatch('changeTheme', { newTheme: e.target.value })
  }
  function setTheme(e) {
    console.log(e)
    dispatch('changeTheme', { newTheme: e.theme.value })
  }
</script>

<form
  class={`${theme.text}`}
  on:submit|preventDefault={setTheme}
>
  <label>
    day
    <input
      name="theme"
      type="radio" value="day"
      on:change={changeTheme}>
  </label>
  <label>
    night
    <input
      name="theme"
      type="radio" value="night"
      on:change={changeTheme}>
  </label>
  <button type="submit">Set preference</button>
</form>
