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
export const day = writable(formatDate(new Date().getTime()));

// ......
// TASKS
// ......
export const tasks = writable(JSON.parse(localStorage.getItem('tasks')) || []);

export const isFirstTime = writable(true);
