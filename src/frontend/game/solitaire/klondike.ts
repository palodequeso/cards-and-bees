import Card, { CardData, Rank, Suit } from "../card";
import Stack from "../stack";
import Solitaire from "./solitaire";

export default class KlondikeSolitaire extends Solitaire {
  private stockStack: Stack;
  private wasteStack: Stack;
  private wasteCardData: CardData[] = [];  // Track waste card data
  private foundations: Stack[] = [];
  private tableau: Card[][] = [];
  private drawCount: number;
  private moves: number = 0;
  private movesLabel: HTMLDivElement | null = null;
  private newGameButton: HTMLButtonElement | null = null;
  private selectedCard: Card | null = null;
  private selectedPile: number | null = null;
  private selectedPileType: 'tableau' | 'waste' | null = null;
  private selectedCardIndex: number | null = null;
  private wasteCards: Card[] = [];  // Visual waste cards

  constructor(htmlNode: HTMLDivElement, drawCount: number = 1) {
    super(htmlNode, `klondike-draw-${drawCount}`);
    this.drawCount = drawCount;
    this.setupGame();
    this.setupControls();
  }

  private setupGame() {
    // Generate and shuffle full deck
    let deckData = Solitaire.generateDeck(() => false);
    deckData = deckData.sort(() => Math.random() - 0.5);

    // Deal tableau (7 piles with 1-7 cards)
    let cardIndex = 0;
    for (let pile = 0; pile < 7; pile++) {
      this.tableau[pile] = [];
      for (let card = 0; card <= pile; card++) {
        const cardData = deckData[cardIndex++];
        cardData.faceDown = card !== pile; // Only top card face up
        const cardObj = new Card(
          cardData,
          100 + pile * 100,
          250 + card * 30,
          null,
          (c: Card) => this.cardDropped(c),
          (c: Card) => this.cardSelected(c, pile, 'tableau')
        );
        this.tableau[pile].push(cardObj);
        this.appNode.append(cardObj.node);
      }
    }

    // Remaining cards go to stock
    const stockCards = deckData.slice(cardIndex);
    this.stockStack = new Stack(
      "Stock",
      stockCards,
      100,
      100,
      true,
      () => this.drawFromStock()
    );
    this.appNode.append(this.stockStack.node);

    // Create empty waste pile placeholder (just shows label, we render cards manually)
    this.wasteStack = new Stack(
      "Waste",
      [],  // Keep empty so Stack doesn't render cards
      220,
      100,
      false,
      () => this.wasteClicked()
    );
    // Hide the stack's auto-rendered card area
    this.wasteStack.node.style.backgroundColor = "transparent";
    this.appNode.append(this.wasteStack.node);

    // Create 4 foundation piles
    const foundationSuits = [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades];
    for (let i = 0; i < 4; i++) {
      const foundation = new Stack(
        foundationSuits[i],
        [],
        400 + i * 100,
        100,
        false,
        () => this.foundationClicked(i)
      );
      this.foundations.push(foundation);
      this.appNode.append(foundation.node);
    }
  }

  private setupControls() {
    this.newGameButton = document.createElement("button");
    this.newGameButton.innerHTML = "New Game";
    this.newGameButton.style.position = "absolute";
    this.newGameButton.style.left = "24px";
    this.newGameButton.style.top = "24px";
    this.newGameButton.addEventListener("click", () => this.newGame());
    this.appNode.append(this.newGameButton);

    this.movesLabel = document.createElement("div");
    this.movesLabel.style.position = "absolute";
    this.movesLabel.style.fontSize = "24px";
    this.movesLabel.style.left = "150px";
    this.movesLabel.style.top = "30px";
    this.movesLabel.style.color = "#FFFFFF";
    this.movesLabel.style.fontWeight = "bold";
    this.movesLabel.innerHTML = `Moves: ${this.moves}`;
    this.appNode.append(this.movesLabel);

    const titleLabel = document.createElement("div");
    titleLabel.style.position = "absolute";
    titleLabel.style.fontSize = "28px";
    titleLabel.style.left = "400px";
    titleLabel.style.top = "28px";
    titleLabel.style.color = "#FFFFFF";
    titleLabel.style.fontWeight = "bold";
    titleLabel.innerHTML = `Klondike (Draw ${this.drawCount})`;
    this.appNode.append(titleLabel);
  }

