import { Orbit } from './orbit.js?v=personal-preview-20261008';

const scenes = [
  { key: 'city', label: 'Follow a new street', category: 'City discovery', color: '#f6c697', title: 'Let curiosity choose the next turn.', copy: 'A familiar city seen differently. A neighborhood you have never visited. Exploring can begin with a plan—or with something that catches your eye.', alt: 'A clothed holographic man walking past blue-lit city buildings and looking around.' },
  { key: 'hiking', label: 'Share the trail', category: 'Outdoor adventures', color: '#b7d8be', title: 'A different view. Good company.', copy: 'Some trails are about the destination. Others are about the conversation along the way. There is more than one reason to head outside.', alt: 'Two clothed holographic women hiking together on a mountain trail and exchanging a smile.' },
  { key: 'gym', label: 'Make time to move', category: 'Movement & strength', color: '#f0b4aa', title: 'A session that belongs to you.', copy: 'A personal goal, a familiar routine, or the simple pleasure of moving. What brings you here is yours to decide.', alt: 'A clothed holographic man raising and lowering two dumbbells in a gym.' },
  { key: 'study', label: 'Stay curious', category: 'Learning & discovery', color: '#c0b8f8', title: 'Follow the question that interests you.', copy: 'Turn a page. Make a note. Connect an idea. Learning can be a step toward something—or something you enjoy for its own sake.', alt: 'A clothed holographic woman turning a book page and writing notes at a softly lit desk.' },
  { key: 'running', label: 'Find your own pace', category: 'Time outdoors', color: '#a1dfe9', title: 'Not every run needs a finish line.', copy: 'A stretch by the river. A little fresh air before the day begins. Whether you are chasing a time or simply enjoying the route, the pace is yours.', alt: 'A clothed holographic woman jogging beside a river at dawn.' },
  { key: 'cooking', label: 'Make something together', category: 'Food & company', color: '#ebce93', title: 'More than what is on the plate.', copy: 'Trying a recipe. Sharing the preparation. Sitting down together. Everyday rituals take on their own meaning through the people we share them with.', alt: 'A clothed holographic woman stirring vegetables while a man serves salad beside her.' },
  { key: 'music', label: 'Play for the pleasure', category: 'Music & expression', color: '#d4b6ec', title: 'It does not have to be a performance.', copy: 'A few chords after work. A song you keep returning to. Some interests do not need an audience or an end goal to deserve a place in your day.', alt: 'A clothed holographic man strumming an acoustic guitar while seated in a living room.' },
  { key: 'garden', label: 'Tend to something', category: 'Everyday care', color: '#abcda5', title: 'A small corner, entirely your own.', copy: 'A pot on the balcony. A new leaf. A few minutes spent caring for something. Life happens in the small things we choose to notice, too.', alt: 'A clothed holographic man in an apron watering a leafy plant on a balcony.' },
  { key: 'commute', label: 'Take in the journey', category: 'Daily journeys', color: '#aebfe8', title: 'There is life between destinations.', copy: 'Watch the city pass. Let your thoughts wander. The journey is part of the day, not just the gap between one place and the next.', alt: 'A clothed holographic woman seated on a moving train, looking toward the city outside.' },
  { key: 'create', label: 'Make room to create', category: 'Hands-on creativity', color: '#e1b9a4', title: 'See what takes shape.', copy: 'Try something unfamiliar. Make it with your hands. Share the discovery with someone beside you. Creating can be about the experience, not just the result.', alt: 'A clothed holographic man shaping a clay bowl while a woman watches and encourages him.' }
];

const stage = document.getElementById('orbit-stage');
const screens = document.getElementById('screen-orbit');
const dialog = document.getElementById('scene-dialog');
let currentScene = 0;
let returnFocus = null;
let mediaPaused = window.SiteMotion.reduced;
let stageVisible = true;
let foregroundIndexes = matchMedia('(max-width: 760px), (pointer: coarse)').matches ? [] : null;
let refreshParticles = () => {};
const sceneVideos = {
  gym: 'assets-holo-20261007/gym-preview.mp4',
  city: 'assets-holo-20261007/city-discovery-v2.mp4',
  hiking: 'assets-holo-20261007/hiking.mp4',
  study: 'assets-holo-20261007/learning.mp4',
  running: 'assets-holo-20261007/running.mp4',
  cooking: 'assets-holo-20261007/cooking.mp4',
  music: 'assets-holo-20261007/guitar.mp4',
  commute: 'assets-holo-20261007/commuter.mp4',
  garden: 'assets-holo-20261007/gardening.mp4',
  create: 'assets-holo-20261007/pottery.mp4'
};
const previewVideos = [];
const dialogVideo = document.createElement('video');
dialogVideo.className = 'dialog-video';
dialogVideo.controls = true;
dialogVideo.muted = true;
dialogVideo.loop = true;
dialogVideo.playsInline = true;
dialogVideo.hidden = true;
dialogVideo.setAttribute('aria-label', 'Holographic life scene');
document.querySelector('.dialog-image-wrap').prepend(dialogVideo);

