export const PLAY_UNTIL = 119;
export const REVEAL_FRAME = 60;
export const FPS = 30;
export const FRAME_DURATION_MS = 1000 / FPS;
export const HOLD_AFTER_END_MS = 350;
export const FADE_OUT_MS = 600;
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type MascotteBypassWindow = Window & { __bsSkipMascotte__?: boolean };

export const MASCOTTE_START_EVENT = "bs-mascotte-start";
export const MASCOTTE_REVEAL_EVENT = "bs-mascotte-reveal";
export const MASCOTTE_END_EVENT = "bs-mascotte-end";
export const MASCOTTE_BYPASS_EVENT = "bs-mascotte-bypass";

export const framePath = (i: number) =>
  `${BASE_PATH}/mascot-frames/f${String(i + 1).padStart(3, "0")}.webp`;

export const fireStart = () => window.dispatchEvent(new CustomEvent(MASCOTTE_START_EVENT));
export const fireReveal = () => window.dispatchEvent(new CustomEvent(MASCOTTE_REVEAL_EVENT));
export const fireEnd = () => window.dispatchEvent(new CustomEvent(MASCOTTE_END_EVENT));
