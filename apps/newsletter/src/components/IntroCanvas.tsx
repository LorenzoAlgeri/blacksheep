"use client";

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";

const FRAME_W = 1920;
const FRAME_H = 1080;
const TOTAL_FRAMES = 99;
const STOP_FRAME = 98;
const FPS = 25;

export interface IntroCanvasHandle {
  play: () => Promise<void>;
  getCurrentFrame: () => number;
  isComplete: () => boolean;
}

export const IntroCanvas = forwardRef<
  IntroCanvasHandle,
  {
    onFrameUpdate?: (frame: number) => void;
    onComplete?: () => void;
    className?: string;
  }
>(function IntroCanvas({ onFrameUpdate, onComplete, className }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const isCompleteRef = useRef(false);
  const loadedCountRef = useRef(0);

  // Preload individual frames
  useEffect(() => {
    const frames: HTMLImageElement[] = [];
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = `/intro-frames/f${String(i).padStart(3, "0")}.png`;
      img.onload = () => {
        loadedCountRef.current++;
      };
      frames.push(img);
    }
    framesRef.current = frames;
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Set canvas size based on container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    const img = framesRef.current[frameIndex];
    if (!canvas || !img || !img.complete) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw frame full size — frame 1:1 with viewport, no scaling
    ctx.drawImage(img, 0, 0, rect.width, rect.height);
  }, []);

  const play = useCallback(() => {
    return new Promise<void>((resolve) => {
      // Wait until at least the first few frames are loaded
      if (loadedCountRef.current < 5) {
        const checkLoaded = setInterval(() => {
          if (loadedCountRef.current >= 5) {
            clearInterval(checkLoaded);
            startPlayback(resolve);
          }
        }, 50);
        return;
      }
      startPlayback(resolve);
    });

    function startPlayback(resolve: () => void) {
      frameRef.current = 0;
      isPlayingRef.current = true;
      isCompleteRef.current = false;
      lastTimeRef.current = performance.now();

      const frameDuration = 1000 / FPS;

      const tick = (now: number) => {
        if (!isPlayingRef.current) return;

        const elapsed = now - lastTimeRef.current;
        if (elapsed >= frameDuration) {
          lastTimeRef.current = now - (elapsed % frameDuration);
          drawFrame(frameRef.current);
          onFrameUpdate?.(frameRef.current);

          frameRef.current++;
          if (frameRef.current >= STOP_FRAME) {
            // Hold on the last drawn frame (frame 97, index-based)
            isPlayingRef.current = false;
            isCompleteRef.current = true;
            onComplete?.();
            resolve();
            return;
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    }
  }, [drawFrame, onComplete, onFrameUpdate]);

  useImperativeHandle(ref, () => ({
    play,
    getCurrentFrame: () => frameRef.current,
    isComplete: () => isCompleteRef.current,
  }));

  return <canvas ref={canvasRef} className={className} style={{ width: "100%", height: "100%" }} />;
});
