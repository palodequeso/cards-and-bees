import Card, { CardData, Rank, Suit } from "../card";
import Stack from "../stack";
import Solitaire from "./solitaire";

export default class KlondikeSolitaire extends Solitaire {
  static FOUNDATION_SUITS = [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades];

  private stockStack: Stack;
  private foundations: Stack[] = [];
  private foundationCounts = [0, 0, 0, 0];
  private tableau: Card[][] = [];
  private drawCount: number;
  private moves: number = 0;
  private movesLabel: HTMLDivElement | null = null;

  // Selection state (click-to-move)
  private selectedCard: Card | null = null;
  private selectedPile: number | null = null;
  private selectedPileType: 'tableau' | 'waste' | null = null;
  private selectedCardIndex: number | null = null;

  // Drag stack state — trailing cards attached to the dragged card
  private dragTrailingCards: Card[] = [];
  private dragAttached = false;

  // Waste
  private wasteCardData: CardData[] = [];
  private wasteCards: Card[] = [];
  private pileColumns: HTMLDivElement[] = [];
  private wasteArea: HTMLDivElement;
  private topRow: HTMLDivElement;
  private tableauRow: HTMLDivElement;

  constructor(htmlNode: HTMLDivElement, drawCount: number = 1, onBack?: () => void, onNewGame?: () => void) {
    super(htmlNode, `klondike-draw-${drawCount}`, onBack, onNewGame);
    this.drawCount = drawCount;
    this.buildLayout();
    this.setupGame();
  }

  // ── Layout ──────────────────────────────────────────────
  private buildLayout() {
    this.appNode.style.display = "flex";
    this.appNode.style.flexDirection = "column";

    const topBar = document.createElement("div");
    topBar.className = "sol-top-bar";
    this.appNode.appendChild(topBar);

    const backBtn = document.createElement("button");
    backBtn.className = "sol-btn";
    backBtn.textContent = "← Back";
    backBtn.addEventListener("click", () => this.onBack());
    topBar.appendChild(backBtn);

    const newGameBtn = document.createElement("button");
    newGameBtn.className = "sol-btn";
    newGameBtn.textContent = "New Game";
    newGameBtn.addEventListener("click", () => this.newGame());
    topBar.appendChild(newGameBtn);

    this.movesLabel = document.createElement("div");
    this.movesLabel.className = "sol-moves";
    this.movesLabel.textContent = "Moves: 0";
    topBar.appendChild(this.movesLabel);

    const title = document.createElement("div");
    title.className = "sol-title";
    title.textContent = `Klondike (Draw ${this.drawCount})`;
    topBar.appendChild(title);

    this.topRow = document.createElement("div");
    this.topRow.className = "sol-top-row";
    this.appNode.appendChild(this.topRow);

    this.tableauRow = document.createElement("div");
    this.tableauRow.className = "sol-tableau-row";
    this.appNode.appendChild(this.tableauRow);

    for (let i = 0; i < 7; i++) {
      const col = document.createElement("div");
      col.className = "sol-pile-col";
      col.addEventListener("click", (e) => {
        if (e.target === col) this.emptyPileClicked(i);
      });
      this.pileColumns.push(col);
      this.tableauRow.appendChild(col);
    }
  }

  // ── Game setup ──────────────────────────────────────────
  private setupGame() {
    let deckData = Solitaire.generateDeck(() => false);
    deckData = deckData.sort(() => Math.random() - 0.5);

    this.topRow.innerHTML = "";
    for (const col of this.pileColumns) col.innerHTML = "";

    // Deal tableau (7 piles, 1..7 cards each, top face up)
    let deckIdx = 0;
    for (let pile = 0; pile < 7; pile++) {
      this.tableau[pile] = [];
      for (let ci = 0; ci <= pile; ci++) {
        const cd = deckData[deckIdx++];
        cd.faceDown = ci !== pile;
        const card = this.makeTableauCard(cd, pile);
        card.node.style.marginTop = ci > 0 ? "-100px" : "0";
        this.tableau[pile].push(card);
        this.pileColumns[pile].appendChild(card.node);
      }
    }

    // Stock + Waste group (left side)
    const stockWaste = document.createElement("div");
    stockWaste.className = "sol-stock-waste";
    this.topRow.appendChild(stockWaste);

    const stockCards = deckData.slice(deckIdx);
    this.stockStack = new Stack("Stock", stockCards, 0, 0, true, () => this.drawFromStock());
    stockWaste.appendChild(this.stockStack.node);

    this.wasteArea = document.createElement("div");
    this.wasteArea.className = "sol-waste-area";
    stockWaste.appendChild(this.wasteArea);

    // Foundations group (right side, pushed by margin-left: auto)
    const foundationsGroup = document.createElement("div");
    foundationsGroup.className = "sol-foundations";
    this.topRow.appendChild(foundationsGroup);

    for (let i = 0; i < 4; i++) {
      const foundation = new Stack(KlondikeSolitaire.FOUNDATION_SUITS[i], [], 0, 0, false, () => this.foundationClicked(i));
      this.foundations.push(foundation);
      foundationsGroup.appendChild(foundation.node);
    }
  }

