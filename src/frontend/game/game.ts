import { Client, Room } from "colyseus";
import Card, { Suit, Rank, CardData, stringToRank, stringToSuit } from "./card";
import Chat from "./chat";
import Player from "./player";
import Stack from "./stack";
import { Draggable } from "./util";

export default class Game {
  private domNode: HTMLDivElement;
  private room: Room;
  private client: Client;
  private state: any = null;
  private isSetup: boolean = false;
  private stacks: { [key: string]: Stack } = {};
  private players: { [key: string]: Player } = {};
  private cards: Card[] = [];
  private chat: Chat | null = null;
  private username: string;
  private opponentsStrip: HTMLDivElement | null = null;
  private stacksZone: HTMLDivElement | null = null;
  private opponentCount = 0;

  constructor(
    domNode: HTMLDivElement,
    room: Room,
    client: Client,
    username: string,
  ) {
    this.domNode = domNode;
    this.room = room;
    this.client = client;
    this.username = username;
    this.state = room.state;
    (this.room as any).onStateChange(this.stateChanged.bind(this));
  }

  setup() {
    if (this.isSetup)
      return;

    this.opponentsStrip = document.createElement("div");
    this.opponentsStrip.id = "opponents-strip";
    this.domNode.appendChild(this.opponentsStrip);

    this.stacksZone = document.createElement("div");
    this.stacksZone.id = "stacks-zone";
    this.domNode.appendChild(this.stacksZone);

    this.updateStacks();
    this.updateCards();
    this.updatePlayers();

    this.chat = new Chat(this.room, this.sendMessage.bind(this));
    this.domNode.appendChild(this.chat.toggleEl);
    this.domNode.appendChild(this.chat.panelEl);

    // Highlight self play area while dragging a card
    document.addEventListener("mousemove", (e) => {
      const selfPlayer = this.getSelfPlayer();
      if (!selfPlayer) return;
      const playArea = selfPlayer.playAreaEl;
      if (Draggable.isDragging) {
        const r = playArea.getBoundingClientRect();
        const over = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        playArea.classList.toggle("drag-over", over);
      } else {
        playArea.classList.remove("drag-over");
      }
    });

    this.isSetup = true;
  }

  // Normalize viewport pixel coords → 0-1 fractions for the server so all
  // players see shared cards at the same relative position.
  toNorm(x: number, y: number) {
    return { x: x / window.innerWidth, y: y / window.innerHeight };
  }
  fromNorm(x: number, y: number) {
    return { x: x * window.innerWidth, y: y * window.innerHeight };
  }

  // ── Players ───────────────────────────────────────────
  updatePlayers() {
    for (const playerId in this.players) {
      const found = this.state.players.find((p) => p.id === playerId);
      if (!found) {
        this.players[playerId].node.remove();
        delete this.players[playerId];
      }
    }

    for (const player of this.state.players) {
      const hand = player.hand.map((c) => {
        const cd = new CardData();
        cd.rank = stringToRank(c.value.rank);
        cd.suit = stringToSuit(c.value.suit);
        cd.faceDown = c.isFaceDown;
        return cd;
      });
      const played = player.played.map((c) => {
        const cd = new CardData();
        cd.rank = stringToRank(c.value.rank);
        cd.suit = stringToSuit(c.value.suit);
        cd.faceDown = c.isFaceDown;
        cd.x = c.x;
        cd.y = c.y;
        return cd;
      });
      if (!this.players[player.id]) {
        const isSelf = player.name === this.username;
        const p = new Player(isSelf, player, hand, played, isSelf ? 0 : this.opponentCount, this.cardDroppedFromHand.bind(this), this.cardDroppedFromPlayArea.bind(this), this.playAreaCardMoved.bind(this), this.handCardsReordered.bind(this));
        this.players[player.id] = p;
        if (isSelf) {
          this.domNode.appendChild(p.node);
        } else {
          this.opponentsStrip.appendChild(p.node);
          this.opponentCount++;
        }
      } else {
        this.players[player.id].updateHand(hand);
        this.players[player.id].updatePlayed(played);
      }
    }
  }

