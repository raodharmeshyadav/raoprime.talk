import React, { useEffect, useRef } from 'react';
import { AudioVisualizerProps } from '../types';

const Visualizer: React.FC<AudioVisualizerProps> = ({ analyser, isActive, color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isActive) return;

      const barWidth = (canvas.width / bufferLength) * 3; // Wider bars
      let x = 0;

      // Draw mirrored from center for waveform look
      const centerX = canvas.width / 2;

      // We'll draw only a subset of frequencies (low-mids) for better visual
      const relevantData = dataArray.slice(0, bufferLength / 2);
      const step = Math.ceil(relevantData.length / 20); // Draw ~20 bars

      for (let i = 0; i < relevantData.length; i += step) {
        const val = relevantData[i];
        const barHeight = (val / 255) * canvas.height;

        // Simple Color based on prop
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6 + (val/255) * 0.4;

        // Rounded pill shape
        const radius = barWidth/2;

        // Right side
        ctx.beginPath();
        ctx.roundRect(centerX + x, (canvas.height - barHeight)/2, barWidth - 4, barHeight || 4, [10]);
        ctx.fill();

        // Left side (Mirror)
        if (x > 0) {
            ctx.beginPath();
            ctx.roundRect(centerX - x, (canvas.height - barHeight)/2, barWidth - 4, barHeight || 4, [10]);
            ctx.fill();
        }

        x += barWidth;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isActive, color]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={100}
      className="w-full h-full"
    />
  );
};

export default Visualizer;