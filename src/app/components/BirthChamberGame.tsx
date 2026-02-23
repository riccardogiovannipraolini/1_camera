// ============================================
// CAMERA DI NASCITA - Web Prototype
// Session 1: State Machine + Intro
// Session 2: Hold-to-Interact Input System
// Session 3: Birth Chamber Visual - 7 Rotating Circles
// Session 4: Tutorial Sequence - 7 Sequential Interactions
// Session 5: Narrative Choice UI + Reverse Sequence
// ============================================

import { useEffect, useRef, useCallback } from 'react';

// ============================================
// TYPES & CONSTANTS
// ============================================

const GameState = {
  INTRO: 'intro',
  SETUP: 'setup',
  TUTORIAL: 'tutorial',
  CHOICE: 'choice',
  EXIT: 'exit',
} as const;

type GameStateType = (typeof GameState)[keyof typeof GameState];

interface Circle {
  radius: number;
  rotationSpeed: number;
  direction: 1 | -1;
  currentAngle: number;
  numTeeth: number;
  toothDepth: number;
  isStopped: boolean;
  opacity: number;
  color: string;
  glowColor: string;
  lineWidth: number;
  stopFlashTimer: number; // flash animation when stopped
  numMarkers: number; // bright accent nodes that make rotation visible
  prevAngle: number; // previous frame angle for trail effect
}

type CharacterPose = 'curled' | 'spasm' | 'struggling' | 'partial' | 'walking' | 'standing';

interface BurstParticle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
}

interface FeedbackText {
  text: string;
  alpha: number;
  y: number;
  timer: number;
  maxTime: number;
}

interface ScreenShake {
  intensity: number;
  timer: number;
  duration: number;
}

// 7 tutorial step definitions
interface TutorialStepDef {
  circleIndex: number;      // which circle to stop (6=outermost, 0=innermost)
  holdDuration: number;     // ms required to hold
  narrativeText: string;    // prompt text
  feedbackText: string;     // floating text on completion
  sfx: 'snap' | 'distort' | 'tear' | 'deep' | 'final';
  characterPose: CharacterPose;
  characterProgress: number; // 0-1, how far from cocoon to sarcophagus
  shakeIntensity: number;
  cordStretched: number;    // 0=normal, 1=max stretch, 2=snapped
  lullabyDistortion: number; // 0-1
}

const TUTORIAL_STEPS: TutorialStepDef[] = [
  { circleIndex: 6, holdDuration: 2000, narrativeText: 'Qualcosa si muove... Tieni premuto →', feedbackText: '...spasmo...', sfx: 'snap', characterPose: 'spasm', characterProgress: 0, shakeIntensity: 3, cordStretched: 0, lullabyDistortion: 0 },
  { circleIndex: 5, holdDuration: 2000, narrativeText: 'Lotta contro il bozzolo... Tieni premuto →', feedbackText: '...lotta...', sfx: 'distort', characterPose: 'struggling', characterProgress: 0.05, shakeIntensity: 4, cordStretched: 0.1, lullabyDistortion: 0.15 },
  { circleIndex: 4, holdDuration: 2000, narrativeText: 'Il cordone si tende... Tieni premuto →', feedbackText: '...quasi libero...', sfx: 'distort', characterPose: 'partial', characterProgress: 0.15, shakeIntensity: 5, cordStretched: 0.3, lullabyDistortion: 0.3 },
  { circleIndex: 3, holdDuration: 2000, narrativeText: 'Primi passi incerti... Tieni premuto →', feedbackText: '...primi passi...', sfx: 'deep', characterPose: 'walking', characterProgress: 0.35, shakeIntensity: 4, cordStretched: 0.5, lullabyDistortion: 0.5 },
  { circleIndex: 2, holdDuration: 2000, narrativeText: 'Ancora un passo... Tieni premuto →', feedbackText: '...ancora...', sfx: 'deep', characterPose: 'walking', characterProgress: 0.55, shakeIntensity: 3, cordStretched: 0.7, lullabyDistortion: 0.65 },
  { circleIndex: 1, holdDuration: 3500, narrativeText: 'Strappo finale... Tieni premuto → (più a lungo)', feedbackText: '...libero.', sfx: 'tear', characterPose: 'standing', characterProgress: 0.75, shakeIntensity: 8, cordStretched: 2, lullabyDistortion: 0.85 },
  { circleIndex: 0, holdDuration: 2000, narrativeText: 'Il sarcofago ti attende... Tieni premuto →', feedbackText: '...il sarcofago...', sfx: 'final', characterPose: 'standing', characterProgress: 1.0, shakeIntensity: 6, cordStretched: 2, lullabyDistortion: 1.0 },
];

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;
const INTRO_DURATION = 5000;
const INTRO_FADE_IN_DELAY = 500;
const SETUP_FADE_IN_DURATION = 2000;

// Circle configurations
// Rotation speeds ~5x original, deeper teeth, brighter colors, marker nodes
const CIRCLE_CONFIGS: Omit<Circle, 'currentAngle' | 'isStopped' | 'opacity' | 'stopFlashTimer' | 'prevAngle'>[] = [
  { radius: 55,  rotationSpeed: 0.040,  direction:  1, numTeeth: 8,  toothDepth: 7,  color: 'rgba(212, 175, 55, 0.75)',  glowColor: 'rgba(212, 175, 55, 0.20)', lineWidth: 2.5, numMarkers: 2 },
  { radius: 100, rotationSpeed: 0.030,  direction: -1, numTeeth: 10, toothDepth: 9,  color: 'rgba(200, 180, 140, 0.65)', glowColor: 'rgba(200, 180, 140, 0.15)', lineWidth: 2.2, numMarkers: 3 },
  { radius: 150, rotationSpeed: 0.025,  direction:  1, numTeeth: 12, toothDepth: 11, color: 'rgba(180, 170, 150, 0.58)', glowColor: 'rgba(180, 170, 150, 0.12)', lineWidth: 2.0, numMarkers: 3 },
  { radius: 200, rotationSpeed: 0.020,  direction: -1, numTeeth: 14, toothDepth: 13, color: 'rgba(160, 155, 140, 0.52)', glowColor: 'rgba(160, 155, 140, 0.10)', lineWidth: 1.8, numMarkers: 4 },
  { radius: 255, rotationSpeed: 0.0175, direction:  1, numTeeth: 16, toothDepth: 12, color: 'rgba(145, 145, 135, 0.46)', glowColor: 'rgba(145, 145, 135, 0.09)', lineWidth: 1.7, numMarkers: 4 },
  { radius: 310, rotationSpeed: 0.015,  direction: -1, numTeeth: 18, toothDepth: 10, color: 'rgba(130, 130, 125, 0.40)', glowColor: 'rgba(130, 130, 125, 0.08)', lineWidth: 1.5, numMarkers: 5 },
  { radius: 370, rotationSpeed: 0.0125, direction:  1, numTeeth: 20, toothDepth: 10, color: 'rgba(115, 115, 112, 0.35)', glowColor: 'rgba(115, 115, 112, 0.06)', lineWidth: 1.4, numMarkers: 5 },
];

// Character positions (relative to center, in base coords)
const COCOON_POS = { x: -170, y: 20 };
const SARCOPHAGUS_POS = { x: 0, y: 0 };

// Session 5: Choice tree texts and reverse narrative
const CHOICE_TEXTS: [string, string][] = [
  ['DORMI', 'RUBA'],
  ['TORNA A DORMIRE', 'RUBA'],
  ['ERA SOLO UN BRUTTO SOGNO', 'RUBA'],
  ['TI TENGO LA MANO, MAMMA È QUI', 'SCAPPA'],
];

const REVERSE_NARRATIVE: string[] = [
  '...il calore del bozzolo ti richiama indietro...',
  '...la ninna nanna si fa più dolce... più insistente...',
  '...qualcosa non va. La voce è sbagliata.',
];

const EXIT_NARRATIVES: Record<string, string[]> = {
  steal: [
    'Le dita si chiudono sulla maschera fredda.',
    'Il sarcofago si apre.',
    'Il pellegrino cammina.',
  ],
  escape: [
    'I piedi nudi sul pavimento gelido.',
    'Non c\'è ritorno da questa porta.',
    'Il pellegrino fugge.',
  ],
  surrender: [
    'La mano ti stringe.',
    'La ninna nanna ti avvolge.',
    'Per sempre.',
  ],
};

const REVERSE_DURATION = 4500; // ms for full reverse sequence