  // ── Center table cards ────────────────────────────────
  updateCards() {
    const tableCards = this.state.tableCards;
    const toRemove = [];
    for (let i = 0; i < this.cards.length; i++) {
      const found = tableCards.find((c) => c.value.rank === this.cards[i].cardData.rank && c.value.suit === this.cards[i].cardData.suit);
      if (!found) {
        this.cards[i].node.remove();
        this.cards[i].destroy();
        toRemove.push(i);
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--)
      this.cards.splice(toRemove[i], 1);

    for (const cardItem of tableCards) {
      const existing = this.cards.find((c) => c.cardData.rank === cardItem.value.rank && c.cardData.suit === cardItem.value.suit);
      const { x, y } = this.fromNorm(cardItem.x, cardItem.y);
      if (existing) {
        existing.reposition(x, y);
        continue;
      }
      const cd = new CardData();
      cd.rank = stringToRank(cardItem.value.rank);
      cd.suit = stringToSuit(cardItem.value.suit);
      cd.faceDown = cardItem.isFaceDown;
      const card = new Card(cd, x, y, this.tableCardMoved.bind(this), this.tableCardDropped.bind(this), this.tableCardSelected.bind(this));
      this.cards.push(card);
      this.domNode.appendChild(card.node);
    }
  }

  // Card being actively dragged on the center table — send live position
  tableCardMoved(card: Card) {
    const { x, y } = this.toNorm(card.x, card.y);
    this.sendToServer("move", {
      type: "move", username: this.username,
      from: "table", to: "table",
      card: { value: { rank: card.cardData.rank, suit: card.cardData.suit }, x, y, isFaceDown: card.cardData.faceDown },
      stack: null,
    });
  }

  // Center table card dropped — route to stack, hand, or stays on table
  tableCardDropped(card: Card) {
    if (this.tryDropOnStack(card, "table"))
      return;
    for (const playerId in this.players) {
      const player = this.players[playerId];
      const r = player.node.getBoundingClientRect();
      if (card.x >= r.left && card.x <= r.right && card.y >= r.top && card.y <= r.bottom) {
        const { x, y } = this.toNorm(card.x, card.y);
        this.sendToServer("move", {
          type: "move", username: this.username, playerId,
          from: "table", to: "hand",
          card: { value: { rank: card.cardData.rank, suit: card.cardData.suit }, x, y, isFaceDown: card.cardData.faceDown },
          stack: null,
        });
        return;
      }
    }
    const { x, y } = this.toNorm(card.x, card.y);
    this.sendToServer("move", {
      type: "move", username: this.username,
      from: "table", to: "table",
      card: { value: { rank: card.cardData.rank, suit: card.cardData.suit }, x, y, isFaceDown: card.cardData.faceDown },
      stack: null,
    });
  }

  tableCardSelected(card: Card) {
    // reserved
  }

  // ── Drop routing from player zones ───────────────────
  // Card dropped out of your hand — check stacks → your play area → center table
  cardDroppedFromHand(card: Card) {
    if (this.tryDropOnStack(card, "hand"))
      return;
    const selfPlayer = this.getSelfPlayer();
    if (selfPlayer) {
      const r = selfPlayer.playAreaEl.getBoundingClientRect();
      if (card.x >= r.left && card.x <= r.right && card.y >= r.top && card.y <= r.bottom) {
        const el = selfPlayer.playAreaEl;
        const contentLeft = r.left + el.clientLeft;
        const contentTop = r.top + el.clientTop;
        const xFrac = Math.max(0, Math.min(0.95, (card.x - contentLeft) / el.clientWidth));
        const yFrac = Math.max(0, Math.min(0.95, (card.y - contentTop) / el.clientHeight));
        this.sendToServer("move", {
          type: "move", username: this.username,
          from: "hand", to: "played",
          card: { value: { rank: card.cardData.rank, suit: card.cardData.suit }, x: xFrac, y: yFrac, isFaceDown: false },
          stack: null,
        });
        return;
      }
    }
    // Lands on center table
    const { x, y } = this.toNorm(card.x, card.y);
    this.sendToServer("move", {
      type: "move", username: this.username,
      from: "hand", to: "table",
      card: { value: { rank: card.cardData.rank, suit: card.cardData.suit }, x, y, isFaceDown: false },
      stack: null,
    });
  }

  // Card dropped out of your play area — check hand → center table
  cardDroppedFromPlayArea(card: Card) {
    const selfPlayer = this.getSelfPlayer();
    if (selfPlayer && selfPlayer.handEl) {
      const r = selfPlayer.handEl.getBoundingClientRect();
      if (card.x >= r.left && card.x <= r.right && card.y >= r.top && card.y <= r.bottom) {
        this.sendToServer("move", {
          type: "move", username: this.username,
          from: "played", to: "hand",
          card: { value: { rank: card.cardData.rank, suit: card.cardData.suit }, x: 0, y: 0, isFaceDown: false },
          stack: null,
        });
        return;
      }
    }
    // Goes to center table at the drop position
    const { x, y } = this.toNorm(card.x, card.y);
    this.sendToServer("move", {
      type: "move", username: this.username,
      from: "played", to: "table",
      card: { value: { rank: card.cardData.rank, suit: card.cardData.suit }, x, y, isFaceDown: false },
      stack: null,
    });
  }

  // Card repositioned within your play area
  playAreaCardMoved(card: Card, xFrac: number, yFrac: number) {
    this.sendToServer("move", {
      type: "move", username: this.username,
      from: "played", to: "played",
      card: { value: { rank: card.cardData.rank, suit: card.cardData.suit }, x: xFrac, y: yFrac, isFaceDown: false },
      stack: null,
    });
  }

  // ── Stacks ────────────────────────────────────────────
  updateStacks() {
    for (const stack of this.state.cardStacks) {
      const cardData = stack.stack.map((cardItem) => {
        const cd = new CardData();
        cd.rank = stringToRank(cardItem.value.rank);
        cd.suit = stringToSuit(cardItem.value.suit);
        cd.faceDown = cardItem.isFaceDown;
        return cd;
      });
      if (!this.stacks[stack.id]) {
        const s = new Stack(
          stack.id,
          cardData,
          stack.x,
          stack.y,
          stack.isFaceDown,
          this.stackClick.bind(this),
        );
        this.stacks[stack.id] = s;
        this.stacksZone.appendChild(s.node);
      }
      this.stacks[stack.id].updateCards(cardData);
      this.stacks[stack.id].setFaceDown(stack.isFaceDown);
    }
  }

  stackClick(stack: Stack) {
    this.sendToServer("draw", { type: "draw", username: this.username, value: stack.stackId });
  }

  // Check if a card was dropped on any stack; sends the move if so. Returns true if handled.
  tryDropOnStack(card: Card, from: string): boolean {
    for (const stackName in this.stacks) {
      const stack = this.stacks[stackName];
      const r = stack.node.getBoundingClientRect();
      if (card.x >= r.left && card.x <= r.right && card.y >= r.top && card.y <= r.bottom) {
        const { x, y } = this.toNorm(card.x, card.y);
        this.sendToServer("move", {
          type: "move", username: this.username,
          from, to: "stack",
          card: { value: { rank: card.cardData.rank, suit: card.cardData.suit }, x, y, isFaceDown: card.cardData.faceDown },
          stack: stack.stackId,
        });
        return true;
      }
    }
    return false;
  }

  // ── Misc ──────────────────────────────────────────────
  handCardsReordered(player: Player, newOrder: CardData[]) {
    this.sendToServer("reorder-hand", { playerId: player.playerId, order: newOrder });
  }

  getSelfPlayer(): Player | null {
    return Object.values(this.players).find((p) => p.isPlayerSelf) ?? null;
  }

  sendMessage(message: string) {
    this.sendToServer("chat", { message, username: this.username });
  }

  sendToServer(type: string, data: any) {
    (this.room as any).send(type, data);
  }

  stateChanged(newState: any) {
    this.state = newState;
    this.setup();
    this.updateStacks();
    this.updateCards();
    this.updatePlayers();
    if (this.chat)
      this.chat.renderMessages();
  }
}
