import Card, { CardData } from "./card";

export default class Stack {
  private domNode: HTMLDivElement;
  private cards: CardData[];
  private id: string;
  private faceDown: boolean = true;
  private topCard: Card | null = null;
  private clickHandler: (stack: Stack) => void;
  private countBadge: HTMLDivElement;
  private cardWrap: HTMLDivElement;
  private labelEl: HTMLDivElement;

  constructor(
    id: string,
    cards: CardData[],
    x: number,
    y: number,
    faceDown: boolean = true,
    clickHandler: (stack: Stack) => void,
  ) {
    this.id = id;
    this.cards = cards;
    this.faceDown = faceDown;
    this.clickHandler = clickHandler;

    this.domNode = document.createElement("div");
    this.domNode.classList.add("card-stack");
    this.domNode.addEventListener("click", () => this.clickHandler(this));

    this.countBadge = document.createElement("div");
    this.countBadge.classList.add("stack-count");
    this.domNode.appendChild(this.countBadge);

    this.cardWrap = document.createElement("div");
    this.cardWrap.classList.add("stack-card-wrap");
    this.domNode.appendChild(this.cardWrap);

    this.labelEl = document.createElement("div");
    this.labelEl.classList.add("stack-label");
    this.labelEl.textContent = id;
    this.domNode.appendChild(this.labelEl);

    this.updateCards(cards);
  }

  public updateCards(cards: CardData[]) {
    this.cards = cards;
    this.countBadge.textContent = String(cards.length);
    this.domNode.classList.toggle("has-cards", cards.length > 0);
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
      if (this.topCard) {
        this.topCard.node.remove();
        this.topCard = null;
      }
      return;
    }
    const renderData = new CardData();
    renderData.rank = topCardData.rank;
    renderData.suit = topCardData.suit;
    renderData.faceDown = this.faceDown;
    if (!this.topCard) {
      this.topCard = new Card(renderData, 0, 0);
      this.topCard.setDraggable(false);
      this.cardWrap.appendChild(this.topCard.node);
    } else {
      this.topCard.updateCardData(renderData);
    }
  }

  public get node() { return this.domNode; }
  public get stackId() { return this.id; }

  public popTopCard(): CardData | null {
    if (this.cards.length === 0)
      return null;
    const top = this.cards.pop();
    this.updateCards(this.cards);
    return top;
  }

  public pushCard(card: CardData) {
    this.cards.push(card);
    this.updateCards(this.cards);
  }

  public placeCardBelow(card: CardData) {
    this.cards.unshift(card);
    this.updateCards(this.cards);
  }
}
