import { logger, safeStringify } from "@/utils/logger";
import storage from "@/utils/storage";
import type { SoundEvent, SoundPreferences } from "@/types/preferences";
import { DEFAULT_PREFERENCES } from "@/utils/settings/preferences/defaults";

let audioContext: AudioContext | null = null;
// The legacy all-sounds switch: a terminal that had it off stays silent.
let masterEnabled = true;
let eventPrefs: SoundPreferences = DEFAULT_PREFERENCES.sounds;

const initializeAudioContext = async (): Promise<void> => {
  try {
    if (!audioContext) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioContext = new AudioContextClass();
    }

    // Resume context if it's suspended (Chrome requirement)
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
  } catch (error) {
    void logger.warn(`AudioContext initialization failed: ${safeStringify(error)}`);
    masterEnabled = false;
  }
};

const loadSettings = async (): Promise<void> => {
  try {
    const savedEnabled = await storage.getItem("sound_enabled");
    masterEnabled = savedEnabled ?? true;
    const prefs = await storage.getItem<{ sounds?: Partial<SoundPreferences> }>("user_preferences");
    eventPrefs = { ...DEFAULT_PREFERENCES.sounds, ...prefs?.sounds };
  } catch (error) {
    void logger.warn(`Failed to load sound settings: ${safeStringify(error)}`);
  }
};

const playBeep = (frequency: number, duration: number, volume: number = 0.1): void => {
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  oscillator.type = "sine";

  // Fade in and out to prevent clicks
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

/** Each event sounds different, so the cashier can tell them apart without looking. */
const PATTERNS: Record<SoundEvent, () => void> = {
  // One short high beep: the item is in.
  scan: () => playBeep(1100, 0.07, 0.08),
  // Two low buzzes: look at the screen.
  scanError: () => {
    playBeep(330, 0.15, 0.15);
    setTimeout(() => playBeep(330, 0.15, 0.15), 200);
  },
  // Two rising beeps: the sale went through.
  sale: () => {
    playBeep(800, 0.1, 0.1);
    setTimeout(() => playBeep(1000, 0.1, 0.1), 120);
  },
  // One long low buzz.
  error: () => playBeep(400, 0.3, 0.15),
};

const play = async (event: SoundEvent): Promise<void> => {
  try {
    await initializeAudioContext();
    if (!audioContext) return;
    PATTERNS[event]();
  } catch (error) {
    void logger.warn(`Failed to play ${event} sound: ${safeStringify(error)}`);
  }
};

/** Plays the event's sound if this terminal has it switched on. */
export const playSound = async (event: SoundEvent): Promise<void> => {
  if (!masterEnabled || !eventPrefs[event]) return;
  await play(event);
};

/** Plays it regardless of the switches: the preview in Preferences. */
export const previewSound = (event: SoundEvent): Promise<void> => play(event);

/** Takes the switches the operator just saved. */
export const setSoundPreferences = (prefs: SoundPreferences): void => {
  eventPrefs = prefs;
};

// Initialize settings on module load
void loadSettings();
