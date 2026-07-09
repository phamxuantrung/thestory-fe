import React, { useState } from 'react';

const ImageLoader = ({ src, alt, style, className, children }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', ...style }} className={className}>
      {/* Actual Image */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.4s ease',
          display: 'block',
          borderRadius: 'inherit'
        }}
      />
      
      {/* Children (e.g. text overlay) */}
      {children && (
        <div style={{ position: 'absolute', inset: 0, opacity: isLoaded ? 1 : 0, transition: 'opacity 0.4s ease', pointerEvents: 'none' }}>
          {/* Allow children to capture events if they have pointer-events: auto locally, though usually overlay is pointer-events: none */}
          <div style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}>
            {children}
          </div>
        </div>
      )}

      {/* Shimmer Overlay */}
      {!isLoaded && (
        <div className="shimmer-overlay" />
      )}
    </div>
  );
};

export default ImageLoader;
