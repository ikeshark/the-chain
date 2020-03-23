<script>
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';

  const dispatch = createEventDispatcher();

  export let message;

  function confirm() {
    dispatch('confirm');
    dispatch('dismiss');
  }
  function dismiss() {
    dispatch('dismiss');
  }
</script>


<Modal on:closeModal={dismiss}>
  <div class="w-10/12 max-666 bg-white p-4 border-double border-black border-8">
    <h2 class="text-2xl font-bold text-center mb-4">Are you sure?</h2>
    <p class="mb-4 text-xl">{message}</p>
    <button
      on:click={confirm}
      class="block w-full mb-4 p-4 border-double border-8 border-green-700 rounded-lg font-bold text-xl"
    >Yes, I’m sure</button>
    <button
      on:click={dismiss}
      class="block w-full mb-4 p-4 border-double border-8 border-red-700 rounded-lg font-bold text-xl"
    >ABORT</button>
  </div>
</Modal>

<style>
  .max-666 {
    max-width: 666px;
  }
</style>