export default function BirthChamberGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Audio system ref
  const audioRef = useRef<{
    ctx: AudioContext | null;
    droneOsc: OscillatorNode | null;
    droneGain: GainNode | null;
    lullabyOsc: OscillatorNode | null;
    lullabyGain: GainNode | null;
    lullabyFilter: BiquadFilterNode | null;
    initialized: boolean;
  }>({
    ctx: null, droneOsc: null, droneGain: null,
    lullabyOsc: null, lullabyGain: null, lullabyFilter: null,
    initialized: false,
  });

  const gameStateRef = useRef<{
    currentState: GameStateType;
    stateTimer: number;
    deltaTime: number;
    lastFrameTime: number;
    circles: Circle[];
    isHolding: boolean;
    holdStartTime: number;
    holdProgress: number;
    currentHoldDuration: number;
    introTextOpacity: number;
    introTextShown: boolean;
    setupFadeAlpha: number;
    frameCount: number;
    fpsTimer: number;
    currentFPS: number;
    animFrameId: number | null;
    tutorialStep: number;
    cocoonPulse: number;
    floorPatternRotation: number;
    // Session 4 additions
    characterX: number;
    characterY: number;
    characterTargetX: number;
    characterTargetY: number;
    characterPose: CharacterPose;
    characterPoseTimer: number;
    cordAttached: boolean;
    cordStretch: number;
    screenShake: ScreenShake;
    feedbackText: FeedbackText | null;
    burstParticles: BurstParticle[];
    lullabyDistortion: number;
    tutorialCompleted: boolean;
    stepTransitionTimer: number;
    cocoonBreakLevel: number; // 0-6, how broken the cocoon is
    // Session 5: Choice system
    choiceLoopCount: number; // 0-3, how many times DORMI was chosen
    reverseActive: boolean; // true during reverse animation
    reverseTimer: number; // ms elapsed in reverse sequence
    reverseCirclesRestarted: number; // how many circles have been restarted
    choiceFadeIn: number; // 0-1, fade-in alpha for choice UI
    exitType: 'steal' | 'escape' | 'surrender' | null;
    exitNarrativeStep: number;
    exitNarrativeTimer: number;
    exitNarrativeAlpha: number;
    reverseNarrativeAlpha: number;
  }>({
    currentState: GameState.INTRO,
    stateTimer: 0,
    deltaTime: 0,
    lastFrameTime: 0,
    circles: CIRCLE_CONFIGS.map((config) => ({
      ...config,
      currentAngle: Math.random() * Math.PI * 2,
      isStopped: false,
      opacity: 1,
      stopFlashTimer: 0,
      prevAngle: 0,
    })),
    isHolding: false,
    holdStartTime: 0,
    holdProgress: 0,
    currentHoldDuration: 2000,
    introTextOpacity: 0,
    introTextShown: false,
    setupFadeAlpha: 0,
    frameCount: 0,
    fpsTimer: 0,
    currentFPS: 0,
    animFrameId: null,
    tutorialStep: 0,
    cocoonPulse: 0,
    floorPatternRotation: 0,
    characterX: COCOON_POS.x,
    characterY: COCOON_POS.y,
    characterTargetX: COCOON_POS.x,
    characterTargetY: COCOON_POS.y,
    characterPose: 'curled',
    characterPoseTimer: 0,
    cordAttached: true,
    cordStretch: 0,
    screenShake: { intensity: 0, timer: 0, duration: 0 },
    feedbackText: null,
    burstParticles: [],
    lullabyDistortion: 0,
    tutorialCompleted: false,
    stepTransitionTimer: 0,
    cocoonBreakLevel: 0,
    // Session 5 defaults
    choiceLoopCount: 0,
    reverseActive: false,
    reverseTimer: 0,
    reverseCirclesRestarted: 0,
    choiceFadeIn: 0,
    exitType: null,
    exitNarrativeStep: 0,
    exitNarrativeTimer: 0,
    exitNarrativeAlpha: 0,
    reverseNarrativeAlpha: 0,
  });

  // UI refs
  const stateDisplayRef = useRef<HTMLDivElement>(null);
  const fpsCounterRef = useRef<HTMLDivElement>(null);
  const introTextRef = useRef<HTMLDivElement>(null);
  const progressContainerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressTextRef = useRef<HTMLDivElement>(null);
  const tutorialUIRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const stepCounterRef = useRef<HTMLDivElement>(null);
  const choiceUIRef = useRef<HTMLDivElement>(null);
  const choiceBtnARef = useRef<HTMLButtonElement>(null);
  const choiceBtnBRef = useRef<HTMLButtonElement>(null);
  const reverseNarrativeRef = useRef<HTMLDivElement>(null);
  const exitNarrativeRef = useRef<HTMLDivElement>(null);

  // ============================================
  // CANVAS RESIZE
  // ============================================
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const aspectRatio = BASE_WIDTH / BASE_HEIGHT;
    const windowRatio = window.innerWidth / window.innerHeight;
    if (windowRatio > aspectRatio) {
      canvas.height = window.innerHeight;
      canvas.width = canvas.height * aspectRatio;
    } else {
      canvas.width = window.innerWidth;
      canvas.height = canvas.width / aspectRatio;
    }
  }, []);

  // ============================================
  // WEB AUDIO - SYNTHESIZED SFX
  // ============================================

  const initAudio = useCallback(() => {
    const a = audioRef.current;
    if (a.initialized) return;
    try {
      a.ctx = new AudioContext();

      // Ambient drone - very low, subtle
      a.droneGain = a.ctx.createGain();
      a.droneGain.gain.value = 0;
      a.droneGain.connect(a.ctx.destination);

      a.droneOsc = a.ctx.createOscillator();
      a.droneOsc.type = 'sine';
      a.droneOsc.frequency.value = 55; // Low A
      a.droneOsc.connect(a.droneGain);
      a.droneOsc.start();

      // Lullaby oscillator with filter
      a.lullabyFilter = a.ctx.createBiquadFilter();
      a.lullabyFilter.type = 'lowpass';
      a.lullabyFilter.frequency.value = 2000;
      a.lullabyFilter.Q.value = 1;
      a.lullabyFilter.connect(a.ctx.destination);

      a.lullabyGain = a.ctx.createGain();
      a.lullabyGain.gain.value = 0;
      a.lullabyGain.connect(a.lullabyFilter);

      a.lullabyOsc = a.ctx.createOscillator();
      a.lullabyOsc.type = 'triangle';
      a.lullabyOsc.frequency.value = 220;
      a.lullabyOsc.connect(a.lullabyGain);
      a.lullabyOsc.start();

      a.initialized = true;
      console.log('%c♪ Audio system initialized', 'color: #9C27B0;');
    } catch (e) {
      console.warn('Audio initialization failed:', e);
    }
  }, []);

  const startDrone = useCallback(() => {
    const a = audioRef.current;
    if (!a.ctx || !a.droneGain) return;
    a.droneGain.gain.cancelScheduledValues(a.ctx.currentTime);
    a.droneGain.gain.setTargetAtTime(0.06, a.ctx.currentTime, 2);
  }, []);

  const startLullaby = useCallback(() => {
    const a = audioRef.current;
    if (!a.ctx || !a.lullabyGain) return;
    a.lullabyGain.gain.cancelScheduledValues(a.ctx.currentTime);
    a.lullabyGain.gain.setTargetAtTime(0.04, a.ctx.currentTime, 1);
  }, []);

  const updateLullabyDistortion = useCallback((distortion: number) => {
    const a = audioRef.current;
    if (!a.ctx || !a.lullabyOsc || !a.lullabyFilter) return;
    // Progressive distortion: lower filter freq, add detune, change waveform feel
    const filterFreq = 2000 * (1 - distortion * 0.85); // 2000 → 300
    const detune = distortion * 400; // 0 → 400 cents
    const baseFreq = 220 - distortion * 80; // 220 → 140 Hz (more ominous)

    a.lullabyFilter.frequency.setTargetAtTime(filterFreq, a.ctx.currentTime, 0.3);
    a.lullabyOsc.detune.setTargetAtTime(detune, a.ctx.currentTime, 0.3);
    a.lullabyOsc.frequency.setTargetAtTime(baseFreq, a.ctx.currentTime, 0.5);

    // Increase drone at higher distortion
    if (a.droneGain) {
      a.droneGain.gain.setTargetAtTime(0.06 + distortion * 0.08, a.ctx.currentTime, 0.5);
    }
  }, []);

  const playSFX = useCallback((type: 'snap' | 'distort' | 'tear' | 'deep' | 'final' | 'reverse' | 'choice_hover') => {
    const a = audioRef.current;
    if (!a.ctx) return;
    const now = a.ctx.currentTime;

    switch (type) {
      case 'snap': {
        // String snap: short noise burst + high-freq ping
        const bufferSize = a.ctx.sampleRate * 0.15;
        const buffer = a.ctx.createBuffer(1, bufferSize, a.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
        }
        const noise = a.ctx.createBufferSource();
        noise.buffer = buffer;
        const hpf = a.ctx.createBiquadFilter();
        hpf.type = 'highpass';
        hpf.frequency.value = 3000;
        const gain = a.ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        noise.connect(hpf).connect(gain).connect(a.ctx.destination);
        noise.start(now);
        noise.stop(now + 0.15);

        // Metallic ping
        const ping = a.ctx.createOscillator();
        ping.frequency.value = 1200;
        ping.type = 'sine';
        const pingGain = a.ctx.createGain();
        pingGain.gain.setValueAtTime(0.15, now);
        pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        ping.connect(pingGain).connect(a.ctx.destination);
        ping.start(now);
        ping.stop(now + 0.3);
        break;
      }
      case 'distort': {
        // Warbling dissonant tone
        const osc1 = a.ctx.createOscillator();
        osc1.frequency.value = 180;
        osc1.type = 'sawtooth';
        const osc2 = a.ctx.createOscillator();
        osc2.frequency.value = 187; // Slight detuning = beating
        osc2.type = 'sawtooth';
        const gain = a.ctx.createGain();
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        const lpf = a.ctx.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.value = 800;
        osc1.connect(lpf);
        osc2.connect(lpf);
        lpf.connect(gain).connect(a.ctx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.8);
        osc2.stop(now + 0.8);
        break;
      }
      case 'tear': {
        // Ripping/tearing: long noise with sweeping filter
        const bufferSize = a.ctx.sampleRate * 0.6;
        const buffer = a.ctx.createBuffer(1, bufferSize, a.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const noise = a.ctx.createBufferSource();
        noise.buffer = buffer;
        const bpf = a.ctx.createBiquadFilter();
        bpf.type = 'bandpass';
        bpf.frequency.setValueAtTime(1500, now);
        bpf.frequency.linearRampToValueAtTime(300, now + 0.6);
        bpf.Q.value = 2;
        const gain = a.ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        noise.connect(bpf).connect(gain).connect(a.ctx.destination);
        noise.start(now);
        noise.stop(now + 0.6);

        // Low thud
        const thud = a.ctx.createOscillator();
        thud.frequency.value = 60;
        thud.type = 'sine';
        const thudGain = a.ctx.createGain();
        thudGain.gain.setValueAtTime(0.25, now);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        thud.connect(thudGain).connect(a.ctx.destination);
        thud.start(now);
        thud.stop(now + 0.4);
        break;
      }
      case 'deep': {
        // Deep resonant hit
        const osc = a.ctx.createOscillator();
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);
        osc.type = 'sine';
        const gain = a.ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain).connect(a.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }
      case 'final': {
        // Dramatic chord: multiple sine tones
        [110, 138.6, 165, 220].forEach((freq) => {
          const osc = a.ctx!.createOscillator();
          osc.frequency.value = freq;
          osc.type = 'sine';
          const gain = a.ctx!.createGain();
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.setTargetAtTime(0.001, now + 0.5, 0.5);
          osc.connect(gain).connect(a.ctx!.destination);
          osc.start(now);
          osc.stop(now + 2);
        });
        break;
      }
      case 'reverse': {
        // Reverse whoosh: descending sweep with filtered noise
        const osc = a.ctx.createOscillator();
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.8);
        osc.type = 'sawtooth';
        const lpf = a.ctx.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.setValueAtTime(2000, now);
        lpf.frequency.exponentialRampToValueAtTime(200, now + 0.8);
        const gain = a.ctx.createGain();
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(lpf).connect(gain).connect(a.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.8);
        break;
      }
      case 'choice_hover': {
        // Subtle click/tick on hover
        const osc = a.ctx.createOscillator();
        osc.frequency.value = 800;
        osc.type = 'sine';
        const gain = a.ctx.createGain();
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain).connect(a.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }
    }
  }, []);

  // ============================================
  // STOP CIRCLE with burst effect
  // ============================================
  const stopCircle = useCallback((circleIndex: number) => {
    const gs = gameStateRef.current;
    if (circleIndex >= 0 && circleIndex < gs.circles.length) {
      const circle = gs.circles[circleIndex];
      circle.isStopped = true;
      circle.stopFlashTimer = 1.0; // Start flash

      // Spawn burst particles around this circle
      const angle = circle.currentAngle;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + angle;
        const speed = 0.5 + Math.random() * 1.5;
        gs.burstParticles.push({
          x: Math.cos(a) * circle.radius,
          y: Math.sin(a) * circle.radius,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: 1,
          maxLife: 1,
          size: 2 + Math.random() * 3,
          color: 'rgba(212, 175, 55, ',
        });
      }

      console.log(`%c⚡ Circle ${circleIndex + 1} stopped!`, 'color: #d4af37; font-weight: bold;');
    }
  }, []);

  // ============================================
  // VISUAL EFFECTS
  // ============================================

  const triggerScreenShake = useCallback((intensity: number, duration: number = 400) => {
    const gs = gameStateRef.current;
    gs.screenShake = { intensity, timer: 0, duration };
  }, []);

  const showFeedback = useCallback((text: string) => {
    const gs = gameStateRef.current;
    gs.feedbackText = { text, alpha: 0, y: 0, timer: 0, maxTime: 2500 };
  }, []);

  // ============================================
  // SESSION 5: CHOICE SYSTEM
  // ============================================

  const updateChoiceUI = useCallback((loopCount: number) => {
    const [textA, textB] = CHOICE_TEXTS[Math.min(loopCount, 3)];
    if (choiceBtnARef.current) choiceBtnARef.current.textContent = textA;
    if (choiceBtnBRef.current) choiceBtnBRef.current.textContent = textB;
  }, []);

  // ============================================
  // STATE MANAGEMENT (moved before choice handlers to avoid TDZ)
  // ============================================

  const changeState = useCallback((newState: GameStateType) => {
    const gs = gameStateRef.current;
    console.log(`%c State Transition: ${gs.currentState} → ${newState}`, 'color: #0f0; font-weight: bold;');

    // Exit current state
    if (gs.currentState === GameState.INTRO) {
      if (introTextRef.current) {
        introTextRef.current.style.opacity = '0';
        setTimeout(() => {
          if (introTextRef.current) introTextRef.current.style.display = 'none';
        }, 2000);
      }
    } else if (gs.currentState === GameState.TUTORIAL) {
      if (tutorialUIRef.current) tutorialUIRef.current.style.display = 'none';
    } else if (gs.currentState === GameState.CHOICE) {
      if (choiceUIRef.current) choiceUIRef.current.style.display = 'none';
    }

    gs.currentState = newState;
    gs.stateTimer = 0;

    if (stateDisplayRef.current) {
      stateDisplayRef.current.textContent = `State: ${newState.toUpperCase()}`;
    }

    // Enter new state
    if (newState === GameState.INTRO) {
      gs.introTextOpacity = 0;
      gs.introTextShown = false;
    } else if (newState === GameState.SETUP) {
      gs.setupFadeAlpha = 0;
      initAudio();
      startDrone();
      console.log('SETUP: Showing chamber with 7 rotating circles...');
    } else if (newState === GameState.TUTORIAL) {
      gs.tutorialStep = 0;
      gs.tutorialCompleted = false;
      gs.characterPose = 'curled';
      gs.characterX = COCOON_POS.x;
      gs.characterY = COCOON_POS.y;
      gs.cordAttached = true;
      gs.cordStretch = 0;
      gs.cocoonBreakLevel = 0;
      gs.currentHoldDuration = TUTORIAL_STEPS[0].holdDuration;
      if (tutorialUIRef.current) tutorialUIRef.current.style.display = 'block';
      if (promptRef.current) promptRef.current.textContent = TUTORIAL_STEPS[0].narrativeText;
      if (stepCounterRef.current) stepCounterRef.current.textContent = '1 / 7';
      startLullaby();
      console.log('TUTORIAL: Starting 7 sequential interactions...');
    } else if (newState === GameState.CHOICE) {
      gs.choiceFadeIn = 0;
      gs.reverseActive = false;
      updateChoiceUI(gs.choiceLoopCount);
      if (choiceUIRef.current) {
        choiceUIRef.current.style.display = 'flex';
        choiceUIRef.current.style.opacity = '0';
        setTimeout(() => {
          if (choiceUIRef.current) choiceUIRef.current.style.opacity = '1';
        }, 100);
      }
      console.log(`CHOICE: Presenting narrative branching (loop ${gs.choiceLoopCount})...`);
    } else if (newState === GameState.EXIT) {
      const a = audioRef.current;
      if (a.ctx && a.lullabyGain) {
        a.lullabyGain.gain.setTargetAtTime(0, a.ctx.currentTime, 1);
      }
      if (a.ctx && a.droneGain) {
        a.droneGain.gain.setTargetAtTime(0, a.ctx.currentTime, 2);
      }
      gs.exitNarrativeStep = 0;
      gs.exitNarrativeTimer = 0;
      gs.exitNarrativeAlpha = 0;
      if (exitNarrativeRef.current) {
        exitNarrativeRef.current.style.display = 'block';
        exitNarrativeRef.current.style.opacity = '0';
      }
      if (choiceUIRef.current) choiceUIRef.current.style.display = 'none';
      if (reverseNarrativeRef.current) reverseNarrativeRef.current.style.display = 'none';
      if (tutorialUIRef.current) tutorialUIRef.current.style.display = 'none';
      console.log(`EXIT: Transitioning to next area (${gs.exitType})...`);
    }
  }, [initAudio, startDrone, startLullaby, updateChoiceUI]);

  const startReverseSequence = useCallback(() => {
    const gs = gameStateRef.current;
    // Hide choice UI
    if (choiceUIRef.current) {
      choiceUIRef.current.style.opacity = '0';
      setTimeout(() => {
        if (choiceUIRef.current) choiceUIRef.current.style.display = 'none';
      }, 400);
    }

    // Show reverse narrative
    const narText = REVERSE_NARRATIVE[Math.min(gs.choiceLoopCount, REVERSE_NARRATIVE.length - 1)];
    if (reverseNarrativeRef.current) {
      reverseNarrativeRef.current.textContent = narText;
      reverseNarrativeRef.current.style.display = 'block';
      reverseNarrativeRef.current.style.opacity = '0';
    }

    gs.reverseActive = true;
    gs.reverseTimer = 0;
    gs.reverseCirclesRestarted = 0;
    gs.reverseNarrativeAlpha = 0;

    // Play reverse SFX
    playSFX('reverse');

    console.log(`%c↺ Reverse sequence started (loop ${gs.choiceLoopCount + 1})`, 'color: #9C27B0; font-weight: bold;');
  }, [playSFX]);

  const startFinalSequence = useCallback((exitType: 'steal' | 'escape' | 'surrender') => {
    const gs = gameStateRef.current;
    gs.exitType = exitType;

    // Hide choice UI
    if (choiceUIRef.current) {
      choiceUIRef.current.style.opacity = '0';
      setTimeout(() => {
        if (choiceUIRef.current) choiceUIRef.current.style.display = 'none';
      }, 400);
    }

    // Play appropriate SFX
    if (exitType === 'steal' || exitType === 'escape') {
      playSFX('final');
    } else {
      // Surrender: haunting lullaby swell
      playSFX('deep');
    }

    console.log(`%c⚡ Final sequence: ${exitType}`, 'color: #FF5722; font-weight: bold;');

    // Short delay then transition to EXIT
    setTimeout(() => {
      const gs2 = gameStateRef.current;
      gs2.exitNarrativeStep = 0;
      gs2.exitNarrativeTimer = 0;
      gs2.exitNarrativeAlpha = 0;
      // changeState will be called from the caller context
    }, 500);
  }, [playSFX]);

  const handleChoiceA = useCallback(() => {
    const gs = gameStateRef.current;
    if (gs.reverseActive) return; // Ignore during reverse

    if (gs.choiceLoopCount < 3) {
      // DORMI path: reverse sequence
      startReverseSequence();
    } else {
      // 4th choice: surrender
      startFinalSequence('surrender');
      setTimeout(() => changeState(GameState.EXIT), 800);
    }
  }, [startReverseSequence, startFinalSequence, changeState]);

  const handleChoiceB = useCallback(() => {
    const gs = gameStateRef.current;
    if (gs.reverseActive) return;

    const exitType = gs.choiceLoopCount >= 3 ? 'escape' : 'steal';
    startFinalSequence(exitType);
    setTimeout(() => changeState(GameState.EXIT), 800);
  }, [startFinalSequence, changeState]);

  // ============================================
  // DRAWING FUNCTIONS
  // ============================================

  const drawGearCircle = useCallback((ctx: CanvasRenderingContext2D, centerX: number, centerY: number, circle: Circle, scale: number) => {
    const segments = 360;
    const scaledRadius = circle.radius * scale;
    const scaledToothDepth = circle.toothDepth * scale;

    let flashBoost = 0;
    if (circle.stopFlashTimer > 0) {
      flashBoost = circle.stopFlashTimer * 0.5;
    }

    // --- TRAIL / AFTERIMAGE: faded copy at previous angle ---
    if (!circle.isStopped && Math.abs(circle.prevAngle - circle.currentAngle) > 0.001) {
      ctx.save();
      ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.15;
      ctx.strokeStyle = circle.color;
      ctx.lineWidth = circle.lineWidth * scale * 0.6;
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2 + circle.prevAngle;
        const toothOffset =
          Math.sin(angle * circle.numTeeth) * scaledToothDepth * 0.7 +
          Math.sin(angle * (circle.numTeeth * 0.5 + 3)) * scaledToothDepth * 0.3;
        const r = scaledRadius + toothOffset;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    // --- MAIN GEAR OUTLINE ---
    ctx.save();
    ctx.strokeStyle = circle.color;
    ctx.lineWidth = (circle.lineWidth + flashBoost * 3) * scale;
    ctx.shadowColor = circle.glowColor;
    ctx.shadowBlur = (15 + flashBoost * 30) * scale;

    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2 + circle.currentAngle;
      // Asymmetric modulation: primary teeth + secondary wobble + one "notch" break
      const toothOffset =
        Math.sin(angle * circle.numTeeth) * scaledToothDepth * 0.65 +
        Math.sin(angle * (circle.numTeeth * 0.5 + 3)) * scaledToothDepth * 0.25 +
        Math.sin(angle * 1.0) * scaledToothDepth * 0.3; // 1-fold asymmetry breaks periodicity
      const r = scaledRadius + toothOffset;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = circle.glowColor;
    ctx.fill();
    ctx.restore();

    // --- TICK MARKS (longer, more visible) ---
    ctx.save();
    ctx.strokeStyle = circle.color.replace(/[\d.]+\)$/, (m) => `${parseFloat(m) * 0.6})`);
    ctx.lineWidth = 1.2 * scale;
    for (let i = 0; i < circle.numTeeth; i++) {
      const angle = (i / circle.numTeeth) * Math.PI * 2 + circle.currentAngle;
      const innerR = scaledRadius - scaledToothDepth * 2.0;
      const outerR = scaledRadius - scaledToothDepth * 0.3;
      ctx.beginPath();
      ctx.moveTo(centerX + Math.cos(angle) * innerR, centerY + Math.sin(angle) * innerR);
      ctx.lineTo(centerX + Math.cos(angle) * outerR, centerY + Math.sin(angle) * outerR);
      ctx.stroke();
    }
    ctx.restore();

    // --- MARKER NODES: bright glowing dots at asymmetric positions ---
    const markers = circle.numMarkers || 3;
    // Use golden-ratio-based spacing so markers are never evenly spaced
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~2.399 rad
    ctx.save();
    for (let i = 0; i < markers; i++) {
      const markerAngle = i * goldenAngle + circle.currentAngle;
      const markerR = scaledRadius;
      const mx = centerX + Math.cos(markerAngle) * markerR;
      const my = centerY + Math.sin(markerAngle) * markerR;
      const dotSize = (2.5 + (i === 0 ? 1.5 : 0)) * scale; // First marker is larger

      // Outer glow
      ctx.shadowColor = 'rgba(240, 220, 160, 0.6)';
      ctx.shadowBlur = 10 * scale;
      ctx.fillStyle = i === 0
        ? 'rgba(255, 230, 140, 0.9)'  // Primary marker: bright gold
        : 'rgba(220, 210, 180, 0.7)'; // Secondary: softer
      ctx.beginPath();
      ctx.arc(mx, my, dotSize, 0, Math.PI * 2);
      ctx.fill();

      // Inner bright core
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 250, 230, 0.95)';
      ctx.beginPath();
      ctx.arc(mx, my, dotSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }, []);

  const drawFloorPattern = useCallback((ctx: CanvasRenderingContext2D, centerX: number, centerY: number, scale: number, rotation: number) => {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    const maxRadius = 400 * scale;
    ctx.strokeStyle = 'rgba(80, 80, 90, 0.15)';
    ctx.lineWidth = 1 * scale;

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * maxRadius, Math.sin(angle) * maxRadius);
      ctx.stroke();
      for (let j = 1; j <= 4; j++) {
        const branchDist = (j / 4) * maxRadius * 0.8;
        const branchLen = maxRadius * 0.15 * (1 - j * 0.15);
        const bx = Math.cos(angle) * branchDist;
        const by = Math.sin(angle) * branchDist;
        const leftAngle = angle + Math.PI / 6;
        ctx.beginPath(); ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(leftAngle) * branchLen, by + Math.sin(leftAngle) * branchLen); ctx.stroke();
        const rightAngle = angle - Math.PI / 6;
        ctx.beginPath(); ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(rightAngle) * branchLen, by + Math.sin(rightAngle) * branchLen); ctx.stroke();
      }
    }
    ctx.strokeStyle = 'rgba(70, 70, 80, 0.1)';
    for (let ring = 1; ring <= 5; ring++) {
      const ringRadius = (ring / 5) * maxRadius * 0.9;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        const x = Math.cos(a) * ringRadius;
        const y = Math.sin(a) * ringRadius;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(90, 90, 100, 0.15)';
    for (let ring = 1; ring <= 5; ring++) {
      const ringRadius = (ring / 5) * maxRadius * 0.9;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(Math.cos(a) * ringRadius, Math.sin(a) * ringRadius, 2 * scale, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }, []);

  const drawSarcophagus = useCallback((ctx: CanvasRenderingContext2D, centerX: number, centerY: number, scale: number) => {
    ctx.save();
    const width = 40 * scale;
    const height = 70 * scale;
    const gradient = ctx.createLinearGradient(centerX - width / 2, centerY - height / 2, centerX + width / 2, centerY + height / 2);
    gradient.addColorStop(0, 'rgba(60, 55, 50, 0.9)');
    gradient.addColorStop(0.5, 'rgba(75, 70, 60, 0.9)');
    gradient.addColorStop(1, 'rgba(55, 50, 45, 0.9)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(centerX - width * 0.4, centerY - height / 2);
    ctx.lineTo(centerX + width * 0.4, centerY - height / 2);
    ctx.lineTo(centerX + width * 0.5, centerY + height / 2);
    ctx.lineTo(centerX - width * 0.5, centerY + height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(140, 130, 110, 0.6)';
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();

    const maskCenterY = centerY - height * 0.15;
    const maskWidth = width * 0.6;
    const maskHeight = height * 0.35;
    ctx.shadowColor = 'rgba(212, 175, 55, 0.4)';
    ctx.shadowBlur = 15 * scale;
    ctx.fillStyle = 'rgba(212, 175, 55, 0.7)';
    ctx.beginPath();
    ctx.ellipse(centerX, maskCenterY, maskWidth / 2, maskHeight / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(230, 200, 80, 0.8)';
    ctx.lineWidth = 1 * scale;
    ctx.stroke();
    ctx.shadowBlur = 0;

    const eyeY = maskCenterY - maskHeight * 0.05;
    const eyeSpacing = maskWidth * 0.28;
    ctx.fillStyle = 'rgba(20, 15, 10, 0.9)';
    ctx.beginPath(); ctx.ellipse(centerX - eyeSpacing, eyeY, maskWidth * 0.18, maskHeight * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(centerX + eyeSpacing, eyeY, maskWidth * 0.18, maskHeight * 0.12, 0, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = 'rgba(180, 150, 40, 0.4)';
    ctx.lineWidth = 0.8 * scale;
    ctx.beginPath(); ctx.moveTo(centerX, eyeY + maskHeight * 0.12 * 2); ctx.lineTo(centerX, maskCenterY + maskHeight * 0.25); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX - maskWidth * 0.15, maskCenterY + maskHeight * 0.3);
    ctx.quadraticCurveTo(centerX, maskCenterY + maskHeight * 0.35, centerX + maskWidth * 0.15, maskCenterY + maskHeight * 0.3);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(140, 130, 110, 0.3)';
    ctx.lineWidth = 0.5 * scale;
    for (let i = 1; i <= 3; i++) {
      const lineY = centerY + height * (0.1 + i * 0.12);
      ctx.beginPath(); ctx.moveTo(centerX - width * 0.35, lineY); ctx.lineTo(centerX + width * 0.35, lineY); ctx.stroke();
    }
    ctx.restore();
  }, []);

  // Draw cocoon that progressively breaks open
  const drawCocoon = useCallback((ctx: CanvasRenderingContext2D, centerX: number, centerY: number, scale: number, pulse: number, breakLevel: number) => {
    ctx.save();
    const cocoonX = centerX + COCOON_POS.x * scale;
    const cocoonY = centerY + COCOON_POS.y * scale;
    const baseWidth = 25 * scale;
    const baseHeight = 40 * scale;
    const cocoonWidth = baseWidth + Math.sin(pulse) * 2 * scale - breakLevel * 1.5 * scale;
    const cocoonHeight = baseHeight + Math.sin(pulse * 0.7) * 1.5 * scale - breakLevel * 2 * scale;

    if (breakLevel < 6) {
      ctx.shadowColor = 'rgba(100, 140, 120, 0.3)';
      ctx.shadowBlur = 10 * scale;

      // Cocoon opacity decreases as it breaks
      const cocoonAlpha = Math.max(0.15, 0.7 - breakLevel * 0.1);
      ctx.fillStyle = `rgba(60, 80, 70, ${cocoonAlpha})`;
      ctx.beginPath();
      ctx.ellipse(cocoonX, cocoonY, Math.max(5, cocoonWidth), Math.max(8, cocoonHeight), Math.PI * 0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(80, 110, 90, ${cocoonAlpha * 0.7})`;
      ctx.lineWidth = 1 * scale;
      ctx.stroke();

      // Crack lines that appear as it breaks
      if (breakLevel > 0) {
        ctx.strokeStyle = `rgba(150, 140, 120, ${0.2 + breakLevel * 0.08})`;
        ctx.lineWidth = 0.8 * scale;
        for (let i = 0; i < breakLevel; i++) {
          const crackAngle = (i / 7) * Math.PI * 2 + i * 0.5;
          const crackLen = (8 + i * 3) * scale;
          ctx.beginPath();
          ctx.moveTo(cocoonX, cocoonY);
          ctx.lineTo(
            cocoonX + Math.cos(crackAngle) * crackLen,
            cocoonY + Math.sin(crackAngle) * crackLen
          );
          ctx.stroke();
        }
      }

      // Internal veins (fewer as it breaks)
      ctx.strokeStyle = `rgba(90, 130, 100, ${0.3 - breakLevel * 0.04})`;
      ctx.lineWidth = 0.5 * scale;
      for (let i = 0; i < Math.max(1, 4 - breakLevel); i++) {
        const veinAngle = (i / 4) * Math.PI + pulse * 0.1;
        ctx.beginPath();
        ctx.moveTo(cocoonX, cocoonY - cocoonHeight * 0.3);
        ctx.quadraticCurveTo(
          cocoonX + Math.cos(veinAngle) * cocoonWidth * 0.6,
          cocoonY + Math.sin(veinAngle) * cocoonHeight * 0.4,
          cocoonX, cocoonY + cocoonHeight * 0.3
        );
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }, []);

  // Draw umbilical cord with stretch/snap state
  const drawUmbilicalCord = useCallback((ctx: CanvasRenderingContext2D, centerX: number, centerY: number, scale: number, charX: number, charY: number, cordAttached: boolean, cordStretch: number) => {
    if (!cordAttached) return; // Cord has been snapped

    ctx.save();
    const cocoonX = centerX + COCOON_POS.x * scale;
    const cocoonY = centerY + COCOON_POS.y * scale;
    const charWorldX = centerX + charX * scale;
    const charWorldY = centerY + charY * scale;

    // Cord color gets more strained (redder) as it stretches
    const strainR = Math.min(140, 90 + cordStretch * 80);
    const strainG = Math.max(40, 70 - cordStretch * 30);
    const strainB = Math.max(30, 60 - cordStretch * 30);
    const strainAlpha = 0.5 + cordStretch * 0.3;

    ctx.strokeStyle = `rgba(${strainR}, ${strainG}, ${strainB}, ${strainAlpha})`;
    ctx.lineWidth = (2.5 - cordStretch * 0.5) * scale; // Thinner as stretched

    // Wobble increases with stretch
    const wobble = Math.sin(performance.now() * 0.01) * cordStretch * 15 * scale;

    const midX = (cocoonX + charWorldX) / 2;
    const midY = (cocoonY + charWorldY) / 2;

    ctx.beginPath();
    ctx.moveTo(cocoonX + 15 * scale, cocoonY);
    ctx.bezierCurveTo(
      cocoonX + 40 * scale, cocoonY - 30 * scale + wobble,
      midX, midY + 20 * scale - wobble,
      charWorldX - 8 * scale, charWorldY
    );
    ctx.stroke();

    // Parallel texture line
    ctx.strokeStyle = `rgba(${strainR + 20}, ${strainG + 20}, ${strainB + 15}, ${strainAlpha * 0.5})`;
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(cocoonX + 15 * scale, cocoonY - 2 * scale);
    ctx.bezierCurveTo(
      cocoonX + 42 * scale, cocoonY - 32 * scale + wobble,
      midX + 2 * scale, midY + 18 * scale - wobble,
      charWorldX - 8 * scale, charWorldY - 2 * scale
    );
    ctx.stroke();
    ctx.restore();
  }, []);

  // Draw character figure at different poses
  const drawCharacter = useCallback((ctx: CanvasRenderingContext2D, centerX: number, centerY: number, scale: number, charX: number, charY: number, pose: CharacterPose, poseTimer: number) => {
    const px = centerX + charX * scale;
    const py = centerY + charY * scale;
    const s = scale;

    ctx.save();
    ctx.translate(px, py);

    // Character glow
    ctx.shadowColor = 'rgba(240, 230, 210, 0.2)';
    ctx.shadowBlur = 8 * s;

    const skinColor = 'rgba(180, 160, 140, 0.8)';
    const darkColor = 'rgba(60, 50, 45, 0.9)';

    switch (pose) {
      case 'curled': {
        // Fetal position - small curled ball
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, 10 * s, 8 * s, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.beginPath();
        ctx.arc(-6 * s, -4 * s, 5 * s, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'spasm': {
        // Twitching in cocoon - jittery
        const jitterX = Math.sin(poseTimer * 30) * 2 * s;
        const jitterY = Math.cos(poseTimer * 25) * 1.5 * s;
        ctx.translate(jitterX, jitterY);
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, 11 * s, 9 * s, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-6 * s, -5 * s, 5 * s, 0, Math.PI * 2);
        ctx.fill();
        // Arm reaching out
        ctx.strokeStyle = skinColor;
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.moveTo(5 * s, -2 * s);
        ctx.lineTo(12 * s + jitterX, -6 * s + jitterY);
        ctx.stroke();
        break;
      }
      case 'struggling': {
        // Half emerging - torso visible
        const struggle = Math.sin(poseTimer * 8) * 1.5 * s;
        ctx.fillStyle = skinColor;
        // Torso
        ctx.beginPath();
        ctx.ellipse(0, 2 * s, 8 * s, 14 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.beginPath();
        ctx.arc(0, -14 * s + struggle, 6 * s, 0, Math.PI * 2);
        ctx.fill();
        // Arms pushing
        ctx.strokeStyle = skinColor;
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.moveTo(-6 * s, -4 * s);
        ctx.lineTo(-14 * s, -10 * s + struggle);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(6 * s, -4 * s);
        ctx.lineTo(14 * s, -10 * s - struggle);
        ctx.stroke();
        break;
      }
      case 'partial': {
        // Mostly free, standing hunched
        ctx.fillStyle = skinColor;
        // Body
        ctx.beginPath();
        ctx.ellipse(0, 5 * s, 7 * s, 18 * s, 0.1, 0, Math.PI * 2);
        ctx.fill();
        // Head (looking down)
        ctx.beginPath();
        ctx.arc(2 * s, -15 * s, 6 * s, 0, Math.PI * 2);
        ctx.fill();
        // Arms hanging
        ctx.strokeStyle = skinColor;
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.moveTo(-5 * s, -3 * s);
        ctx.quadraticCurveTo(-12 * s, 8 * s, -8 * s, 18 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(5 * s, -3 * s);
        ctx.quadraticCurveTo(12 * s, 8 * s, 8 * s, 18 * s);
        ctx.stroke();
        // Legs
        ctx.beginPath();
        ctx.moveTo(-3 * s, 18 * s);
        ctx.lineTo(-4 * s, 28 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(3 * s, 18 * s);
        ctx.lineTo(4 * s, 28 * s);
        ctx.stroke();
        break;
      }
      case 'walking': {
        // Walking pose with elbow covering face in step 4
        const walkCycle = Math.sin(poseTimer * 5);
        ctx.fillStyle = skinColor;
        // Body (upright)
        ctx.beginPath();
        ctx.ellipse(0, 2 * s, 7 * s, 17 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.beginPath();
        ctx.arc(0, -17 * s, 6 * s, 0, Math.PI * 2);
        ctx.fill();
        // Arm over face (elbow covering)
        ctx.strokeStyle = skinColor;
        ctx.lineWidth = 3.5 * s;
        ctx.beginPath();
        ctx.moveTo(-5 * s, -5 * s);
        ctx.quadraticCurveTo(-10 * s, -15 * s, -2 * s, -19 * s);
        ctx.stroke();
        // Other arm
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.moveTo(5 * s, -3 * s);
        ctx.quadraticCurveTo(14 * s, 5 * s, 10 * s, 14 * s);
        ctx.stroke();
        // Legs walking
        ctx.beginPath();
        ctx.moveTo(-3 * s, 16 * s);
        ctx.lineTo(-3 * s + walkCycle * 4 * s, 28 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(3 * s, 16 * s);
        ctx.lineTo(3 * s - walkCycle * 4 * s, 28 * s);
        ctx.stroke();
        break;
      }
      case 'standing': {
        // Standing upright, arms at sides
        ctx.fillStyle = skinColor;
        // Body
        ctx.beginPath();
        ctx.ellipse(0, 2 * s, 7 * s, 17 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.beginPath();
        ctx.arc(0, -17 * s, 6.5 * s, 0, Math.PI * 2);
        ctx.fill();
        // Eyes (subtle dots)
        ctx.fillStyle = darkColor;
        ctx.beginPath(); ctx.arc(-2.5 * s, -18 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(2.5 * s, -18 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
        // Arms
        ctx.strokeStyle = skinColor;
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.moveTo(-6 * s, -4 * s);
        ctx.quadraticCurveTo(-11 * s, 6 * s, -7 * s, 16 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(6 * s, -4 * s);
        ctx.quadraticCurveTo(11 * s, 6 * s, 7 * s, 16 * s);
        ctx.stroke();
        // Legs
        ctx.beginPath();
        ctx.moveTo(-3 * s, 16 * s);
        ctx.lineTo(-4 * s, 28 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(3 * s, 16 * s);
        ctx.lineTo(4 * s, 28 * s);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }, []);

  const drawAmbientParticles = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
      const seed = i * 137.508;
      const x = ((Math.sin(time * 0.0003 + seed) * 0.4 + 0.5 + Math.sin(seed * 0.1) * 0.1) % 1) * width;
      const y = ((time * 0.00005 + seed / particleCount + Math.sin(time * 0.0002 + seed * 0.5) * 0.05) % 1) * height;
      const size = 1 + Math.sin(time * 0.001 + seed) * 0.8;
      const alpha = 0.03 + Math.sin(time * 0.002 + seed) * 0.02;
      ctx.fillStyle = `rgba(240, 230, 210, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  // Draw burst particles
  const drawBurstParticles = useCallback((ctx: CanvasRenderingContext2D, centerX: number, centerY: number, scale: number, particles: BurstParticle[]) => {
    for (const p of particles) {
      if (p.life <= 0) continue;
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = `${p.color}${alpha})`;
      ctx.shadowColor = `${p.color}${alpha * 0.5})`;
      ctx.shadowBlur = 4 * scale;
      ctx.beginPath();
      ctx.arc(centerX + p.x * scale, centerY + p.y * scale, p.size * scale * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }, []);

  // Draw feedback text on canvas
  const drawFeedbackText = useCallback((ctx: CanvasRenderingContext2D, centerX: number, centerY: number, scale: number, fb: FeedbackText) => {
    if (fb.alpha <= 0) return;
    ctx.save();
    ctx.font = `${Math.round(28 * scale)}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(240, 230, 210, ${fb.alpha})`;
    ctx.shadowColor = `rgba(212, 175, 55, ${fb.alpha * 0.5})`;
    ctx.shadowBlur = 15 * scale;
    ctx.fillText(fb.text, centerX, centerY - 120 * scale + fb.y * scale);
    ctx.restore();
  }, []);

  // ============================================
  // HOLD-TO-INTERACT
  // ============================================

  const showProgressBar = useCallback(() => {
    if (progressContainerRef.current) progressContainerRef.current.style.display = 'flex';
  }, []);

  const hideProgressBar = useCallback(() => {
    if (progressContainerRef.current) progressContainerRef.current.style.display = 'none';
  }, []);

  const resetProgress = useCallback(() => {
    if (progressBarRef.current) progressBarRef.current.style.width = '0%';
    if (progressTextRef.current) progressTextRef.current.textContent = '0%';
    hideProgressBar();
  }, [hideProgressBar]);

  const onHoldComplete = useCallback(() => {
    const gs = gameStateRef.current;
    gs.isHolding = false;
    console.log('%c✓ Hold complete! Action triggered.', 'color: #8BC34A; font-weight: bold;');

    if (progressContainerRef.current) {
      progressContainerRef.current.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.8)';
    }
    setTimeout(() => {
      resetProgress();
      if (progressContainerRef.current) {
        progressContainerRef.current.style.boxShadow = 'none';
      }
    }, 400);

    // ---- Context-specific actions ----
    if (gs.currentState === GameState.SETUP) {
      changeState(GameState.TUTORIAL);
    } else if (gs.currentState === GameState.TUTORIAL) {
      const step = TUTORIAL_STEPS[gs.tutorialStep];
      if (!step) return;

      // 1. Stop the correct circle
      stopCircle(step.circleIndex);

      // 2. Play SFX
      playSFX(step.sfx);

      // 3. Screen shake
      triggerScreenShake(step.shakeIntensity, 400);

      // 4. Show feedback text
      showFeedback(step.feedbackText);

      // 5. Update character
      const targetProgress = step.characterProgress;
      gs.characterTargetX = COCOON_POS.x + (SARCOPHAGUS_POS.x - COCOON_POS.x) * targetProgress;
      gs.characterTargetY = COCOON_POS.y + (SARCOPHAGUS_POS.y - COCOON_POS.y) * targetProgress;
      gs.characterPose = step.characterPose;
      gs.characterPoseTimer = 0;

      // 6. Cord stretch / snap
      if (step.cordStretched >= 2) {
        gs.cordAttached = false; // Snap!
      } else {
        gs.cordStretch = step.cordStretched;
      }

      // 7. Cocoon break progression
      gs.cocoonBreakLevel = Math.min(6, gs.tutorialStep + 1);

      // 8. Update lullaby distortion
      gs.lullabyDistortion = step.lullabyDistortion;
      updateLullabyDistortion(step.lullabyDistortion);

      // 9. Advance step
      gs.tutorialStep++;
      gs.stepTransitionTimer = 800; // Brief pause before next prompt

      if (gs.tutorialStep >= 7) {
        // All steps done → transition to CHOICE after delay
        gs.tutorialCompleted = true;
        setTimeout(() => changeState(GameState.CHOICE), 2000);
      } else {
        // Prepare next step
        const nextStep = TUTORIAL_STEPS[gs.tutorialStep];
        gs.currentHoldDuration = nextStep.holdDuration;
        // Prompt updates after transition delay
        setTimeout(() => {
          if (promptRef.current) promptRef.current.textContent = nextStep.narrativeText;
          if (stepCounterRef.current) stepCounterRef.current.textContent = `${gs.tutorialStep + 1} / 7`;
        }, 800);
      }
    }
  }, [changeState, resetProgress, stopCircle, playSFX, triggerScreenShake, showFeedback, updateLullabyDistortion]);

  // ============================================
  // GAME LOOP
  // ============================================

  const gameLoop = useCallback((currentTime: number) => {
    const gs = gameStateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Delta time
    if (gs.lastFrameTime === 0) gs.lastFrameTime = currentTime;
    gs.deltaTime = Math.min(currentTime - gs.lastFrameTime, 50); // cap at 50ms
    gs.lastFrameTime = currentTime;
    gs.stateTimer += gs.deltaTime;

    // FPS
    gs.frameCount++;
    gs.fpsTimer += gs.deltaTime;
    if (gs.fpsTimer >= 1000) {
      gs.currentFPS = Math.round((gs.frameCount * 1000) / gs.fpsTimer);
      if (fpsCounterRef.current) fpsCounterRef.current.textContent = `FPS: ${gs.currentFPS}`;
      gs.frameCount = 0;
      gs.fpsTimer = 0;
    }

    const scale = canvas.width / BASE_WIDTH;
    let centerX = canvas.width / 2;
    let centerY = canvas.height / 2;

    // ---- UPDATE ----

    gs.cocoonPulse += gs.deltaTime * 0.003;
    gs.floorPatternRotation += gs.deltaTime * 0.00002;
    gs.characterPoseTimer += gs.deltaTime * 0.001;

    // Update circles
    for (const circle of gs.circles) {
      if (!circle.isStopped) {
        circle.prevAngle = circle.currentAngle;
        circle.currentAngle += circle.rotationSpeed * circle.direction * (gs.deltaTime * 0.06);
      }
      // Decay flash timer
      if (circle.stopFlashTimer > 0) {
        circle.stopFlashTimer = Math.max(0, circle.stopFlashTimer - gs.deltaTime * 0.002);
      }
    }

    // Update screen shake
    if (gs.screenShake.timer < gs.screenShake.duration) {
      gs.screenShake.timer += gs.deltaTime;
      const progress = gs.screenShake.timer / gs.screenShake.duration;
      const decay = 1 - progress;
      const shakeX = (Math.random() - 0.5) * gs.screenShake.intensity * decay * scale;
      const shakeY = (Math.random() - 0.5) * gs.screenShake.intensity * decay * scale;
      centerX += shakeX;
      centerY += shakeY;
    }

    // Update character position (smooth interpolation)
    const lerpSpeed = 0.003 * gs.deltaTime;
    gs.characterX += (gs.characterTargetX - gs.characterX) * Math.min(lerpSpeed, 1);
    gs.characterY += (gs.characterTargetY - gs.characterY) * Math.min(lerpSpeed, 1);

    // Update feedback text
    if (gs.feedbackText) {
      gs.feedbackText.timer += gs.deltaTime;
      const t = gs.feedbackText.timer / gs.feedbackText.maxTime;
      if (t < 0.15) {
        gs.feedbackText.alpha = t / 0.15; // fade in
      } else if (t > 0.7) {
        gs.feedbackText.alpha = (1 - t) / 0.3; // fade out
      } else {
        gs.feedbackText.alpha = 1;
      }
      gs.feedbackText.y -= gs.deltaTime * 0.01; // drift up
      if (t >= 1) gs.feedbackText = null;
    }

    // Update burst particles
    for (let i = gs.burstParticles.length - 1; i >= 0; i--) {
      const p = gs.burstParticles[i];
      p.x += p.vx * gs.deltaTime * 0.06;
      p.y += p.vy * gs.deltaTime * 0.06;
      p.life -= gs.deltaTime * 0.001;
      if (p.life <= 0) gs.burstParticles.splice(i, 1);
    }

    // Step transition timer
    if (gs.stepTransitionTimer > 0) {
      gs.stepTransitionTimer = Math.max(0, gs.stepTransitionTimer - gs.deltaTime);
    }

    // State-specific update
    switch (gs.currentState) {
      case GameState.INTRO:
        if (!gs.introTextShown && gs.stateTimer >= INTRO_FADE_IN_DELAY) {
          gs.introTextShown = true;
          if (introTextRef.current) {
            introTextRef.current.style.display = 'block';
            void introTextRef.current.offsetWidth;
            introTextRef.current.style.opacity = '1';
          }
        }
        if (gs.stateTimer >= INTRO_DURATION) {
          changeState(GameState.SETUP);
        }
        break;

      case GameState.SETUP:
        gs.setupFadeAlpha = Math.min(gs.stateTimer / SETUP_FADE_IN_DURATION, 1);
        break;

      case GameState.TUTORIAL:
        break;

      case GameState.CHOICE:
        // Update choice fade-in
        if (gs.choiceFadeIn < 1) {
          gs.choiceFadeIn = Math.min(1, gs.choiceFadeIn + gs.deltaTime * 0.001);
        }

        // REVERSE SEQUENCE update
        if (gs.reverseActive) {
          gs.reverseTimer += gs.deltaTime;

          // Fade in reverse narrative text
          const narPhase = gs.reverseTimer / 1000;
          if (narPhase < 0.8) {
            gs.reverseNarrativeAlpha = narPhase / 0.8;
          } else if (narPhase > 3.0) {
            gs.reverseNarrativeAlpha = Math.max(0, 1 - (narPhase - 3.0) / 1.0);
          } else {
            gs.reverseNarrativeAlpha = 1;
          }
          if (reverseNarrativeRef.current) {
            reverseNarrativeRef.current.style.opacity = `${gs.reverseNarrativeAlpha}`;
          }

          // Restart circles one by one (innermost=0 first, every ~500ms)
          const circleRestartInterval = 500;
          const expectedRestarted = Math.min(7, Math.floor(gs.reverseTimer / circleRestartInterval) + 1);
          while (gs.reverseCirclesRestarted < expectedRestarted && gs.reverseCirclesRestarted < 7) {
            const idx = gs.reverseCirclesRestarted; // 0, 1, 2... from innermost
            gs.circles[idx].isStopped = false;
            gs.circles[idx].stopFlashTimer = 0.6; // Brief flash on restart
            gs.reverseCirclesRestarted++;
            playSFX('reverse');
          }

          // Smoothly reverse character position back to cocoon
          const reverseProgress = Math.min(1, gs.reverseTimer / REVERSE_DURATION);
          const easeOut = 1 - Math.pow(1 - reverseProgress, 3); // cubic ease-out
          gs.characterTargetX = COCOON_POS.x + (SARCOPHAGUS_POS.x - COCOON_POS.x) * (1 - easeOut);
          gs.characterTargetY = COCOON_POS.y + (SARCOPHAGUS_POS.y - COCOON_POS.y) * (1 - easeOut);

          // Reverse cocoon break level
          gs.cocoonBreakLevel = Math.max(0, Math.round(6 * (1 - easeOut)));

          // Reverse cord state
          if (reverseProgress > 0.3) {
            gs.cordAttached = true;
            gs.cordStretch = Math.max(0, 2 * (1 - easeOut));
          }

          // Reverse lullaby distortion
          gs.lullabyDistortion = Math.max(0, 1 - easeOut);
          updateLullabyDistortion(gs.lullabyDistortion);

          // Reverse character pose
          if (reverseProgress < 0.3) {
            gs.characterPose = 'standing';
          } else if (reverseProgress < 0.5) {
            gs.characterPose = 'walking';
          } else if (reverseProgress < 0.7) {
            gs.characterPose = 'partial';
          } else if (reverseProgress < 0.85) {
            gs.characterPose = 'struggling';
          } else {
            gs.characterPose = 'curled';
          }

          // Reverse complete
          if (gs.reverseTimer >= REVERSE_DURATION) {
            gs.reverseActive = false;
            gs.choiceLoopCount++;
            gs.characterX = COCOON_POS.x;
            gs.characterY = COCOON_POS.y;
            gs.characterPose = 'curled';
            gs.cocoonBreakLevel = 0;
            gs.cordAttached = true;
            gs.cordStretch = 0;
            gs.lullabyDistortion = 0;
            gs.tutorialStep = 0;
            gs.tutorialCompleted = false;

            // Hide reverse narrative
            if (reverseNarrativeRef.current) {
              reverseNarrativeRef.current.style.opacity = '0';
              setTimeout(() => {
                if (reverseNarrativeRef.current) reverseNarrativeRef.current.style.display = 'none';
              }, 500);
            }

            // Re-run tutorial (all 7 steps again)
            // Reset hold system for tutorial
            gs.currentState = GameState.TUTORIAL;
            gs.stateTimer = 0;
            gs.currentHoldDuration = TUTORIAL_STEPS[0].holdDuration;
            if (tutorialUIRef.current) tutorialUIRef.current.style.display = 'block';
            if (promptRef.current) promptRef.current.textContent = TUTORIAL_STEPS[0].narrativeText;
            if (stepCounterRef.current) stepCounterRef.current.textContent = '1 / 7';
            if (stateDisplayRef.current) stateDisplayRef.current.textContent = 'State: TUTORIAL';

            console.log(`%c↺ Reverse complete → Tutorial restart (loop ${gs.choiceLoopCount})`, 'color: #9C27B0; font-weight: bold;');
          }
        }
        break;

      case GameState.EXIT: {
        // Narrative sequence for exit
        const narratives = gs.exitType ? EXIT_NARRATIVES[gs.exitType] || [] : [];
        if (narratives.length > 0 && gs.exitNarrativeStep < narratives.length) {
          gs.exitNarrativeTimer += gs.deltaTime;
          const stepDuration = 3000; // Each line shows for 3 seconds
          const fadeInTime = 800;
          const fadeOutTime = 600;
          const elapsed = gs.exitNarrativeTimer;

          if (elapsed < fadeInTime) {
            gs.exitNarrativeAlpha = elapsed / fadeInTime;
          } else if (elapsed > stepDuration - fadeOutTime) {
            gs.exitNarrativeAlpha = Math.max(0, (stepDuration - elapsed) / fadeOutTime);
          } else {
            gs.exitNarrativeAlpha = 1;
          }

          if (exitNarrativeRef.current) {
            exitNarrativeRef.current.textContent = narratives[gs.exitNarrativeStep];
            exitNarrativeRef.current.style.opacity = `${gs.exitNarrativeAlpha}`;
            exitNarrativeRef.current.style.display = 'block';
          }

          if (elapsed >= stepDuration) {
            gs.exitNarrativeStep++;
            gs.exitNarrativeTimer = 0;
          }
        } else if (exitNarrativeRef.current) {
          // All narration done — keep showing final fade
          const fadeProgress = Math.max(0, 1 - (gs.exitNarrativeTimer / 2000));
          exitNarrativeRef.current.style.opacity = `${fadeProgress}`;
        }
        break;
      }
    }

    // Update hold progress with variable duration
    if (gs.isHolding) {
      const elapsed = Date.now() - gs.holdStartTime;
      const duration = gs.currentHoldDuration;
      const progress = Math.min((elapsed / duration) * 100, 100);
      if (progressBarRef.current) progressBarRef.current.style.width = progress + '%';
      if (progressTextRef.current) progressTextRef.current.textContent = Math.floor(progress) + '%';
      if (progress >= 100) {
        onHoldComplete();
      }
    }

    // ---- RENDER ----
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    switch (gs.currentState) {
      case GameState.INTRO: {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const time = gs.stateTimer / 1000;
        ctx.fillStyle = 'rgba(240, 230, 210, 0.1)';
        for (let i = 0; i < 30; i++) {
          const x = (Math.sin(time * 0.5 + i * 0.5) * 0.3 + 0.5) * canvas.width;
          const y = ((time * 0.1 + i / 30) % 1) * canvas.height;
          const size = 2 + Math.sin(time + i) * 1;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case GameState.SETUP:
      case GameState.TUTORIAL:
      case GameState.CHOICE: {
        const alpha = gs.currentState === GameState.SETUP ? gs.setupFadeAlpha : 1;

        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const bgGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 450 * scale);
        bgGrad.addColorStop(0, `rgba(20, 18, 15, ${alpha})`);
        bgGrad.addColorStop(0.5, `rgba(12, 11, 10, ${alpha})`);
        bgGrad.addColorStop(1, `rgba(8, 8, 8, ${alpha})`);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalAlpha = alpha;

        drawFloorPattern(ctx, centerX, centerY, scale, gs.floorPatternRotation);
        drawAmbientParticles(ctx, canvas.width, canvas.height, gs.stateTimer);

        // Draw circles outermost→innermost
        for (let i = gs.circles.length - 1; i >= 0; i--) {
          const circle = gs.circles[i];
          if (circle.isStopped) {
            ctx.save();
            const pulseAlpha = 0.1 + Math.sin(gs.stateTimer * 0.003) * 0.05;
            ctx.globalAlpha = alpha * (0.6 + pulseAlpha);
            const stoppedCircle = {
              ...circle,
              color: `rgba(212, 175, 55, ${0.4 + pulseAlpha})`,
              glowColor: `rgba(212, 175, 55, ${0.1 + pulseAlpha * 0.3})`,
            };
            drawGearCircle(ctx, centerX, centerY, stoppedCircle, scale);
            ctx.restore();
          } else {
            drawGearCircle(ctx, centerX, centerY, circle, scale);
          }
        }

        // Burst particles
        drawBurstParticles(ctx, centerX, centerY, scale, gs.burstParticles);

        // Umbilical cord (behind character, in front of cocoon)
        if (gs.currentState === GameState.TUTORIAL || gs.currentState === GameState.CHOICE) {
          drawUmbilicalCord(ctx, centerX, centerY, scale, gs.characterX, gs.characterY, gs.cordAttached, gs.cordStretch);
        } else {
          // In SETUP, draw the default cord from cocoon to center
          drawUmbilicalCord(ctx, centerX, centerY, scale, COCOON_POS.x, COCOON_POS.y, true, 0);
        }

        // Cocoon
        const breakLevel = (gs.currentState === GameState.TUTORIAL || gs.currentState === GameState.CHOICE) ? gs.cocoonBreakLevel : 0;
        drawCocoon(ctx, centerX, centerY, scale, gs.cocoonPulse, breakLevel);

        // Character (only in TUTORIAL and beyond, after first step starts)
        if ((gs.currentState === GameState.TUTORIAL && gs.tutorialStep > 0) || gs.currentState === GameState.CHOICE) {
          drawCharacter(ctx, centerX, centerY, scale, gs.characterX, gs.characterY, gs.characterPose, gs.characterPoseTimer);
        }

        // Sarcophagus at center
        drawSarcophagus(ctx, centerX, centerY, scale);

        // Feedback text
        if (gs.feedbackText) {
          drawFeedbackText(ctx, centerX, centerY, scale, gs.feedbackText);
        }

        ctx.globalAlpha = 1;
        break;
      }

      case GameState.EXIT: {
        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const bgGradExit = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 450 * scale);
        bgGradExit.addColorStop(0, 'rgba(20, 18, 15, 1)');
        bgGradExit.addColorStop(1, 'rgba(8, 8, 8, 1)');
        ctx.fillStyle = bgGradExit;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Scene fades out gradually
        const sceneFade = Math.max(0, 1 - gs.stateTimer / 8000);
        ctx.globalAlpha = sceneFade;

        drawFloorPattern(ctx, centerX, centerY, scale, gs.floorPatternRotation);
        drawAmbientParticles(ctx, canvas.width, canvas.height, gs.stateTimer);
        for (let i = gs.circles.length - 1; i >= 0; i--) {
          drawGearCircle(ctx, centerX, centerY, gs.circles[i], scale);
        }
        drawCocoon(ctx, centerX, centerY, scale, gs.cocoonPulse, gs.cocoonBreakLevel);
        if (gs.tutorialStep > 0) {
          drawCharacter(ctx, centerX, centerY, scale, gs.characterX, gs.characterY, gs.characterPose, gs.characterPoseTimer);
        }
        drawSarcophagus(ctx, centerX, centerY, scale);

        ctx.globalAlpha = 1;

        // Dark vignette overlay that intensifies
        const exitAlpha = Math.min(gs.stateTimer / 5000, 0.85);
        ctx.fillStyle = `rgba(0, 0, 0, ${exitAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        break;
      }
    }

    gs.animFrameId = requestAnimationFrame(gameLoop);
  }, [changeState, drawAmbientParticles, drawBurstParticles, drawCharacter, drawCocoon, drawFeedbackText, drawFloorPattern, drawGearCircle, drawSarcophagus, drawUmbilicalCord, onHoldComplete, playSFX, updateLullabyDistortion]);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const gs = gameStateRef.current;
    gs.lastFrameTime = 0;
    gs.animFrameId = requestAnimationFrame(gameLoop);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        // Initialize audio on first interaction (browser policy)
        initAudio();
        const a = audioRef.current;
        if (a.ctx && a.ctx.state === 'suspended') a.ctx.resume();

        if (!gs.isHolding && (gs.currentState === GameState.SETUP || gs.currentState === GameState.TUTORIAL)) {
          // Don't allow hold during step transition
          if (gs.currentState === GameState.TUTORIAL && gs.stepTransitionTimer > 0) return;
          if (gs.tutorialCompleted) return;

          e.preventDefault();
          gs.isHolding = true;
          gs.holdStartTime = Date.now();
          showProgressBar();
          console.log('%cHold started...', 'color: #4CAF50;');
        }
      }

      // Session 5: Keyboard 1/2 for CHOICE state
      if (gs.currentState === GameState.CHOICE && !gs.reverseActive) {
        if (e.key === '1') {
          e.preventDefault();
          handleChoiceA();
        } else if (e.key === '2') {
          e.preventDefault();
          handleChoiceB();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (gs.isHolding) {
          e.preventDefault();
          gs.isHolding = false;
          resetProgress();
          console.log('%cHold released - Progress reset', 'color: #f44336;');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    console.log('%c=== CAMERA DI NASCITA - Prototype ===', 'color: #d4af37; font-size: 16px; font-weight: bold;');
    console.log('%cSession 1-5: Full Game Flow (INTRO → SETUP → TUTORIAL → CHOICE → EXIT)', 'color: #f0e6d2;');
    console.log('%cChoice keys: [1] = left button, [2] = right button', 'color: #888;');

    (window as any).debugChangeState = changeState;
    (window as any).GameState = GameState;
    (window as any).stopCircle = stopCircle;

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      if (gs.animFrameId) cancelAnimationFrame(gs.animFrameId);
      // Cleanup audio
      const a = audioRef.current;
      if (a.ctx) {
        try { a.droneOsc?.stop(); } catch {}
        try { a.lullabyOsc?.stop(); } catch {}
        a.ctx.close();
        a.initialized = false;
      }
    };
  }, [changeState, gameLoop, initAudio, resizeCanvas, resetProgress, showProgressBar, stopCircle, handleChoiceA, handleChoiceB]);

  // ============================================
  // RENDER JSX
  // ============================================

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        overflow: 'hidden',
        fontFamily: "'Courier New', monospace",
        color: '#fff',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: '100%',
          maxHeight: '100%',
          background: '#000',
        }}
      />

      {/* UI Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        {/* Intro Text */}
        <div
          ref={introTextRef}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 'clamp(24px, 4vw, 48px)',
            textAlign: 'center',
            color: '#f0e6d2',
            textShadow: '0 0 20px rgba(240, 230, 210, 0.5)',
            letterSpacing: '0.1em',
            opacity: 0,
            transition: 'opacity 2s ease-in-out',
            pointerEvents: 'auto',
          }}
        >
          Svegliati, pellegrino.
        </div>

        {/* Tutorial UI */}
        <div
          ref={tutorialUIRef}
          style={{
            display: 'none',
            position: 'absolute',
            bottom: '16%',
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            pointerEvents: 'auto',
            width: 'clamp(300px, 50vw, 600px)',
          }}
        >
          <div
            ref={stepCounterRef}
            style={{
              fontSize: 'clamp(11px, 1.2vw, 15px)',
              color: 'rgba(212, 175, 55, 0.6)',
              letterSpacing: '0.2em',
              marginBottom: '8px',
              textTransform: 'uppercase',
            }}
          >
            1 / 7
          </div>
          <div
            ref={promptRef}
            style={{
              fontSize: 'clamp(13px, 1.6vw, 20px)',
              color: '#f0e6d2',
              textShadow: '0 0 10px rgba(240, 230, 210, 0.3)',
              letterSpacing: '0.04em',
              lineHeight: '1.4',
            }}
          >
            Qualcosa si muove... Tieni premuto →
          </div>
        </div>

        {/* Progress Bar */}
        <div
          ref={progressContainerRef}
          style={{
            display: 'none',
            position: 'absolute',
            bottom: '8%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'clamp(250px, 25vw, 400px)',
            height: '36px',
            background: 'rgba(0, 0, 0, 0.75)',
            border: '2px solid rgba(240, 230, 210, 0.6)',
            borderRadius: '4px',
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
            transition: 'box-shadow 0.3s ease',
          }}
        >
          <div
            ref={progressBarRef}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '0%',
              height: '100%',
              background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.6), rgba(212, 175, 55, 0.9))',
              transition: 'width 0.05s linear',
              zIndex: 1,
            }}
          />
          <div
            ref={progressTextRef}
            style={{
              position: 'relative',
              zIndex: 2,
              fontSize: '16px',
              color: '#f0e6d2',
              textShadow: '0 0 4px rgba(0, 0, 0, 0.8)',
              letterSpacing: '0.05em',
            }}
          >
            0%
          </div>
        </div>

        {/* Choice UI */}
        <div
          ref={choiceUIRef}
          style={{
            display: 'none',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            gap: '40px',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            pointerEvents: 'auto',
            opacity: 0,
            transition: 'opacity 0.8s ease-in-out',
          }}
        >
          {/* Choice prompt */}
          <div
            style={{
              fontSize: 'clamp(13px, 1.6vw, 20px)',
              color: 'rgba(240, 230, 210, 0.6)',
              textAlign: 'center',
              marginBottom: '20px',
              letterSpacing: '0.08em',
            }}
          >
            Cosa fai?
          </div>
          <div style={{ display: 'flex', gap: '50px', justifyContent: 'center', alignItems: 'center' }}>
            <button
              ref={choiceBtnARef}
              onClick={handleChoiceA}
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 'clamp(16px, 2.2vw, 28px)',
                padding: '20px 40px',
                background: 'rgba(240, 230, 210, 0.08)',
                border: '2px solid rgba(240, 230, 210, 0.5)',
                color: '#f0e6d2',
                cursor: 'pointer',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                transition: 'all 0.3s ease',
                minWidth: '180px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(240, 230, 210, 0.25)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(240, 230, 210, 0.4)';
                e.currentTarget.style.borderColor = '#f0e6d2';
                e.currentTarget.style.transform = 'scale(1.06)';
                playSFX('choice_hover');
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(240, 230, 210, 0.08)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'rgba(240, 230, 210, 0.5)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              DORMI
            </button>
            <div style={{ color: 'rgba(240, 230, 210, 0.25)', fontSize: 'clamp(14px, 1.4vw, 18px)' }}>o</div>
            <button
              ref={choiceBtnBRef}
              onClick={handleChoiceB}
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 'clamp(16px, 2.2vw, 28px)',
                padding: '20px 40px',
                background: 'rgba(240, 230, 210, 0.08)',
                border: '2px solid rgba(240, 230, 210, 0.5)',
                color: '#f0e6d2',
                cursor: 'pointer',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                transition: 'all 0.3s ease',
                minWidth: '180px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(240, 230, 210, 0.25)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(240, 230, 210, 0.4)';
                e.currentTarget.style.borderColor = '#f0e6d2';
                e.currentTarget.style.transform = 'scale(1.06)';
                playSFX('choice_hover');
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(240, 230, 210, 0.08)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'rgba(240, 230, 210, 0.5)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              RUBA
            </button>
          </div>
          {/* Keyboard hint */}
          <div
            style={{
              fontSize: 'clamp(10px, 1vw, 13px)',
              color: 'rgba(240, 230, 210, 0.25)',
              marginTop: '24px',
              letterSpacing: '0.12em',
            }}
          >
            [1] / [2]
          </div>
        </div>

        {/* Reverse Narrative Overlay */}
        <div
          ref={reverseNarrativeRef}
          style={{
            display: 'none',
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 'clamp(16px, 2vw, 26px)',
            color: '#f0e6d2',
            textAlign: 'center',
            textShadow: '0 0 20px rgba(240, 230, 210, 0.5)',
            letterSpacing: '0.06em',
            fontStyle: 'italic',
            opacity: 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none',
            maxWidth: '70vw',
          }}
        />

        {/* Exit Narrative Overlay */}
        <div
          ref={exitNarrativeRef}
          style={{
            display: 'none',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 'clamp(20px, 3vw, 40px)',
            color: '#f0e6d2',
            textAlign: 'center',
            textShadow: '0 0 25px rgba(240, 230, 210, 0.6)',
            letterSpacing: '0.1em',
            opacity: 0,
            transition: 'opacity 0.2s ease',
            pointerEvents: 'none',
            maxWidth: '80vw',
          }}
        />
      </div>

      {/* Debug Panel */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '15px',
          border: '1px solid #333',
          fontSize: '14px',
          fontFamily: "'Courier New', monospace",
          color: '#0f0',
          zIndex: 100,
          pointerEvents: 'none',
        }}
      >
        <div ref={stateDisplayRef} style={{ marginBottom: '5px' }}>
          State: INTRO
        </div>
        <div ref={fpsCounterRef} style={{ color: '#ff0' }}>
          FPS: 0
        </div>
      </div>
    </div>
  );
}
