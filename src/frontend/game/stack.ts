import Card, { CardData } from "./card";

export default class Stack {
  private domNode: HTMLDivElement | null = null;
  private cards: CardData[];
  private id: string;
  private x: number = 0;
  private y: number = 0;
  private faceDown: boolean = true;
  private label: HTMLDivElement | null = null;
  private topCard: Card | null = null;
  private clickHandler: (stack: Stack) => void;

  constructor(
    id: string,
    cards: CardData[],
    x: number = 0,
    y: number = 0,
    faceDown: boolean = true,
    clickHandler: (stack: Stack) => void,
  ) {
    this.id = id;
    this.cards = cards;
    this.x = x;
    this.y = y;
    this.faceDown = faceDown;
    this.clickHandler = clickHandler;
    this.domNode = document.createElement("div");
    this.domNode.addEventListener("click", this.clickHandler.bind(this, this));
    this.domNode.classList.add("card-stack");
    this.domNode.style.left = `${this.x}px`;
    this.domNode.style.top = `${this.y}px`;
    this.label = document.createElement("div");
    this.label.classList.add("stack-label");
    this.label.innerHTML = this.id + " " + this.cards.length;
    this.domNode.appendChild(this.label);
    this.renderTopCard();
  }

  public updateCards(cards: CardData[]) {
    this.cards = cards;
    this.label.innerHTML = this.id + " " + this.cards.length;
    this.renderTopCard();
  }

  public setFaceDown(faceDown: boolean) {
    this.faceDown = faceDown;
    this.renderTopCard();
  }

  public renderTopCard() {
    const topCardData =
      this.cards.length > 0 ? this.cards[this.cards.length - 1] : null;
    if (!topCardData) {
      this.topCard?.node.remove();
      this.topCard = null;
      return;
    }
    if (!this.topCard) {
      this.topCard = new Card(topCardData, 4, 24);
      this.topCard.setDraggable(false);
      this.domNode?.appendChild(this.topCard.node);
    } else {
      this.topCard.updateCardData(topCardData);
    }
  }

  public get node() {
    return this.domNode;
  }

  public get stackId() {
    return this.id;
  }

  public popTopCard(): CardData | null {
    if (this.cards.length === 0) {
      return null;
    }
    const topCard = this.cards.pop();
    this.renderTopCard();
    this.label.innerHTML = this.id + " " + this.cards.length;
    return topCard;
  }

  public pushCard(card: CardData) {
    this.cards.push(card);
    this.renderTopCard();
    this.label.innerHTML = this.id + " " + this.cards.length;
  }

  public placeCardBelow(card: CardData) {
    this.cards.unshift(card);
    this.renderTopCard();
    this.label.innerHTML = this.id + " " + this.cards.length;
  }
}
