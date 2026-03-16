import React, { useState } from "react";

interface ImageWithFallbackProps {
  src: string;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
}

export function ImageWithFallback({ 
  src, 
  alt = "", 
  className = "", 
  fallbackSrc = "https://via.placeholder.com/100x100?text=LiveLink" 
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [error, setError] = useState(false);

  const handleError = () => {
    if (!error) {
      setImgSrc(fallbackSrc);
      setError(true);
    }
  };

  return (
    <img 
      src={imgSrc} 
      alt={alt}
      className={className}
      onError={handleError}
      loading="lazy"
    />
  );
}