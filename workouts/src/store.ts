import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { SEED_DATA } from './seed';
import type { AppData, CardioEntry, Category, Day, Equipment, Exercise, LiftEntry, SetEntry } from './types';

const STORAGE_KEY = 'workouts:data:v1';

const EMPTY_DAY: Day = { lifts: [], cardio: [] };

const newId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const isAppData = (value: unknown): value is AppData =>
  typeof value === 'object' &&
  value !== null &&
  'exercises' in value &&
  Array.isArray(value.exercises) &&
  'days' in value &&
  typeof value.days === 'object' &&
  value.days !== null;

const load = async (): Promise<AppData> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return SEED_DATA;
  const parsed: unknown = JSON.parse(raw);
  return isAppData(parsed) ? parsed : SEED_DATA;
};

const withDay = (data: AppData, date: string, change: (day: Day) => Day): AppData => {
  const next = change(data.days[date] ?? EMPTY_DAY);
  const days = { ...data.days };
  if (next.lifts.length === 0 && next.cardio.length === 0) delete days[date];
  else days[date] = next;
  return { ...data, days };
};

const withLift = (data: AppData, date: string, index: number, change: (lift: LiftEntry) => LiftEntry): AppData =>
  withDay(data, date, (day) => ({
    ...day,
    lifts: day.lifts.map((lift, position) => (position === index ? change(lift) : lift)),
  }));

export type NewExercise = { name: string; category: Category; equipment: Equipment };

export type Store = {
  data: AppData;
  ready: boolean;
  addLift: (date: string, exerciseId: string, sets: SetEntry[]) => void;
  removeLift: (date: string, index: number) => void;
  moveLift: (date: string, index: number, offset: -1 | 1) => void;
  addSet: (date: string, index: number) => void;
  updateSet: (date: string, index: number, setIndex: number, patch: Partial<SetEntry>) => void;
  removeSet: (date: string, index: number, setIndex: number) => void;
  addCardio: (date: string, kind: string, minutes: number) => void;
  removeCardio: (date: string, id: string) => void;
  addExercise: (exercise: NewExercise) => Exercise;
  updateExercise: (id: string, patch: Partial<Omit<Exercise, 'id'>>) => void;
};

export const useStore = (): Store => {
  const [data, setData] = useState<AppData>(SEED_DATA);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    load()
      .then(setData)
      .catch(() => setData(SEED_DATA))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => undefined);
  }, [data, ready]);

  const addLift = useCallback((date: string, exerciseId: string, sets: SetEntry[]) => {
    setData((current) => withDay(current, date, (day) => ({ ...day, lifts: [...day.lifts, { exerciseId, sets }] })));
  }, []);

  const removeLift = useCallback((date: string, index: number) => {
    setData((current) =>
      withDay(current, date, (day) => ({ ...day, lifts: day.lifts.filter((_, position) => position !== index) })),
    );
  }, []);

  const moveLift = useCallback((date: string, index: number, offset: -1 | 1) => {
    setData((current) =>
      withDay(current, date, (day) => {
        const target = index + offset;
        const moving = day.lifts[index];
        const displaced = day.lifts[target];
        if (!moving || !displaced) return day;
        const lifts = [...day.lifts];
        lifts[index] = displaced;
        lifts[target] = moving;
        return { ...day, lifts };
      }),
    );
  }, []);

  const addSet = useCallback((date: string, index: number) => {
    setData((current) =>
      withLift(current, date, index, (lift) => {
        const last = lift.sets[lift.sets.length - 1];
        return { ...lift, sets: [...lift.sets, { weight: last?.weight ?? null, reps: null }] };
      }),
    );
  }, []);

  const updateSet = useCallback((date: string, index: number, setIndex: number, patch: Partial<SetEntry>) => {
    setData((current) =>
      withLift(current, date, index, (lift) => ({
        ...lift,
        sets: lift.sets.map((set, position) => (position === setIndex ? { ...set, ...patch } : set)),
      })),
    );
  }, []);

  const removeSet = useCallback((date: string, index: number, setIndex: number) => {
    setData((current) =>
      withLift(current, date, index, (lift) => ({
        ...lift,
        sets: lift.sets.filter((_, position) => position !== setIndex),
      })),
    );
  }, []);

  const addCardio = useCallback((date: string, kind: string, minutes: number) => {
    const entry: CardioEntry = { id: newId(), kind, minutes };
    setData((current) => withDay(current, date, (day) => ({ ...day, cardio: [...day.cardio, entry] })));
  }, []);

  const removeCardio = useCallback((date: string, id: string) => {
    setData((current) =>
      withDay(current, date, (day) => ({ ...day, cardio: day.cardio.filter((entry) => entry.id !== id) })),
    );
  }, []);

  const addExercise = useCallback((exercise: NewExercise): Exercise => {
    const created: Exercise = { ...exercise, id: newId(), repTarget: 9 };
    setData((current) => ({ ...current, exercises: [...current.exercises, created] }));
    return created;
  }, []);

  const updateExercise = useCallback((id: string, patch: Partial<Omit<Exercise, 'id'>>) => {
    setData((current) => ({
      ...current,
      exercises: current.exercises.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }, []);

  return useMemo(
    () => ({
      data,
      ready,
      addLift,
      removeLift,
      moveLift,
      addSet,
      updateSet,
      removeSet,
      addCardio,
      removeCardio,
      addExercise,
      updateExercise,
    }),
    [
      data,
      ready,
      addLift,
      removeLift,
      moveLift,
      addSet,
      updateSet,
      removeSet,
      addCardio,
      removeCardio,
      addExercise,
      updateExercise,
    ],
  );
};
