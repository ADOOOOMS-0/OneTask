
import React, { useState } from 'react';

/**
 * A custom hook to manage state in `sessionStorage`.
 * This is used for data that should persist across page reloads within a single browser tab,
 * but should not be shared across tabs or devices.
 *
 * @param key The key to use in sessionStorage.
 * @param initialValue The initial value to use if no value is found in sessionStorage.
 */
function useSessionStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

export default useSessionStorage;
