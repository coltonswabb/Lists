import AsyncStorage from '@react-native-async-storage/async-storage';

/** How long to wait before each further try at reading: a read that fails at launch usually succeeds a moment later. */
const RETRY_AFTER_MS = [80, 200, 500, 1000];

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** What was kept under a key, or `failed` when the store could not be read at all. Nothing kept reads as null. */
export type Kept = { failed: false; raw: string | null } | { failed: true };

/**
 * Reads what is kept under a key, trying again a few times if the store cannot be read.
 *
 * A failed read must never be mistaken for "nothing kept": whoever asked would start from nothing and then
 * save that over what is really there. So failure is reported as such, and the caller must not save after it.
 */
export const readKept = async (key: string): Promise<Kept> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return { failed: false, raw: await AsyncStorage.getItem(key) };
    } catch {
      const delay = RETRY_AFTER_MS[attempt];
      if (delay === undefined) return { failed: true };
      await wait(delay);
    }
  }
};
