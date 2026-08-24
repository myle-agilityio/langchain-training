// Tools stringify their result, but a run can still be cut short mid-stream.
export const parseResult = <T>(result: string | undefined): T | null => {
  if (!result) return null;
  try {
    return JSON.parse(result) as T;
  } catch {
    return null;
  }
};
