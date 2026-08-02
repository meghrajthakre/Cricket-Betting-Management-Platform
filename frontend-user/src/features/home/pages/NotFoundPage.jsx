import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Large 404 */}
        <h1 className="text-8xl md:text-9xl font-rajdhani font-bold text-[var(--color-primary)] mb-4">
          404
        </h1>

        {/* Message */}
        <h2 className="text-2xl md:text-3xl font-rajdhani font-semibold text-[var(--color-text-dark)] mb-2">
          Page Not Found
        </h2>
        <p className="text-[var(--color-text-dark)] opacity-80 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Home button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="px-8 py-3 bg-[var(--color-btn-bg)] text-white font-semibold rounded-md hover:bg-[var(--color-btn-hover)] transition duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFound;