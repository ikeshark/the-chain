<script>
  export let history;
  export let theme;
</script>

<div class="text-blue-200">
  <h2 class="text-4xl text-center">Your History</h2>
  <p class="text-lg mb-4 text-center">Number of recorded days: {history.length}</p>
  <div class="text-blue-900 flex flex-wrap">
    {#each history as { isCompleted, day }}
      <div class="border-solid border-blue-700 border-4 m-1 p-2 flex-grow text-xl font-bold w-24 h-24 {isCompleted ? 'bg-blue-200' : 'bg-gray-100'}">
        {new Date(day)
          .toLocaleDateString('en', {
      			month: 'short',
      			day: 'numeric',
          })
        }
        <span class="block text-3xl text-center -mt-1">
          {@html isCompleted ? '&check;' : '&times;'}
        </span>
      </div>
    {/each}
  </div>
</div>
