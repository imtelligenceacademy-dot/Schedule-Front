import { useEffect, useState, type RefObject } from "react";

/**
 * Click-and-drag panning for a horizontally scrolling container (mouse only; touch scrolls
 * natively). Horizontal movement scrolls the container, vertical movement scrolls the page.
 * A drag longer than a few pixels swallows the click so schedule cards don't open.
 * Change `key` whenever the scroll container is re-mounted so the listeners re-bind.
 */
export function useDragScroll(ref: RefObject<HTMLElement | null>, key: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startX = 0,
      startY = 0,
      lastX = 0,
      lastY = 0,
      pointer: number | null = null,
      dragged = false;
    function down(e: PointerEvent) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      pointer = e.pointerId;
      startX = lastX = e.clientX;
      startY = lastY = e.clientY;
      dragged = false;
    }
    function move(e: PointerEvent) {
      if (e.pointerId !== pointer || !el) return;
      if (!dragged && Math.hypot(e.clientX - startX, e.clientY - startY) < 5) return;
      if (!dragged) {
        dragged = true;
        el.setPointerCapture(e.pointerId);
        el.classList.add("dragging");
      }
      el.scrollLeft -= e.clientX - lastX;
      window.scrollBy(0, -(e.clientY - lastY));
      lastX = e.clientX;
      lastY = e.clientY;
    }
    function up(e: PointerEvent) {
      if (e.pointerId !== pointer || !el) return;
      pointer = null;
      el.classList.remove("dragging");
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    }
    function click(e: MouseEvent) {
      if (dragged) {
        e.stopPropagation();
        e.preventDefault();
        dragged = false;
      }
    }
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("click", click, true);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("click", click, true);
    };
  }, [ref, key]);
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const listener = () => setMatches(list.matches);
    listener();
    list.addEventListener("change", listener);
    return () => list.removeEventListener("change", listener);
  }, [query, setMatches]);
  return matches;
}
