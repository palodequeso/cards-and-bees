export class Draggable {
  private isDragging = false;
  private offsetX = 0;
  private offsetY = 0;
  private isEnabled = true;

  private static draggingElement: Draggable | null = null; // Track the current dragging element

  constructor(
    protected dragElement: HTMLElement,
    private onDragMove: (x: number, y: number) => void,
    private onDragEnd: (x: number, y: number) => void,
  ) {
    this.dragElement.style.position = "absolute";
    this.dragElement.style.cursor = "grab";
    this.dragElement.draggable = false; // Disable HTML5 native dragging
    this.dragElement.addEventListener("mousedown", this.onMouseDown);
    this.dragElement.addEventListener("touchstart", this.onTouchStart, {
      passive: false,
    });
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("touchmove", this.onTouchMove, {
      passive: false,
    });
    document.addEventListener("mouseup", this.onMouseUp);
    document.addEventListener("touchend", this.onTouchEnd);
  }

  private onMouseDown = (event: MouseEvent) => {
    if (!this.isEnabled) {
      return;
    }
    event.preventDefault();
    if (Draggable.draggingElement) return; // Prevent starting a drag if another element is already being dragged
    Draggable.draggingElement = this; // Set the current instance as the dragging element
    console.log('event', event);
    this.startDragging(event.clientX, event.clientY);
  };

  private onTouchStart = (event: TouchEvent) => {
    if (!this.isEnabled) {
      return;
    }
    event.preventDefault();
    if (Draggable.draggingElement) return; // Prevent starting a drag if another element is already being dragged
    Draggable.draggingElement = this; // Set the current instance as the dragging element
    const touch = event.touches[0];
    this.startDragging(touch.clientX, touch.clientY);
  };

  private onMouseMove = (event: MouseEvent) => {
    if (
      !this.isEnabled ||
      !Draggable.draggingElement ||
      Draggable.draggingElement !== this
    ) {
      return;
    }
    event.preventDefault();
    this.dragElement.style.left = event.clientX - this.offsetX + "px";
    this.dragElement.style.top = event.clientY - this.offsetY + "px";
    const { left, top } = this.dragElement.getBoundingClientRect();
    this.onDragMove(left, top);
  };

  private onTouchMove = (event: TouchEvent) => {
    if (
      !this.isEnabled ||
      !Draggable.draggingElement ||
      Draggable.draggingElement !== this
    ) {
      return;
    }
    event.preventDefault();
    const touch = event.touches[0];
    this.dragElement.style.left = touch.clientX - this.offsetX + "px";
    this.dragElement.style.top = touch.clientY - this.offsetY + "px";
    const { left, top } = this.dragElement.getBoundingClientRect();
    this.onDragMove(left, top);
  };

  private onMouseUp = () => {
    if (!this.isEnabled || Draggable.draggingElement !== this) {
      return;
    }
    this.stopDragging();
  };

  private onTouchEnd = () => {
    if (!this.isEnabled || Draggable.draggingElement !== this) {
      return;
    }
    this.stopDragging();
  };

  private startDragging(clientX: number, clientY: number) {
    this.isDragging = true;
    this.offsetX = clientX - this.dragElement.offsetLeft;
    this.offsetY = clientY - this.dragElement.offsetTop;
    this.dragElement.style.left = clientX - this.offsetX + "px";
    this.dragElement.style.top = clientY - this.offsetY + "px";
    this.dragElement.style.cursor = "grabbing";
    this.dragElement.style.zIndex = "1000"; // Ensure the dragged element is on top
  }

  private stopDragging() {
    this.isDragging = false;
    this.dragElement.style.cursor = "grab";
    this.dragElement.style.zIndex = ""; // Reset z-index
    const { left, top } = this.dragElement.getBoundingClientRect();
    if (this.onDragEnd) {
      this.onDragEnd(
        left, top,
      );
    }
    Draggable.draggingElement = null; // Reset the dragging element
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  destroy() {
    this.dragElement.removeEventListener("mousedown", this.onMouseDown);
    this.dragElement.removeEventListener("touchstart", this.onTouchStart);
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("touchmove", this.onTouchMove);
    document.removeEventListener("mouseup", this.onMouseUp);
    document.removeEventListener("touchend", this.onTouchEnd);
  }
}
