import { CardData, Rank, Suit } from "../card";

export default class Solitaire {
  constructor(
    protected appNode: HTMLDivElement,
    protected type: string,
  ) {
    //
  }

  public get node() {
    return this.appNode;
  }

  public static generateDeck(
    exclusionFilter: (c: CardData) => boolean,
  ): CardData[] {
    const cards: CardData[] = [];
    for (const suit of Object.values(Suit)) {
      for (const rank of Object.values(Rank)) {
        const cardData = new CardData();
        cardData.suit = suit;
        cardData.rank = rank;
        if (!exclusionFilter(cardData)) {
          cards.push(cardData);
        }
      }
    }
    return cards;
  }
}
