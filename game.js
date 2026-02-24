// ============================================
// CAMERA DI NASCITA - Web Prototype
// Session 1: State Machine + Intro
// Session 2: Hold-to-Interact Input System
// Session 3: Birth Chamber Visual - 7 Rotating Circles
// Session 4: Tutorial Sequence - 7 Sequential Interactions
// Session 5: Narrative Choice UI + Reverse Sequence
// Session 8: Final Sequence — Mask + Cards + Flash
// Session 9: Blood Two-Phase + Player-Driven Exit
// ============================================

// Canvas setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

function resizeCanvas() {
    const aspectRatio = BASE_WIDTH / BASE_HEIGHT;
    const windowRatio = window.innerWidth / window.innerHeight;
    if (windowRatio > aspectRatio) {
        canvas.height = window.innerHeight;
        canvas.width = canvas.height * aspectRatio;
    } else {
        canvas.width = window.innerWidth;
        canvas.height = canvas.width / aspectRatio;
    }
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Preload circle asset from Figma
// Preload circle assets from Figma
const circleImage = new Image();
circleImage.src = 'assets/circle.png';
const circleImage2 = new Image();
circleImage2.src = 'assets/circle_variant.png';

let assetsLoaded = 0;
const onAssetLoad = () => { assetsLoaded++; console.log(`%c🎨 Asset loaded (${assetsLoaded}/2)`, 'color: #d4af37;'); };
circleImage.onload = onAssetLoad;
circleImage2.onload = onAssetLoad;

// ============================================
// STATE MACHINE
// ============================================

const GameState = { TITLE_SCREEN: 'title_screen', INTRO: 'intro', SETUP: 'setup', TUTORIAL: 'tutorial', CHOICE: 'choice', FINAL_SEQUENCE: 'final_sequence', BLOOD_EXIT: 'blood_exit', EXIT: 'exit' };
let currentState = GameState.TITLE_SCREEN;
let stateTimer = 0;
let deltaTime = 0;
let lastFrameTime = performance.now();

function changeState(newState) {
    console.log(`%c State Transition: ${currentState} → ${newState}`, 'color: #0f0; font-weight: bold;');
    onStateExit(currentState);
    currentState = newState;
    stateTimer = 0;
    document.getElementById('state-display').textContent = `State: ${newState.toUpperCase()}`;
    onStateEnter(newState);
}

function onStateExit(state) {
    switch (state) {
        case GameState.TITLE_SCREEN: /* cleanup handled in transition */ break;
        case GameState.INTRO: hideIntroText(); break;
        case GameState.TUTORIAL: hideTutorialUI(); break;
        case GameState.CHOICE: hideChoiceUI(); break;
    }
}

function onStateEnter(state) {
    switch (state) {
        case GameState.TITLE_SCREEN: enterTitleScreen(); break;
        case GameState.INTRO: startIntro(); break;
        case GameState.SETUP: startSetup(); break;
        case GameState.TUTORIAL: startTutorial(); break;
        case GameState.CHOICE: startChoice(); break;
        case GameState.FINAL_SEQUENCE: runFinalSequence(); break;
        case GameState.BLOOD_EXIT: runBloodAndExit(); break;
        case GameState.EXIT: startExit(); break;
    }
}

function updateState() {
    stateTimer += deltaTime;
    switch (currentState) {
        case GameState.TITLE_SCREEN: /* handled by async overlay */ break;
        case GameState.INTRO: updateIntro(); break;
        case GameState.SETUP: updateSetup(); break;
        case GameState.TUTORIAL: updateTutorial(); break;
        case GameState.CHOICE: updateChoice(); break;
        case GameState.FINAL_SEQUENCE: updateCommon(); break;
        case GameState.BLOOD_EXIT: updateBloodExit(); break;
        case GameState.EXIT: updateExit(); break;
    }
}

function renderState() {
    switch (currentState) {
        case GameState.TITLE_SCREEN: /* HTML overlay, no canvas render */ break;
        case GameState.INTRO: renderIntro(); break;
        case GameState.SETUP: renderSetup(); break;
        case GameState.TUTORIAL: renderTutorial(); break;
        case GameState.CHOICE: renderChoice(); break;
        case GameState.FINAL_SEQUENCE: renderChamber(1); break;
        case GameState.BLOOD_EXIT: renderBloodExit(); break;
        case GameState.EXIT: renderExit(); break;
    }
}

// ============================================
// SESSION 4: TUTORIAL STEP DEFINITIONS
// ============================================

const COCOON_POS = { x: -170, y: 20 };
const SARCOPHAGUS_POS = { x: 0, y: 0 };

// Session 6: Choice tree texts and reverse narrative
const CHOICE_TEXTS = [
    { a: 'DORMI', b: 'RUBA' },
    { a: 'TORNA A DORMIRE', b: 'RUBA' },
    { a: 'ERA SOLO UN BRUTTO SOGNO', b: 'RUBA' },
    { a: 'TI TENGO LA MANO, MAMMA È QUI', b: 'SCAPPA' }
];

const REVERSE_NARRATIVE = [
    '...il calore del bozzolo ti richiama indietro...',
    '...la ninna nanna si fa più dolce... più insistente...',
    '...qualcosa non va. La voce è sbagliata.',
];

const EXIT_NARRATIVES = {
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

const TUTORIAL_STEPS = [
    { circleIndex: 6, holdDuration: 2000, narrativeText: 'Qualcosa si muove... Tieni premuto →', feedbackText: '...spasmo...', sfx: 'snap', characterPose: 'spasm', characterProgress: 0, shakeIntensity: 3, cordStretched: 0, lullabyDistortion: 0 },
    { circleIndex: 5, holdDuration: 2000, narrativeText: 'Lotta contro il bozzolo... Tieni premuto →', feedbackText: '...lotta...', sfx: 'distort', characterPose: 'struggling', characterProgress: 0.05, shakeIntensity: 4, cordStretched: 0.1, lullabyDistortion: 0.15 },
    { circleIndex: 4, holdDuration: 2000, narrativeText: 'Il cordone si tende... Tieni premuto →', feedbackText: '...quasi libero...', sfx: 'distort', characterPose: 'partial', characterProgress: 0.15, shakeIntensity: 5, cordStretched: 0.3, lullabyDistortion: 0.3 },
    { circleIndex: 3, holdDuration: 2000, narrativeText: 'Primi passi incerti... Tieni premuto →', feedbackText: '...primi passi...', sfx: 'deep', characterPose: 'walking', characterProgress: 0.35, shakeIntensity: 4, cordStretched: 0.5, lullabyDistortion: 0.5 },
    { circleIndex: 2, holdDuration: 2000, narrativeText: 'Ancora un passo... Tieni premuto →', feedbackText: '...ancora...', sfx: 'deep', characterPose: 'walking', characterProgress: 0.55, shakeIntensity: 3, cordStretched: 0.7, lullabyDistortion: 0.65 },
    { circleIndex: 1, holdDuration: 3500, narrativeText: 'Strappo finale... Tieni premuto → (più a lungo)', feedbackText: '...libero.', sfx: 'tear', characterPose: 'standing', characterProgress: 0.75, shakeIntensity: 8, cordStretched: 2, lullabyDistortion: 0.85 },
    { circleIndex: 0, holdDuration: 2000, narrativeText: 'Il sarcofago ti attende... Tieni premuto →', feedbackText: '...il sarcofago...', sfx: 'final', characterPose: 'standing', characterProgress: 1.0, shakeIntensity: 6, cordStretched: 2, lullabyDistortion: 1.0 },
];

// ============================================
// UTILITIES
// ============================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const audioAssets = {};

function fadeOutAudio(audio, durationMs) {
    const steps = 20;
    const stepTime = durationMs / steps;
    const volumeStep = audio.volume / steps;
    const interval = setInterval(() => {
        audio.volume = Math.max(0, audio.volume - volumeStep);
        if (audio.volume <= 0) {
            clearInterval(interval);
            audio.pause();
        }
    }, stepTime);
}

// ============================================
// TITLE SCREEN
// ============================================

async function startTitleScreen() {
    const screen = document.getElementById('title-screen');
    screen.classList.remove('hidden');
    screen.style.opacity = '1';

    // To respect browser autoplay policies, we must wait for an interaction
    // before playing audio and starting the visual sequence.
    const prompt = document.getElementById('ts-prompt');
    const originalText = prompt.innerText || "[RISVEGLIO]";

    // Show a preliminary "click to initialize" prompt
    prompt.innerText = "[ CLICCA PER AVVIARE L'ESPERIENZA ]";
    prompt.style.opacity = '1';
    prompt.classList.add('visible');

    await new Promise(resolve => {
        function onInitInput() {
            document.removeEventListener('keydown', onInitInput);
            document.removeEventListener('click', onInitInput);
            resolve();
        }
        document.addEventListener('keydown', onInitInput);
        document.addEventListener('click', onInitInput);
    });

    // Hide prompt to prepare for the actual sequence
    prompt.style.opacity = '0';
    prompt.classList.remove('visible');
    await sleep(500);
    prompt.innerText = originalText;

    // Start main theme -- now it will play reliably since the user has interacted
    audioAssets.mainTheme = new Audio('assets/music/TEMA_PRINCIPALE.wav');
    audioAssets.mainTheme.loop = true;
    audioAssets.mainTheme.volume = 0.7;
    audioAssets.mainTheme.play().catch(() => { });

    // Sequence: logo -> vessillo -> prompt
    await sleep(500);
    document.getElementById('ts-logo').style.opacity = '1';

    await sleep(2000);
    document.getElementById('ts-vessillo').style.opacity = '1';

    await sleep(1500);
    prompt.style.opacity = '1';
    prompt.classList.add('visible');

    // Wait for any key/click to transition to the next state
    return new Promise(resolve => {
        function onInput(e) {
            document.removeEventListener('keydown', onInput);
            document.removeEventListener('click', onInput);
            resolve();
        }
        document.addEventListener('keydown', onInput);
        document.addEventListener('click', onInput);
    });
}

function enterTitleScreen() {
    startTitleScreen().then(() => {
        const screen = document.getElementById('title-screen');
        screen.style.opacity = '0';
        if (audioAssets.mainTheme) fadeOutAudio(audioAssets.mainTheme, 1000);
        setTimeout(() => {
            screen.classList.add('hidden');
            changeState(GameState.INTRO);
        }, 1000);
    });
}

// ============================================
// WEB AUDIO - SYNTHESIZED SFX
// ============================================

let audioCtx = null;
let droneOsc = null, droneGain = null;
let lullabyAudio = null, lullabySource = null, lullabyGain = null, lullabyFilter = null;
let audioInitialized = false;

function initAudio() {
    if (audioInitialized) return;
    try {
        audioCtx = new AudioContext();
        // Ambient drone
        droneGain = audioCtx.createGain();
        droneGain.gain.value = 0;
        droneGain.connect(audioCtx.destination);
        droneOsc = audioCtx.createOscillator();
        droneOsc.type = 'sine';
        droneOsc.frequency.value = 55;
        droneOsc.connect(droneGain);
        droneOsc.start();
        // Lullaby
        lullabyFilter = audioCtx.createBiquadFilter();
        lullabyFilter.type = 'lowpass';
        lullabyFilter.frequency.value = 2000;
        lullabyFilter.Q.value = 1;
        lullabyFilter.connect(audioCtx.destination);
        lullabyGain = audioCtx.createGain();
        lullabyGain.gain.value = 0;
        lullabyGain.connect(lullabyFilter);

        lullabyAudio = new Audio('assets/music/NINNA_NANNA_REVERSE.wav');
        lullabyAudio.loop = true;
        lullabySource = audioCtx.createMediaElementSource(lullabyAudio);
        lullabySource.connect(lullabyGain);

        audioInitialized = true;
        console.log('%c♪ Audio system initialized', 'color: #9C27B0;');
    } catch (e) {
        console.warn('Audio initialization failed:', e);
    }
}

function startDrone() {
    if (!audioCtx || !droneGain) return;
    droneGain.gain.setTargetAtTime(0.06, audioCtx.currentTime, 2);
}

function startLullaby() {
    if (!audioCtx || !lullabyGain) return;
    lullabyGain.gain.setTargetAtTime(0.04, audioCtx.currentTime, 1);
    if (lullabyAudio) lullabyAudio.play().catch(() => { });
}

function updateLullabyDistortion(distortion) {
    if (!audioCtx || !lullabyFilter) return;
    const filterFreq = 2000 * (1 - distortion * 0.85);

    lullabyFilter.frequency.setTargetAtTime(filterFreq, audioCtx.currentTime, 0.3);

    if (lullabyAudio) {
        // As distortion goes up, playback slows down
        lullabyAudio.playbackRate = Math.max(0.2, 1.0 - (distortion * 0.6));
    }

    if (droneGain) droneGain.gain.setTargetAtTime(0.06 + distortion * 0.08, audioCtx.currentTime, 0.5);
}

function playSFX(type) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    switch (type) {
        case 'snap': {
            const bufSize = audioCtx.sampleRate * 0.15;
            const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.1));
            const n = audioCtx.createBufferSource(); n.buffer = buf;
            const hpf = audioCtx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 3000;
            const g = audioCtx.createGain(); g.gain.setValueAtTime(0.3, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            n.connect(hpf).connect(g).connect(audioCtx.destination); n.start(now); n.stop(now + 0.15);
            const ping = audioCtx.createOscillator(); ping.frequency.value = 1200; ping.type = 'sine';
            const pg = audioCtx.createGain(); pg.gain.setValueAtTime(0.15, now); pg.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            ping.connect(pg).connect(audioCtx.destination); ping.start(now); ping.stop(now + 0.3);
            break;
        }
        case 'distort': {
            const o1 = audioCtx.createOscillator(); o1.frequency.value = 180; o1.type = 'sawtooth';
            const o2 = audioCtx.createOscillator(); o2.frequency.value = 187; o2.type = 'sawtooth';
            const g = audioCtx.createGain(); g.gain.setValueAtTime(0.08, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
            const lpf = audioCtx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 800;
            o1.connect(lpf); o2.connect(lpf); lpf.connect(g).connect(audioCtx.destination);
            o1.start(now); o2.start(now); o1.stop(now + 0.8); o2.stop(now + 0.8);
            break;
        }
        case 'tear': {
            const bufSize = audioCtx.sampleRate * 0.6;
            const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
            const n = audioCtx.createBufferSource(); n.buffer = buf;
            const bpf = audioCtx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.setValueAtTime(1500, now); bpf.frequency.linearRampToValueAtTime(300, now + 0.6); bpf.Q.value = 2;
            const g = audioCtx.createGain(); g.gain.setValueAtTime(0.4, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            n.connect(bpf).connect(g).connect(audioCtx.destination); n.start(now); n.stop(now + 0.6);
            const thud = audioCtx.createOscillator(); thud.frequency.value = 60; thud.type = 'sine';
            const tg = audioCtx.createGain(); tg.gain.setValueAtTime(0.25, now); tg.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            thud.connect(tg).connect(audioCtx.destination); thud.start(now); thud.stop(now + 0.4);
            break;
        }
        case 'deep': {
            const o = audioCtx.createOscillator(); o.frequency.setValueAtTime(80, now); o.frequency.exponentialRampToValueAtTime(40, now + 0.5); o.type = 'sine';
            const g = audioCtx.createGain(); g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            o.connect(g).connect(audioCtx.destination); o.start(now); o.stop(now + 0.5);
            break;
        }
        case 'final': {
            [110, 138.6, 165, 220].forEach(freq => {
                const o = audioCtx.createOscillator(); o.frequency.value = freq; o.type = 'sine';
                const g = audioCtx.createGain(); g.gain.setValueAtTime(0.1, now); g.gain.setTargetAtTime(0.001, now + 0.5, 0.5);
                o.connect(g).connect(audioCtx.destination); o.start(now); o.stop(now + 2);
            });
            break;
        }
        // Session 5: Reverse sequence SFX — descending whoosh
        case 'reverse': {
            const o = audioCtx.createOscillator();
            o.frequency.setValueAtTime(600, now);
            o.frequency.exponentialRampToValueAtTime(80, now + 0.8);
            o.type = 'sine';
            const g = audioCtx.createGain();
            g.gain.setValueAtTime(0.12, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
            const lpf = audioCtx.createBiquadFilter();
            lpf.type = 'lowpass'; lpf.frequency.value = 1200;
            o.connect(lpf).connect(g).connect(audioCtx.destination);
            o.start(now); o.stop(now + 0.8);
            break;
        }
        // Session 5: Lullaby clearing — bright ascending chime
        case 'lullaby_clear': {
            [330, 440, 554, 660].forEach((freq, idx) => {
                const o = audioCtx.createOscillator();
                o.frequency.value = freq; o.type = 'sine';
                const g = audioCtx.createGain();
                g.gain.setValueAtTime(0, now + idx * 0.1);
                g.gain.linearRampToValueAtTime(0.08, now + idx * 0.1 + 0.05);
                g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.6);
                o.connect(g).connect(audioCtx.destination);
                o.start(now + idx * 0.1); o.stop(now + idx * 0.1 + 0.6);
            });
            break;
        }
        // Session 5: Choice hover — subtle tick
        case 'choice_hover': {
            const o = audioCtx.createOscillator();
            o.frequency.value = 800; o.type = 'sine';
            const g = audioCtx.createGain();
            g.gain.setValueAtTime(0.04, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            o.connect(g).connect(audioCtx.destination);
            o.start(now); o.stop(now + 0.08);
            break;
        }
        // Session 9: Laceration — wet tearing noise
        case 'laceration': {
            const bufSize = audioCtx.sampleRate * 1.2;
            const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufSize) * 0.8;
            const n = audioCtx.createBufferSource(); n.buffer = buf;
            const bpf = audioCtx.createBiquadFilter(); bpf.type = 'bandpass';
            bpf.frequency.setValueAtTime(2000, now); bpf.frequency.exponentialRampToValueAtTime(200, now + 1.2); bpf.Q.value = 3;
            const g = audioCtx.createGain(); g.gain.setValueAtTime(0.35, now); g.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
            n.connect(bpf).connect(g).connect(audioCtx.destination); n.start(now); n.stop(now + 1.2);
            // Low rumble underneath
            const rumble = audioCtx.createOscillator(); rumble.frequency.value = 50; rumble.type = 'sine';
            const rg = audioCtx.createGain(); rg.gain.setValueAtTime(0.15, now); rg.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
            rumble.connect(rg).connect(audioCtx.destination); rumble.start(now); rumble.stop(now + 1.5);
            break;
        }
        // Session 9: Portal crossing — deep resonant chord
        case 'portal_cross': {
            [55, 82.4, 110, 146.8].forEach(freq => {
                const o = audioCtx.createOscillator(); o.frequency.value = freq; o.type = 'sine';
                const g = audioCtx.createGain(); g.gain.setValueAtTime(0.12, now); g.gain.setTargetAtTime(0.001, now + 1, 1);
                o.connect(g).connect(audioCtx.destination); o.start(now); o.stop(now + 3);
            });
            break;
        }
    }
}

// ============================================
// CIRCLE SYSTEM
// ============================================

// 7 outer circles — shifted further out (r=370 to r=795) to clear cocoon area
const circles = [
    { radius: 370, rotationSpeed: 0.0125, direction: 1, numTeeth: 20, toothDepth: 10, color: 'rgba(115, 115, 112, 0.35)', glowColor: 'rgba(115, 115, 112, 0.06)', lineWidth: 1.4, numMarkers: 5, currentAngle: Math.random() * Math.PI * 2, prevAngle: 0, isStopped: false, stopFlashTimer: 0 },
    { radius: 435, rotationSpeed: 0.010, direction: -1, numTeeth: 22, toothDepth: 9, color: 'rgba(105, 105, 100, 0.32)', glowColor: 'rgba(105, 105, 100, 0.05)', lineWidth: 1.3, numMarkers: 5, currentAngle: Math.random() * Math.PI * 2, prevAngle: 0, isStopped: false, stopFlashTimer: 0 },
    { radius: 500, rotationSpeed: 0.008, direction: 1, numTeeth: 24, toothDepth: 8, color: 'rgba(95, 95, 90, 0.28)', glowColor: 'rgba(95, 95, 90, 0.04)', lineWidth: 1.2, numMarkers: 6, currentAngle: Math.random() * Math.PI * 2, prevAngle: 0, isStopped: false, stopFlashTimer: 0 },
    { radius: 570, rotationSpeed: 0.006, direction: -1, numTeeth: 26, toothDepth: 7, color: 'rgba(85, 85, 82, 0.24)', glowColor: 'rgba(85, 85, 82, 0.03)', lineWidth: 1.1, numMarkers: 6, currentAngle: Math.random() * Math.PI * 2, prevAngle: 0, isStopped: false, stopFlashTimer: 0 },
    { radius: 645, rotationSpeed: 0.005, direction: 1, numTeeth: 28, toothDepth: 6, color: 'rgba(75, 75, 74, 0.20)', glowColor: 'rgba(75, 75, 74, 0.02)', lineWidth: 1.0, numMarkers: 7, currentAngle: Math.random() * Math.PI * 2, prevAngle: 0, isStopped: false, stopFlashTimer: 0 },
    { radius: 720, rotationSpeed: 0.004, direction: -1, numTeeth: 30, toothDepth: 5, color: 'rgba(65, 65, 60, 0.16)', glowColor: 'rgba(65, 65, 60, 0.01)', lineWidth: 0.9, numMarkers: 7, currentAngle: Math.random() * Math.PI * 2, prevAngle: 0, isStopped: false, stopFlashTimer: 0 },
    { radius: 795, rotationSpeed: 0.003, direction: 1, numTeeth: 32, toothDepth: 4, color: 'rgba(55, 55, 50, 0.12)', glowColor: 'rgba(55, 55, 50, 0.005)', lineWidth: 0.8, numMarkers: 7, currentAngle: Math.random() * Math.PI * 2, prevAngle: 0, isStopped: false, stopFlashTimer: 0 },
];

// ============================================
// SESSION 4: GAME STATE VARIABLES
// ============================================

let characterX = COCOON_POS.x, characterY = COCOON_POS.y;
let characterTargetX = COCOON_POS.x, characterTargetY = COCOON_POS.y;
let characterPose = 'curled';
let characterPoseTimer = 0;
let cordAttached = true;
let cordStretch = 0;
let cocoonBreakLevel = 0;
let lullabyDistortionLevel = 0;
let tutorialCompleted = false;
let stepTransitionTimer = 0;

let screenShake = { intensity: 0, timer: 0, duration: 0 };
let feedbackTextObj = null;
let burstParticles = [];

// Session 5: Choice system state
let choiceLoopCount = 0;      // 0-3, how many times DORMI was chosen
let reverseActive = false;     // true during reverse animation
let reverseTimer = 0;          // ms elapsed in reverse sequence
let reverseCirclesRestarted = 0; // how many circles have been restarted
let choiceFadeIn = 0;          // 0-1, fade-in alpha for choice UI
let exitType = null;           // 'steal' | 'escape' | 'surrender' | null
let exitNarrativeStep = 0;
let exitNarrativeTimer = 0;
let exitNarrativeAlpha = 0;
let reverseNarrativeAlpha = 0;

// Session 8: Final sequence state
let maskGlowDimmed = false;    // true after mask theft — dims sarcophagus golden glow
let hasCloak = false;           // true after PG wraps shroud — adds white cloak to character

// Session 9: Blood & exit state
let bloodPhase = 'none';         // 'none' | 'laceration' | 'reveal' | 'submerge' | 'player_exit'
let bloodRevealProgress = 0;     // 0→1, controls floor geometry red tint
let bloodSubmergeProgress = 0;   // 0→1, controls geometry fade-out
let playerExitEnabled = false;   // true when player can move freely
let cloakRed = false;            // true after portal crossing
let portalCrossed = false;       // prevents re-triggering

// ============================================
// VISUAL EFFECTS
// ============================================

function triggerScreenShake(intensity, duration) {
    screenShake = { intensity, timer: 0, duration: duration || 400 };
}

function showFeedback(text) {
    feedbackTextObj = { text, alpha: 0, y: 0, timer: 0, maxTime: 2500 };
}

function stopCircle(circleIndex) {
    if (circleIndex >= 0 && circleIndex < circles.length) {
        circles[circleIndex].isStopped = true;
        circles[circleIndex].stopFlashTimer = 1.0;
        // Burst particles
        const c = circles[circleIndex];
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2 + c.currentAngle;
            burstParticles.push({
                x: Math.cos(a) * c.radius, y: Math.sin(a) * c.radius,
                vx: Math.cos(a) * (0.5 + Math.random() * 1.5),
                vy: Math.sin(a) * (0.5 + Math.random() * 1.5),
                life: 1, maxLife: 1,
                size: 2 + Math.random() * 3,
                color: 'rgba(212, 175, 55, '
            });
        }
        console.log(`%c⚡ Circle ${circleIndex + 1} stopped!`, 'color: #d4af37; font-weight: bold;');
    }
}

// ============================================
// DRAWING FUNCTIONS
// ============================================

function drawGearCircle(centerX, centerY, circle, scale, index) {
    if (assetsLoaded < 2) return; // wait for assets

    const img = (index % 2 === 0) ? circleImage : circleImage2;

    const scaledRadius = circle.radius * scale;
    const imgSize = scaledRadius * 2.4;
    let flashBoost = circle.stopFlashTimer > 0 ? circle.stopFlashTimer * 0.5 : 0;

    // --- TRAIL / AFTERIMAGE ---
    if (!circle.isStopped && Math.abs(circle.prevAngle - circle.currentAngle) > 0.001) {
        ctx.save();
        ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.08;
        ctx.translate(centerX, centerY);
        ctx.rotate(circle.prevAngle);
        ctx.drawImage(img, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
        ctx.restore();
    }

    ctx.save();
    ctx.translate(centerX, centerY);

    // --- GLOW EFFECT (Optimized via Radial Gradient instead of shadowBlur) ---
    // Extract base alpha from the rgba string to scale it
    const glowAlphaStr = circle.glowColor.match(/[\d.]+\)$/);
    const baseAlpha = glowAlphaStr ? parseFloat(glowAlphaStr[0]) : 0.4;

    let glowR, glowColorObj;
    if (flashBoost > 0) {
        glowR = (imgSize / 2) + (20 + flashBoost * 40) * scale;
        glowColorObj = `rgba(212, 175, 55, ${0.6 * flashBoost})`;
    } else {
        glowR = (imgSize / 2) + 8 * scale;
        glowColorObj = circle.glowColor.replace(/[\d.]+\)$/, `${baseAlpha})`);
    }

    // Draw optimized circular glow
    const grad = ctx.createRadialGradient(0, 0, (imgSize / 2) * 0.6, 0, 0, glowR);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.8, glowColorObj);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();

    // --- MAIN CIRCLE IMAGE ---
    ctx.rotate(circle.currentAngle);
    ctx.drawImage(img, -imgSize / 2, -imgSize / 2, imgSize, imgSize);

    // --- GOLD TINT for stopped circles ---
    if (circle.isStopped) {
        const tintAlpha = 0.25 + Math.sin(stateTimer * 0.003) * 0.08;
        // Optimization: Instead of slow source-atop rectangular fill, 
        // draw the same image tinted using globalCompositeOperation 'source-atop' onto an offscreen canvas is slow,
        // so we use a faster approach: 'color' or 'overlay' blend mode directly with a circular shape
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = `rgba(212, 175, 55, ${tintAlpha * 0.8})`;
        ctx.beginPath();
        // The image ring is approximately between 0.2 and 0.5 of imgSize
        ctx.arc(0, 0, imgSize * 0.45, 0, Math.PI * 2);
        ctx.arc(0, 0, imgSize * 0.25, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
}

function drawFloorPattern(centerX, centerY, scale, rotation, bloodTint) {
    const t = bloodTint || 0; // 0 = normal grey, 1 = full red
    ctx.save(); ctx.translate(centerX, centerY); ctx.rotate(rotation);
    const maxR = 350 * scale; // stay within innermost gear circle (370)

    // Color interpolation helpers
    const col = (rBase, gBase, bBase, aBase, rEnd, gEnd, bEnd, aEnd) => {
        const r = Math.round(rBase + t * (rEnd - rBase));
        const g = Math.round(gBase + t * (gEnd - gBase));
        const b = Math.round(bBase + t * (bEnd - bBase));
        const a = aBase + t * (aEnd - aBase);
        return `rgba(${r},${g},${b},${a})`;
    };

    const mainCol = col(80, 80, 90, 0.12, 255, 40, 40, 1);
    const secCol = col(70, 70, 80, 0.08, 220, 30, 30, 0.8);
    const fineCol = col(60, 60, 70, 0.06, 180, 25, 25, 0.6);
    const dotCol = col(90, 90, 100, 0.12, 255, 50, 50, 1);
    const lw = (1 + t * 2) * scale;
    const lwFine = (0.6 + t * 1.2) * scale;

    // --- Phase 1: Main axes and Level 1 branches ---
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const ex = Math.cos(angle) * maxR, ey = Math.sin(angle) * maxR;
        ctx.moveTo(0, 0); ctx.lineTo(ex, ey);

        for (let j = 1; j <= 4; j++) {
            const dist = (j / 4.5) * maxR;
            const bLen = maxR * 0.22 * (1 - j * 0.12);
            const bx = Math.cos(angle) * dist, by = Math.sin(angle) * dist;
            const aPlus = angle + Math.PI / 6, aMinus = angle - Math.PI / 6;

            const bpx = bx + Math.cos(aPlus) * bLen, bpy = by + Math.sin(aPlus) * bLen;
            const bmx = bx + Math.cos(aMinus) * bLen, bmy = by + Math.sin(aMinus) * bLen;
            ctx.moveTo(bx, by); ctx.lineTo(bpx, bpy);
            ctx.moveTo(bx, by); ctx.lineTo(bmx, bmy);
        }
    }
    ctx.strokeStyle = mainCol; ctx.lineWidth = lw; ctx.stroke();

    // --- Phase 2: Level 2 branches and Concentric Hexagons ---
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        for (let j = 1; j <= 3; j++) { // Only first 3 for sub-branches
            const dist = (j / 4.5) * maxR;
            const bLen = maxR * 0.22 * (1 - j * 0.12);
            const bx = Math.cos(angle) * dist, by = Math.sin(angle) * dist;
            const subLen = bLen * 0.5;

            for (const baseA of [angle + Math.PI / 6, angle - Math.PI / 6]) {
                const bex = bx + Math.cos(baseA) * bLen, bey = by + Math.sin(baseA) * bLen;
                const mid = 0.55;
                const mx = bx + (bex - bx) * mid, my = by + (bey - by) * mid;

                ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(baseA + Math.PI / 5) * subLen, my + Math.sin(baseA + Math.PI / 5) * subLen);
                ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(baseA - Math.PI / 5) * subLen, my + Math.sin(baseA - Math.PI / 5) * subLen);
            }
        }
    }
    // Hexagons
    for (let ring = 1; ring <= 6; ring++) {
        const rr = (ring / 6.5) * maxR;
        for (let i = 0; i <= 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
            if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
            else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
    }
    ctx.strokeStyle = secCol; ctx.lineWidth = lwFine; ctx.stroke();

    // --- Phase 3: Level 3 tiny fronds and Cross-hatching ---
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        for (let j = 1; j <= 2; j++) { // Only first 2 for fronds
            const dist = (j / 4.5) * maxR;
            const bLen = maxR * 0.22 * (1 - j * 0.12);
            const bx = Math.cos(angle) * dist, by = Math.sin(angle) * dist;
            const tinyLen = (bLen * 0.5) * 0.45;

            for (const baseA of [angle + Math.PI / 6, angle - Math.PI / 6]) {
                const bex = bx + Math.cos(baseA) * bLen, bey = by + Math.sin(baseA) * bLen;
                ctx.moveTo(bex, bey); ctx.lineTo(bex + Math.cos(baseA + Math.PI / 4) * tinyLen, bey + Math.sin(baseA + Math.PI / 4) * tinyLen);
                ctx.moveTo(bex, bey); ctx.lineTo(bex + Math.cos(baseA - Math.PI / 4) * tinyLen, bey + Math.sin(baseA - Math.PI / 4) * tinyLen);
            }
        }
    }
    // Cross-hatching
    for (let i = 0; i < 6; i++) {
        const a1 = (i / 6) * Math.PI * 2, a2 = ((i + 1) / 6) * Math.PI * 2;
        for (let d = 0.3; d <= 0.8; d += 0.25) {
            ctx.moveTo(Math.cos(a1) * maxR * d, Math.sin(a1) * maxR * d);
            ctx.lineTo(Math.cos(a2) * maxR * d, Math.sin(a2) * maxR * d);
        }
    }
    ctx.strokeStyle = fineCol; ctx.lineWidth = lwFine * 0.6; ctx.stroke();

    // --- Phase 4: Diamonds and dots ---
    ctx.fillStyle = dotCol;
    const ds = (2.5 + t * 2) * scale;
    ctx.save(); ctx.rotate(Math.PI / 4);
    ctx.fillRect(-ds, -ds, ds * 2, ds * 2);
    ctx.restore();
    for (let ring = 1; ring <= 5; ring++) {
        const rr = (ring / 5.5) * maxR;
        for (let i = 0; i < 6; i++) {
            const nx = Math.cos((i / 6) * Math.PI * 2) * rr, ny = Math.sin((i / 6) * Math.PI * 2) * rr;
            ctx.save(); ctx.translate(nx, ny); ctx.rotate(Math.PI / 4);
            ctx.fillRect(-ds * 0.7, -ds * 0.7, ds * 1.4, ds * 1.4);
            ctx.restore();
        }
    }
    ctx.beginPath();
    for (let ring = 2; ring <= 5; ring += 2) {
        const rr = (ring / 6.5) * maxR;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
            ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
            ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, ds * 0.5, 0, Math.PI * 2);
        }
    }
    ctx.fill();

    ctx.restore();
}

