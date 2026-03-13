/**
 * WorldNavigator – first-person walk mode for the 3D Builder.
 *
 * Controls:
 *   W / ↑   – move forward
 *   S / ↓   – move backward
 *   A / ←   – strafe left
 *   D / →   – strafe right
 *   Mouse   – look around (pointer-lock)
 *   Escape  – exit walk mode
 */
import * as THREE from 'three';

const EYE_HEIGHT    = 2.2;   // camera height above ground (world units)
const MOVE_SPEED    = 10;    // movement speed (units per second)
const SENSITIVITY   = 0.0018; // mouse look sensitivity (radians per pixel)
const MAX_PITCH_RAD = Math.PI / 2.1; // clamp vertical look slightly before ±90° to avoid gimbal lock

export class WorldNavigator {
  constructor (camera, renderer, orbitControls) {
    this.camera   = camera;
    this.renderer = renderer;
    this.controls = orbitControls;

    this.active = false;
    this._keys  = {};
    this._pitch = 0;  // vertical look angle (radians)
    this._yaw   = 0;  // horizontal look angle (radians)

    this._onKeyDown          = this._onKeyDown.bind(this);
    this._onKeyUp            = this._onKeyUp.bind(this);
    this._onMouseMove        = this._onMouseMove.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);
  }

  /* ── Public API ── */

  activate () {
    if (this.active) return;
    this.active = true;

    // Snap current camera orientation to yaw/pitch
    const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
    this._yaw   = euler.y;
    this._pitch = euler.x;

    // Ensure eye height
    this.camera.position.y = EYE_HEIGHT;

    this.controls.enabled = false;

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup',   this._onKeyUp);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);

    this.renderer.domElement.requestPointerLock();
  }

  deactivate () {
    if (!this.active) return;
    this.active = false;

    this.controls.enabled = true;
    this._keys = {};

    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup',   this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);

    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }
  }

  /** Called from the scene animation loop every frame. */
  update (delta) {
    if (!this.active) return;

    // Apply look rotation
    const euler = new THREE.Euler(this._pitch, this._yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);

    // Build movement vector in camera-facing direction (ignoring Y)
    const dir = new THREE.Vector3();
    if (this._keys['KeyW'] || this._keys['ArrowUp'])    dir.z -= 1;
    if (this._keys['KeyS'] || this._keys['ArrowDown'])  dir.z += 1;
    if (this._keys['KeyA'] || this._keys['ArrowLeft'])  dir.x -= 1;
    if (this._keys['KeyD'] || this._keys['ArrowRight']) dir.x += 1;

    if (dir.lengthSq() > 0) {
      dir.normalize()
         .applyEuler(new THREE.Euler(0, this._yaw, 0))
         .multiplyScalar(MOVE_SPEED * delta);
      this.camera.position.add(dir);
    }

    // Lock camera to eye height
    this.camera.position.y = EYE_HEIGHT;
  }

  /* ── Private ── */

  _onKeyDown (e) {
    this._keys[e.code] = true;
    if (e.code === 'Escape') this.deactivate();
  }

  _onKeyUp (e) {
    this._keys[e.code] = false;
  }

  _onMouseMove (e) {
    this._yaw   -= e.movementX * SENSITIVITY;
    this._pitch -= e.movementY * SENSITIVITY;
    // Clamp vertical look angle to prevent gimbal lock at exactly ±90°
    this._pitch = Math.max(-MAX_PITCH_RAD, Math.min(MAX_PITCH_RAD, this._pitch));
  }

  _onPointerLockChange () {
    if (document.pointerLockElement === this.renderer.domElement) {
      document.addEventListener('mousemove', this._onMouseMove);
    } else {
      document.removeEventListener('mousemove', this._onMouseMove);
      // Pointer lock was released externally (e.g. Escape key)
      if (this.active) this.deactivate();
    }
  }
}
