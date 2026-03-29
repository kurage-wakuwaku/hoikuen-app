import { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export function useFirestore(key, initialValue, user) {
  const [storedValue, setStoredValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStoredValue(initialValue);
      setIsLoading(false);
      return;
    }

    const docRef = doc(db, 'users', user.uid, 'appData', key);

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        // Data exists in cloud, sync it
        setStoredValue(snapshot.data().value);
        setIsLoading(false);
      } else {
        // Cloud is empty. Perform smart migration from local storage!
        try {
          const item = window.localStorage.getItem(key);
          const valueToInit = item ? JSON.parse(item) : initialValue;
          console.log(`Initializing ${key} in Firestore. Found local data:`, !!item);
          
          // Save the local data (or initial fallback) to Firestore in background
          setDoc(docRef, { value: valueToInit }).catch(console.error);
          
          setStoredValue(valueToInit);
        } catch (error) {
          console.warn(`Error reading localStorage key "${key}":`, error);
          setDoc(docRef, { value: initialValue }).catch(console.error);
          setStoredValue(initialValue);
        }
        setIsLoading(false);
      }
    }, (error) => {
      console.error("Firestore Error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, key]); 

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Optimistic instant UI update
      setStoredValue(valueToStore);
      
      // Background async save to Firestore
      if (user) {
        const docRef = doc(db, 'users', user.uid, 'appData', key);
        setDoc(docRef, { value: valueToStore }).catch(console.error);
      }
    } catch (error) {
      console.error("Error setting document:", error);
    }
  };

  return [storedValue, setValue, isLoading];
}