  private newGame() {
    // Clear existing game
    for (const pile of this.tableau) {
      for (const card of pile) {
        card.node.remove();
        card.destroy();
      }
    }
    this.tableau = [];

    for (const card of this.wasteCards) {
      card.node.remove();
      card.destroy();
    }
    this.wasteCards = [];
    this.wasteCardData = [];

    this.stockStack.node.remove();
    this.wasteStack.node.remove();
    for (const foundation of this.foundations) {
      foundation.node.remove();
    }
    this.foundations = [];

    this.moves = 0;
    this.movesLabel.innerHTML = `Moves: ${this.moves}`;
    this.selectedCard = null;
    this.selectedPile = null;
    this.selectedPileType = null;
    this.selectedCardIndex = null;

    // Start new game
    this.setupGame();
  }

  private drawFromStock() {
    if (this.selectedCard) {
      this.deselectCard();
    }

    const cardsDrawn: CardData[] = [];
    for (let i = 0; i < this.drawCount; i++) {
      const card = this.stockStack.popTopCard();
      if (card) {
        card.faceDown = false;
        cardsDrawn.push(card);
      } else {
        break;
      }
    }

    if (cardsDrawn.length > 0) {
      // Clear old waste display
      for (const card of this.wasteCards) {
        card.node.remove();
        card.destroy();
      }
      this.wasteCards = [];

      // Add drawn cards to waste data
      for (const cardData of cardsDrawn) {
        this.wasteCardData.push(cardData);
      }

      // Render the visible waste cards
      this.renderWasteCards();

      this.moves++;
      this.updateMovesLabel();
    } else {
      // Recycle waste back to stock
      for (const card of this.wasteCards) {
        card.node.remove();
        card.destroy();
      }
      this.wasteCards = [];

      // Move all waste data back to stock (in reverse)
      while (this.wasteCardData.length > 0) {
        const cardData = this.wasteCardData.pop();
        cardData.faceDown = true;
        this.stockStack.pushCard(cardData);
      }
    }
  }

  private renderWasteCards() {
    // Render only the visible waste cards
    const visibleCount = Math.min(this.drawCount, this.wasteCardData.length);
    const startIndex = Math.max(0, this.wasteCardData.length - visibleCount);
    
    for (let i = startIndex; i < this.wasteCardData.length; i++) {
      const cardData = this.wasteCardData[i];
      const visualIndex = i - startIndex;
      const card = new Card(
        cardData,
        220 + visualIndex * 20,
        100,
        null,
        (c: Card) => this.wasteCardDropped(c),
        (c: Card) => this.wasteCardSelected(c)
      );
      this.wasteCards.push(card);
      this.appNode.append(card.node);
    }
  }

  private wasteClicked() {
    if (this.wasteCards.length > 0) {
      this.wasteCardSelected(this.wasteCards[this.wasteCards.length - 1]);
    }
  }

  private wasteCardSelected(card: Card) {
    // Can only select top waste card
    if (card !== this.wasteCards[this.wasteCards.length - 1]) {
      return;
    }

    // Deselect if clicking same card
    if (this.selectedCard === card) {
      this.deselectCard();
      return;
    }

    // If we have another card selected, ignore
    if (this.selectedCard) {
      this.deselectCard();
      return;
    }

    // Select this card
    this.selectedCard = card;
    this.selectedPileType = 'waste';
    card.node.style.border = "3px solid yellow";
  }

  private wasteCardDropped(card: Card) {
    // Same logic as tableau cards
    this.cardDropped(card);
  }

  private cardSelected(card: Card, pileIndex: number, pileType: 'tableau' | 'waste') {
    if (pileType === 'tableau') {
      const pile = this.tableau[pileIndex];
      const cardIndex = pile.findIndex(c => c === card);
      
      // Can only select face-up cards
      if (card.cardData.faceDown) {
        return;
      }

      // Deselect if clicking the same card
      if (this.selectedCard === card) {
        this.deselectCard();
        return;
      }

      // If we have a selected card, try to move it to this pile
      if (this.selectedCard) {
        if (this.canMoveToTableau(this.selectedCard, pileIndex)) {
          this.moveToTableau(pileIndex);
        } else {
          this.deselectCard();
        }
        return;
      }

      // Select this card
      this.selectedCard = card;
      this.selectedPile = pileIndex;
      this.selectedPileType = pileType;
      this.selectedCardIndex = cardIndex;
      card.node.style.border = "3px solid yellow";
    }
  }

