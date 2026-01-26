import { useState, useEffect } from 'react';

export const FloatingActionButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 z-40 p-3 rounded-full bg-primary text-white shadow-lg shadow-primary/40 hover:bg-primary-dark hover:-translate-y-1 transition-all duration-300 backdrop-blur-sm"
      title="Back to top"
      aria-label="Back to top"
    >
      <span className="material-symbols-outlined">arrow_upward</span>
    </button>
  );
};

