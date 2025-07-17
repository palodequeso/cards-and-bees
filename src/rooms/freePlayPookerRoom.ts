import { Room, Client } from "colyseus";
import {
  RoomState,
  PlayerState,
  CardState,
  CardStack,
  ChatMessage,
} from "./schema/freePlayPoker";

function generatePokerCards() {
  const out = [];
  ["Hearts", "Clubs", "Diamonds", "Spades"].forEach((suit) => {
    [
      "Ace",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "Jack",
      "Queen",
      "King",
    ].forEach((rank) => {
      const cs = new CardState();
      cs.value.set("suit", suit);
      cs.value.set("rank", rank);
      out.push(cs);
    });
  });
  return out;
}

export default class FreePlayPokerRoom extends Room<RoomState> {
  // number of clients per room
  maxClients = 4;

  private _initDrawStack() {
    const stack = new CardStack();
    stack.id = "draw";
    stack.x = 100;
    stack.y = 128;
    stack.isFaceDown = true;
    const pokerCards = generatePokerCards().sort(() => Math.random() - 0.5);
    pokerCards.forEach((c) => {
      stack.stack.push(c);
    });
    return stack;
  }

  private _initDiscardStack() {
    const stack = new CardStack();
    stack.id = "discard";
    stack.x = 200;
    stack.y = 128;
    stack.isFaceDown = false;
    return stack;
  }

  private _getPlayer(client: Client) {
    return this.state.players.find((p) => p.id === client.sessionId);
  }

  private _getPlayerById(id: string) {
    return this.state.players.find((p) => p.id === id);
  }

  private async _handleDrawCard(client: Client, data: any) {
    const { value } = data;
    const player = this._getPlayer(client);
    const fromStack = this.state.cardStacks.find((s) => s.id === value);
    if (fromStack.stack.length === 0) {
      return;
    }

    const card = fromStack.stack.pop();
    card.isFaceDown = false;
    player.hand.push(card);
  }

  private async _handleChatMessage(client: Client, data: any) {
    const { message, username } = data;
    const newMessage = new ChatMessage();
    newMessage.date = new Date().toISOString();
    newMessage.name = username;
    newMessage.message = message;
    this.state.chatMessages.push(newMessage);
  }

  private async _handleReorderHand(client: Client, data: any) {
    const { playerId, order } = data;
    const player = this._getPlayer(client);
    if (!player) {
      console.error("Player not found for reordering hand");
      return;
    }
    // reorder player hand to match the new order of card data
    player.hand = order.map((cardData: any) => {
      const card = player.hand.find(
        (c) =>
          c.value.get("rank") === cardData.rank &&
          c.value.get("suit") === cardData.suit,
      );
      if (!card) {
        console.error("Card not found for reordering hand");
        return;
      }
      return card;
    });
  }

  private async _handleMove(client: Client, data: any) {
    const { username, from, to, card } = data;
    console.log(username, from, to, card);
    if (from === "hand" && to === "table") {
      const player = this._getPlayer(client);
      const cardIndex = player.hand.findIndex(
        (c) =>
          c.value.get("rank") === card.value.rank &&
          c.value.get("suit") === card.value.suit,
      );
      if (cardIndex === -1) {
        return;
      }

      const cardToMove = player.hand.splice(cardIndex, 1)[0];
      cardToMove.x = card.x;
      cardToMove.y = card.y;
      cardToMove.isFaceDown = card.isFaceDown;
      this.state.tableCards.push(cardToMove);
    } else if (from === "table" && to === "table") {
      const cardIndex = this.state.tableCards.findIndex(
        (c) =>
          c.value.get("rank") === card.value.rank &&
          c.value.get("suit") === card.value.suit,
      );
      if (cardIndex === -1) {
        return;
      }

      const cardToMove = this.state.tableCards[cardIndex];
      cardToMove.x = card.x;
      cardToMove.y = card.y;
      cardToMove.isFaceDown = card.isFaceDown;
      this.state.tableCards[cardIndex] = cardToMove;
    } else if (from === "table" && to === "stack") {
      const { stack } = data;
      const toStack = this.state.cardStacks.find((s) => s.id === stack);

      const cardIndex = this.state.tableCards.findIndex(
        (c) =>
          c.value.get("rank") === card.value.rank &&
          c.value.get("suit") === card.value.suit,
      );
      if (cardIndex === -1) {
        return;
      }

      const movingCard = this.state.tableCards.splice(cardIndex, 1);
      toStack.stack.push(movingCard[0]);
    } else if (from === "hand" && to === "stack") {
      const { stack } = data;
      const toStack = this.state.cardStacks.find((s) => s.id === stack);
      const player = this._getPlayer(client);
      const cardIndex = player.hand.findIndex(
        (c) =>
          c.value.get("rank") === card.value.rank &&
          c.value.get("suit") === card.value.suit,
      );
      if (cardIndex === -1) {
        return;
      }

      const cardToMove = player.hand.splice(cardIndex, 1)[0];
      toStack.stack.push(cardToMove);
    } else if (from === "table" && to === "hand") {
      const { playerId, card } = data;
      const player = this._getPlayerById(playerId);
      const cardIndex = this.state.tableCards.findIndex(
        (c) =>
          c.value.get("rank") === card.value.rank &&
          c.value.get("suit") === card.value.suit,
      );
      if (cardIndex === -1) {
        return;
      }

      const cardToMove = this.state.tableCards.splice(cardIndex, 1)[0];
      player.hand.push(cardToMove);
    }
  }

  requestJoin(options: any, isNew: boolean) {
    console.log("request join", options, isNew);
    return true;
  }

  // room has been created: bring your own logic
  async onCreate(options: any) {
    const newRoom = new RoomState();
    this.setMetadata(options);
    if (options.game === "freePlayPoker") {
      const stack = this._initDrawStack();
      newRoom.cardStacks.push(stack);
      const discard = this._initDiscardStack();
      newRoom.cardStacks.push(discard);
    }
    newRoom.name = options.name;
    this.onMessage("*", this._handleMessage.bind(this));
    this.setState(newRoom);
  }

  _handleMessage(client: Client, type: string, data: any, extra: any) {
    console.log(
      "received message:",
      client.id,
      client.sessionId,
      type,
      data,
      extra,
    );
    if (type === "draw") {
      this._handleDrawCard(client, data);
    } else if (type === "chat") {
      this._handleChatMessage(client, data);
    } else if (type === "move") {
      this._handleMove(client, data);
    } else if (type === "reorder-hand") {
      this._handleReorderHand(client, data);
    }
  }

  // client joined: bring your own logic
  async onJoin(client: Client, options: any) {
    const { username } = options;
    const newPlayer = new PlayerState();
    newPlayer.name = username;
    newPlayer.id = client.sessionId;
    this.state.players.push(newPlayer);
  }

  // client left: bring your own logic
  async onLeave(client: Client, consented: boolean) {
    console.log("client left", client.sessionId, consented);
  }

  // room has been disposed: bring your own logic
  async onDispose() {
    console.log("room disposed");
  }
}
