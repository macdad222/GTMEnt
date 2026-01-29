import { useRef, useEffect, useCallback } from 'react';

interface AudioVisualizerProps {
  audioBuffer: AudioBuffer | null;
  isActive: boolean;
  width?: number;
  height?: number;
  barCount?: number;
  color?: string;
}

/**
 * Audio waveform visualizer component
 * Shows animated bars based on audio data or idle animation when not active
 */
export function AudioVisualizer({
  audioBuffer,
  isActive,
  width = 120,
  height = 40,
  barCount = 12,
  color = '#00d4ff',
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const barsRef = useRef<number[]>(new Array(barCount).fill(0.1));

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const bars = barsRef.current;
    const barWidth = (width / barCount) * 0.7;
    const gap = (width / barCount) * 0.3;
    const maxBarHeight = height * 0.9;

    // Draw bars
    bars.forEach((value, i) => {
      const x = i * (barWidth + gap) + gap / 2;
      const barHeight = Math.max(4, value * maxBarHeight);
      const y = (height - barHeight) / 2;

      // Create gradient for each bar
      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, `${color}cc`);
      gradient.addColorStop(1, `${color}66`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2);
      ctx.fill();

      // Add glow effect when active
      if (isActive && value > 0.3) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
  }, [width, height, barCount, color, isActive]);

  const animate = useCallback(() => {
    const bars = barsRef.current;

    if (isActive && audioBuffer) {
      // Use audio data to drive visualization
      const channelData = audioBuffer.getChannelData(0);
      const samplesPerBar = Math.floor(channelData.length / barCount);

      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        const start = i * samplesPerBar;
        for (let j = 0; j < samplesPerBar; j++) {
          sum += Math.abs(channelData[start + j] || 0);
        }
        const average = sum / samplesPerBar;
        // Smooth transition
        bars[i] = bars[i] * 0.7 + average * 3 * 0.3;
      }
    } else if (isActive) {
      // Listening animation - gentle wave
      const time = Date.now() / 1000;
      for (let i = 0; i < barCount; i++) {
        const wave = Math.sin(time * 2 + i * 0.5) * 0.3 + 0.4;
        bars[i] = bars[i] * 0.9 + wave * 0.1;
      }
    } else {
      // Idle state - minimal bars
      for (let i = 0; i < barCount; i++) {
        bars[i] = bars[i] * 0.95 + 0.1 * 0.05;
      }
    }

    draw();
    animationRef.current = requestAnimationFrame(animate);
  }, [isActive, audioBuffer, barCount, draw]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="opacity-90"
      style={{ width, height }}
    />
  );
}

