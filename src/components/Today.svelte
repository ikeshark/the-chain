<script>
	import {
		badges,
		currentStreak,
		day,
		hasHistory,
		longestStreak,
		tab,
		tasks,
		theme,
		version,
		isSubmitted,
	} from '../stores.js';

	$: tasksLeft = $tasks.filter(task => task.isCompleted === false).length;
	$: isFuture = (new Date().getTime() < $day.getTime());

	function toggleComplete({ target }) {
		const id = parseInt(target.value);
		const task = $tasks[id];
		const { isCompleted, title } = task;
    const updatedTask = {
      id,
      isCompleted: !isCompleted,
      title
    }

		tasks.update(oldTasks => {
			let newTasks = oldTasks.filter(task => task.id !== id);
			newTasks = [...newTasks, updatedTask];
			newTasks.sort((a,b) => a.id - b.id);
			return newTasks;
		});
	}

	function submitDay() {
		const year = $day.getFullYear();
		const month = $day.getMonth();

		const isCompleted = tasksLeft ? false : true;
		const value = { day: $day.getTime(), isCompleted };

		let history = {};
		if (localStorage.history) {
			history = JSON.parse(localStorage.getItem('history'));
		} else {
			history.numRecDays = 0
		}
		history.numRecDays = history.numRecDays + 1;
		if (!history[year]) {
			history[year] = {};
			history[year][month] = [value];
		}	else if (!history[year][month]) {
			history[year][month] = [value]
		} else {
			history[year][month] = [ ...history[year][month], value ];
		}

		currentStreak.update(old => isCompleted ? old + 1 : 0);
		day.update(d => new Date(d.setDate(d.getDate() + 1)));

		localStorage.setItem('history', JSON.stringify(history));
		localStorage.setItem('currentDay', $day.getTime());
		let destination = 'calendar';
		if ($currentStreak > $longestStreak) {
			longestStreak.set($currentStreak);
			// if there is a new badge go to user
			if (badges.indexOf($currentStreak) !== -1) destination = 'user';
		}
		tasks.update(old => old.map(task => {
			return { ...task, isCompleted: false }
		}));
		hasHistory.set(true);
		isSubmitted.submit();
		tab.set(destination)
	}
</script>
<div class="flex {$theme.text}">
  <div class="w-1/2">
    <p>Current streak: {$currentStreak}</p>
    <p class="mb-4">Longest streak: {$longestStreak}</p>
  </div>
  <div class="w-1/2">
    {#if tasksLeft}
      <p class="text-lg text-right">Tasks left: {tasksLeft}</p>
    {:else}
      <p class="text-right font-bold">All done for the day!</p>
    {/if}
		<p class="text-right text-lg">Version: {$version}</p>
  </div>
</div>

<div
  id="scroll"
  class="{$theme.invertBorder} border-2 p-2 shadow-lg overflow-y-scroll {$theme.invertBg}">
  <h2 class="text-2xl text-center mb-2 {$theme.invertText}">
    {$day.toLocaleDateString('en', {
			month: 'long',
			day: 'numeric',
			weekday: 'long'
		})}
  </h2>

  {#each $tasks as { title, id, isCompleted }}
    <label
			class="py-1 px-2 mb-1 shadow-sm border {$theme.border} {$theme.text} {$theme.bg} text-xl last:mb-12"
		>
    	{title}

    	{#if !isFuture}
				<input
	    		class="float-left mt-2 mr-2"
	    		type="checkbox"
	        value={id}
	    		on:change={toggleComplete}
					checked={isCompleted}
	    	>
			{/if}
    </label>
  {/each}
</div>
{#if !isFuture}
	<button
		class="absolute bottom-0 left-0 m-4 border-gray-800 border-solid bg-gray-200 py-1 px-3 text-2xl font-bold rounded-lg border-2"
		on:click={submitDay}
	>
		Submit
	</button>
{/if}

<style>
	input { transform: scale(1.5); }
	#scroll { max-height: calc(100vh - 13rem); }
</style>
