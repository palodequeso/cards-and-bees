import Card, { CardData } from "./card";

export default class Player {
  private zoneNode: HTMLDivElement;
  private playAreaNode: HTMLDivElement;
  private playAreaLabel: HTMLDivElement;
  private handStripNode: HTMLDivElement | null = null; // self only
  private isSelf: boolean;
  private player: any;
  private hand: CardData[] = [];
  private played: CardData[] = [];
  private handCards: Card[] = [];
  private playedCards: Card[] = [];
  private handSummary: HTMLDivElement | null = null;
  private onCardDroppedFromHand: (c: Card) => void;
  private onCardDroppedFromPlayArea: (c: Card) => void;
  private onPlayAreaCardMoved: (c: Card, xFrac: number, yFrac: number) => void;
  private onHandReordered: (p: Player, newOrder: CardData[]) => void;

  constructor(
    isSelf: boolean,
    player: any,
    hand: CardData[],
    played: CardData[],
    playerIndex: number,
    onCardDroppedFromHand: (c: Card) => void,
    onCardDroppedFromPlayArea: (c: Card) => void,
    onPlayAreaCardMoved: (c: Card, xFrac: number, yFrac: number) => void,
    onHandReordered: (p: Player, newOrder: CardData[]) => void,
  ) {
    this.isSelf = isSelf;
    this.player = player;
    this.onCardDroppedFromHand = onCardDroppedFromHand;
    this.onCardDroppedFromPlayArea = onCardDroppedFromPlayArea;
    this.onPlayAreaCardMoved = onPlayAreaCardMoved;
    this.onHandReordered = onHandReordered;

    // ── Outer zone wrapper ──────────────────────────────
    this.zoneNode = document.createElement("div");
    this.zoneNode.classList.add(isSelf ? "player-self-zone" : "player-opponent-zone");

    // ── Play area ───────────────────────────────────────
    this.playAreaNode = document.createElement("div");
    this.playAreaNode.classList.add("player-play-area");
    this.playAreaNode.classList.add(isSelf ? "self-play-area" : "opponent-play-area");

    this.playAreaLabel = document.createElement("div");
    this.playAreaLabel.classList.add("play-area-label");
    this.playAreaLabel.textContent = "play area";
    this.playAreaNode.appendChild(this.playAreaLabel);

    if (isSelf) {
      // Self: play area above hand strip (play area closer to center table)
      this.zoneNode.appendChild(this.playAreaNode);

      this.handStripNode = document.createElement("div");
      this.handStripNode.classList.add("player-hand-strip");
      const nameEl = document.createElement("div");
      nameEl.classList.add("player-name", "is-self");
      nameEl.textContent = player.name;
      this.handStripNode.appendChild(nameEl);
      this.zoneNode.appendChild(this.handStripNode);
    } else {
      // Opponent: name+hand summary at top edge, play area below (closer to center table)
      const headerRow = document.createElement("div");
      headerRow.classList.add("opponent-header");
      const nameEl = document.createElement("div");
      nameEl.classList.add("player-name");
      nameEl.textContent = player.name;
      headerRow.appendChild(nameEl);
      this.handSummary = document.createElement("div");
      this.handSummary.classList.add("hand-summary");
      headerRow.appendChild(this.handSummary);
      this.zoneNode.appendChild(headerRow);
      this.zoneNode.appendChild(this.playAreaNode);
    }

    this.updateHand(hand);
    this.updatePlayed(played);
  }

  // ── Hand ──────────────────────────────────────────────
  public updateHand(hand: CardData[]) {
    this.hand = hand;
    if (this.isSelf) {
      this.syncHandCards();
    } else {
      this.handSummary.textContent = `${hand.length} card${hand.length !== 1 ? "s" : ""} in hand`;
    }
  }