  private makeTableauCard(cd: CardData, pileIndex: number): Card {
    const card = new Card(cd, 0, 0, (c) => this.tableauCardDragged(c, pileIndex), (c) => this.tableauCardDropped(c, pileIndex), (c) => this.tableauCardClicked(c, pileIndex));
    card.node.style.position = "relative";
    card.setDraggable(!cd.faceDown);
    return card;
  }

  // On first drag-move, attach all cards below the dragged card as children
  // and highlight valid drop targets
  private tableauCardDragged(card: Card, pileIndex: number) {
    if (this.dragAttached) return;
    this.dragAttached = true;
    const pile = this.tableau[pileIndex];
    const cardIndex = pile.findIndex(c => c === card);
    if (cardIndex === -1) return;

    // Gather trailing cards (everything after the dragged card)
    this.dragTrailingCards = [];
    for (let i = cardIndex + 1; i < pile.length; i++) {
      const trailing = pile[i];
      this.dragTrailingCards.push(trailing);
      // Position absolutely within the dragged card, stacking down 40px each
      const offset = (i - cardIndex) * 40;
      trailing.node.style.position = "absolute";
      trailing.node.style.left = "0";
      trailing.node.style.top = offset + "px";
      trailing.node.style.margin = "0";
      trailing.node.style.zIndex = `${i - cardIndex}`;
      trailing.node.style.pointerEvents = "none";
      card.node.appendChild(trailing.node);
    }
    // Show valid drop targets while dragging
    this.highlightDragTargets(card, pileIndex, cardIndex === pile.length - 1);
  }

  private wasteCardDragged(card: Card) {
    this.highlightDragTargets(card, -1, true);
  }

  private highlightDragTargets(card: Card, excludePile: number, isSingleCard: boolean) {
    this.clearHighlights();
    for (let i = 0; i < 7; i++) {
      if (i === excludePile) continue;
      if (this.canMoveToTableau(card, i)) {
        this.pileColumns[i].classList.add("sol-valid-target");
      }
    }
    if (isSingleCard) {
      for (let i = 0; i < 4; i++) {
        if (this.canMoveToFoundation(card, i)) {
          this.foundations[i].node.classList.add("sol-valid-target");
        }
      }
    }
  }

  // ── New game ────────────────────────────────────────────
  private newGame() {
    for (const pile of this.tableau) {
      for (const card of pile) {
        card.node.remove();
        card.destroy();
      }
    }
    this.tableau = [];
    this.clearWasteDisplay();
    this.wasteCardData = [];
    this.stockStack.node.remove();
    for (const f of this.foundations)
      f.node.remove();
    this.foundations = [];
    this.foundationCounts = [0, 0, 0, 0];
    this.moves = 0;
    this.updateMovesLabel();
    this.deselectCard();
    this.setupGame();
  }

  // ── Stock / Waste ───────────────────────────────────────
  private drawFromStock() {
    if (this.selectedCard)
      this.deselectCard();

    const drawn: CardData[] = [];
    for (let i = 0; i < this.drawCount; i++) {
      const cd = this.stockStack.popTopCard();
      if (cd) {
        cd.faceDown = false;
        drawn.push(cd);
      } else
        break;
    }

    if (drawn.length > 0) {
      this.clearWasteDisplay();
      for (const cd of drawn)
        this.wasteCardData.push(cd);
      this.renderWasteCards();
      this.moves++;
      this.updateMovesLabel();
    } else {
      // Recycle waste → stock
      this.clearWasteDisplay();
      while (this.wasteCardData.length > 0) {
        const cd = this.wasteCardData.pop();
        cd.faceDown = true;
        this.stockStack.pushCard(cd);
      }
    }
  }