function canPlayPreview(index) {
  return !mediaPaused && stageVisible && !document.hidden && !dialog.open &&
    (foregroundIndexes === null || foregroundIndexes.includes(index));
}
function syncVideos() {
  previewVideos.forEach((video, index) => {
    const active = canPlayPreview(index);
    video.dataset.previewActive = String(active);
    if (!active) video.pause();
    else if (video.paused) {
      video.play().then(() => {
        // A pending play must not resume a preview after scrolling away or opening a dialog.
        if (!canPlayPreview(index)) video.pause();
      }).catch(() => {});
    }
  });
  if (document.hidden || mediaPaused) dialogVideo.pause();
}

scenes.forEach((scene, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'life-screen';
  button.draggable = false;
  button.dataset.scene = String(index);
  button.setAttribute('aria-label', `${scene.category}: ${scene.label}. View scene.`);
  button.setAttribute('aria-haspopup', 'dialog');
  button.style.setProperty('--screen-color', scene.color);
  button.innerHTML = `<span class="screen-photo-wrap"><img class="screen-photo" src="assets-holo-20261007/${scene.key}.webp" alt="${scene.alt}" width="1280" height="720" draggable="false"><span class="screen-shade"></span><span class="screen-notch"></span><span class="screen-heading"><span>${scene.label}</span></span><span class="screen-hover-label">Take a closer look</span></span><span class="screen-edge" aria-hidden="true"></span>`;
  screens.append(button);
  if (sceneVideos[scene.key]) {
    const video = document.createElement('video');
    video.className = 'screen-photo screen-video';
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.controls = false;
    video.disablePictureInPicture = true;
    video.disableRemotePlayback = true;
    video.tabIndex = -1;
    video.preload = 'metadata';
    video.poster = `assets-holo-20261007/${scene.key}.webp`;
    video.setAttribute('aria-hidden', 'true');
    video.src = sceneVideos[scene.key];
    video.addEventListener('loadeddata', () => video.classList.add('is-ready'));
    button.querySelector('.screen-photo-wrap').append(video);
    previewVideos.push(video);
  }
});

const orbit = new Orbit(stage, screens.children, {
  onMotionChange(paused) {
    document.documentElement.classList.toggle('motion-paused', paused);
    mediaPaused = paused;
    syncVideos();
    refreshParticles();
  },
  onForegroundChange(indexes) {
    foregroundIndexes = indexes;
    syncVideos();
  }
});
new IntersectionObserver(entries => {
  stageVisible = entries[0].isIntersecting;
  orbit.setSuspended(!stageVisible || dialog.open);
  syncVideos();
  refreshParticles();
}).observe(stage);
document.addEventListener('visibilitychange', syncVideos);

function updateDialog(index) {
  currentScene = (index + scenes.length) % scenes.length;
  const scene = scenes[currentScene];
  const image = document.getElementById('dialog-image');
  image.src = `assets-holo-20261007/${scene.key}.webp`;
  image.alt = scene.alt;
  dialogVideo.pause();
  const videoSource = sceneVideos[scene.key];
  dialogVideo.hidden = !videoSource;
  image.hidden = Boolean(videoSource);
  if (videoSource) {
    dialogVideo.setAttribute('aria-label', scene.alt);
    dialogVideo.poster = `assets-holo-20261007/${scene.key}.webp`;
    dialogVideo.src = videoSource;
    if (!mediaPaused && !document.hidden) dialogVideo.play().catch(() => {});
  } else {
    dialogVideo.removeAttribute('src');
    dialogVideo.load();
  }
  document.getElementById('dialog-category').textContent = scene.category;
  document.getElementById('dialog-title').textContent = scene.title;
  document.getElementById('dialog-copy').textContent = scene.copy;
  document.getElementById('dialog-index').textContent = `WAYS OF LIVING / ${String(currentScene + 1).padStart(2, '0')}`;
  document.getElementById('dialog-count').textContent = `${currentScene + 1} / ${scenes.length}`;
}

