/** Whether a store's backend is a staging one: its address names staging, as ours do. */
const isStagingBackend = (backendUrl: string | null | undefined): boolean =>
  !!backendUrl && /staging/i.test(backendUrl);

export { isStagingBackend };
