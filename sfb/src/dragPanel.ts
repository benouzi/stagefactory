// Un volet (assistant, atelier) se déplace par son en-tête et s'agrandit par son coin bas droit.
export function dragPanel(e: { target: EventTarget | null; currentTarget: EventTarget | null; clientX: number; clientY: number; preventDefault(): void }) {
  if ((e.target as HTMLElement).closest("button, input, select, a")) return; const el = (e.currentTarget as HTMLElement).parentElement as HTMLElement, r = el.getBoundingClientRect(), sx = e.clientX, sy = e.clientY; e.preventDefault();
  el.style.right = "auto"; el.style.bottom = "auto"; el.style.width = r.width + "px"; el.style.height = r.height + "px"; el.style.left = r.left + "px"; el.style.top = r.top + "px";
  const mv = (ev: MouseEvent) => { el.style.left = Math.max(0, Math.min(innerWidth - 120, r.left + ev.clientX - sx)) + "px"; el.style.top = Math.max(30, Math.min(innerHeight - 60, r.top + ev.clientY - sy)) + "px"; };
  const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); }; window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
}
