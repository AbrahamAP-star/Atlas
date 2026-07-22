import type { ReactNode, ElementType, CSSProperties } from "react";
import { useReveal } from "./hooks";

export function Reveal({
  as: Tag = "div",
  delay = 0,
  className = "",
  immediate = false,
  children,
}: {
  as?: ElementType;
  delay?: number;
  className?: string;
  /** Above-the-fold content: animate via CSS on mount instead of waiting
   *  for hydration + IntersectionObserver, so it doesn't block FCP. */
  immediate?: boolean;
  children: ReactNode;
}) {
  // useReveal siempre se llama (Rules of Hooks) aunque "immediate" no
  // use su resultado; evita una llamada condicional de hook.
  const { ref, visible } = useReveal();

  if (immediate) {
    const style: CSSProperties = { animationDelay: `${delay}ms` };
    return (
      <Tag style={style} className={`reveal-immediate ${className}`}>
        {children}
      </Tag>
    );
  }

  const style: CSSProperties = { transitionDelay: `${delay}ms` };
  return (
    <Tag
      ref={ref as never}
      style={style}
      className={`reveal ${visible ? "reveal-in" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}
