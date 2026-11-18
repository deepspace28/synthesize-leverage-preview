import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
for (const figure of document.querySelectorAll('[data-model]')) {
  const stage = figure.querySelector('.model-stage');
  const status = figure.querySelector('.model-status');
  try {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.3));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    const scene = new THREE.Scene();
    const environment = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    scene.environment = environment.fromScene(room, 0.04).texture;
    room.dispose();
    environment.dispose();
    scene.add(new THREE.HemisphereLight(0xfff0d6, 0x44454c, 1.6));
    const light = new THREE.DirectionalLight(0xffead1, 2);
    light.position.set(-4, 7, 5);
    scene.add(light);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = Math.PI / 2.05;
    let mixer, clips, active = false, visible = false;
    const clock = new THREE.Clock();
    const render = () => renderer.render(scene, camera);
    controls.addEventListener('change', render);
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D object. Drag to rotate, use left and right arrow keys, or press Home to reset the view.');
    renderer.domElement.addEventListener('keydown', event => {
      if (event.key === 'Home') { event.preventDefault(); controls.reset(); render(); }
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), event.key === 'ArrowLeft' ? -0.2 : 0.2);
      camera.position.copy(controls.target).add(offset);
      controls.update();
    });
    const resize = () => {
      const { width, height } = stage.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    };
    new ResizeObserver(resize).observe(stage);
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }).observe(stage);
    new GLTFLoader().load(`models/${figure.dataset.model}.glb`, gltf => {
      scene.add(gltf.scene);
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const distance = Math.max(size.x, size.y, size.z) * 1.22;
      camera.position.copy(center).add(new THREE.Vector3(distance * 0.35, distance * 0.9, distance));
      controls.target.copy(center);
      controls.update();
      controls.saveState();
      mixer = new THREE.AnimationMixer(gltf.scene);
      mixer.addEventListener('finished', () => { active = false; });
      clips = gltf.animations;
      if (figure.dataset.model === 'decision-file') {
        const clip = clips.find(c => c.name === 'reveal');
        if (clip) {
          const action = mixer.clipAction(clip);
          action.play();
          action.time = clip.duration * 0.65;
          action.paused = true;
          mixer.update(0);
          figure.querySelector('[data-animate]').setAttribute('aria-pressed', 'true');
        }
      }
      stage.replaceChildren(renderer.domElement);
      stage.classList.add('loaded');
      resize();
      status.textContent = '';
      figure.dataset.ready = 'true';
    }, undefined, () => {
      status.textContent = '3D could not load. The briefing image is shown.';
      figure.querySelectorAll('button').forEach(button => { button.disabled = true; });
    });
    figure.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button || !mixer) return;
      if (button.hasAttribute('data-reset')) {
        controls.reset();
        mixer.stopAllAction();
        figure.querySelectorAll('[data-animate]').forEach(b => b.setAttribute('aria-pressed', 'false'));
        active = false;
      }
      if (button.dataset.turn) {
        const offset = camera.position.clone().sub(controls.target);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), Number(button.dataset.turn) * 0.3);
        camera.position.copy(controls.target).add(offset);
        controls.update();
      }
      if (button.dataset.animate) {
        const clip = clips.find(c => c.name === button.dataset.animate);
        if (!clip) return;
        const open = button.getAttribute('aria-pressed') !== 'true';
        button.setAttribute('aria-pressed', String(open));
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.reset();
        action.time = open ? 0 : clip.duration;
        action.timeScale = open ? 1 : -1;
        action.play();
        if (reducedMotion.matches) { action.time = open ? clip.duration : 0; mixer.update(0); }
        active = !reducedMotion.matches;
      }
      render();
    });
    renderer.setAnimationLoop(() => {
      const delta = Math.min(clock.getDelta(), 0.05);
      if (active && visible && mixer) { mixer.update(delta); render(); }
    });
  } catch {
    status.textContent = 'The static object is shown because 3D is unavailable in this browser.';
    figure.querySelectorAll('button').forEach(button => { button.disabled = true; });
  }
}
