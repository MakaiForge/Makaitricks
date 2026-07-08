import { useEffect, useRef, type RefObject } from "react";

export function useClickOutside<T extends HTMLElement = HTMLDivElement>(
  onOutsideClick: () => void
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutsideClick();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onOutsideClick]);

  return ref;
}