  private renderWasteCards() {
    const visibleCount = Math.min(this.drawCount, this.wasteCardData.length);
    const startIndex = Math.max(0, this.wasteCardData.length - visibleCount);

    for (let i = startIndex; i < this.wasteCardData.length; i++) {
      const cd = this.wasteCardData[i];
      const isTop = i === this.wasteCardData.length - 1;
      const card = new Card(cd, 0, 0, isTop ? (c) => this.wasteCardDragged(c) : null, isTop ? (c) => this.wasteCardDropped(c) : null, isTop ? (c) => this.wasteCardClicked(c) : null);
      card.node.style.position = "relative";
      card.node.style.marginLeft = (i > startIndex) ? "-68px" : "0";
      card.setDraggable(isTop);
      this.wasteCards.push(card);
      this.wasteArea.appendChild(card.node);
    }
  }

  private clearWasteDisplay() {
    for (const c of this.wasteCards) {
      c.node.remove();
      c.destroy();
    }
    this.wasteCards = [];
  }

  // ── Click handlers ──────────────────────────────────────
  private wasteCardClicked(card: Card) {
    // Only top waste card is clickable (enforced by only binding it)
    if (this.selectedCard === card) {
      this.deselectCard();
      return;
    }
    if (this.selectedCard) {
      // Already have a selection — deselect
      this.deselectCard();
      return;
    }
    this.selectCard(card, null, 'waste', null);
  }

  private tableauCardClicked(card: Card, pileIndex: number) {
    const pile = this.tableau[pileIndex];
    const cardIndex = pile.findIndex(c => c === card);
    if (card.cardData.faceDown)
      return;
    // Clicking selected card deselects
    if (this.selectedCard === card) {
      this.deselectCard();
      return;
    }
    // If we have a selection, try to move there
    if (this.selectedCard) {
      if (this.canMoveToTableau(this.selectedCard, pileIndex)) {
        this.moveToTableau(pileIndex);
      } else {
        this.deselectCard();
      }
      return;
    }
    this.selectCard(card, pileIndex, 'tableau', cardIndex);
  }

  private emptyPileClicked(pileIndex: number) {
    if (!this.selectedCard) return;
    if (this.tableau[pileIndex].length === 0 && this.canMoveToTableau(this.selectedCard, pileIndex)) {
      this.moveToTableau(pileIndex);
    } else {
      this.deselectCard();
    }
  }

  private foundationClicked(foundationIndex: number) {
    if (!this.selectedCard) return;
    if (this.canMoveToFoundation(this.selectedCard, foundationIndex)) {
      this.moveToFoundation(foundationIndex);
    } else {
      this.deselectCard();
    }
  }

  // ── Drop handlers (drag-and-drop) ───────────────────────
  private detachTrailingCards() {
    for (const tc of this.dragTrailingCards) {
      tc.node.style.pointerEvents = "";
      if (tc.node.parentElement) tc.node.parentElement.removeChild(tc.node);
    }
    this.dragTrailingCards = [];
    this.dragAttached = false;
    this.clearHighlights();
  }

  private tableauCardDropped(card: Card, sourcePileIndex: number) {
    this.detachTrailingCards();
    const sourcePile = this.tableau[sourcePileIndex];
    const cardIndex = sourcePile.findIndex(c => c === card);
    if (cardIndex === -1) {
      this.repositionTableau();
      return;
    }
    // Set selection state so moveToTableau/moveToFoundation can use it
    this.selectedCard = card;
    this.selectedPile = sourcePileIndex;
    this.selectedPileType = 'tableau';
    this.selectedCardIndex = cardIndex;

    const cr = card.node.getBoundingClientRect();
    const cx = (cr.left + cr.right) / 2;
    const cy = (cr.top + cr.bottom) / 2;

    // Check foundations (single card at end of pile only)
    if (cardIndex === sourcePile.length - 1) {
      for (let i = 0; i < 4; i++) {
        const fr = this.foundations[i].node.getBoundingClientRect();
        if (cx >= fr.left && cx <= fr.right && cy >= fr.top && cy <= fr.bottom) {
          if (this.canMoveToFoundation(card, i)) {
            this.moveToFoundation(i);
            return;
          }
        }
      }
    }

    // Check tableau piles
    for (let i = 0; i < 7; i++) {
      if (i === sourcePileIndex) continue;
      const cr2 = this.pileColumns[i].getBoundingClientRect();
      if (cx >= cr2.left && cx <= cr2.right && cy >= cr2.top - 40 && cy <= cr2.bottom + 40) {
        if (this.canMoveToTableau(card, i)) {
          this.moveToTableau(i);
          return;
        }
      }
    }

    // No valid target — snap back
    this.deselectCard();
    this.repositionTableau();
  }