function drawSarcophagus(centerX, centerY, scale) {
    ctx.save();
    const w = 40 * scale, h = 70 * scale;
    const g = ctx.createLinearGradient(centerX - w / 2, centerY - h / 2, centerX + w / 2, centerY + h / 2);
    g.addColorStop(0, 'rgba(60,55,50,0.9)'); g.addColorStop(0.5, 'rgba(75,70,60,0.9)'); g.addColorStop(1, 'rgba(55,50,45,0.9)');
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(centerX - w * 0.4, centerY - h / 2); ctx.lineTo(centerX + w * 0.4, centerY - h / 2); ctx.lineTo(centerX + w * 0.5, centerY + h / 2); ctx.lineTo(centerX - w * 0.5, centerY + h / 2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(140,130,110,0.6)'; ctx.lineWidth = 1.5 * scale; ctx.stroke();
    const my = centerY - h * 0.15, mw = w * 0.6, mh = h * 0.35;
    if (maskGlowDimmed) {
        ctx.shadowColor = 'rgba(100,80,40,0.15)'; ctx.shadowBlur = 5 * scale;
        ctx.fillStyle = 'rgba(120,100,50,0.4)'; ctx.beginPath(); ctx.ellipse(centerX, my, mw / 2, mh / 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(130,110,60,0.4)'; ctx.lineWidth = 1 * scale; ctx.stroke(); ctx.shadowBlur = 0;
    } else {
        ctx.shadowColor = 'rgba(212,175,55,0.4)'; ctx.shadowBlur = 15 * scale;
        ctx.fillStyle = 'rgba(212,175,55,0.7)'; ctx.beginPath(); ctx.ellipse(centerX, my, mw / 2, mh / 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(230,200,80,0.8)'; ctx.lineWidth = 1 * scale; ctx.stroke(); ctx.shadowBlur = 0;
    }
    ctx.fillStyle = 'rgba(20,15,10,0.9)';
    ctx.beginPath(); ctx.ellipse(centerX - mw * 0.28, my - mh * 0.05, mw * 0.18, mh * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(centerX + mw * 0.28, my - mh * 0.05, mw * 0.18, mh * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(180,150,40,0.4)'; ctx.lineWidth = 0.8 * scale;
    ctx.beginPath(); ctx.moveTo(centerX, my - mh * 0.05 + mh * 0.12 * 2); ctx.lineTo(centerX, my + mh * 0.25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(centerX - mw * 0.15, my + mh * 0.3); ctx.quadraticCurveTo(centerX, my + mh * 0.35, centerX + mw * 0.15, my + mh * 0.3); ctx.stroke();
    ctx.strokeStyle = 'rgba(140,130,110,0.3)'; ctx.lineWidth = 0.5 * scale;
    for (let i = 1; i <= 3; i++) { const ly = centerY + h * (0.1 + i * 0.12); ctx.beginPath(); ctx.moveTo(centerX - w * 0.35, ly); ctx.lineTo(centerX + w * 0.35, ly); ctx.stroke(); }
    ctx.restore();
}

function drawCocoon(centerX, centerY, scale, pulse, breakLevel) {
    ctx.save();
    const cx = centerX + COCOON_POS.x * scale, cy = centerY + COCOON_POS.y * scale;
    const bw = 25 * scale, bh = 40 * scale;
    const cw = bw + Math.sin(pulse) * 2 * scale - breakLevel * 1.5 * scale;
    const ch = bh + Math.sin(pulse * 0.7) * 1.5 * scale - breakLevel * 2 * scale;
    if (breakLevel < 6) {
        const ca = Math.max(0.15, 0.7 - breakLevel * 0.1);
        ctx.shadowColor = 'rgba(100,140,120,0.3)'; ctx.shadowBlur = 10 * scale;
        ctx.fillStyle = `rgba(60,80,70,${ca})`;
        ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(5, cw), Math.max(8, ch), Math.PI * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(80,110,90,${ca * 0.7})`; ctx.lineWidth = 1 * scale; ctx.stroke();
        if (breakLevel > 0) {
            ctx.strokeStyle = `rgba(150,140,120,${0.2 + breakLevel * 0.08})`; ctx.lineWidth = 0.8 * scale;
            for (let i = 0; i < breakLevel; i++) {
                const ca2 = (i / 7) * Math.PI * 2 + i * 0.5, cl = (8 + i * 3) * scale;
                ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ca2) * cl, cy + Math.sin(ca2) * cl); ctx.stroke();
            }
        }
        ctx.strokeStyle = `rgba(90,130,100,${0.3 - breakLevel * 0.04})`; ctx.lineWidth = 0.5 * scale;
        for (let i = 0; i < Math.max(1, 4 - breakLevel); i++) {
            const va = (i / 4) * Math.PI + pulse * 0.1;
            ctx.beginPath(); ctx.moveTo(cx, cy - ch * 0.3);
            ctx.quadraticCurveTo(cx + Math.cos(va) * cw * 0.6, cy + Math.sin(va) * ch * 0.4, cx, cy + ch * 0.3); ctx.stroke();
        }
    }
    ctx.shadowBlur = 0; ctx.restore();
}

function drawUmbilicalCord(centerX, centerY, scale, charX, charY, isAttached, stretch) {
    if (!isAttached) return;
    ctx.save();
    const cx = centerX + COCOON_POS.x * scale, cy = centerY + COCOON_POS.y * scale;
    const px = centerX + charX * scale, py = centerY + charY * scale;
    const r = Math.min(140, 90 + stretch * 80), g2 = Math.max(40, 70 - stretch * 30), b = Math.max(30, 60 - stretch * 30);
    const a = 0.5 + stretch * 0.3;
    ctx.strokeStyle = `rgba(${r},${g2},${b},${a})`;
    ctx.lineWidth = (2.5 - stretch * 0.5) * scale;
    const wobble = Math.sin(performance.now() * 0.01) * stretch * 15 * scale;
    const mx = (cx + px) / 2, my2 = (cy + py) / 2;
    ctx.beginPath(); ctx.moveTo(cx + 15 * scale, cy);
    ctx.bezierCurveTo(cx + 40 * scale, cy - 30 * scale + wobble, mx, my2 + 20 * scale - wobble, px - 8 * scale, py); ctx.stroke();
    ctx.strokeStyle = `rgba(${r + 20},${g2 + 20},${b + 15},${a * 0.5})`; ctx.lineWidth = 1 * scale;
    ctx.beginPath(); ctx.moveTo(cx + 15 * scale, cy - 2 * scale);
    ctx.bezierCurveTo(cx + 42 * scale, cy - 32 * scale + wobble, mx + 2 * scale, my2 + 18 * scale - wobble, px - 8 * scale, py - 2 * scale); ctx.stroke();
    ctx.restore();
}

function drawCharacter(centerX, centerY, scale, charX, charY, pose, poseTimer) {
    const px = centerX + charX * scale, py = centerY + charY * scale;
    const s = scale;
    ctx.save(); ctx.translate(px, py);
    ctx.shadowColor = 'rgba(240,230,210,0.2)'; ctx.shadowBlur = 8 * s;
    const skin = 'rgba(180,160,140,0.8)';
    const dark = 'rgba(60,50,45,0.9)';
    switch (pose) {
        case 'curled':
            ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(0, 0, 10 * s, 8 * s, 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(-6 * s, -4 * s, 5 * s, 0, Math.PI * 2); ctx.fill(); break;
        case 'spasm': {
            const jx = Math.sin(poseTimer * 30) * 2 * s, jy = Math.cos(poseTimer * 25) * 1.5 * s;
            ctx.translate(jx, jy); ctx.fillStyle = skin;
            ctx.beginPath(); ctx.ellipse(0, 0, 11 * s, 9 * s, 0.2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(-6 * s, -5 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = skin; ctx.lineWidth = 3 * s;
            ctx.beginPath(); ctx.moveTo(5 * s, -2 * s); ctx.lineTo(12 * s + jx, -6 * s + jy); ctx.stroke(); break;
        }
        case 'struggling': {
            const st = Math.sin(poseTimer * 8) * 1.5 * s; ctx.fillStyle = skin;
            ctx.beginPath(); ctx.ellipse(0, 2 * s, 8 * s, 14 * s, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(0, -14 * s + st, 6 * s, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = skin; ctx.lineWidth = 3 * s;
            ctx.beginPath(); ctx.moveTo(-6 * s, -4 * s); ctx.lineTo(-14 * s, -10 * s + st); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(6 * s, -4 * s); ctx.lineTo(14 * s, -10 * s - st); ctx.stroke(); break;
        }
        case 'partial':
            ctx.fillStyle = skin;
            ctx.beginPath(); ctx.ellipse(0, 5 * s, 7 * s, 18 * s, 0.1, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(2 * s, -15 * s, 6 * s, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = skin; ctx.lineWidth = 3 * s;
            ctx.beginPath(); ctx.moveTo(-5 * s, -3 * s); ctx.quadraticCurveTo(-12 * s, 8 * s, -8 * s, 18 * s); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(5 * s, -3 * s); ctx.quadraticCurveTo(12 * s, 8 * s, 8 * s, 18 * s); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-3 * s, 18 * s); ctx.lineTo(-4 * s, 28 * s); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(3 * s, 18 * s); ctx.lineTo(4 * s, 28 * s); ctx.stroke(); break;
        case 'walking': {
            const wc = Math.sin(poseTimer * 5); ctx.fillStyle = skin;
            ctx.beginPath(); ctx.ellipse(0, 2 * s, 7 * s, 17 * s, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(0, -17 * s, 6 * s, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = skin; ctx.lineWidth = 3.5 * s;
            ctx.beginPath(); ctx.moveTo(-5 * s, -5 * s); ctx.quadraticCurveTo(-10 * s, -15 * s, -2 * s, -19 * s); ctx.stroke();
            ctx.lineWidth = 3 * s;
            ctx.beginPath(); ctx.moveTo(5 * s, -3 * s); ctx.quadraticCurveTo(14 * s, 5 * s, 10 * s, 14 * s); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-3 * s, 16 * s); ctx.lineTo(-3 * s + wc * 4 * s, 28 * s); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(3 * s, 16 * s); ctx.lineTo(3 * s - wc * 4 * s, 28 * s); ctx.stroke(); break;
        }
        case 'standing':
            ctx.fillStyle = skin;
            ctx.beginPath(); ctx.ellipse(0, 2 * s, 7 * s, 17 * s, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(0, -17 * s, 6.5 * s, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = dark;
            ctx.beginPath(); ctx.arc(-2.5 * s, -18 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(2.5 * s, -18 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = skin; ctx.lineWidth = 3 * s;
            ctx.beginPath(); ctx.moveTo(-6 * s, -4 * s); ctx.quadraticCurveTo(-11 * s, 6 * s, -7 * s, 16 * s); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(6 * s, -4 * s); ctx.quadraticCurveTo(11 * s, 6 * s, 7 * s, 16 * s); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-3 * s, 16 * s); ctx.lineTo(-4 * s, 28 * s); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(3 * s, 16 * s); ctx.lineTo(4 * s, 28 * s); ctx.stroke();
            // Session 8: Cloak overlay (white or red)
            if (hasCloak) {
                const cStroke = cloakRed ? 'rgba(160,30,30,0.6)' : 'rgba(240,235,225,0.5)';
                const cFill = cloakRed ? 'rgba(140,20,20,0.25)' : 'rgba(240,235,225,0.2)';
                ctx.strokeStyle = cStroke; ctx.lineWidth = 4 * s;
                ctx.beginPath(); ctx.moveTo(-8 * s, -10 * s); ctx.quadraticCurveTo(0, 5 * s, 8 * s, -10 * s); ctx.stroke();
                ctx.fillStyle = cFill;
                ctx.beginPath(); ctx.ellipse(0, 2 * s, 9 * s, 19 * s, 0, 0, Math.PI * 2); ctx.fill();
            }
            break;
    }
    ctx.restore();
}

function drawAmbientParticles(width, height, time) {
    for (let i = 0; i < 50; i++) {
        const seed = i * 137.508;
        const x = ((Math.sin(time * 0.0003 + seed) * 0.4 + 0.5 + Math.sin(seed * 0.1) * 0.1) % 1) * width;
        const y = ((time * 0.00005 + seed / 50 + Math.sin(time * 0.0002 + seed * 0.5) * 0.05) % 1) * height;
        const sz = 1 + Math.sin(time * 0.001 + seed) * 0.8;
        const a = 0.03 + Math.sin(time * 0.002 + seed) * 0.02;
        ctx.fillStyle = `rgba(240,230,210,${a})`; ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI * 2); ctx.fill();
    }
}

function drawBurstParticles(centerX, centerY, scale) {
    for (const p of burstParticles) {
        if (p.life <= 0) continue;
        const a = p.life / p.maxLife;
        ctx.fillStyle = `${p.color}${a})`;
        ctx.shadowColor = `${p.color}${a * 0.5})`; ctx.shadowBlur = 4 * scale;
        ctx.beginPath(); ctx.arc(centerX + p.x * scale, centerY + p.y * scale, p.size * scale * a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
}

function drawFeedbackText(centerX, centerY, scale, fb) {
    if (fb.alpha <= 0) return;
    ctx.save();
    ctx.font = `${Math.round(28 * scale)}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(240,230,210,${fb.alpha})`;
    ctx.shadowColor = `rgba(212,175,55,${fb.alpha * 0.5})`; ctx.shadowBlur = 15 * scale;
    ctx.fillText(fb.text, centerX, centerY - 120 * scale + fb.y * scale);
    ctx.restore();
}

// ============================================
// INTRO STATE
// ============================================

const INTRO_DURATION = 5000;
const INTRO_FADE_IN_DELAY = 500;
const SETUP_FADE_IN_DURATION = 2000;
let setupFadeAlpha = 0;
let cocoonPulse = 0;
let floorPatternRotation = 0;

function startIntro() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    setTimeout(showIntroText, INTRO_FADE_IN_DELAY);
}
function updateIntro() { if (stateTimer >= INTRO_DURATION) changeState(GameState.SETUP); }
function renderIntro() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const time = stateTimer / 1000; ctx.fillStyle = 'rgba(240,230,210,0.1)';
    for (let i = 0; i < 30; i++) {
        const x = (Math.sin(time * 0.5 + i * 0.5) * 0.3 + 0.5) * canvas.width;
        const y = ((time * 0.1 + i / 30) % 1) * canvas.height;
        ctx.beginPath(); ctx.arc(x, y, 2 + Math.sin(time + i), 0, Math.PI * 2); ctx.fill();
    }
}
function showIntroText() {
    const el = document.getElementById('intro-text'); el.classList.remove('hidden');
    void el.offsetWidth; el.classList.add('visible');
}
function hideIntroText() {
    const el = document.getElementById('intro-text'); el.classList.remove('visible');
    setTimeout(() => el.classList.add('hidden'), 2000);
}

// ============================================
// SETUP STATE
// ============================================

function startSetup() {
    setupFadeAlpha = 0;
    initAudio(); startDrone();
    console.log('SETUP: Showing chamber with 7 rotating circles...');
}

function updateSetup() {
    setupFadeAlpha = Math.min(stateTimer / SETUP_FADE_IN_DURATION, 1);
    updateCommon();
}

function renderSetup() { renderChamber(setupFadeAlpha); }

// ============================================
// TUTORIAL STATE
// ============================================

let tutorialStep = 0;
let currentHoldDuration = 2000;

function startTutorial() {
    tutorialStep = 0;
    tutorialCompleted = false;
    characterPose = 'curled';
    characterX = COCOON_POS.x; characterY = COCOON_POS.y;
    characterTargetX = COCOON_POS.x; characterTargetY = COCOON_POS.y;
    cordAttached = true; cordStretch = 0; cocoonBreakLevel = 0;
    currentHoldDuration = TUTORIAL_STEPS[0].holdDuration;
    showTutorialUI();
    updateTutorialPrompt();
    startLullaby();
    console.log('TUTORIAL: Starting 7 sequential interactions...');
}

function updateTutorial() { updateCommon(); }
function renderTutorial() { renderChamber(1); }

function updateTutorialPrompt() {
    const prompt = document.getElementById('interaction-prompt');
    if (prompt && TUTORIAL_STEPS[tutorialStep]) {
        prompt.textContent = TUTORIAL_STEPS[tutorialStep].narrativeText;
    }
}

function showTutorialUI() { document.getElementById('tutorial-ui').classList.remove('hidden'); }
function hideTutorialUI() { document.getElementById('tutorial-ui').classList.add('hidden'); }

// ============================================
// COMMON UPDATE (shared between states)
// ============================================

function updateCommon() {
    cocoonPulse += deltaTime * 0.003;
    floorPatternRotation += deltaTime * 0.00002;
    characterPoseTimer += deltaTime * 0.001;
    // Circle rotation + flash decay
    circles.forEach(c => {
        if (!c.isStopped) {
            c.prevAngle = c.currentAngle;
            c.currentAngle += c.rotationSpeed * c.direction * (deltaTime * 0.06);
        }
        if (c.stopFlashTimer > 0) c.stopFlashTimer = Math.max(0, c.stopFlashTimer - deltaTime * 0.002);
    });
    // Screen shake
    if (screenShake.timer < screenShake.duration) screenShake.timer += deltaTime;
    // Character lerp
    const lerpSpeed = 0.003 * deltaTime;
    characterX += (characterTargetX - characterX) * Math.min(lerpSpeed, 1);
    characterY += (characterTargetY - characterY) * Math.min(lerpSpeed, 1);
    // Feedback text
    if (feedbackTextObj) {
        feedbackTextObj.timer += deltaTime;
        const t = feedbackTextObj.timer / feedbackTextObj.maxTime;
        feedbackTextObj.alpha = t < 0.15 ? t / 0.15 : t > 0.7 ? (1 - t) / 0.3 : 1;
        feedbackTextObj.y -= deltaTime * 0.01;
        if (t >= 1) feedbackTextObj = null;
    }
    // Burst particles
    for (let i = burstParticles.length - 1; i >= 0; i--) {
        const p = burstParticles[i];
        p.x += p.vx * deltaTime * 0.06; p.y += p.vy * deltaTime * 0.06;
        p.life -= deltaTime * 0.001;
        if (p.life <= 0) burstParticles.splice(i, 1);
    }
    if (stepTransitionTimer > 0) stepTransitionTimer = Math.max(0, stepTransitionTimer - deltaTime);
}

// ============================================
// RENDER CHAMBER (shared)
// ============================================

function renderChamber(alpha) {
    const scale = canvas.width / BASE_WIDTH;
    let centerX = canvas.width / 2, centerY = canvas.height / 2;
    // Apply screen shake
    if (screenShake.timer < screenShake.duration) {
        const decay = 1 - screenShake.timer / screenShake.duration;
        centerX += (Math.random() - 0.5) * screenShake.intensity * decay * scale;
        centerY += (Math.random() - 0.5) * screenShake.intensity * decay * scale;
    }
    ctx.fillStyle = '#080808'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const bg = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 450 * scale);
    bg.addColorStop(0, `rgba(20,18,15,${alpha})`); bg.addColorStop(0.5, `rgba(12,11,10,${alpha})`); bg.addColorStop(1, `rgba(8,8,8,${alpha})`);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = alpha;
    drawFloorPattern(centerX, centerY, scale, floorPatternRotation);
    drawAmbientParticles(canvas.width, canvas.height, stateTimer);
    // Circles
    for (let i = circles.length - 1; i >= 0; i--) {
        const c = circles[i];
        if (c.isStopped) {
            ctx.save();
            const pa = 0.1 + Math.sin(stateTimer * 0.003) * 0.05;
            ctx.globalAlpha = alpha * (0.6 + pa);
            const sc = Object.assign({}, c, { color: `rgba(212,175,55,${0.4 + pa})`, glowColor: `rgba(212,175,55,${0.1 + pa * 0.3})` });
            drawGearCircle(centerX, centerY, sc, scale, i);
            ctx.restore();
        } else {
            drawGearCircle(centerX, centerY, c, scale, i);
        }
    }
    drawBurstParticles(centerX, centerY, scale);
    // Cord
    const isActiveState = currentState === GameState.TUTORIAL || currentState === GameState.CHOICE || currentState === GameState.FINAL_SEQUENCE || currentState === GameState.BLOOD_EXIT;
    if (isActiveState) {
        drawUmbilicalCord(centerX, centerY, scale, characterX, characterY, cordAttached, cordStretch);
    } else {
        drawUmbilicalCord(centerX, centerY, scale, COCOON_POS.x, COCOON_POS.y, true, 0);
    }
    const bl = isActiveState ? cocoonBreakLevel : 0;
    drawCocoon(centerX, centerY, scale, cocoonPulse, bl);
    if ((currentState === GameState.TUTORIAL && tutorialStep > 0) || currentState === GameState.CHOICE || currentState === GameState.FINAL_SEQUENCE || currentState === GameState.BLOOD_EXIT) {
        drawCharacter(centerX, centerY, scale, characterX, characterY, characterPose, characterPoseTimer);
    }
    drawSarcophagus(centerX, centerY, scale);
    if (feedbackTextObj) drawFeedbackText(centerX, centerY, scale, feedbackTextObj);
    ctx.globalAlpha = 1;
}

// ============================================
// CHOICE & EXIT (Session 6)
// ============================================

// Simple analytics logger
const analytics = {
    log(event, data) {
        console.log(`%c📊 [Analytics] ${event}`, 'color: #4CAF50;', data);
    }
};

function showChoice() {
    const texts = CHOICE_TEXTS[Math.min(choiceLoopCount, CHOICE_TEXTS.length - 1)];
    document.getElementById('choice-a').textContent = texts.a;
    document.getElementById('choice-b').textContent = texts.b;
    const el = document.getElementById('choice-ui');
    el.classList.remove('hidden');
    choiceFadeIn = 0;
    setTimeout(() => { el.classList.add('visible'); }, 100);
    document.addEventListener('keydown', onChoiceKey);
}

function hideChoiceUI() {
    const el = document.getElementById('choice-ui');
    el.classList.remove('visible');
    el.classList.add('hidden');
    document.removeEventListener('keydown', onChoiceKey);
}

function onChoiceKey(e) {
    if (reverseActive) return;
    if (e.key === '1') { e.preventDefault(); selectChoice('a'); }
    if (e.key === '2') { e.preventDefault(); selectChoice('b'); }
}

function selectChoice(choice) {
    document.removeEventListener('keydown', onChoiceKey);
    hideChoiceUI();

    analytics.log('choice_made', {
        choice,
        loopCount: choiceLoopCount,
        text: CHOICE_TEXTS[Math.min(choiceLoopCount, CHOICE_TEXTS.length - 1)][choice]
    });

    if (choice === 'a' && choiceLoopCount < 3) {
        choiceLoopCount++;
        startReverseSequence();
    } else {
        const type = choice === 'a' ? 'surrender' : (choiceLoopCount >= 3 ? 'escape' : 'steal');
        exitType = type;
        if (type === 'surrender') {
            // Surrender goes directly to EXIT (no mask sequence)
            playSFX('deep');
            setTimeout(() => changeState(GameState.EXIT), 800);
        } else {
            // Steal/Escape triggers the full final sequence
            playSFX('final');
            changeState(GameState.FINAL_SEQUENCE);
        }
    }
}

function startChoice() {
    showChoice();
    console.log(`CHOICE: Presenting narrative branching (loop ${choiceLoopCount})...`);
}

function updateChoice() {
    updateCommon();
    if (choiceFadeIn < 1) choiceFadeIn = Math.min(1, choiceFadeIn + deltaTime * 0.001);

    if (reverseActive) {
        reverseTimer += deltaTime;
        const narPhase = reverseTimer / 1000;
        if (narPhase < 0.8) reverseNarrativeAlpha = narPhase / 0.8;
        else if (narPhase > 3.0) reverseNarrativeAlpha = Math.max(0, 1 - (narPhase - 3.0) / 1.0);
        else reverseNarrativeAlpha = 1;
        const revNar = document.getElementById('reverse-narrative');
        if (revNar) revNar.style.opacity = `${reverseNarrativeAlpha}`;

        const circleRestartInterval = 500;
        const expectedRestarted = Math.min(7, Math.floor(reverseTimer / circleRestartInterval) + 1);
        while (reverseCirclesRestarted < expectedRestarted && reverseCirclesRestarted < 7) {
            circles[reverseCirclesRestarted].isStopped = false;
            circles[reverseCirclesRestarted].stopFlashTimer = 0.6;
            reverseCirclesRestarted++;
            playSFX('reverse');
        }

        const reverseProgress = Math.min(1, reverseTimer / REVERSE_DURATION);
        const easeOut = 1 - Math.pow(1 - reverseProgress, 3);
        characterTargetX = COCOON_POS.x + (SARCOPHAGUS_POS.x - COCOON_POS.x) * (1 - easeOut);
        characterTargetY = COCOON_POS.y + (SARCOPHAGUS_POS.y - COCOON_POS.y) * (1 - easeOut);
        cocoonBreakLevel = Math.max(0, Math.round(6 * (1 - easeOut)));
        if (reverseProgress > 0.3) { cordAttached = true; cordStretch = Math.max(0, 2 * (1 - easeOut)); }
        lullabyDistortionLevel = Math.max(0, 1 - easeOut);
        updateLullabyDistortion(lullabyDistortionLevel);

        if (reverseProgress < 0.3) characterPose = 'standing';
        else if (reverseProgress < 0.5) characterPose = 'walking';
        else if (reverseProgress < 0.7) characterPose = 'partial';
        else if (reverseProgress < 0.85) characterPose = 'struggling';
        else characterPose = 'curled';

        if (reverseTimer >= REVERSE_DURATION) {
            reverseActive = false;
            characterX = COCOON_POS.x; characterY = COCOON_POS.y;
            characterPose = 'curled'; cocoonBreakLevel = 0;
            cordAttached = true; cordStretch = 0;
            lullabyDistortionLevel = 0; tutorialStep = 0; tutorialCompleted = false;
            if (revNar) { revNar.style.opacity = '0'; setTimeout(() => revNar.classList.add('hidden'), 500); }
            currentState = GameState.TUTORIAL; stateTimer = 0;
            currentHoldDuration = TUTORIAL_STEPS[0].holdDuration;
            showTutorialUI(); updateTutorialPrompt();
            document.getElementById('state-display').textContent = 'State: TUTORIAL';
            console.log(`%c↺ Reverse complete → Tutorial restart (loop ${choiceLoopCount})`, 'color: #9C27B0; font-weight: bold;');
        }
    }
}

function renderChoice() { renderChamber(1); }

function startReverseSequence() {
    const narText = REVERSE_NARRATIVE[Math.min(choiceLoopCount - 1, REVERSE_NARRATIVE.length - 1)];
    const revNar = document.getElementById('reverse-narrative');
    if (revNar) { revNar.textContent = narText; revNar.classList.remove('hidden'); revNar.style.opacity = '0'; }
    reverseActive = true; reverseTimer = 0; reverseCirclesRestarted = 0; reverseNarrativeAlpha = 0;
    playSFX('reverse');
    console.log(`%c↺ Reverse sequence started (loop ${choiceLoopCount})`, 'color: #9C27B0; font-weight: bold;');
}

// ============================================
// SESSION 8: FINAL SEQUENCE — Mask + Cards + Flash
// ============================================

async function runFinalSequence() {
    analytics.log('final_sequence_start', { loopCount: choiceLoopCount, exitType });
    console.log(`%c⚡ Final sequence: ${exitType}`, 'color: #FF5722; font-weight: bold;');

    const container = document.getElementById('final-sequence');
    container.classList.remove('hidden');

    // Step 1: Mask close-up (fade in 0.8s, hold 3s, fade out 0.8s)
    const mask = document.getElementById('mask-overlay');
    mask.classList.remove('hidden');
    await sleep(50); // allow DOM paint
    mask.classList.add('visible');
    await sleep(3800); // 0.8s fade + 3s hold
    mask.classList.remove('visible');
    await sleep(800); // fade out

    // Step 2: Subliminal flash — eyes B&W (~70ms)
    const eyes = document.getElementById('eyes-flash');
    eyes.classList.add('instant');
    eyes.classList.remove('hidden');
    eyes.style.opacity = '1';
    await sleep(70); // ~70ms subliminal
    eyes.style.opacity = '0';
    await sleep(200); // brief black gap
    eyes.classList.add('hidden');

    // Step 3: Mask with 3 cards overlaid (2s)
    const maskCards = document.getElementById('mask-cards');
    maskCards.classList.remove('hidden');
    await sleep(50);
    maskCards.classList.add('visible');
    await sleep(2500); // 2s hold + margin
    maskCards.classList.remove('visible');
    await sleep(800);

    // Step 4: Back to game view — PG steals mask
    container.classList.add('hidden');
    mask.classList.add('hidden');
    maskCards.classList.add('hidden');
    animateMaskTheft();
    await sleep(2000);

    // Step 5: PG wraps shroud as cloak (white)
    hasCloak = true;
    console.log('%c🧥 Cloak acquired', 'color: #f0e6d2;');
    await sleep(1000);

    // Step 6: Lullaby dies (distorted fade — tape running out of energy)
    killLullaby(3000);
    await sleep(3000);

    // Step 7: Card acquisition banner
    container.classList.remove('hidden');
    const banner = document.getElementById('card-banner');
    banner.classList.remove('hidden');
    await sleep(50);
    banner.classList.add('visible');
    analytics.log('cards_acquired', {
        cards: ['Occhio Sinistro', 'Occhio Destro', 'Timpani', 'Carta Asemica']
    });
    await sleep(3500);
    banner.classList.remove('visible');
    await sleep(800);
    banner.classList.add('hidden');
    container.classList.add('hidden');

    // Proceed to Session 9: blood + exit
    startBloodAndExit();
}

function animateMaskTheft() {
    // Mask on sarcophagus loses golden glow
    maskGlowDimmed = true;
    // Character reaches towards sarcophagus
    characterPose = 'standing'; // reaching gesture handled visually
    triggerScreenShake(4, 600);
    console.log('%c🎭 Mask stolen — glow dimmed', 'color: #d4af37; font-weight: bold;');
}

function killLullaby(durationMs) {
    if (!audioCtx || !lullabyOsc || !lullabyGain) return;
    const now = audioCtx.currentTime;
    const endTime = now + durationMs / 1000;
    // Slow down frequency (like tape running out of energy)
    lullabyOsc.frequency.setValueAtTime(lullabyOsc.frequency.value, now);
    lullabyOsc.frequency.exponentialRampToValueAtTime(30, endTime);
    // Increase detune for warbling effect
    lullabyOsc.detune.setValueAtTime(lullabyOsc.detune.value, now);
    lullabyOsc.detune.linearRampToValueAtTime(800, endTime);
    // Fade volume to 0
    lullabyGain.gain.setValueAtTime(lullabyGain.gain.value, now);
    lullabyGain.gain.exponentialRampToValueAtTime(0.0001, endTime);
    // Also fade the drone
    if (droneGain) {
        droneGain.gain.setValueAtTime(droneGain.gain.value, now);
        droneGain.gain.exponentialRampToValueAtTime(0.0001, endTime);
    }
    console.log('%c🎵 Lullaby dying — tape-out effect', 'color: #9C27B0;');
}

function startBloodAndExit() {
    changeState(GameState.BLOOD_EXIT);
}

// ============================================
// SESSION 9: BLOOD TWO-PHASE + PLAYER EXIT
// ============================================

async function runBloodAndExit() {
    analytics.log('blood_sequence_start');
    console.log('%c🩸 Blood sequence — Phase A: Rivelazione', 'color: #F44336; font-weight: bold;');

    // Step 1: Laceration tears open on right wall
    const laceration = document.getElementById('laceration');
    laceration.classList.remove('hidden');
    laceration.classList.add('opening');
    playSFX('laceration');
    await sleep(2500);

    // Step 2: Phase A — Rivelazione (blood reveals floor geometry)
    bloodPhase = 'reveal';
    analytics.log('blood_phase_a', { phase: 'rivelazione' });
    console.log('%c🩸 Floor geometry revealing in red', 'color: #FF3333;');
    await sleep(4500); // bloodRevealProgress animated in updateBloodExit

    // Step 3: Phase B — Sommersione (blood rises, geometry drowns)
    bloodPhase = 'submerge';
    analytics.log('blood_phase_b', { phase: 'sommersione' });
    console.log('%c🩸 Blood rising — geometry submerging', 'color: #8B0000;');
    // Blood fill is canvas-drawn in renderBloodExit, no DOM overlay needed
    await sleep(5500); // bloodSubmergeProgress animated in updateBloodExit

    // Step 4: Show exit prompt — player must walk voluntarily
    bloodPhase = 'player_exit';
    enablePlayerMovement();
    const exitPrompt = document.getElementById('exit-prompt');
    exitPrompt.classList.remove('hidden');
    exitPrompt.classList.add('visible');
    analytics.log('exit_available');
    console.log('%c→ Player exit enabled — ArrowRight/D to walk', 'color: #4CAF50; font-weight: bold;');

    // Wait for player to reach portal zone
    await waitForPlayerAtPortal();
}

function updateBloodExit() {
    updateCommon();
    // Advance blood reveal progress (Phase A: 0→1 over ~4s)
    if (bloodPhase === 'reveal' && bloodRevealProgress < 1) {
        bloodRevealProgress = Math.min(1, bloodRevealProgress + deltaTime / 4000);
    }
    // Advance submersion (Phase B: 0→1 over ~5s)
    if (bloodPhase === 'submerge' && bloodSubmergeProgress < 1) {
        bloodSubmergeProgress = Math.min(1, bloodSubmergeProgress + deltaTime / 5000);
    }
}

function renderBloodExit() {
    const scale = canvas.width / BASE_WIDTH;
    let centerX = canvas.width / 2, centerY = canvas.height / 2;
    // Screen shake
    if (screenShake.timer < screenShake.duration) {
        const decay = 1 - screenShake.timer / screenShake.duration;
        centerX += (Math.random() - 0.5) * screenShake.intensity * decay * scale;
        centerY += (Math.random() - 0.5) * screenShake.intensity * decay * scale;
    }
    ctx.fillStyle = '#080808'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const bg = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 450 * scale);
    bg.addColorStop(0, 'rgba(20,18,15,1)'); bg.addColorStop(0.5, 'rgba(12,11,10,1)'); bg.addColorStop(1, 'rgba(8,8,8,1)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawAmbientParticles(canvas.width, canvas.height, stateTimer);
    // Draw circles FIRST (they have opaque centers)
    for (let i = circles.length - 1; i >= 0; i--) drawGearCircle(centerX, centerY, circles[i], scale, i);

    // Floor geometry ON TOP of circles so it's visible
    drawFloorPattern(centerX, centerY, scale, floorPatternRotation, bloodRevealProgress);

    // === Blood fill inside innermost circle (Phase B) ===
    if (bloodSubmergeProgress > 0) {
        const floorR = 350 * scale; // match drawFloorPattern maxR
        ctx.save();
        // Clip to circular floor area
        ctx.beginPath();
        ctx.arc(centerX, centerY, floorR, 0, Math.PI * 2);
        ctx.clip();
        // Blood rises from bottom of circle upward
        const circleBottom = centerY + floorR;
        const circleDiameter = floorR * 2;
        const fillHeight = circleDiameter * bloodSubmergeProgress * 0.95;
        const fillTop = circleBottom - fillHeight;
        // Gradient: darker at bottom, translucent at top edge
        const bloodGrad = ctx.createLinearGradient(centerX, circleBottom, centerX, fillTop);
        bloodGrad.addColorStop(0, 'rgba(100,8,8,0.95)');
        bloodGrad.addColorStop(0.6, 'rgba(140,15,15,0.85)');
        bloodGrad.addColorStop(1, 'rgba(170,25,25,0.5)');
        ctx.fillStyle = bloodGrad;
        ctx.fillRect(centerX - floorR, fillTop, floorR * 2, fillHeight);
        // Subtle ripple at the blood surface
        if (bloodSubmergeProgress > 0.1) {
            ctx.strokeStyle = 'rgba(200,30,30,0.3)';
            ctx.lineWidth = 1.5 * scale;
            ctx.beginPath();
            const rippleW = floorR * 0.8;
            const waveOffset = Math.sin(stateTimer * 0.002) * 3 * scale;
            ctx.moveTo(centerX - rippleW, fillTop + waveOffset);
            ctx.quadraticCurveTo(centerX, fillTop - 4 * scale + waveOffset, centerX + rippleW, fillTop + waveOffset);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Character, sarcophagus, cocoon drawn last (on top)
    drawUmbilicalCord(centerX, centerY, scale, characterX, characterY, cordAttached, cordStretch);
    drawCocoon(centerX, centerY, scale, cocoonPulse, cocoonBreakLevel);
    drawCharacter(centerX, centerY, scale, characterX, characterY, characterPose, characterPoseTimer);
    drawSarcophagus(centerX, centerY, scale);
    ctx.globalAlpha = 1;
}

// --- Player-driven exit movement ---

function enablePlayerMovement() {
    playerExitEnabled = true;
    document.addEventListener('keydown', onExitMovement);
}

function onExitMovement(e) {
    if (!playerExitEnabled) return;
    const step = 8;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        characterTargetX = Math.min(350, characterTargetX + step);
    }
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        characterTargetX = Math.max(-170, characterTargetX - step);
    }
}

function waitForPlayerAtPortal() {
    return new Promise(resolve => {
        const checkInterval = setInterval(() => {
            if (characterX >= 300) { // portal threshold in canvas coords
                clearInterval(checkInterval);
                playerExitEnabled = false;
                document.removeEventListener('keydown', onExitMovement);
                onPlayerCrossesPortal().then(resolve);
            }
        }, 100);
    });
}

async function onPlayerCrossesPortal() {
    if (portalCrossed) return;
    portalCrossed = true;
    analytics.log('portal_crossed');
    console.log('%c🚪 Portal crossed — cloak turns red', 'color: #B71C1C; font-weight: bold;');

    // Hide exit prompt
    const exitPrompt = document.getElementById('exit-prompt');
    exitPrompt.classList.remove('visible');

    // Cloak turns red
    cloakRed = true;
    playSFX('portal_cross');
    await sleep(2000);

    // Fade to black
    const endFade = document.getElementById('end-fade');
    endFade.classList.remove('hidden');
    await sleep(50);
    endFade.classList.add('visible');
    await sleep(2500);

    // Show end text
    const endText = document.getElementById('end-text');
    endText.classList.remove('hidden');
    await sleep(50);
    endText.classList.add('visible');

    const totalTime = (Date.now() - (analytics.startTime || Date.now())) / 1000;
    analytics.log('game_complete', {
        totalTimeSeconds: totalTime,
        choiceLoops: choiceLoopCount,
        exitType
    });
    console.log(`%c✅ Game complete — ${totalTime.toFixed(1)}s`, 'color: #4CAF50; font-weight: bold; font-size: 16px;');
}

document.getElementById('choice-a').addEventListener('click', () => selectChoice('a'));
document.getElementById('choice-b').addEventListener('click', () => selectChoice('b'));

function startExit() {
    if (audioCtx && lullabyGain) lullabyGain.gain.setTargetAtTime(0, audioCtx.currentTime, 1);
    if (audioCtx && droneGain) droneGain.gain.setTargetAtTime(0, audioCtx.currentTime, 2);
    exitNarrativeStep = 0; exitNarrativeTimer = 0; exitNarrativeAlpha = 0;
    const exitNar = document.getElementById('exit-narrative');
    if (exitNar) { exitNar.classList.remove('hidden'); exitNar.style.opacity = '0'; }
    hideChoiceUI();
    const revNar = document.getElementById('reverse-narrative');
    if (revNar) revNar.classList.add('hidden');
    hideTutorialUI();
    console.log(`EXIT: Transitioning to next area (${exitType})...`);
}

function updateExit() {
    updateCommon();
    const narratives = exitType ? (EXIT_NARRATIVES[exitType] || []) : [];
    const exitNar = document.getElementById('exit-narrative');
    if (narratives.length > 0 && exitNarrativeStep < narratives.length) {
        exitNarrativeTimer += deltaTime;
        const stepDuration = 3000, fadeInTime = 800, fadeOutTime = 600;
        const elapsed = exitNarrativeTimer;
        if (elapsed < fadeInTime) exitNarrativeAlpha = elapsed / fadeInTime;
        else if (elapsed > stepDuration - fadeOutTime) exitNarrativeAlpha = Math.max(0, (stepDuration - elapsed) / fadeOutTime);
        else exitNarrativeAlpha = 1;
        if (exitNar) { exitNar.textContent = narratives[exitNarrativeStep]; exitNar.style.opacity = `${exitNarrativeAlpha}`; }
        if (elapsed >= stepDuration) { exitNarrativeStep++; exitNarrativeTimer = 0; }
    } else if (exitNar) {
        const fadeProgress = Math.max(0, 1 - (exitNarrativeTimer / 2000));
        exitNar.style.opacity = `${fadeProgress}`;
    }
}

function renderExit() {
    const scale = canvas.width / BASE_WIDTH;
    const centerX = canvas.width / 2, centerY = canvas.height / 2;
    ctx.fillStyle = '#080808'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const bgGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 450 * scale);
    bgGrad.addColorStop(0, 'rgba(20,18,15,1)'); bgGrad.addColorStop(1, 'rgba(8,8,8,1)');
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const sceneFade = Math.max(0, 1 - stateTimer / 8000);
    ctx.globalAlpha = sceneFade;
    drawFloorPattern(centerX, centerY, scale, floorPatternRotation);
    drawAmbientParticles(canvas.width, canvas.height, stateTimer);
    for (let i = circles.length - 1; i >= 0; i--) drawGearCircle(centerX, centerY, circles[i], scale, i);
    drawCocoon(centerX, centerY, scale, cocoonPulse, cocoonBreakLevel);
    if (tutorialStep > 0) drawCharacter(centerX, centerY, scale, characterX, characterY, characterPose, characterPoseTimer);
    drawSarcophagus(centerX, centerY, scale);
    ctx.globalAlpha = 1;
    const exitAlpha = Math.min(stateTimer / 5000, 0.85);
    ctx.fillStyle = `rgba(0,0,0,${exitAlpha})`; ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ============================================
// HOLD-TO-INTERACT
// ============================================

let isHolding = false;
let holdStartTime = 0;
let holdAnimationFrame = null;

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        initAudio();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        if (!isHolding && (currentState === GameState.SETUP || currentState === GameState.TUTORIAL)) {
            if (currentState === GameState.TUTORIAL && stepTransitionTimer > 0) return;
            if (tutorialCompleted) return;
            e.preventDefault();
            isHolding = true;
            holdStartTime = Date.now();
            showProgressBar();
            updateProgress();
        }
    }
    // Choice keyboard handled by onChoiceKey (added/removed with choice UI)
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (isHolding) {
            e.preventDefault();
            isHolding = false;
            resetProgress();
            if (holdAnimationFrame) { cancelAnimationFrame(holdAnimationFrame); holdAnimationFrame = null; }
        }
    }
});

function updateProgress() {
    if (!isHolding) return;
    const elapsed = Date.now() - holdStartTime;
    const duration = currentHoldDuration;
    const progress = Math.min((elapsed / duration) * 100, 100);
    document.getElementById('progress-bar').style.width = progress + '%';
    document.getElementById('progress-text').textContent = Math.floor(progress) + '%';
    if (progress >= 100) {
        onHoldComplete();
    } else {
        holdAnimationFrame = requestAnimationFrame(updateProgress);
    }
}

function resetProgress() {
    document.getElementById('progress-bar').style.width = '0%';
    document.getElementById('progress-text').textContent = '0%';
    hideProgressBar();
}

function onHoldComplete() {
    isHolding = false;
    console.log('%c✓ Hold complete!', 'color: #8BC34A; font-weight: bold;');
    const pc = document.getElementById('progress-container');
    pc.style.boxShadow = '0 0 20px rgba(212,175,55,0.8)';
    setTimeout(() => { resetProgress(); pc.style.boxShadow = 'none'; }, 400);

    if (currentState === GameState.SETUP) {
        changeState(GameState.TUTORIAL);
    } else if (currentState === GameState.TUTORIAL) {
        const step = TUTORIAL_STEPS[tutorialStep];
        if (!step) return;
        stopCircle(step.circleIndex);
        playSFX(step.sfx);
        triggerScreenShake(step.shakeIntensity, 400);
        showFeedback(step.feedbackText);
        const tp = step.characterProgress;
        characterTargetX = COCOON_POS.x + (SARCOPHAGUS_POS.x - COCOON_POS.x) * tp;
        characterTargetY = COCOON_POS.y + (SARCOPHAGUS_POS.y - COCOON_POS.y) * tp;
        characterPose = step.characterPose;
        characterPoseTimer = 0;
        if (step.cordStretched >= 2) cordAttached = false; else cordStretch = step.cordStretched;
        cocoonBreakLevel = Math.min(6, tutorialStep + 1);
        lullabyDistortionLevel = step.lullabyDistortion;
        updateLullabyDistortion(step.lullabyDistortion);
        tutorialStep++;
        stepTransitionTimer = 800;
        if (tutorialStep >= 7) {
            tutorialCompleted = true;
            setTimeout(() => changeState(GameState.CHOICE), 2000);
        } else {
            currentHoldDuration = TUTORIAL_STEPS[tutorialStep].holdDuration;
            setTimeout(() => updateTutorialPrompt(), 800);
        }
    }
}

function showProgressBar() { document.getElementById('progress-container').classList.remove('hidden'); }
function hideProgressBar() { document.getElementById('progress-container').classList.add('hidden'); }

// ============================================
// GAME LOOP
// ============================================

let frameCount = 0;
let fpsTimer = 0;
let currentFPS = 0;

function gameLoop(currentTime) {
    deltaTime = Math.min(currentTime - lastFrameTime, 50);
    lastFrameTime = currentTime;
    frameCount++; fpsTimer += deltaTime;
    if (fpsTimer >= 1000) {
        currentFPS = Math.round(frameCount * 1000 / fpsTimer);
        document.getElementById('fps-counter').textContent = `FPS: ${currentFPS}`;
        frameCount = 0; fpsTimer = 0;
    }
    updateState(); renderState();
    requestAnimationFrame(gameLoop);
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
    console.log('%c=== CAMERA DI NASCITA - Prototype ===', 'color: #d4af37; font-size: 16px; font-weight: bold;');
    console.log('%cSessions 1-5: Full Game Flow (TITLE_SCREEN → INTRO → SETUP → TUTORIAL → CHOICE → EXIT)', 'color: #f0e6d2;');
    console.log('%cChoice keys: [1] = left button, [2] = right button', 'color: #888;');
    document.getElementById('state-display').textContent = 'State: TITLE_SCREEN';
    onStateEnter(currentState);
    requestAnimationFrame(gameLoop);
}

window.addEventListener('load', init);
window.debugChangeState = changeState;
window.GameState = GameState;
window.stopCircle = stopCircle;