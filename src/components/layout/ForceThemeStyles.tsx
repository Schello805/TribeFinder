"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ForceThemeStyles() {
  useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <style jsx global>{`
        /* NUCLEAR OPTION FOR INPUT TEXT COLORS */
        html body input,
        html body textarea,
        html body select {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
          caret-color: #000000 !important;
          opacity: 1 !important;
        }

        html.dark body input,
        html.dark body textarea,
        html.dark body select {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #ffffff !important;
          opacity: 1 !important;
        }

        /* Placeholder overrides */
        html body ::placeholder {
          color: #4b5563 !important; /* gray-600 */
          -webkit-text-fill-color: #4b5563 !important;
          opacity: 1 !important;
        }

        html.dark body ::placeholder {
          color: #9ca3af !important; /* gray-400 */
          -webkit-text-fill-color: #9ca3af !important;
          opacity: 1 !important;
        }
        
        /* Autofill fixes */
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
          -webkit-text-fill-color: #000000 !important;
          -webkit-box-shadow: 0 0 0px 1000px #ffffff inset !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        html.dark input:-webkit-autofill,
        html.dark input:-webkit-autofill:hover, 
        html.dark input:-webkit-autofill:focus, 
        html.dark input:-webkit-autofill:active {
          -webkit-text-fill-color: #ffffff !important;
          -webkit-box-shadow: 0 0 0px 1000px #374151 inset !important;
        }
      `}</style>
    </>
  );
}
