import React, { useState } from 'react';
import { motion } from 'framer-motion';

const ImageLoader = ({ src, alt, style, className }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', ...style }} className={className}>
      {/* Skeleton Shimmer */}
      {!isLoaded && (
        <motion.div
          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, #fdf2f8 25%, #fce7f3 50%, #fdf2f8 75%)',
            backgroundSize: '400% 100%',
            borderRadius: 'inherit'
          }}
        />
      )}
      
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
    </div>
  );
};

export default ImageLoader;
