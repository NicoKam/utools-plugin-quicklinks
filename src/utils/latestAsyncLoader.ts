export function createLatestAsyncLoader() {
  let generation = 0;
  return {
    async run<T>(load: () => Promise<T>, accept: (value: T) => void) {
      const currentGeneration = ++generation;
      const value = await load();
      if (currentGeneration === generation)
        accept(value);
    },
    invalidate() {
      generation++;
    },
  };
}
