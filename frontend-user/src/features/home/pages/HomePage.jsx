import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <main
      className="relative min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center"
      style={{
        backgroundImage: `url('https://media.istockphoto.com/id/177427917/photo/close-up-of-red-cricket-ball-and-bat-sitting-on-grass.jpg?s=612x612&w=0&k=20&c=DcorerbBUeDNTfld3OclgHxCty4jih2yDCzipffX6zw=')`,
      }}
      role="img"
      aria-label="Scenic mountain landscape background"
    >
      {/* Semi-transparent overlay for better text contrast */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content container – fully responsive with proper padding */}
      <div className="relative z-10 text-center bg-white/30 rounded-lg shadow-lg py-8 px-10 sm:px-12 md:py-10 md:px-16 lg:px-20 backdrop-blur-sm">
        {/* Heading – scales down nicely on mobile */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 md:mb-8 drop-shadow-lg">
          Sonu7777
        </h1>

        {/* Login button */}
        <button
          onClick={handleLogin}
          className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-gray-900 font-semibold rounded-full shadow-xl hover:scale-105 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent cursor-pointer text-base sm:text-lg"
        >
          Log in
        </button>
      </div>
    </main>
  );
};

export default HomePage;