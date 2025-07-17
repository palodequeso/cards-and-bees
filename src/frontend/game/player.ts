import Card, { CardData } from "./card";

export default class Player {
  private domNode: HTMLDivElement | null = null;
  private isSelf: boolean = false;
  private player: any = null;
  private hand: CardData[] = [];
  private playerIndex: number = 0;
  private handSummary: HTMLDivElement | null = null;
  private handCards: Card[] = [];
  private cardMovedToTable: (c: Card) => void;
  private handCardsReordered: (p: Player, newOrder: CardData[]) => void;

  constructor(
    isSelf: boolean,
    player: any,
    hand: CardData[],
    playerIndex: number,
    cardMovedToTable: (c: Card) => void,
    handCardsReordered: () => void,
  ) {
    this.isSelf = isSelf;
    this.player = player;
    this.playerIndex = playerIndex;
    this.cardMovedToTable = cardMovedToTable;
    this.handCardsReordered = handCardsReordered;

    this.domNode = document.createElement("div");
    this.domNode.classList.add("player-container");
    this.domNode.style.position = "fixed";
    if (this.isSelf) {
      this.domNode.style.left = "300px";
      this.domNode.style.bottom = "10px";
      this.domNode.style.height = "132px";
    } else {
      this.domNode.style.left = `${24 + 200 * this.playerIndex}px`;
      this.domNode.style.top = "32px";
    }

    const playerName = document.createElement("div");
    playerName.classList.add("player-name");
    playerName.innerHTML = `Name: ${player.name}`;
    this.domNode.appendChild(playerName);

    this.updateHand(hand);
  }

  public updateHand(hand: CardData[]) {
    this.hand = hand;
    if (this.isSelf) {
      this.updateOwnHand();
    } else {
      if (!this.handSummary) {
        this.handSummary = document.createElement("div");
        this.handSummary.classList.add("hand-summary");
        this.domNode.appendChild(this.handSummary);
      }
      this.handSummary.innerHTML = `${hand.length} cards in hand.`;
    }
  }

  private updateOwnHand() {
    const indexesToRemove = [];
    let i = 0;
    for (const card of this.handCards) {
      // remove cards that are no longer in hand
      const foundInHand = this.hand.find(
        (c) => c.rank === card.cardData.rank && c.suit === card.cardData.suit,
      );
      if (!foundInHand) {
        card.node.remove();
        card.destroy();
        indexesToRemove.push(i);
      }
      i += 1;
    }
    for (const index of indexesToRemove) {
      this.handCards.splice(index, 1);
    }
    for (const cardData of this.hand) {
      if (
        this.handCards.findIndex(
          (c) =>
            c.cardData.rank === cardData.rank &&
            c.cardData.suit === cardData.suit,
        ) !== -1
      ) {
        continue;
      }
      const card = new Card(
        cardData,
        this.handCards.length * 20 + 4,
        24,
        this.cardDragged.bind(this),
        this.cardDropped.bind(this),
      );
      this.handCards.push(card);
      this.domNode.append(card.node);
    }
    this.lineupHandCards();
  }

  private lineupHandCards() {
    for (let i = 0; i < this.hand.length; i += 1) {
      const handCard = this.handCards.find(
        (c) =>
          c.cardData.rank === this.hand[i].rank &&
          c.cardData.suit === this.hand[i].suit
      );
      if (!handCard) {
        console.error("Card not found in handCards for lineup", this.hand[i]);
        continue;
      }
      handCard.node.style.left = `${i * 20 + 4}px`;
      handCard.node.style.top = "24px";
      handCard.node.style.zIndex = `${i + 1}`;
    }
  }

  public cardDragged(c: Card) {
    // TODO: Allow reordering cards in hand here
    const cardsOrderedByXPosition = this.handCards
      .slice() // create a copy to sort
      .sort((a, b) => {
        // Sort by x position
        const aRect = a.node.getBoundingClientRect();
        const bRect = b.node.getBoundingClientRect();
        const aX = aRect.left + aRect.width / 2; // center of the card
        const bX = bRect.left + bRect.width / 2; // center of the card
        if (aX < bX) {
          return -1; // a comes before b
        } else if (aX > bX) {
          return 1; // a comes after b
        } else {
          return 0; // a and b are equal
        }
      });
    // This is where you can implement logic to reorder the cards in the hand
    // but just leave a space for where the card is being dragged is supposed to be in the computed ordering
    for (let i = 0; i < cardsOrderedByXPosition.length; i++) {
      // skip the card that is being dragged
      if (
        cardsOrderedByXPosition[i].cardData.rank === c.cardData.rank &&
        cardsOrderedByXPosition[i].cardData.suit === c.cardData.suit
      ) {
        continue;
      }
      cardsOrderedByXPosition[i].node.style.left = `${i * 20 + 4}px`;
      cardsOrderedByXPosition[i].node.style.top = "24px";
    }
  }

  public cardDropped(c: Card) {
    const cardRect = c.node.getBoundingClientRect();
    const playerRect = this.domNode.getBoundingClientRect();
    // if card is mostly inside, then move to hand
    // else move to table
    const margin = 20;
    if (
      cardRect.left > playerRect.left - margin &&
      cardRect.right < playerRect.right + margin &&
      cardRect.top > playerRect.top - margin &&
      cardRect.bottom < playerRect.bottom + margin
    ) {
      console.log("Card Dropped in hand", c);
      // TODO: Reorder cards based on drop spot
      this.handCardsReordered(this, this.handCards
        .slice() // create a copy to sort
        .sort((a, b) => {
          // Sort by x position
          const aRect = a.node.getBoundingClientRect();
          const bRect = b.node.getBoundingClientRect();
          const aX = aRect.left + aRect.width / 2; // center of the card
          const bX = bRect.left + bRect.width / 2; // center of the card
          if (aX < bX) {
            return -1; // a comes before b
          } else if (aX > bX) {
            return 1; // a comes after b
          } else {
            return 0; // a and b are equal
          }
        }).map((c) => c.cardData)); // return the new order of cards in the hand
    } else {
      console.log("Card Dropped on table", c);
      this.cardMovedToTable(c);
      // TODO: Remove card from hand
      const cardIndex = this.hand.findIndex(
        (c) => c.rank === c.rank && c.suit === c.suit,
      );
      if (cardIndex === -1) {
        console.error("Oops!");
        return;
      }
      this.hand.splice(cardIndex, 1);
    }
    this.lineupHandCards();
  }

  public get node() {
    return this.domNode;
  }

  public get playerId() {
    return this.player.id; // Return the player ID for reference
  }
}
