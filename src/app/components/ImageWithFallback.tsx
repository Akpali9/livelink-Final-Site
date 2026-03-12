import { useState } from 'react';

interface ImageWithFallbackProps {
  src?: string;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
}

export function ImageWithFallback({ 
  src, 
  alt = '', 
  className = '', 
  fallback 
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className={`${className} bg-gray-200 flex items-center justify-center`}>
        <span className="text-gray-400 text-xs">No image</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
      crossOrigin="anonymous"
    />
  );
}
