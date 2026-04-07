export class Draggable {
  private isDragging = false;
  private offsetX = 0;
  private offsetY = 0;
  private isEnabled = true;

  private static draggingElement: Draggable | null = null;

  static get isDragging() {
    return Draggable.draggingElement !== null;
  }

  constructor(
    protected dragElement: HTMLElement,
    private onDragMove: (x: number, y: number) => void,
    private onDragEnd: (x: number, y: number) => void,
  ) {
    this.dragElement.style.position = "absolute";
    this.dragElement.style.cursor = "grab";
    this.dragElement.draggable = false;
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
    if (!this.isEnabled) return;
    event.preventDefault();
    if (Draggable.draggingElement) return;
    Draggable.draggingElement = this;
    this.startDragging(event.clientX, event.clientY);
  };

  private onTouchStart = (event: TouchEvent) => {
    if (!this.isEnabled) return;
    event.preventDefault();
    if (Draggable.draggingElement) return;
    Draggable.draggingElement = this;
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
    if (!this.isEnabled || Draggable.draggingElement !== this) return;
    this.stopDragging();
  };

  private onTouchEnd = () => {
    if (!this.isEnabled || Draggable.draggingElement !== this) return;
    this.stopDragging();
  };

  private startDragging(clientX: number, clientY: number) {
    this.isDragging = true;
    const rect = this.dragElement.getBoundingClientRect();
    // Find the offset parent — this is the containing block for position:absolute
    const parent = this.dragElement.offsetParent as HTMLElement;
    const parentRect = parent ? parent.getBoundingClientRect() : { left: 0, top: 0 };
    // Absolute positioning is relative to the parent's padding edge, so
    // subtract the parent's border (clientLeft/clientTop) from the offset.
    const borderLeft = parent ? parent.clientLeft : 0;
    const borderTop = parent ? parent.clientTop : 0;
    const left = rect.left - parentRect.left - borderLeft;
    const top = rect.top - parentRect.top - borderTop;
    this.offsetX = clientX - left;
    this.offsetY = clientY - top;
    this.dragElement.style.position = "absolute";
    this.dragElement.style.margin = "0";
    this.dragElement.style.left = left + "px";
    this.dragElement.style.top = top + "px";
    this.dragElement.style.cursor = "grabbing";
    this.dragElement.style.zIndex = "1000";
  }

  private stopDragging() {
    this.isDragging = false;
    this.dragElement.style.cursor = "grab";
    this.dragElement.style.zIndex = "";
    const { left, top } = this.dragElement.getBoundingClientRect();
    if (this.onDragEnd) {
      this.onDragEnd(left, top);
    }
    Draggable.draggingElement = null;
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
