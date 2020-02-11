<script>
  export let theme;
  export let history;
  let dataObj;
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
        weekday
      };
      if (dataObj[year][month]) {
        dataObj[year][month] = [ ...dataObj[year][month], value ];
      } else {
        dataObj[year][month] = [value];
      }
    });

    console.log(dataObj);
  }
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
</script>

<div class={`${theme.text} text-center`}>
  <h2 class="text-4xl text-center">Your History</h2>
  {#if history.length}
    <p class="text-lg -mt-2 mb-2 text-center">
      Number of recorded days: {numRecDays}
    </p>
    <div id="scroll" class="rounded-lg overflow-y-scroll">
      {#each Object.entries(dataObj).sort((a, b) => b[0] - a[0]) as year}
        <h3>{year[0]}</h3>
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
                <div
                  style="grid-column: {dayObj.weekday}-start / {dayObj.weekday}-end"
                  class="text-center text-lg text-black font-bold rounded-sm {isCompletedStyles(dayObj.isCompleted)}">
                  {dayObj.day}
                  <span class="block text-3xl -mt-2">
                    {@html isCompletedContent(dayObj.isCompleted)}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {/each} <!-- end month -->
      {/each} <!-- end year -->
    </div> <!-- end div#scroll -->
  {:else}
    <h2 class="{theme.text} text-xl">YOU AINT GOT NO HISTORY</h2>
  {/if}
</div>


<style>
  #scroll { height: 68vh;}
  .monthGrid {
    display: grid;
    grid-gap: 3px;
    grid-template-columns:
      [Mon-start] 1fr [Mon-end Tue-start] 1fr [Tue-end Wed-start] 1fr [Wed-end Thu-start] 1fr [Thu-end Fri-start] 1fr [Fri-end Sat-start] 1fr [Sat-end Sun-start] 1fr [Sun-end];
  }
</style>