  private wasteCardDropped(card: Card) {
    this.clearHighlights();
    this.selectedCard = card;
    this.selectedPileType = 'waste';

    const cr = card.node.getBoundingClientRect();
    const cx = (cr.left + cr.right) / 2;
    const cy = (cr.top + cr.bottom) / 2;

    // Check foundations
    for (let i = 0; i < 4; i++) {
      const fr = this.foundations[i].node.getBoundingClientRect();
      if (cx >= fr.left && cx <= fr.right && cy >= fr.top && cy <= fr.bottom) {
        if (this.canMoveToFoundation(card, i)) {
          this.moveToFoundation(i);
          return;
        }
      }
    }
    // Check tableau piles
    for (let i = 0; i < 7; i++) {
      const cr2 = this.pileColumns[i].getBoundingClientRect();
      if (cx >= cr2.left && cx <= cr2.right && cy >= cr2.top - 40 && cy <= cr2.bottom + 40) {
        if (this.canMoveToTableau(card, i)) {
          this.moveToTableau(i);
          return;
        }
      }
    }
    // No valid target — return waste card to waste area
    this.deselectCard();
    this.clearWasteDisplay();
    this.renderWasteCards();
  }

  // ── Selection & highlighting ────────────────────────────
  private selectCard(card: Card, pile: number | null, type: 'tableau' | 'waste', cardIndex: number | null) {
    this.deselectCard();
    this.selectedCard = card;
    this.selectedPile = pile;
    this.selectedPileType = type;
    this.selectedCardIndex = cardIndex;
    card.node.style.outline = "2px solid #c9a84c";
    card.node.style.outlineOffset = "-2px";
    this.highlightValidTargets(card);
  }

  private deselectCard() {
    if (this.selectedCard) {
      this.selectedCard.node.style.outline = "";
      this.selectedCard.node.style.outlineOffset = "";
    }
    this.selectedCard = null;
    this.selectedPile = null;
    this.selectedPileType = null;
    this.selectedCardIndex = null;
    this.clearHighlights();
  }

  private highlightValidTargets(card: Card) {
    // Highlight tableau piles that can accept this card
    for (let i = 0; i < 7; i++) {
      if (this.selectedPileType === 'tableau' && this.selectedPile === i) continue;
      if (this.canMoveToTableau(card, i)) {
        this.pileColumns[i].classList.add("sol-valid-target");
      }
    }
    // Highlight foundations (only for single cards — top of pile or waste)
    const isSingleCard = this.selectedPileType === 'waste' ||
      (this.selectedPileType === 'tableau' && this.selectedCardIndex === this.tableau[this.selectedPile].length - 1);
    if (isSingleCard) {
      for (let i = 0; i < 4; i++) {
        if (this.canMoveToFoundation(card, i)) {
          this.foundations[i].node.classList.add("sol-valid-target");
        }
      }
    }
  }

  private clearHighlights() {
    for (const col of this.pileColumns) col.classList.remove("sol-valid-target");
    for (const f of this.foundations) f.node.classList.remove("sol-valid-target");
  }

  // ── Move validation ─────────────────────────────────────
  private canMoveToTableau(card: Card, targetPile: number): boolean {
    const pile = this.tableau[targetPile];
    if (pile.length === 0)
      return this.rankValue(card.cardData.rank) === 13;
    const topCard = pile[pile.length - 1];
    if (topCard.cardData.faceDown)
      return false;
    if (this.rankValue(topCard.cardData.rank) !== this.rankValue(card.cardData.rank) + 1)
      return false;
    return this.cardColor(topCard.cardData.suit) !== this.cardColor(card.cardData.suit);
  }

