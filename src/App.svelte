<script>
	import { fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { onMount } from 'svelte';

	import Tailwindcss from './Tailwindcss.svelte';
	import EditChain from './EditChain.svelte';
	import Today from './Today.svelte';

	let isNav = false;
	let isSubmitted = false;
	let isFirstTime = true;

	let tab = '';

	let day = new Date();
	let tasks = [];
	let history = [];
	let currentStreak = 0;
	let longestStreak = 0;
	let version = 0;

	onMount(() => {
		if (localStorage.tasks) {
			isFirstTime = false;
			tab = 'today';
			tasks = JSON.parse(localStorage.getItem('tasks'));
			const currentChain = JSON.parse(localStorage.getItem('currentChain'));
			version = currentChain.version;

			if (localStorage.history) {
				history = JSON.parse(localStorage.getItem('history'));
				const { epoch } = history[history.length - 1];
				day = new Date(epoch);
				day = day.setDate(day.getDate() + 1);
			}
			if (localStorage.currentStreak) {
				currentStreak = localStorage.getItem('currentStreak');
			}
			if (localStorage.longestStreak) {
				longestStreak = localStorage.getItem('longestStreak');
			}

		} else {
			tab = 'edit';
		}

	});

	$: tasksLeft = tasks.filter(task => task.isCompleted === false).length;


	function changeTab(e) {
		tab = e.target.value;
	}
	function toggleComplete({ detail }) {
		tasks = tasks.filter(task => task.id !== detail.id);
		tasks = [...tasks, detail];
		tasks = tasks.sort((a,b) => a.id - b.id);
		localStorage.setItem('tasks', tasks);
	}
	function openNav() {
		isNav = !isNav;
	}
	function submitDay() {
		isSubmitted = true;
		const isCompleted = tasksLeft ? false: true;
		currentStreak = isCompleted ? currentStreak + 1 : 0;
		history.push({
			day: day.getTime(),
			tasks: JSON.stringify(tasks),
			isSubmitted,
			isCompleted
		});
		localStorage.setItem('history', JSON.stringify(history));
		localStorage.setItem('currentStreak', currentStreak);
		if (currentStreak > longestStreak) {
			longestStreak = currentStreak;
			localStorage.setItem('longestStreak', longestStreak);
		}
	}
	function submitChain(e) {
		tasks = e.target.detail.chain;
		version = currentStreak ? version + 0.01 : version + 1;

		let chainHistory = [];
		if (isFirstTime) {
			isFirstTime = false;
		} else {
			chainHistory = JSON.parse(localStorage.getItem(chainHistory))
		}
		chainHistory.push({
			version,
			startDay: day.getTime(),
			tasks: tasks.map(task => task.title)
		})
		localStorage.setItem('chainHistory', JSON.stringify(chainHistory));

		localStorage.setItem('tasks', tasks);
		localStorage.setItem('currentChain', JSON.stringify({
			startDay: day.getTime(),
			version
		}))

		tab = 'today';
	}

	let btnClass = 'px-2 py-1 border-black border-2 border-solid text-xl rounded-lg mx-2';
	let btnActive = ' bg-gray-400 shadow-md'
</script>

<Tailwindcss />

<div class="p-2">
	<h1 class="text-3xl mb-2 text-center">Don’t Break the Chain</h1>
	<div class="flex items-center justify-center mb-4">
		<div class="chain"></div>
		<div class="chain"></div>
		<div class="chain"></div>
		<div class="chain"></div>
		<div class="chain"></div>
		<div class="chain"></div>
		<div class="chain"></div>
	</div>

	<!-- TODAY -->
	{#if tab === 'today'}
		<div class="flex">
			<div class="w-1/2">
				<p>Current streak: {currentStreak}</p>
				<p class="mb-4">Longest streak: {longestStreak}</p>
			</div>
			<div class="w-1/2">
				{#if tasksLeft}
					<p class="text-lg text-right">Tasks left: {tasksLeft}</p>
				{:else}
					<p class="text-lg text-right font-bold">All done for the day!</p>
				{/if}
			</div>
		</div>

		<div
			id="scroll"
			class="border-gray-500 border-2 p-2 shadow-lg overflow-y-scroll"
			in:fly="{{ y: 200, duration: 700, delay: 250 }}"
			out:fly="{{ y: -200, duration: 500 }}"
		>
			<h2 class="text-2xl text-center">{day.toLocaleDateString('en', { month: 'long', day: 'numeric' })}</h2>
			{#each tasks as task }
				<Today {...task} on:toggleComplete={toggleComplete} />
			{/each}
		</div>
		<button
			class="fixed bottom-0 left-0 m-4 border-gray-800 border-solid bg-gray-200 py-1 px-3 text-2xl font-bold rounded-lg border-2"
			on:click={submitDay}>Submit</button>
	{:else}
		<EditChain
			isFirstTime={isFirstTime}
			tasks={tasks}
			on:submitChain={submitChain}
		/>
	{/if}
</div>


{#if !isFirstTime}
	<button
		on:click={openNav}
		class="fixed z-20 bottom-0 right-0 m-4 border-gray-800 border-solid w-12 h-12 font-bold rounded-full leading-none border-2 {isNav ? 'bg-white text-xl' : 'text-4xl bg-gray-300' }">
		{isNav ? 'x' : '⋮'}
	</button>
{/if}

{#if isNav}
	<nav
		class="mobileNav z-10 fixed rounded-full bg-gray-200 border-4 border-solid border-gray-800 shadow-lg"
		transition:fly="{{ x: 200, y: 200, duration: 300 }}"
	>
		<button
			type="button" value="today"
			on:click={changeTab}
			class="menuIcon home">🏠</button>
		<button
			type="button" value="edit"
			on:click={changeTab}
			class="menuIcon edit">✏️</button>
		<button class="menuIcon calendar">📅</button>
		<button class="menuIcon profile">👤</button>
	</nav>
{/if}

<style>
	@keyframes spin {
		from {transform: rotateX(0deg)}
		to {transform: rotateX(180deg)}
	}
	.menuIcon {
		font-size: 3rem;
		border: none;
		position: absolute;
	}
	#scroll { max-height: calc(100vh - 13.5rem); }
	.home { top: 21vw; left: 12vw; }
	.edit { top: 0; right: 54vw; }
	.calendar { top: 9vw; right: 69vw; }
	.profile { bottom: 50vw; left: 5vw; }
	.mobileNav {
		width: 111vw;
		height: 111vw;
		bottom: -50vw;
		right: -50vw;
	}
	.chain {border: 3px solid black; width: 55px; height: 25px; border-radius: 8px;}
	.chain:nth-of-type(odd) {animation: spin 1 2s linear}
	.chain:nth-of-type(even) {animation: spin 1 2s 1s linear; height: 15px; margin: 0 -14px;}
</style>
