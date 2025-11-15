import { Client, Room } from "colyseus";
import Card, { Suit, Rank, CardData, stringToRank, stringToSuit } from "./card";
import Chat from "./chat";
import Player from "./player";
import Stack from "./stack";

export default class Game {
  private domNode: HTMLDivElement;
  private room: Room;
  private client: Client;
  private state: any = null; // raw state for ref?, Maybe remove
  private isSetup: boolean = false;
  private stacks: { [key: string]: Stack } = {};
  private players: { [key: string]: Player } = {};
  private cards: Card[] = [];
  private chat: Chat | null = null;
  private username: string;

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
    if (this.isSetup) {
      return;
    }

    // card stacks
    this.updateStacks();

    // table cards
    this.updateCards();

    // player hands
    this.updatePlayers();

    // chat
    this.chat = new Chat(this.room, this.sendMessage.bind(this));
    this.domNode.append(this.chat.node);

    this.isSetup = true;
  }

  updatePlayers() {
    // Remove players that are no longer in the state
    for (const playerId in this.players) {
      const found = this.state.players.find((p) => p.id === playerId);
      if (!found) {
        this.players[playerId].node.remove();
        delete this.players[playerId];
      }
    }
    
    for (const player of this.state.players) {
      const handCards: CardData[] = [];
      for (const handCard of player.hand) {
        const cardData = new CardData();
        cardData.rank = stringToRank(handCard.value.rank);
        cardData.suit = stringToSuit(handCard.value.suit);
        cardData.faceDown = handCard.isFaceDown;
        handCards.push(cardData);
      }
      if (!this.players[player.id]) {
        const p = new Player(
          player.name === this.username,
          player,
          handCards,
          Object.keys(this.players).length, // player index for positioning
          this.cardMovedToTable.bind(this),
          this.handCardsReordered.bind(this) // callback for when the hand cards are reordered
        );
        this.players[player.id] = p;
        this.domNode.append(p.node);
      }
      const p = this.players[player.id];
      p.updateHand(handCards);
    }
  }

  updateCards() {
    const tableCards = this.state.tableCards;
    const indexesToRemove = [];
    for (let i = 0; i < this.cards.length; i++) {
      const existingCard = this.cards[i];
      const found = tableCards.find(
        (c) =>
          c.value.rank === existingCard.cardData.rank &&
          c.value.suit === existingCard.cardData.suit,
      );
      if (!found) {
        existingCard.node.remove();
        existingCard.destroy();
        indexesToRemove.push(i);
      }
    }
    // Remove in reverse order to maintain correct indices
    for (let i = indexesToRemove.length - 1; i >= 0; i--) {
      this.cards.splice(indexesToRemove[i], 1);
    }
    for (const cardItem of tableCards) {
      const existingCard = this.cards.find(
        (c) =>
          c.cardData.rank === cardItem.value.rank &&
          c.cardData.suit === cardItem.value.suit,
      );
      if (existingCard) {
        // already exists, reposition
        existingCard.reposition(cardItem.x, cardItem.y);
        continue;
      }
      const cardData = new CardData();
      cardData.rank = stringToRank(cardItem.value.rank);
      cardData.suit = stringToSuit(cardItem.value.suit);
      cardData.faceDown = cardItem.isFaceDown;
      const card = new Card(
        cardData,
        cardItem.x,
        cardItem.y,
        this.cardMovedCallback.bind(this),
        this.cardDroppedCallback.bind(this),
        this.cardSelectedCallback.bind(this)
      );
      this.cards.push(card);
      this.domNode.append(card.node);
    }
  }

  cardMovedCallback(card: Card) {
    this.sendToServer("move", {
      type: "move",
      username: this.username,
      from: "table",
      to: "table",
      card: {
        value: {
          rank: card.cardData.rank,
          suit: card.cardData.suit,
        },
        x: card.x,
        y: card.y,
        isFaceDown: card.cardData.faceDown,
      },
      stack: null,
    });
  }

  cardDroppedCallback(card: Card) {
    // check if inside bounds of any stack
    for (const stackName in this.stacks) {
      const stack = this.stacks[stackName];
      const stackRect = stack.node.getBoundingClientRect();
      if (card.x >= stackRect.left && card.x <= stackRect.right && card.y >= stackRect.top && card.y <= stackRect.bottom) {
        this.sendToServer("move", {
          type: "move",
          username: this.username,
          from: "table",
          to: "stack",
          card: {
            value: {
              rank: card.cardData.rank,
              suit: card.cardData.suit,
            },
            x: card.x,
            y: card.y,
            isFaceDown: card.cardData.faceDown,
          },
          stack: stack.stackId,
        });
        return;
      }
    }

    // check if inside bounds of player hand
    for (const playerId in this.players) {
      const player = this.players[playerId];
      const playerRect = player.node.getBoundingClientRect();
      if (card.x >= playerRect.left && card.x <= playerRect.right && card.y >= playerRect.top && card.y <= playerRect.bottom) {
        this.sendToServer("move", {
          type: "move",
          username: this.username,
          playerId: playerId,
          from: "table",
          to: "hand",
          card: {
            value: {
              rank: card.cardData.rank,
              suit: card.cardData.suit,
            },
            x: card.x,
            y: card.y,
            isFaceDown: card.cardData.faceDown,
          },
          stack: null,
        });
        return;
      }
    }

    console.log('card dropped', card);
    this.sendToServer("move", {
      type: "move",
      username: this.username,
      from: "table",
      to: "table",
      card: {
        value: {
          rank: card.cardData.rank,
          suit: card.cardData.suit,
        },
        x: card.x,
        y: card.y,
        isFaceDown: card.cardData.faceDown,
      },
      stack: null,
    });
  }

  cardSelectedCallback(card: Card) {
    console.log('card selected', card);
  }

  updateStacks() {
    for (const stack of this.state.cardStacks) {
      const cardData: CardData[] = [];
      for (const cardItem of stack.stack) {
        const cardDataItem = new CardData();
        cardDataItem.rank = stringToRank(cardItem.value.rank);
        cardDataItem.suit = stringToSuit(cardItem.value.suit);
        cardDataItem.faceDown = cardItem.isFaceDown;
        cardData.push(cardDataItem);
      }
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
        this.domNode.append(s.node);
      }
      const s = this.stacks[stack.id];
      s.updateCards(cardData);
      s.setFaceDown(stack.isFaceDown);
    }
  }

  stackClick(stack: Stack) {
    console.log("stack clicked", stack);
    this.sendToServer("draw", {
      type: "draw",
      username: this.username,
      value: stack.stackId,
    });
  }

  handCardsReordered(player: Player, newOrder: CardData[]) {
    this.sendToServer("reorder-hand", {
      playerId: player.playerId,
      order: newOrder,
    });
  }

  cardMovedToTable(card: Card) {
    console.log("card moved to table", card);
    // const dx = dropEvent.node.getBoundingClientRect().x - mouseEvent.clientX;
    // const dy = dropEvent.node.getBoundingClientRect().y - mouseEvent.clientY;
    // card.x = mouseEvent.clientX + dx;
    // card.y = mouseEvent.clientY + dy;
    const moveData = {
      type: "move",
      username: this.username,
      from: "hand",
      to: "table",
      card: {
        value: {
          rank: card.cardData.rank,
          suit: card.cardData.suit,
        },
        x: card.x,
        y: card.y,
        isFaceDown: card.cardData.faceDown,
      },
      stack: null,
    };

    // const stack = positionToStack(mouseEvent.clientX, mouseEvent.clientY);
    // if (stack) {
    //   moveData.to = "stack";
    //   moveData.stack = stack.id;
    // }

    // const playerHand = positionToPlayerHand(mouseEvent.clientX, mouseEvent.clientY);
    this.sendToServer("move", moveData);

    // check if inside bounds of any stack
    for (const stackName in this.stacks) {
      const stack = this.stacks[stackName];
      const stackRect = stack.node.getBoundingClientRect();
      if (card.x >= stackRect.left && card.x <= stackRect.right && card.y >= stackRect.top && card.y <= stackRect.bottom) {
        this.sendToServer("move", {
          type: "move",
          username: this.username,
          from: "table",
          to: "stack",
          card: {
            value: {
              rank: card.cardData.rank,
              suit: card.cardData.suit,
            },
            x: card.x,
            y: card.y,
            isFaceDown: card.cardData.faceDown,
          },
          stack: stack.stackId,
        });
        return;
      }
    }
  }

  sendMessage(message: string) {
    this.sendToServer("chat", {
      message,
      username: this.username,
    });
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
    if (this.chat) {
      this.chat.renderMessages();
    }
  }
}
