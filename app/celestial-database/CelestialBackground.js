'use client';

// Exact reuse of the homepage's background implementation (rotating photo
// layers behind a dark radial/linear gradient, plus a drifting starfield
// canvas on top) — same URLs, same timing, same filters/overlay values as
// SpaceTecHub.js. Kept here as its own component so the celestial database
// page can drop it in without duplicating the homepage's JSX.

import { useEffect, useRef, useState } from 'react';

const SPACE_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072',
  'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=2070',
  'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2072',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2069',
];

export default function CelestialBackground() {
  const canvasRef = useRef(null);
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const bgTimer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % SPACE_BACKGROUNDS.length);
    }, 7000);
    return () => clearInterval(bgTimer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.2 + 0.3,
      alpha: Math.random() * 0.7 + 0.3,
      speed: Math.random() * 0.2 + 0.05,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      stars.forEach((star) => {
        star.y -= star.speed;
        if (star.y < 0) {
          star.y = height;
          star.x = Math.random() * width;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      {SPACE_BACKGROUNDS.map((bgUrl, idx) => (
        <div
          key={bgUrl}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundImage: `url('${bgUrl}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
            opacity: bgIndex === idx ? 1 : 0,
            transition: 'opacity 1.8s ease-in-out',
            filter: 'brightness(0.4) contrast(1.25)',
            pointerEvents: 'none',
          }}
        />
      ))}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background:
            'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.95) 100%), linear-gradient(180deg, rgba(0,0,0,0.5) 0%, #000000 100%)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none' }} />
    </>
  );
}
