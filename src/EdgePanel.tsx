import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export default function EdgePanel({ edge, label, children }: {
  edge: 'top' | 'bottom' | 'left' | 'right';
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hovered = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = () => clearTimeout(timer.current);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className={`edgePanel edge-${edge}`}
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') { hovered.current = true; cancel(); setOpen(true); } }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') {
          hovered.current = false;
          timer.current = setTimeout(() => setOpen(false), 180);
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') { cancel(); setOpen(false); trigger.current?.focus(); }
      }}>
      <button ref={trigger} className="edgeHandle" aria-expanded={open} aria-controls={id}
        onClick={(event) => {
          cancel();
          setOpen((value) => hovered.current || !value);
        }}>{label}</button>
      <section id={id} className="edgeBody" aria-label={label} hidden={!open}>
        {children}
      </section>
    </div>
  );
}