[...screens.children].forEach((screen, index) => {
  screen.addEventListener('click', event => {
    if (event.detail > 0 && orbit.didDrag) { event.preventDefault(); return; }
    returnFocus = screen;
    updateDialog(index);
    orbit.setSuspended(true);
    document.body.classList.add('dialog-open');
    dialog.showModal();
    syncVideos();
    refreshParticles();
  });
});
dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target === dialog) {
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  }
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('dialog-open');
  orbit.setSuspended(!stageVisible);
  dialogVideo.pause();
  syncVideos();
  refreshParticles();
  returnFocus?.focus({ preventScroll: true });
});
dialog.addEventListener('keydown', event => {
  // Keep native video controls' arrow-key seeking and volume behavior intact.
  if (event.target instanceof HTMLVideoElement || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key === 'ArrowRight') { event.preventDefault(); updateDialog(currentScene + 1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); updateDialog(currentScene - 1); }
});
document.getElementById('previous-scene').addEventListener('click', () => updateDialog(currentScene - 1));
document.getElementById('next-scene').addEventListener('click', () => updateDialog(currentScene + 1));
document.getElementById('year').textContent = new Date().getFullYear();

// A light particle shimmer follows the generated hologram's actual silhouette.
const figure = document.getElementById('hologram-image');
const particleCanvas = document.getElementById('hologram-particles');
const particleContext = particleCanvas.getContext('2d');
let particles = [];
let particleFrame = null;
let figureReady = false;
let particleWidth = 0;
let particleHeight = 0;
let lastParticleTime = 0;
const compactMotion = matchMedia('(max-width: 760px), (pointer: coarse)');
function prepareParticles() {
  if (!figure.naturalWidth || !particleContext) return;
  const sample = document.createElement('canvas');
  sample.width = 170;
  sample.height = 255;
  const context = sample.getContext('2d', { willReadFrequently: true });
  context.drawImage(figure, 0, 0, sample.width, sample.height);
  const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
  particles = [];
  for (let y = 10; y < 248; y += 3) {
    for (let x = 12; x < 158; x += 3) {
      const p = (y * 170 + x) * 4;
      if (pixels[p + 3] > 80 && pixels[p + 1] > 100 && pixels[p + 2] > 135 && ((x * 11 + y * 7) % 5 < 2)) {
        particles.push({ x: x / 170, y: y / 255, phase: (x * 0.7 + y * 0.83) % 6.28, r: 0.45 + ((x + y) % 3) * 0.21 });
      }
    }
  }
  if (compactMotion.matches && particles.length > 240) {
    const stride = Math.ceil(particles.length / 240);
    particles = particles.filter((point, index) => index % stride === 0);
  }
  figureReady = true;
  resizeParticleCanvas();
  syncParticles();
}
function resizeParticleCanvas() {
  const rect = particleCanvas.getBoundingClientRect();
  const density = Math.min(devicePixelRatio || 1, compactMotion.matches ? 1.25 : 2);
  particleWidth = rect.width;
  particleHeight = rect.height;
  particleCanvas.width = Math.round(rect.width * density);
  particleCanvas.height = Math.round(rect.height * density);
  particleContext?.setTransform(density, 0, 0, density, 0, 0);
  if (figureReady) paintParticles(0);
}
new ResizeObserver(resizeParticleCanvas).observe(particleCanvas);
if (figure.complete) prepareParticles();
else figure.addEventListener('load', prepareParticles, { once: true });
function paintParticles(time) {
  if (figureReady && particleContext) {
    const width = particleWidth;
    const height = particleHeight;
    particleContext.clearRect(0, 0, width, height);
    const staticFrame = window.SiteMotion.reduced || !stageVisible || dialog.open;
    const t = staticFrame ? 0 : time * 0.0005;
    for (const point of particles) {
      const strength = 0.1 + Math.pow((Math.sin(t * 2 + point.phase) + 1) / 2, 4) * 0.67;
      particleContext.fillStyle = `rgba(207,243,255,${strength})`;
      particleContext.beginPath();
      particleContext.arc(point.x * width, point.y * height, point.r, 0, Math.PI * 2);
      particleContext.fill();
    }
  }
}
function particlesActive() {
  return figureReady && !window.SiteMotion.reduced && !document.hidden && stageVisible && !dialog.open;
}
function drawParticles(time) {
  particleFrame = null;
  if (!particlesActive()) return;
  if (!compactMotion.matches || time - lastParticleTime >= 1000 / 24) {
    paintParticles(time);
    lastParticleTime = time;
  }
  particleFrame = requestAnimationFrame(drawParticles);
}
function syncParticles() {
  if (particleFrame !== null) cancelAnimationFrame(particleFrame);
  particleFrame = null;
  lastParticleTime = 0;
  if (!document.hidden && figureReady) paintParticles(0);
  if (particlesActive()) particleFrame = requestAnimationFrame(drawParticles);
}
refreshParticles = syncParticles;
compactMotion.addEventListener('change', prepareParticles);
window.SiteMotion.subscribe(syncParticles);
document.addEventListener('visibilitychange', syncParticles);
syncParticles();