  private deselectCard() {
    if (this.selectedCard) {
      this.selectedCard.node.style.border = "";
      this.selectedCard = null;
      this.selectedPile = null;
      this.selectedPileType = null;
      this.selectedCardIndex = null;
    }
  }

  private cardDropped(card: Card) {
    // Find where the card was dropped
    const cardX = card.x;
    const cardY = card.y;

    // Check tableau piles
    for (let i = 0; i < 7; i++) {
      const pileX = 100 + i * 100;
      const pileY = 250;
      if (cardX >= pileX - 40 && cardX <= pileX + 40 && cardY >= pileY - 40) {
        if (this.canMoveToTableau(card, i)) {
          this.selectedCard = card;
          this.moveToTableau(i);
          return;
        }
      }
    }

    // Check foundations
    for (let i = 0; i < 4; i++) {
      const foundX = 400 + i * 100;
      const foundY = 100;
      if (cardX >= foundX - 40 && cardX <= foundX + 80 && cardY >= foundY - 40 && cardY <= foundY + 130) {
        if (this.canMoveToFoundation(card, i)) {
          this.selectedCard = card;
          this.moveToFoundation(i);
          return;
        }
      }
    }

    // Return to original position
    this.repositionTableau();
  }

  private canMoveToTableau(card: Card, targetPile: number): boolean {
    const pile = this.tableau[targetPile];
    
    if (pile.length === 0) {
      // Empty pile can only accept King
      return this.rankValue(card.cardData.rank) === 13;
    }

    const topCard = pile[pile.length - 1];
    
    // Must be descending rank
    if (this.rankValue(topCard.cardData.rank) !== this.rankValue(card.cardData.rank) + 1) {
      return false;
    }

    // Must be alternating colors
    return this.cardColor(topCard.cardData.suit) !== this.cardColor(card.cardData.suit);
  }

  private canMoveToFoundation(card: Card, foundationIndex: number): boolean {
    const foundation = this.foundations[foundationIndex];
    const foundationSuit = [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades][foundationIndex];

    // Must match suit
    if (card.cardData.suit !== foundationSuit) {
      return false;
    }

    // Check if it's the next card in sequence
    const topCardData = foundation.popTopCard();
    if (!topCardData) {
      // Empty foundation needs Ace
      const result = this.rankValue(card.cardData.rank) === 1;
      return result;
    }

    foundation.pushCard(topCardData);
    return this.rankValue(card.cardData.rank) === this.rankValue(topCardData.rank) + 1;
  }

  private moveToTableau(targetPile: number) {
    if (!this.selectedCard) return;

    if (this.selectedPileType === 'tableau' && this.selectedPile !== null) {
      const sourcePile = this.tableau[this.selectedPile];
      const cardIndex = this.selectedCardIndex;

      // Move all cards from this card to the end
      const cardsToMove = sourcePile.splice(cardIndex);
      this.tableau[targetPile].push(...cardsToMove);

      // Flip top card of source pile if needed
      if (sourcePile.length > 0) {
        const topCard = sourcePile[sourcePile.length - 1];
        if (topCard.cardData.faceDown) {
          topCard.cardData.faceDown = false;
          topCard.updateCardData(topCard.cardData);
        }
      }
    } else if (this.selectedPileType === 'waste') {
      // Move from waste to tableau
      const cardData = this.wasteCardData.pop();  // Remove from data
      
      // Clear and re-render waste display
      for (const card of this.wasteCards) {
        card.node.remove();
        card.destroy();
      }
      this.wasteCards = [];
      this.renderWasteCards();
      
      const card = new Card(
        cardData,
        100 + targetPile * 100,
        250 + this.tableau[targetPile].length * 30,
        null,
        (c: Card) => this.cardDropped(c),
        (c: Card) => this.cardSelected(c, targetPile, 'tableau')
      );
      this.tableau[targetPile].push(card);
      this.appNode.append(card.node);
    }

    this.deselectCard();
    this.repositionTableau();
    this.moves++;
    this.updateMovesLabel();
    this.checkWin();
  }

