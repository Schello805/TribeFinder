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
    } else if (e.key === 'Backspace' && input === '' && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
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
      <div className="flex flex-wrap gap-2 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 min-h-[42px]">
        <AnimatePresence>
          {selectedTags.map(tag => (
            <motion.span
              key={tag}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-indigo-400 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800 hover:text-indigo-600 dark:hover:text-indigo-100 focus:outline-none"
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
            onKeyDown={handleKeyDown}
            placeholder={selectedTags.length === 0 ? "Tanzstile suchen oder hinzufügen..." : ""}
            className="w-full border-none focus:ring-0 p-0 text-sm text-black dark:text-white bg-transparent placeholder-gray-600 dark:placeholder-gray-400 h-7"
          />
          
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-50 max-h-60 overflow-auto"
              >
                {isLoading ? (
                  <div className="p-2 text-sm text-gray-500 dark:text-gray-400">Laden...</div>
                ) : suggestions.length > 0 ? (
                  <ul>
                    {suggestions.map((suggestion) => (
                      <li
                        key={suggestion.id}
                        onClick={() => addTag(suggestion.name)}
                        className="px-3 py-2 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm text-gray-700 dark:text-gray-200"
                      >
                        {suggestion.name}
                      </li>
                    ))}
                    {input && !suggestions.find(s => s.name.toLowerCase() === input.toLowerCase()) && input.length >= 2 && (
                      <li
                        onClick={() => addTag(input)}
                        className="px-3 py-2 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm text-indigo-600 dark:text-indigo-400 border-t border-gray-100 dark:border-gray-700"
                      >
                         Neu hinzufügen: &quot;{input}&quot; (Wartet auf Freigabe)
                      </li>
                    )}
                  </ul>
                ) : input.length >= 2 ? (
                  <div 
                    onClick={() => addTag(input)}
                    className="px-3 py-2 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm text-indigo-600 dark:text-indigo-400"
                  >
                    Neu hinzufügen: &quot;{input}&quot; (Wartet auf Freigabe)
                  </div>
                ) : (
                  <div className="p-2 text-sm text-gray-500 dark:text-gray-400 italic">Keine weiteren Vorschläge</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Wähle aus der Liste oder tippe Enter für neue Tanzarten.
      </p>
    </div>
  );
}
