import { useEffect, useRef } from 'react';

interface EscapeEntry {
  id: number;
  onClose: () => void;
}

const escapeStack: EscapeEntry[] = [];
let nextEscapeId = 1;

export function pushEscapeHandler(onClose: () => void): () => void {
  const id = nextEscapeId++;
  escapeStack.push({ id, onClose });
  return () => {
    const idx = escapeStack.findIndex((entry) => entry.id === id);
    if (idx !== -1) {
      escapeStack.splice(idx, 1);
    }
  };
}

export function popAndRunTopEscapeHandler(): boolean {
  if (escapeStack.length === 0) return false;
  const top = escapeStack[escapeStack.length - 1];
  top.onClose();
  return true;
}

/**
 * Registers a modal or popup on the LIFO Escape stack while `isOpen` is true.
 * Pressing ESC closes only the top-most open layer step by step.
 */
export function useEscapeClose(isOpen: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    return pushEscapeHandler(() => onCloseRef.current());
  }, [isOpen]);
}
