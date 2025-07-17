function lerp1(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function normalizeVector(v: number[]): number[] {
  const length = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  if (length === 0) {
    return [0, 0];
  }
  return [v[0] / length, v[1] / length];
}

////////// loooooooooooooooollll
function projectileMotionInterpolation(
  start: { x: number; y: number },
  end: { x: number; y: number },
  totalTime: number,
  time: number,
): { x: number; y: number } {
  const timeS = time / totalTime;
  const x = lerp1(start.x, end.x, timeS);
  const y = lerp1(start.y, end.y, timeS);

  const heightS = 60;
  const yDiff = end.y - start.y;
  const td = (timeS > 0.5 ? 1.0 - timeS : timeS) * Math.abs(yDiff) * heightS;

  return { x, y: y - Math.pow(Math.abs(td), 0.5) };
}

const maxFlightTime = [1500, 2500];
const maxLandingTime = [700, 1200];
const maxAntennaeTime = [400, 1000];
const timeStep = 17;

function getRandRange(range: number[]): number {
  return Math.random() * (range[1] - range[0]) + range[0];
}

let currentMaxTime = getRandRange(maxFlightTime);

export default class Bee {
  private beeNode: HTMLDivElement | null = null;
  private position: { x: number; y: number } = { x: 0, y: 0 };
  private target: { x: number; y: number } = { x: 0, y: 0 };
  private deltaTime = 0.0;
  private state = "flying"; // flying, landed, antennae
  private frameIndex = 0;
  private intervalTimer = null;

  constructor() {
    this.beeNode = document.createElement("div");
    this.beeNode.className = "bee";
    this.intervalTimer = setInterval(this.handleBee.bind(this), timeStep);
  }

  handleBee() {
    this.deltaTime += timeStep;
    const nextState = this.deltaTime > currentMaxTime;
    if (nextState) {
      this.deltaTime = 0;
    }

    switch (this.state) {
      case "flying":
        // animate
        this.frameIndex = this.frameIndex === 0 ? 1 : 0;
        if (nextState) {
          this.state = "landed";
          currentMaxTime = getRandRange(maxLandingTime);
        } else {
          const newPosition = projectileMotionInterpolation(
            this.position,
            this.target,
            currentMaxTime,
            this.deltaTime,
          );
          this.position = newPosition;
        }
        break;
      case "landed":
        this.frameIndex = 2;
        if (nextState) {
          this.state = "antennae";
          currentMaxTime = getRandRange(maxAntennaeTime);
        }
        break;
      case "antennae":
        this.frameIndex = this.frameIndex === 0 ? 2 : 0;
        // animate
        if (nextState) {
          this.state = "flying";
          currentMaxTime = getRandRange(maxFlightTime);
          this.target = {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
          };
        }
        break;
      default:
        break;
    }

    this.beeNode.style.left = this.position.x + "px";
    this.beeNode.style.top = this.position.y + "px";
    this.beeNode.style.backgroundPosition = `0px ${this.frameIndex * -12}px`;
  }

  public get node() {
    return this.beeNode;
  }
}
