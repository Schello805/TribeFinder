"use client";

import { useState, useEffect } from "react";

interface ObfuscatedEmailProps {
  email: string;
  className?: string;
}

export default function ObfuscatedEmail({ email, className = "" }: ObfuscatedEmailProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Render nothing or a placeholder on server to prevent scraping
    return <span className="text-[var(--muted)] text-sm">Lade E-Mail...</span>;
  }

  // Simple obfuscation: Split email and reconstruct
  const [user, domain] = email.split("@");

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = `mailto:${user}@${domain}`;
  };

  return (
    <a 
      href="#" 
      onClick={handleClick}
      className={className}
      title="Klicken um E-Mail zu senden"
    >
      {user}
      <span className="hidden">no-spam</span>
      @
      {domain}
    </a>
  );
}
