import { Draggable } from "./util";

export enum Suit {
  Clubs = "Clubs",
  Hearts = "Hearts",
  Diamonds = "Diamonds",
  Spades = "Spades",
}

export enum Rank {
  A = "Ace",
  Two = "2",
  Three = "3",
  Four = "4",
  Five = "5",
  Six = "6",
  Seven = "7",
  Eight = "8",
  Nine = "9",
  Ten = "10",
  J = "Jack",
  Q = "Queen",
  K = "King",
}

export function stringToSuit(suit: string) {
  switch (suit) {
    case "Clubs":
      return Suit.Clubs;
    case "Hearts":
      return Suit.Hearts;
    case "Diamonds":
      return Suit.Diamonds;
    case "Spades":
      return Suit.Spades;
    default:
      throw new Error("Invalid suit: " + suit);
  }
}

export function stringToRank(rank: string) {
  switch (rank) {
    case "Ace":
      return Rank.A;
    case "2":
      return Rank.Two;
    case "3":
      return Rank.Three;
    case "4":
      return Rank.Four;
    case "5":
      return Rank.Five;
    case "6":
      return Rank.Six;
    case "7":
      return Rank.Seven;
    case "8":
      return Rank.Eight;
    case "9":
      return Rank.Nine;
    case "10":
      return Rank.Ten;
    case "Jack":
      return Rank.J;
    case "Queen":
      return Rank.Q;
    case "King":
      return Rank.K;
    default:
      throw new Error("Invalid rank: " + rank);
  }
}

export class CardData {
  public suit: Suit;
  public rank: Rank;
  public faceDown: boolean = true;
}

export default class Card extends Draggable {
  private domNode: any;
  private cardMovedCallback: (c: Card) => void;
  private cardDroppedCallback: (c: Card) => void;
  private cardSelectedCallback: (c: Card) => void;
  private data: CardData;
  public x: number = 0;
  public y: number = 0;

  constructor(
    cardData: CardData,
    x: number = 0,
    y: number = 0,
    cardMovedCallback?: (c: Card) => void,
    cardDroppedCallback?: (c: Card) => void,
    cardSelectedCallback?: (c: Card) => void,
  ) {
    super(
      document.createElement("div"),
      (x: number, y: number) => {
        this.cardMoved(x, y);
      },
      (x: number, y: number) => {
        this.cardDropped(x, y);
      },
    );
    this.cardMovedCallback = cardMovedCallback;
    this.cardDroppedCallback = cardDroppedCallback;
    this.cardSelectedCallback = cardSelectedCallback;
    this.data = cardData;
    this.x = x;
    this.y = y;
    this.domNode = this.dragElement;
    this.domNode.className = "card";
    this.domNode.draggable = true;
    this.domNode.style.left = this.x + "px";
    this.domNode.style.top = this.y + "px";
    const fileName = this.data.faceDown
      ? "back-blue.png"
      : `${this.data.rank.toString().substring(0, 1).toLowerCase()}${this.data.suit.toString().substring(0, 1).toLowerCase()}.png`;
    this.domNode.style.backgroundImage = `url(./static/poker/8bit/${fileName})`;
    if (this.cardSelectedCallback) {
      this.domNode.addEventListener("click", () => {
        this.cardSelectedCallback(this);
      });
    }
  }

  public reposition(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.domNode.style.left = `${this.x}px`;
    this.domNode.style.top = `${this.y}px`;
  }

  public setDraggable(draggable: boolean) {
    super.setEnabled(draggable);
  }

  public get node() {
    return this.domNode;
  }

  public get cardData(): CardData {
    return this.data;
  }

  public cardMoved(x: number, y: number) {
    // Visually already moved by Draggable
    this.x = x;
    this.y = y;
    if (this.cardMovedCallback) {
      this.cardMovedCallback(this);
    }
  }

  public cardDropped(x: number, y: number) {
    // Visually already moved by Draggable
    this.x = x;
    this.y = y;
    if (this.cardDroppedCallback) {
      this.cardDroppedCallback(this);
    }
  }

  public destroy() {
    if (this.cardSelectedCallback) {
      this.domNode.removeEventListener("click", () => {
        this.cardSelectedCallback(this);
      });
    }
    super.destroy();
  }

  public updateCardData(cardData: CardData) {
    this.data = cardData;
    const fileName = this.data.faceDown
      ? "back-blue.png"
      : `${this.data.rank.toString().substring(0, 1).toLowerCase()}${this.data.suit.toString().substring(0, 1).toLowerCase()}.png`;
    this.domNode.style.backgroundImage = `url(./static/poker/8bit/${fileName})`;
  }
}
