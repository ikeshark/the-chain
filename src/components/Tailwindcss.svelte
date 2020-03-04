<style global>
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  body { padding: 0 }
  [class*='bg-'] {
    transition: background-color 0.5s;
  }
  [class*='text-'] {
    transition: color 0.1s;
  }
  [class*='border-'] {
    transition: border-color 0.5s;
  }
  .max-w-500 {
    max-width: 500px;
  }
</style>