  private syncHandCards() {
    // Remove cards no longer in hand
    const toRemove = [];
    for (let i = 0; i < this.handCards.length; i++) {
      const stillThere = this.hand.find((c) => c.rank === this.handCards[i].cardData.rank && c.suit === this.handCards[i].cardData.suit);
      if (!stillThere) {
        this.handCards[i].node.remove();
        this.handCards[i].destroy();
        toRemove.push(i);
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--)
      this.handCards.splice(toRemove[i], 1);

    // Add new cards
    for (const cd of this.hand) {
      const exists = this.handCards.findIndex((c) => c.cardData.rank === cd.rank && c.cardData.suit === cd.suit) !== -1;
      if (exists)
        continue;
      const card = new Card(cd, this.handCards.length * 28 + 4, 26, this.handCardDragged.bind(this), this.handCardDropped.bind(this));
      this.handCards.push(card);
      this.handStripNode.appendChild(card.node);
    }
    this.lineupHandCards();
  }

  private lineupHandCards() {
    for (let i = 0; i < this.hand.length; i++) {
      const card = this.handCards.find((c) => c.cardData.rank === this.hand[i].rank && c.cardData.suit === this.hand[i].suit);
      if (!card)
        continue;
      card.node.style.left = `${i * 28 + 4}px`;
      card.node.style.top = "30px";
      card.node.style.zIndex = `${i + 1}`;
    }
    const w = Math.max(200, this.hand.length * 28 + 100);
    this.handStripNode.style.width = `${w}px`;
  }

  private handCardDragged(c: Card) {
    const sorted = this.handCards.slice().sort((a, b) => a.node.getBoundingClientRect().left - b.node.getBoundingClientRect().left);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].cardData.rank === c.cardData.rank && sorted[i].cardData.suit === c.cardData.suit)
        continue;
      sorted[i].node.style.left = `${i * 28 + 4}px`;
      sorted[i].node.style.top = "30px";
    }
  }

  private handCardDropped(c: Card) {
    const cr = c.node.getBoundingClientRect();
    const hr = this.handStripNode.getBoundingClientRect();
    const margin = 20;
    const inHand = cr.left > hr.left - margin &&
      cr.right < hr.right + margin &&
      cr.top > hr.top - margin &&
      cr.bottom < hr.bottom + margin;

    if (inHand) {
      const newOrder = this.handCards
        .slice()
        .sort((a, b) => a.node.getBoundingClientRect().left - b.node.getBoundingClientRect().left)
        .map((c) => c.cardData);
      this.onHandReordered(this, newOrder);
    } else {
      // Let game.ts decide: play area? stacks? center?
      const idx = this.hand.findIndex((cd) => cd.rank === c.cardData.rank && cd.suit === c.cardData.suit);
      if (idx !== -1)
        this.hand.splice(idx, 1);
      this.onCardDroppedFromHand(c);
    }
    this.lineupHandCards();
  }

  // ── Play area (freeform) ───────────────────────────────
  public updatePlayed(played: CardData[]) {
    this.played = played;
    // Remove cards no longer in played
    const toRemove = [];
    for (let i = 0; i < this.playedCards.length; i++) {
      const stillThere = this.played.find((c) => c.rank === this.playedCards[i].cardData.rank && c.suit === this.playedCards[i].cardData.suit);
      if (!stillThere) {
        this.playedCards[i].node.remove();
        this.playedCards[i].destroy();
        toRemove.push(i);
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--)
      this.playedCards.splice(toRemove[i], 1);

    // Add new cards or reposition existing ones
    for (const cd of this.played) {
      const existing = this.playedCards.find((c) => c.cardData.rank === cd.rank && c.cardData.suit === cd.suit);
      if (existing) {
        // Update position from server state
        this.positionPlayedCard(existing, cd);
        continue;
      }
      const card = this.isSelf
        ? new Card(cd, 0, 0, undefined, this.playAreaCardDropped.bind(this))
        : new Card(cd, 0, 0);
      if (!this.isSelf)
        card.setDraggable(false);
      this.playedCards.push(card);
      this.playAreaNode.appendChild(card.node);
      this.positionPlayedCard(card, cd);
    }
    this.playAreaLabel.style.display = this.played.length > 0 ? "none" : "";
    this.playAreaNode.classList.toggle("has-cards", this.played.length > 0);
  }

  private positionPlayedCard(card: Card, cd: CardData) {
    const cw = this.playAreaNode.clientWidth;
    const ch = this.playAreaNode.clientHeight;
    // If play area not yet in DOM or fractions are 0, use a staggered default
    if (cw === 0 || ch === 0) {
      const idx = this.playedCards.indexOf(card);
      card.reposition(idx * 28 + 8, 8);
      return;
    }
    card.node.style.left = `${cd.x * cw}px`;
    card.node.style.top = `${cd.y * ch}px`;
  }

  private playAreaCardDropped(c: Card) {
    const cr = c.node.getBoundingClientRect();
    const pr = this.playAreaNode.getBoundingClientRect();
    // Check if card center is far enough from play area to count as ejected
    const centerX = (cr.left + cr.right) / 2;
    const centerY = (cr.top + cr.bottom) / 2;
    const ejectMargin = 80;
    const ejected = centerX < pr.left - ejectMargin ||
      centerX > pr.right + ejectMargin ||
      centerY < pr.top - ejectMargin ||
      centerY > pr.bottom + ejectMargin;

    if (ejected) {
      // Truly ejected — game.ts decides where it lands
      const idx = this.played.findIndex((cd) => cd.rank === c.cardData.rank && cd.suit === c.cardData.suit);
      if (idx !== -1)
        this.played.splice(idx, 1);
      this.onCardDroppedFromPlayArea(c);
      return;
    }

    // Snap back into play area bounds and update position using content dimensions
    const contentLeft = pr.left + this.playAreaNode.clientLeft;
    const contentTop = pr.top + this.playAreaNode.clientTop;
    const cw = this.playAreaNode.clientWidth;
    const ch = this.playAreaNode.clientHeight;
    const xFrac = Math.max(0, Math.min(0.95, (cr.left - contentLeft) / cw));
    const yFrac = Math.max(0, Math.min(0.95, (cr.top - contentTop) / ch));
    c.node.style.left = `${xFrac * cw}px`;
    c.node.style.top = `${yFrac * ch}px`;
    this.onPlayAreaCardMoved(c, xFrac, yFrac);
  }

  // ── Public interface ──────────────────────────────────
  get node() { return this.zoneNode; }
  get playAreaEl() { return this.playAreaNode; }
  get handEl() { return this.handStripNode; }
  get isPlayerSelf() { return this.isSelf; }
  get playerId() { return this.player.id; }
}
