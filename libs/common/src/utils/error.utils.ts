type ResultType<T> = { success: true; result: T } | { success: false; error: unknown }

export const catchError = <T>(fn: () => T): T extends Promise<infer U> ? Promise<ResultType<U>> : ResultType<T> => {
  if ('then' in fn) {
    return (fn as unknown as Promise<T>)
      .then((result) => ({ success: true, result }) as const)
      .catch((error: unknown) => ({ success: false, error }) as const) as any
  }

  try {
    return { success: true, result: fn() } as any
  } catch (error) {
    return { success: false, error } as any
  }
}
