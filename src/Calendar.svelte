<script>
  export let theme;

  let history = [];
  let chainHistory = [];
  let dataObj;
  let showModal = false;
  let detail = null;

  if (localStorage.chainHistory) chainHistory = JSON.parse(localStorage.getItem('chainHistory'));
  if (localStorage.history) history = JSON.parse(localStorage.getItem('history'));

  const numRecDays = history.length;
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  if (history.length) {
    history.sort((a, b) => a.day - b.day);

    const firstEpoch = history[0].day;
    const lastEpoch =  history[history.length -1].day;

    const paddedMonths = fillOutMonth(firstEpoch, lastEpoch);

    history = [...paddedMonths[0], ...history, ...paddedMonths[1]];

    function findYears(epochA, epochZ) {
      const firstYear = new Date(epochA).getFullYear();
      const lastYear = new Date(epochZ).getFullYear();

      if (firstYear === lastYear) return [firstYear]
      else if (lastYear - firstYear === 1) {
        return [lastYear, firstYear]
      }
      else {
        let yearArray = [];
        for (let i = firstYear; i <= lastYear; i++ ) {
          yearArray.push(i);
        }
        return yearArray;
      }
    }

    function fillOutMonth(epochA, epochZ) {
      // start of month is always 1
      // if start date isn't 1, simply make an array with rest of values
      const startDate = new Date(epochA).getDate();
      let newBegDates = [];
      if (startDate !== 1) {
        let result = [];
        for (let i = 1; i < startDate; i++) {
          newBegDates.push({
            day: new Date(epochA).setDate(i),
            isCompleted: null
          });
        }
      }

      const lastDate = new Date(epochZ).getDate()
      const lastMonth = new Date(epochZ).getMonth();
      let newEndDates = [];

      for (let i = lastDate + 1; i <= 31; i++) {
        const tomorrow = new Date(epochZ)
        tomorrow.setDate(i);
        if (tomorrow.getMonth() !== lastMonth) {
          break;
        }
        newEndDates.push({
          day: new Date(epochZ).setDate(i),
          isCompleted: null
        });
      }

      return [newBegDates, newEndDates];
    }

    function createDataStructure(yearArray) {
      const dataObj = {};
      for (var i = 0; i < yearArray.length; i++) {
        dataObj[yearArray[i]] = {}
      }
      return dataObj;
    }

    dataObj = createDataStructure(
      findYears(firstEpoch, lastEpoch)
    );

    history.sort((a, b) => b.day - a.day);
    history.forEach(item => {
      const date = new Date(item.day);
      const year = date.getFullYear();
      const month = date.toLocaleDateString('en', {
        month: 'long'
      });
      const weekday = date.toLocaleDateString('en', {
        weekday: 'short'
      });

      const value = {
        isCompleted: item.isCompleted,
        day: date.getDate(),
        weekday,
        epoch: item.day,
      };
      if (dataObj[year][month]) {
        dataObj[year][month] = [ ...dataObj[year][month], value ];
      } else {
        dataObj[year][month] = [value];
      }
    });

  } // END if (history.length)

  function isCompletedStyles(isCompleted) {
    if (isCompleted === true) return 'bg-green-500'
    else if (isCompleted === false) return 'bg-red-600'
    else if (isCompleted === null) return 'bg-gray-500'
  }
  function isCompletedContent(isCompleted) {
    if (isCompleted === true) return '&check;'
    else if (isCompleted === false) return '&times;'
    else if (isCompleted === null) return '&nbsp;'
  }
  function showDetail({ target }) {
    const id = parseInt(target.id);
    detail = chainHistory.filter(item => item.startDay === id)[0];
  }
  function closeModal({ target }) {
    if (target.id === 'modal') detail = null;
  }
</script>

