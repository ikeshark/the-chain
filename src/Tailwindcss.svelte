<style global>
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  body {
    max-width: 666px;
    margin: 0 auto;
    padding: 0px;
  }
  [class*='bg-'] {
    transition: background-color 0.5s;
  }
  [class*='text-'] {
    transition: color 0.1s;
  }
  [class*='border-'] {
    transition: border-color 0.5s;
  }
</style>