  private canMoveToFoundation(card: Card, foundationIndex: number): boolean {
    const suit = KlondikeSolitaire.FOUNDATION_SUITS[foundationIndex];
    if (card.cardData.suit !== suit)
      return false;
    const count = this.foundationCounts[foundationIndex];
    if (count === 0)
      return this.rankValue(card.cardData.rank) === 1;
    return this.rankValue(card.cardData.rank) === count + 1;
  }

  // ── Move execution ──────────────────────────────────────
  private moveToTableau(targetPile: number) {
    if (!this.selectedCard) return;

    if (this.selectedPileType === 'tableau' && this.selectedPile !== null) {
      const sourcePile = this.tableau[this.selectedPile];
      const cardsToMove = sourcePile.splice(this.selectedCardIndex);
      this.tableau[targetPile].push(...cardsToMove);
      this.flipTopCard(sourcePile);
    } else if (this.selectedPileType === 'waste') {
      this.wasteCardData.pop();
      this.clearWasteDisplay();
      this.renderWasteCards();

      const cd = this.selectedCard.cardData;
      // Destroy the dragged waste card
      this.selectedCard.node.remove();
      this.selectedCard.destroy();
      this.selectedCard = null;
      const card = this.makeTableauCard(cd, targetPile);
      this.tableau[targetPile].push(card);
      this.pileColumns[targetPile].appendChild(card.node);
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
      // Can only move last card to foundation
      if (this.selectedCardIndex !== sourcePile.length - 1) {
        this.deselectCard();
        return;
      }
      const card = sourcePile.pop();
      card.node.remove();
      card.destroy();
      this.foundations[foundationIndex].pushCard(card.cardData);
      this.foundationCounts[foundationIndex]++;
      this.flipTopCard(sourcePile);
    } else if (this.selectedPileType === 'waste') {
      const cd = this.wasteCardData.pop();
      this.foundations[foundationIndex].pushCard(cd);
      this.foundationCounts[foundationIndex]++;
      this.clearWasteDisplay();
      this.renderWasteCards();
    }

    this.deselectCard();
    this.repositionTableau();
    this.moves++;
    this.updateMovesLabel();
    this.checkWin();
  }

  private flipTopCard(pile: Card[]) {
    if (pile.length === 0)
      return;
    const top = pile[pile.length - 1];
    if (top.cardData.faceDown) {
      top.cardData.faceDown = false;
      top.updateCardData(top.cardData);
      top.setDraggable(true);
    }
  }

  // ── Reposition tableau cards into their columns ─────────
  private repositionTableau() {
    for (let pi = 0; pi < 7; pi++) {
      const pile = this.tableau[pi];
      const col = this.pileColumns[pi];
      for (let ci = 0; ci < pile.length; ci++) {
        const card = pile[ci];
        card.node.style.position = "relative";
        card.node.style.left = "0";
        card.node.style.top = "0";
        card.node.style.marginTop = ci > 0 ? "-100px" : "0";
        card.node.style.zIndex = `${ci}`;
        // Always re-append to ensure correct DOM order
        col.appendChild(card.node);
      }
    }
  }

  // ── Utilities ───────────────────────────────────────────
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
    if (this.movesLabel)
      this.movesLabel.textContent = `Moves: ${this.moves}`;
  }

  private checkWin() {
    if (this.foundationCounts.every(c => c === 13))
      this.showWin();
  }

  private showWin() {
    const overlay = document.createElement("div");
    overlay.className = "sol-overlay";
    const container = document.createElement("div");
    container.style.cssText = "display:flex;flex-direction:column;align-items:center;";
    const msg = document.createElement("div");
    msg.className = "sol-overlay-msg sol-win";
    msg.innerHTML = `You Win!<br><span style="font-size:18px;">Moves: ${this.moves}</span>`;
    container.appendChild(msg);
    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:12px;margin-top:20px;";
    const newGameBtn = document.createElement("button");
    newGameBtn.className = "sol-btn";
    newGameBtn.textContent = "New Game";
    newGameBtn.addEventListener("click", () => this.newGame());
    const backBtn = document.createElement("button");
    backBtn.className = "sol-btn";
    backBtn.textContent = "Back";
    backBtn.addEventListener("click", () => this.onBack());
    btnRow.append(newGameBtn, backBtn);
    container.appendChild(btnRow);
    overlay.appendChild(container);
    this.appNode.appendChild(overlay);
  }
}
