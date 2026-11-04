"use client";

import { useSyncExternalStore } from "react";

/**
 * Lista persistida no localStorage, exposta como store externo do React.
 * Tolera armazenamento indisponível (modo privado, cota cheia) mantendo os
 * dados em memória, e sincroniza entre abas pelo evento `storage`.
 */
export function createLocalStore<T>(key: string, parse: (items: unknown[]) => T[]) {
  const EMPTY: T[] = [];
  let cache: T[] | null = null;
  const listeners = new Set<() => void>();

  function read(): T[] {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return EMPTY;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parse(parsed) : EMPTY;
    } catch {
      return EMPTY;
    }
  }

  function get(): T[] {
    if (cache === null) cache = read();
    return cache;
  }

  function set(items: T[]) {
    cache = items;
    try {
      window.localStorage.setItem(key, JSON.stringify(items));
    } catch {
      // Armazenamento indisponível: mantém só em memória.
    }
    listeners.forEach((l) => l());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        cache = read();
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  function useItems(): T[] {
    return useSyncExternalStore(subscribe, get, () => EMPTY);
  }

  return { get, set, useItems };
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
