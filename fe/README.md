# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Fall Detection – Pose Tracking Demo (Milestone A)

This project includes a dedicated browser-based live pose tracking feature built using Google MediaPipe Pose Landmarker for Web (`@mediapipe/tasks-vision`).

### Features
- Live camera access using `navigator.mediaDevices.getUserMedia` (video only, no audio requested).
- High-performance continuous pose landmark inference via `@mediapipe/tasks-vision` in `VIDEO` mode.
- Connected skeleton overlay aligned with the live video feed.
- Hardware-accelerated mirroring (selfie mode) toggle.
- Real-time performance indicators (FPS meter, pose count, delegate indicator).
- Comprehensive error handling (permission denied, missing camera, camera in-use, insecure context).
- Automatic cleanup of animation frames, canvas contexts, and media tracks on stop or page unmount.

### Asset Locations
- **Pose Model:** `fe/public/models/pose_landmarker_lite.task` (MediaPipe Pose Landmarker Lite float16 model).
- **WASM Binaries:** `fe/public/wasm/` (`vision_wasm_internal.*` and `vision_wasm_module_internal.*`).
- Automatic fallback to official CDN URLs if local assets fail to load.

### How to Run
```bash
cd fe
npm install
npm run dev
```
Open your browser at `http://localhost:5173` (or the URL printed by Vite), log in, and switch to the **Fall Detection Demo** (🚶) tab. Click **Start Camera** to allow camera access and view live pose tracking.

### Scope & Limitations (Milestone A)
> **Note:** Milestone A is strictly limited to live camera capture and pose landmark visualization. It does **not** train or run a fall-detection ML classifier, does not decide whether a user has fallen, does not record or upload video feeds, and does not provide emergency alerts or medical monitoring.


If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
