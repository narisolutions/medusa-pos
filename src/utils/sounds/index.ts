import storage from "@/utils/storage";

export enum ScanSoundType {
  SUCCESS = "success",
  ERROR = "error",
}

let audioContext: AudioContext | null = null;
let isEnabled: boolean = true;

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
    console.warn("AudioContext initialization failed:", error);
    isEnabled = false;
  }
};


const loadSettings = async (): Promise<void> => {
  try {
    const savedEnabled = await storage.getItem("sound_enabled");
    isEnabled = savedEnabled ?? true;
  } catch (error) {
    console.warn("Failed to load sound settings:", error);
  }
};

const playBeep = async (
  frequency: number,
  duration: number,
  volume: number = 0.1
): Promise<void> => {
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  // Connect nodes
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Configure oscillator
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  oscillator.type = "sine";

  // Configure gain (volume) with fade out to prevent clicks
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(
    volume,
    audioContext.currentTime + 0.01
  );
  gainNode.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + duration
  );

  // Start and stop the oscillator
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

export const playSuccessSound = async (): Promise<void> => {
  if (!isEnabled) return;

  try {
    await initializeAudioContext();
    if (!audioContext) return;

    // Create success sound: two ascending beeps
    await playBeep(800, 0.1, 0.1); // First beep: 800Hz, 100ms
    setTimeout(() => {
      playBeep(1000, 0.1, 0.1); // Second beep: 1000Hz, 100ms
    }, 120);
  } catch (error) {
    console.warn("Failed to play success sound:", error);
  }
};

export const playErrorSound = async (): Promise<void> => {
  if (!isEnabled) return;

  try {
    await initializeAudioContext();
    if (!audioContext) return;

    // Create error sound: lower frequency buzz
    await playBeep(400, 0.3, 0.15); // Low buzz: 400Hz, 300ms
  } catch (error) {
    console.warn("Failed to play error sound:", error);
  }
};

// Initialize settings on module load
loadSettings();
