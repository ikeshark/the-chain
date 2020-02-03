<script>
	import { onMount } from 'svelte';
	import { scale } from 'svelte/transition';
	import { bounceOut, quadIn } from 'svelte/easing';

	import Tailwindcss from './Tailwindcss.svelte';
	import EditChain from './EditChain.svelte';
	import Today from './Today.svelte';
	import Calendar from './Calendar.svelte';

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
			version = parseInt(currentChain.version);

			if (localStorage.history) {
				history = JSON.parse(localStorage.getItem('history'));
				const epoch = history[history.length - 1].day;
				day = new Date(epoch);
				day = new Date(day.setDate(day.getDate() + 1));
			}
			if (localStorage.currentStreak) {
				currentStreak = parseInt(localStorage.getItem('currentStreak'));
			}
			if (localStorage.longestStreak) {
				longestStreak = parseInt(localStorage.getItem('longestStreak'));
			}

			if (day.getTime() > new Date().getTime()) tab = 'today'

		} else {
			tab = 'edit';
		}

	});

	$: tasksLeft = tasks.filter(task => task.isCompleted === false).length;
	$: isToday = (new Date().getDate() === day.getDate());
	$: {
		if(tasks.length)localStorage.setItem('tasks', JSON.stringify(tasks))
	};

	function changeTab(e) {
		tab = e.target.value;
		isNav = false;
	}
	function toggleComplete({ detail }) {
		const task = tasks[detail.id];
		const { isCompleted, id, title } = task;
    const updatedTask = {
      id: detail.id,
      isCompleted: !isCompleted,
      title
    }
		let newTasks = tasks.filter(task => task.id !== detail.id);
		newTasks = [...newTasks, updatedTask];

		tasks = newTasks.sort((a,b) => a.id - b.id);
	}
	function openNav() {
		isNav = !isNav;
	}
	function submitDay() {
		// todo : after submit change to cal tab draw happy face
		isSubmitted = true;
		const isCompleted = tasksLeft ? false : true;
		currentStreak = isCompleted ? currentStreak + 1 : 0;
		// change from push 
		history.push({
			day: day.getTime(),
			isCompleted
		});
		localStorage.setItem('history', JSON.stringify(history));
		localStorage.setItem('currentStreak', currentStreak);
		if (currentStreak > longestStreak) {
			longestStreak = currentStreak;
			localStorage.setItem('longestStreak', longestStreak);
		}
		tasks = tasks.map(task => {
			return { ...task, isCompleted: false }
		});
		day = new Date(day.setDate(day.getDate() + 1));
		tab = 'calendar';
	}
	function submitChain(e) {
		tasks = e.detail.chain;
		version = currentStreak ? version + 0.01 : version + 1;

		let chainHistory = [];
		if (isFirstTime) {
			isFirstTime = false;
		} else if (localStorage.chainHistory) {
			chainHistory = JSON.parse(localStorage.getItem('chainHistory'))
		}
		chainHistory.push({
			version,
			startDay: day.getTime(),
			tasks: tasks.map(task => task.title)
		})
		localStorage.setItem('chainHistory', JSON.stringify(chainHistory));

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
	<h1 class="text-3xl mb-2 text-center text-blue-200">Don’t Break the Chain</h1>
	<div class="flex items-center justify-center mb-4 text-blue-200">
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
		<div in:scale={{delay: 500}} out:scale={{delay: 0}}>
			<Today
				{day}
	      {currentStreak}
	      {longestStreak}
				{tasks}
				{tasksLeft}
				{version}
				{isToday}
				on:toggleComplete={toggleComplete}
	    />
		</div>
		{#if isToday}
		<button
		  class="fixed bottom-0 left-0 m-4 border-gray-800 border-solid bg-gray-200 py-1 px-3 text-2xl font-bold rounded-lg border-2"
		  on:click={submitDay}
		>
		  Submit
		</button>
		{/if}
	{/if}
	{#if tab === 'edit'}
		<div in:scale={{delay: 400}} out:scale={{delay: 0}}>
			<EditChain
				{isFirstTime}
				{tasks}
				on:submitChain={submitChain}
			/>
		</div>
	{/if}
	{#if tab === 'calendar'}
		<div in:scale={{delay: 400}} out:scale>
			<Calendar {history}/>
		</div>
	{:else if tab === 'profile'}
		<div in:scale={{delay: 400}} out:scale>
			<h2 class="text-4xl m-4 text-blue-200">profile coming soon sorry</h2>
		</div>
	{/if}
</div>


{#if !isFirstTime}
	<button
		on:click={openNav}
		class="fixed z-20 bottom-0 right-0 m-4 border-gray-800 border-solid w-12 h-12 font-bold rounded-full leading-none border-2 {isNav ? 'bg-white text-xl' : 'text-4xl bg-gray-300' }">
		{@html isNav ? '&times;' : '⋮'}
	</button>
{/if}

{#if isNav}
	<nav
		class="mobileNav z-10 fixed rounded-full bg-blue-200 border-4 border-solid border-blue-100 shadow-lg"
		in:scale={{ start: 0.2 }}
		out:scale={{ easing: quadIn, start: 0.2, duration: 200 }}
	>
		<button
			type="button" value="today"
			on:click={changeTab}
			class="menuIcon home">🏠</button>
		<button
			type="button" value="edit"
			on:click={changeTab}
			class="menuIcon edit">✏️</button>
		<button
			type="button" value="calendar"
			on:click={changeTab}
			class="menuIcon calendar">📅</button>
		<button
			type="button" value="profile"
			on:click={changeTab}
			class="menuIcon profile">👤</button>
	</nav>
{/if}


<style>
	@keyframes spin {
		from {transform: rotateX(0deg)}
		to {transform: rotateX(180deg)}
	}
	.menuIcon {
		font-size: 2.5rem;
    border: 2px solid black;
    position: absolute;
    border-radius: 50%;
    width: 3rem;
    height: 3rem;
    background-color: white;
	}
	#scroll { max-height: calc(100vh - 13.5rem); }
	.home { top: 5.4rem; left: 2.1rem; }
	.edit { top: .5rem; left: 10rem; }
	.calendar { top: 2rem; left: 5.6rem; }
	.profile { top: 10rem; left: 1rem; }
	.mobileNav {
		width: 25rem;
		height: 25rem;
		bottom: -11rem;
		right: -11rem;
	}
	.chain {border: 3px solid currentColor; width: 55px; height: 25px; border-radius: 8px;}
	.chain:nth-of-type(odd) {animation: spin 1 2s linear}
	.chain:nth-of-type(even) {animation: spin 1 2s 1s linear; height: 15px; margin: 0 -14px;}
</style>
