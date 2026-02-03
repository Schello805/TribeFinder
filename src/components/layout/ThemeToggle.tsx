"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme, theme } = useTheme();

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button 
        className="p-1.5 rounded text-[var(--nav-muted)] opacity-50 cursor-wait"
        title="Theme wird geladen..."
        disabled
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="inline-flex items-center rounded-md border border-[var(--nav-border)] bg-[var(--nav-surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`px-2 py-1.5 text-[var(--nav-muted)] hover:text-[var(--nav-fg)] transition-colors duration-200 focus:outline-none ${
          theme === "light" ? "bg-[var(--nav-surface-hover)] text-[var(--nav-fg)]" : ""
        }`}
        aria-label="Helles Design"
        title="Hell"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`px-2 py-1.5 text-[var(--nav-muted)] hover:text-[var(--nav-fg)] transition-colors duration-200 focus:outline-none ${
          theme === "dark" ? "bg-[var(--nav-surface-hover)] text-[var(--nav-fg)]" : ""
        }`}
        aria-label="Dunkles Design"
        title="Dunkel"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => setTheme("system")}
        className={`px-2 py-1.5 text-[var(--nav-muted)] hover:text-[var(--nav-fg)] transition-colors duration-200 focus:outline-none ${
          theme === "system" ? "bg-[var(--nav-surface-hover)] text-[var(--nav-fg)]" : ""
        }`}
        aria-label="System-Design"
        title={`System (${resolvedTheme === "dark" ? "Dunkel" : "Hell"})`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l6-1 8-8a2.121 2.121 0 00-3-3l-8 8z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7l3 3" />
        </svg>
      </button>
    </div>
  );
}
