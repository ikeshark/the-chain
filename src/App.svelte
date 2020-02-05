<script>
	import { onMount } from 'svelte';
	import { scale } from 'svelte/transition';
	import { bounceOut, quadIn } from 'svelte/easing';

	import Tailwindcss from './Tailwindcss.svelte';
	import EditChain from './EditChain.svelte';
	import Today from './Today.svelte';
	import User from './User.svelte';
	import Calendar from './Calendar.svelte';

	let isNav = false;
	let isFirstTime = true;

	let tab = '';

	let day = new Date();
	let tasks = [];
	let history = [];
	let currentStreak = 0;
	let longestStreak = 0;
	let version = 0;

	const themes = {
		day: {
			bg: 'bg-orange-200',
			border: 'border-red-900',
			text: 'text-red-800',
			invertBg: 'bg-red-800',
			invertBorder: 'border-orange-500',
			invertText: 'text-orange-200',
			name: 'day',
		},
		night: {
			bg: 'bg-gray-800',
			border: 'border-blue-100',
			text: 'text-blue-200',
			invertBg: 'bg-blue-200',
			invertBorder: 'border-blue-600',
			invertText: 'text-gray-800',
			name:'night'
		},
		green: {
			bg: 'bg-green-800',
			border: 'border-green-100',
			text: 'text-yellow-300',
			invertBg: 'bg-yellow-300',
			invertBorder: 'border-green-600',
			invertText: 'text-green-800',
			name:'green'
		},
		indigo: {
			bg: 'bg-indigo-800',
			border: 'border-indigo-100',
			text: 'text-purple-300',
			invertBg: 'bg-purple-300',
			invertBorder: 'border-indigo-600',
			invertText: 'text-indigo-800',
			name:'indigo'
		},
	}
	// optional night invertBorder = border-gray-500
	// optional night bg = bg-blue-900
	let theme = themes.night;

	onMount(() => {
		if (localStorage.tasks) {
			isFirstTime = false;
			tab = 'profile';
			tasks = JSON.parse(localStorage.getItem('tasks'));
			const currentChain = JSON.parse(localStorage.getItem('currentChain'));

			// if storing num in localStorage that is in obj (using JSON.parse / stringify)
			// you will have a number, no need to parse
			version = currentChain.version;

			if (localStorage.history) {
				history = JSON.parse(localStorage.getItem('history'));
				const epoch = history[history.length - 1].day;
				day = new Date(epoch);
				day = new Date(day.setDate(day.getDate() + 1));
			}
			if (localStorage.currentStreak) {
				// if storing a number directly in local storage it gets turned into a string
				currentStreak = parseInt(localStorage.getItem('currentStreak'));
			}
			if (localStorage.longestStreak) {
				longestStreak = parseInt(localStorage.getItem('longestStreak'));
			}
			if (localStorage.theme) {
				theme = themes[localStorage.getItem('theme')]
			}

		} else {
			tab = 'edit';
		}

	});

	$: tasksLeft = tasks.filter(task => task.isCompleted === false).length;
	$: isFuture = (new Date().getDate() < day.getDate());
	$: if (tasks.length) localStorage.setItem('tasks', JSON.stringify(tasks));

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
		const isCompleted = tasksLeft ? false : true;
		currentStreak = isCompleted ? currentStreak + 1 : 0;
		history = [...history, { day: day.getTime(), isCompleted }];
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
		version = parseFloat(version.toFixed(2));

		let chainHistory = [];
		if (isFirstTime) {
			isFirstTime = false;
		} else if (localStorage.chainHistory) {
			chainHistory = JSON.parse(localStorage.getItem('chainHistory'))
		}
		chainHistory = [ ...chainHistory, {
			version,
			startDay: day.getTime(),
			tasks: tasks.map(task => task.title)
		}]

		localStorage.setItem('chainHistory', JSON.stringify(chainHistory));
		localStorage.setItem('currentChain', JSON.stringify({
			startDay: day.getTime(),
			version
		}))

		tab = 'today';
	}

	function changeTheme(e) {
		theme = themes[e.detail.newTheme];
	}
	function setTheme(e) {
		localStorage.setItem('theme', e.detail.newTheme);
	}

</script>

<Tailwindcss />

<div class={`p-2 h-screen mx-auto relative overflow-hidden ${theme.bg}`}>
	<h1 class={`text-3xl mb-2 text-center ${theme.text}`}>Don’t Break the Chain</h1>
	<div class={`flex items-center justify-center mb-4 ${theme.text}`}>
		<div class="chain"></div>
		<div class="chain"></div>
		<div class="chain"></div>
		<div class="chain"></div>
		<div class="chain"></div>
		<div class="chain"></div>
		<div class="chain"></div>
	</div>

	{#if tab === 'today'}
		<div in:scale={{delay: 500}} out:scale={{delay: 0}}>
			<Today
				{day}
	      {currentStreak}
	      {longestStreak}
				{tasks}
				{tasksLeft}
				{version}
				{isFuture}
				{theme}
				on:toggleComplete={toggleComplete}
	    />
		</div>
		{#if !isFuture}
		<button
		  class="absolute bottom-0 left-0 m-4 border-gray-800 border-solid bg-gray-200 py-1 px-3 text-2xl font-bold rounded-lg border-2"
		  on:click={submitDay}
		>
		  Submit
		</button>
		{/if}
	{/if}
	{#if tab === 'edit'}
		<div in:scale={{delay: 400}} out:scale={{delay: 0}}>
			<EditChain
				{theme}
				{isFirstTime}
				{tasks}
				on:submitChain={submitChain}
			/>
		</div>
	{/if}
	{#if tab === 'calendar'}
		<div in:scale={{delay: 400}} out:scale={{delay: 0}}>
			<Calendar {theme}  {history} />
		</div>
	{:else if tab === 'profile'}
		<div in:scale={{delay: 400}} out:scale>
			<User
				{themes}
				{theme}
				on:setTheme={setTheme}
				on:changeTheme={changeTheme}
			/>
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
		class={`mobileNav z-10 fixed rounded-full ${theme.invertBg} border-4 border-solid ${theme.border} shadow-lg`}
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
	.chain {
		border: 3px solid currentColor;
		width: 55px;
		height: 25px;
		border-radius: 8px;
	}
	.chain:nth-of-type(odd) {animation: spin 1 2s linear}
	.chain:nth-of-type(even) {animation: spin 1 2s 1s linear; height: 15px; margin: 0 -14px;}
</style>