<div class={`${theme.text} text-center`}>
  <div class="flex justify-center items-center">
    <h2 class="text-4xl mr-8">Your History</h2>
    <p class="rounded-full shadow w-16 h-16 {theme.border} border-solid border-2 border-b text-sm">
      <span class="text-3xl block -mb-3">{numRecDays}</span>
      days
    </p>
  </div>
  {#if history.length}
    <div id="scroll" class="rounded-lg overflow-y-scroll">
      {#each Object.entries(dataObj).sort((a, b) => b[0] - a[0]) as year}
        {#if Object.entries(dataObj).length > 1}<h3>{year[0]}</h3>{/if}
        {#each Object.entries(year[1]) as month}
          <div class="last:mb-12">
            <h4 class={`text-2xl text-center ${theme.text}`}>{month[0]}</h4>
            <div class="monthGrid">
              {#each weekdays as weekday}
                <div style="grid-column: {weekday}">
                  {weekday}
                </div>
              {/each}
              {#each month[1].sort((a, b) => a.day - b.day) as dayObj}
                {#if chainHistory.map(x => x.startDay).indexOf(dayObj.epoch) !== -1}
                  <button
                    id={dayObj.epoch}
                    type="button"
                    on:click={showDetail}
                    style="grid-column: {dayObj.weekday}-start / {dayObj.weekday}-end"
                    class="text-center relative text-lg text-black font-bold rounded-sm {isCompletedStyles(dayObj.isCompleted)}">
                    {dayObj.day}
                    <span class="block text-3xl -mt-2">
                      {@html isCompletedContent(dayObj.isCompleted)}
                    </span>
                  </button>
                {:else}
                  <div
                    id={dayObj.epoch}
                    style="grid-column: {dayObj.weekday}-start / {dayObj.weekday}-end"
                    class="text-center text-lg text-black font-bold rounded-sm {isCompletedStyles(dayObj.isCompleted)}">
                    {dayObj.day}
                    <span class="block text-3xl -mt-2">
                      {@html isCompletedContent(dayObj.isCompleted)}
                    </span>
                  </div>
                {/if}
              {/each}
            </div> <!-- end grid -->
          </div>
        {/each} <!-- end month -->
      {/each} <!-- end year -->
    </div> <!-- end div#scroll -->
  {:else}
    <h2 class="{theme.text} text-xl">YOU AINT GOT NO HISTORY</h2>
  {/if}
</div>

{#if !!detail}
  <div
    class="absolute top-0 left-0 z-10 flex items-center justify-center h-screen w-screen"
    on:click={closeModal}
    id="modal">
    <div class="{theme.invertBg} {theme.invertBorder} border-2 p-2 shadow-lg overflow-y-scroll w-10/12 shadow-lg">
      <h2 class={`text-2xl text-center mb-2 ${theme.invertText}`}>
        Version: {detail.version}
      </h2>
      <ul>
        {#each detail.tasks as task}
          <li class={`
      			py-1 px-2 mb-1 shadow-sm
      			border ${theme.border}
      			${theme.text} ${theme.bg}
      			text-xl last:mb-12
      		`}>
          	{task}
          </li>
        {/each}
      </ul>
    </div>
  </div>
{/if}

<style>
  #modal {
    background-color: rgba(0, 0, 0, 0.7);
  }
  #scroll { height: 68vh;}
  button {
    --width: 5px;
    --bg: rgba(255,255,255,0.4);
    background-blend-mode: lighten;
    background-image: repeating-linear-gradient(34deg, transparent, transparent var(--width), var(--bg) var(--width), var(--bg) calc(var(--width) * 2));
  }

  .monthGrid {
    display: grid;
    grid-gap: 3px;
    /* i need to change this for i18n purposes */
    grid-template-columns:
      [Mon-start] 1fr [Mon-end Tue-start] 1fr [Tue-end Wed-start] 1fr [Wed-end Thu-start] 1fr [Thu-end Fri-start] 1fr [Fri-end Sat-start] 1fr [Sat-end Sun-start] 1fr [Sun-end];
  }
</style>
