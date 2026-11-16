// Keyboard and mouse state for the game: held keys, the mouse position in
// world coordinates, and edge detection so a press registers exactly once.

export class Input {
  constructor(canvas, view) {
    this.canvas = canvas;
    this.view = view;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseX = view.width / 2;
    this.mouseY = view.height / 3;
    this.mouseDown = false;
    this.mouseClicked = false;
    this.rightClicked = false;

    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(event.code);
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
    });
    canvas.addEventListener('mousemove', (event) => {
      this.trackMouse(event);
    });
    canvas.addEventListener('mousedown', (event) => {
      this.trackMouse(event);
      if (event.button === 0) {
        this.mouseDown = true;
        this.mouseClicked = true;
      }
      if (event.button === 2) this.rightClicked = true;
    });
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.mouseDown = false;
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  trackMouse(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.view.width / rect.width;
    const scaleY = this.view.height / rect.height;
    this.mouseX = (event.clientX - rect.left) * scaleX;
    this.mouseY = (event.clientY - rect.top) * scaleY;
  }

  down(...codes) {
    return codes.some((code) => this.keys.has(code));
  }

  justPressed(...codes) {
    return codes.some((code) => this.pressed.has(code));
  }

  // Called at the end of each frame: one-frame signals reset.
  endFrame() {
    this.pressed.clear();
    this.mouseClicked = false;
    this.rightClicked = false;
  }
}
