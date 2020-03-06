import { writable, derived } from 'svelte/store';

// ......
// THEME
// ......
export const themes = {
  day: {
    bg: 'bg-orange-100',
    border: 'border-red-800',
    text: 'text-red-800',
    invertBg: 'bg-red-800',
    invertBorder: 'border-orange-500',
    invertText: 'text-orange-200',
    name: 'day',
  },
  night: {
    bg: 'bg-gray-800',
    border: 'border-blue-200',
    text: 'text-blue-200',
    invertBg: 'bg-blue-200',
    invertBorder: 'border-blue-700',
    invertText: 'text-gray-800',
    name:'night'
  },
  green: {
    bg: 'bg-green-900',
    border: 'border-yellow-400',
    text: 'text-yellow-300',
    invertBg: 'bg-green-200',
    invertBorder: 'border-green-700',
    invertText: 'text-green-900',
    name:'green'
  },
  indigo: {
    bg: 'bg-indigo-800',
    border: 'border-indigo-200',
    text: 'text-purple-300',
    invertBg: 'bg-indigo-300',
    invertBorder: 'border-blue-700',
    invertText: 'text-blue-900',
    name:'indigo'
  },
}
// optional night invertBorder = border-gray-500
// optional night bg = bg-blue-900
export const themeName = writable('night');
export const theme = derived(themeName, $themeName => themes[$themeName])

// ......
// DATE
// ......
function formatDate(epoch) {
  const date = new Date(epoch);
  return new Date(date.setHours(0, 0, 0, 0));
}
export const day = writable(
  localStorage.getItem('currentDay') ?
    new Date(parseInt(localStorage.currentDay)) :
    formatDate(new Date().getTime())
);

// ......
// TASKS
// ......
function createTask() {
  const { subscribe, set, update } = writable(
    JSON.parse(localStorage.getItem('tasks')) || []
  );

  return {
    subscribe,
    set,
    update,
    reset: () => update(tasks => tasks.map(task => {
      return { ...task, isCompleted: false }
    }))
  }
}
export const tasks = createTask();

// .....
// MISC
// .....
export const isFirstTime = writable(true);

function createIsSubmitted() {
  const { subscribe, set, update } = writable(false);
  return {
    subscribe,
    submit: () => {
      set(true);
      setTimeout(() => set(false), 6000);
    }
  }
}
export const isSubmitted = createIsSubmitted();

// https://fireship.io/snippets/custom-svelte-stores/
// https://higsch.me/2019/06/22/2019-06-21-svelte-local-storage/

const createPersistedStore = (key, defaultValue) => {
	const initialJson = localStorage.getItem(key)
	const initialValue = initialJson ? JSON.parse(initialJson) : defaultValue
	const store = writable(initialValue)

	const subscribe = fn =>
		store.subscribe(current => {
			localStorage.setItem(key, JSON.stringify(current))
			return fn(current)
		})

	return {
		subscribe,
		set: store.set
	}
}

export const store = createPersistedStore("dogs", {visible: false, dogs: 0})
