<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  function closeModal({ target }) {
    if (target.id == 'modal') {
      dispatch('closeModal');
    }
  }
</script>

<div
  class="fixed top-0 left-0 z-10 flex items-center justify-center h-screen w-screen"
  on:click={closeModal}
  id="modal"
>
  <slot></slot>
</div>

<style>
  #modal {
    background-color: rgba(0, 0, 0, 0.7);
  }
</style>
