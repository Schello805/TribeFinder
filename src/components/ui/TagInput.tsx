'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Tag {
  id: string;
  name: string;
}

interface TagInputProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

export default function TagInput({ selectedTags, onChange }: TagInputProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    const fetchTags = async () => {
      // Wenn leer, zeige die ersten 20 (default) oder lade sie
      const searchTerm = input.length >= 2 ? input : '';
      
      setIsLoading(true);
      try {
        const res = await fetch(`/api/tags?search=${encodeURIComponent(searchTerm)}&approvedOnly=true`);
        if (res.ok) {
          const data = await res.json();
          // Filter out already selected tags
          setSuggestions(data.filter((t: Tag) => !selectedTags.includes(t.name)));
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce nur bei Eingabe, bei leerem Input (Fokus) sofort oder wenn sich selectedTags ändert
    const timeoutId = setTimeout(fetchTags, input ? 300 : 0);
    return () => clearTimeout(timeoutId);
  }, [input, selectedTags]);

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'Backspace' && input === '' && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };

  const handleBlur = () => {
    // Delay to allow click on a suggestion to register first.
    window.setTimeout(() => {
      const active = document.activeElement;
      if (containerRef.current && active && containerRef.current.contains(active)) return;
      setIsOpen(false);
    }, 0);
  };

  const addTag = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      onChange([...selectedTags, trimmed]);
      setInput('');
      setIsOpen(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(selectedTags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="w-full" ref={containerRef}>
      <div className="flex flex-wrap gap-2 p-2 border border-[var(--border)] rounded-md bg-[var(--surface)] focus-within:ring-2 focus-within:ring-[var(--primary)] focus-within:border-[var(--primary)] min-h-[42px]">
        <AnimatePresence>
          {selectedTags.map(tag => (
            <motion.span
              key={tag}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)]"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus:outline-none"
              >
                ×
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        
        <div className="relative flex-grow">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setIsOpen(true);
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={selectedTags.length === 0 ? "Tanzstile suchen oder hinzufügen..." : ""}
            className="w-full border-none focus:ring-0 p-0 text-sm text-[var(--foreground)] bg-transparent placeholder-[var(--muted)] h-7"
          />
          
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute left-0 right-0 top-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-lg z-50 max-h-60 overflow-auto"
              >
                {isLoading ? (
                  <div className="p-2 text-sm text-[var(--muted)]">Laden...</div>
                ) : suggestions.length > 0 ? (
                  <ul>
                    {suggestions.map((suggestion) => (
                      <li
                        key={suggestion.id}
                        onClick={() => addTag(suggestion.name)}
                        className="px-3 py-2 cursor-pointer hover:bg-[var(--surface-hover)] text-sm text-[var(--foreground)]"
                      >
                        {suggestion.name}
                      </li>
                    ))}
                    {input && !suggestions.find(s => s.name.toLowerCase() === input.toLowerCase()) && input.length >= 2 && (
                      <li
                        onClick={() => addTag(input)}
                        className="px-3 py-2 cursor-pointer hover:bg-[var(--surface-hover)] text-sm text-[var(--link)] border-t border-[var(--border)]"
                      >
                         Neu hinzufügen: &quot;{input}&quot; (Wartet auf Freigabe)
                      </li>
                    )}
                  </ul>
                ) : input.length >= 2 ? (
                  <div 
                    onClick={() => addTag(input)}
                    className="px-3 py-2 cursor-pointer hover:bg-[var(--surface-hover)] text-sm text-[var(--link)]"
                  >
                    Neu hinzufügen: &quot;{input}&quot; (Wartet auf Freigabe)
                  </div>
                ) : (
                  <div className="p-2 text-sm text-[var(--muted)] italic">Keine weiteren Vorschläge</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Wähle aus der Liste oder tippe Enter für neue Tanzarten.
      </p>
    </div>
  );
}