  private moveToFoundation(foundationIndex: number) {
    if (!this.selectedCard) return;

    if (this.selectedPileType === 'tableau' && this.selectedPile !== null) {
      const sourcePile = this.tableau[this.selectedPile];
      const cardIndex = this.selectedCardIndex;

      // Can only move single cards to foundation
      if (cardIndex !== sourcePile.length - 1) {
        this.deselectCard();
        this.repositionTableau();
        return;
      }

      const card = sourcePile.pop();
      card.node.remove();
      card.destroy();
      this.foundations[foundationIndex].pushCard(card.cardData);

      // Flip top card if needed
      if (sourcePile.length > 0) {
        const topCard = sourcePile[sourcePile.length - 1];
        if (topCard.cardData.faceDown) {
          topCard.cardData.faceDown = false;
          topCard.updateCardData(topCard.cardData);
        }
      }
    } else if (this.selectedPileType === 'waste') {
      // Move from waste to foundation
      const cardData = this.wasteCardData.pop();  // Remove from data
      this.foundations[foundationIndex].pushCard(cardData);
      
      // Clear and re-render waste display
      for (const card of this.wasteCards) {
        card.node.remove();
        card.destroy();
      }
      this.wasteCards = [];
      this.renderWasteCards();
    }

    this.deselectCard();
    this.repositionTableau();
    this.moves++;
    this.updateMovesLabel();
    this.checkWin();
  }

  private foundationClicked(foundationIndex: number) {
    if (!this.selectedCard) return;

    if (this.canMoveToFoundation(this.selectedCard, foundationIndex)) {
      this.moveToFoundation(foundationIndex);
    } else {
      this.deselectCard();
    }
  }

  private repositionTableau() {
    for (let pileIndex = 0; pileIndex < 7; pileIndex++) {
      const pile = this.tableau[pileIndex];
      for (let cardIndex = 0; cardIndex < pile.length; cardIndex++) {
        const card = pile[cardIndex];
        card.reposition(
          100 + pileIndex * 100,
          250 + cardIndex * 30
        );
        card.node.style.zIndex = `${cardIndex}`;
      }
    }
  }

  private rankValue(rank: Rank): number {
    switch (rank) {
      case Rank.A: return 1;
      case Rank.Two: return 2;
      case Rank.Three: return 3;
      case Rank.Four: return 4;
      case Rank.Five: return 5;
      case Rank.Six: return 6;
      case Rank.Seven: return 7;
      case Rank.Eight: return 8;
      case Rank.Nine: return 9;
      case Rank.Ten: return 10;
      case Rank.J: return 11;
      case Rank.Q: return 12;
      case Rank.K: return 13;
      default: return 0;
    }
  }

  private cardColor(suit: Suit): 'red' | 'black' {
    return suit === Suit.Hearts || suit === Suit.Diamonds ? 'red' : 'black';
  }

  private updateMovesLabel() {
    if (this.movesLabel) {
      this.movesLabel.innerHTML = `Moves: ${this.moves}`;
    }
  }

  private checkWin() {
    // Check if all foundations have 13 cards
    const allComplete = this.foundations.every(f => {
      let count = 0;
      let card = f.popTopCard();
      while (card) {
        count++;
        const nextCard = f.popTopCard();
        if (nextCard) {
          f.pushCard(card);
          card = nextCard;
        } else {
          f.pushCard(card);
          break;
        }
      }
      return count === 13;
    });

    if (allComplete) {
      this.showWin();
    }
  }

  private showWin() {
    const winMessage = document.createElement("div");
    winMessage.style.position = "absolute";
    winMessage.style.left = "50%";
    winMessage.style.top = "50%";
    winMessage.style.transform = "translate(-50%, -50%)";
    winMessage.style.fontSize = "48px";
    winMessage.style.color = "#FFD700";
    winMessage.style.fontWeight = "bold";
    winMessage.style.textShadow = "2px 2px 4px rgba(0,0,0,0.8)";
    winMessage.style.zIndex = "1000";
    winMessage.innerHTML = `🎉 You Win! 🎉<br><span style="font-size: 24px;">Moves: ${this.moves}</span>`;
    this.appNode.append(winMessage);
  }
}
