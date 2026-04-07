import Card, { CardData, Rank, Suit } from "../card";
import Stack from "../stack";
import Solitaire from "./solitaire";

export default class ScoundrelSolitaire extends Solitaire {
  private drawStack: Stack;
  private discardStack: Stack;
  private tableau: Card[];
  private healthLabel: HTMLDivElement | null = null;
  private health: number = 20;
  private weapon: Card | null = null;
  private weaponFoes: Card[] = [];
  private usedHealthThisRoom: boolean = false;
  private ranLastRoom: boolean = false;
  private runButton: HTMLButtonElement | null = null;
  private fightingEnemy: Card | null = null;
  private fightWeaponButton: HTMLButtonElement | null = null;
  private fightFistsButton: HTMLButtonElement | null = null;
  private roomArea: HTMLDivElement | null = null;
  private weaponArea: HTMLDivElement | null = null;
  private stacksContainer: HTMLDivElement | null = null;
  private roomCardArea: HTMLDivElement | null = null;
  private weaponCardArea: HTMLDivElement | null = null;

  constructor(htmlNode: HTMLDivElement, onBack?: () => void, onNewGame?: () => void) {
    super(htmlNode, "scoundrel", onBack, onNewGame);
    this.buildLayout();
    this.setupCards();
    this.enterRoom();
  }

  private buildLayout() {
    this.appNode.style.display = "flex";
    this.appNode.style.flexDirection = "column";
    this.appNode.style.alignItems = "center";

    // ── Top bar ──
    const topBar = document.createElement("div");
    topBar.className = "sol-top-bar";
    const backBtn = document.createElement("button");
    backBtn.className = "sol-btn";
    backBtn.textContent = "← Back";
    backBtn.addEventListener("click", () => this.onBack());
    topBar.appendChild(backBtn);
    this.appNode.appendChild(topBar);

    const newGameBtn = document.createElement("button");
    newGameBtn.className = "sol-btn";
    newGameBtn.textContent = "New Game";
    newGameBtn.addEventListener("click", () => this.onNewGame());
    topBar.appendChild(newGameBtn);

    this.healthLabel = document.createElement("div");
    this.healthLabel.className = "sol-health";
    this.healthLabel.textContent = "♥ 20";
    topBar.appendChild(this.healthLabel);

    const title = document.createElement("div");
    title.className = "sol-title";
    title.textContent = "Scoundrel";
    topBar.appendChild(title);

    const warning = document.createElement("div");
    warning.className = "sol-warning";
    warning.textContent = "Beta — may have bugs";
    topBar.appendChild(warning);

    // ── Centered game column ──
    const gameCol = document.createElement("div");
    gameCol.className = "scoundrel-layout";
    this.appNode.appendChild(gameCol);

    // Row 1: Dungeon Deck (draw + discard) side by side with Dungeon Room
    const topSection = document.createElement("div");
    topSection.className = "scoundrel-top";
    gameCol.appendChild(topSection);

    // Deck side
    const stacksCol = document.createElement("div");
    stacksCol.className = "scoundrel-deck";
    topSection.appendChild(stacksCol);
    const stacksLabel = document.createElement("div");
    stacksLabel.className = "sol-section-label";
    stacksLabel.textContent = "Dungeon Deck";
    stacksCol.appendChild(stacksLabel);
    this.stacksContainer = stacksCol;

    // Room side
    this.roomArea = document.createElement("div");
    this.roomArea.className = "scoundrel-room";
    topSection.appendChild(this.roomArea);
    const roomLabel = document.createElement("div");
    roomLabel.className = "sol-section-label";
    roomLabel.textContent = "Dungeon Room";
    this.roomArea.appendChild(roomLabel);
    this.roomCardArea = document.createElement("div");
    this.roomCardArea.className = "sol-room-cards";
    this.roomArea.appendChild(this.roomCardArea);

    // Row 2: Actions (horizontal button row)
    const actionsRow = document.createElement("div");
    actionsRow.className = "scoundrel-actions";
    gameCol.appendChild(actionsRow);

    this.runButton = document.createElement("button");
    this.runButton.className = "sol-btn";
    this.runButton.textContent = "🏃 Run";
    this.runButton.disabled = true;
    this.runButton.addEventListener("click", this.run.bind(this));
    actionsRow.appendChild(this.runButton);

    this.fightWeaponButton = document.createElement("button");
    this.fightWeaponButton.className = "sol-btn";
    this.fightWeaponButton.textContent = "🗡️ Fight w/ Weapon";
    this.fightWeaponButton.disabled = true;
    this.fightWeaponButton.addEventListener("click", () => {
      if (this.weapon)
        this.fightEnemyWithWeapon();
    });
    actionsRow.appendChild(this.fightWeaponButton);

    this.fightFistsButton = document.createElement("button");
    this.fightFistsButton.className = "sol-btn";
    this.fightFistsButton.textContent = "👊 Fight w/ Fists";
    this.fightFistsButton.disabled = true;
    this.fightFistsButton.addEventListener("click", () => {
      this.fightEnemyWithFists();
    });
    actionsRow.appendChild(this.fightFistsButton);

    // Row 3: Weapon area
    this.weaponArea = document.createElement("div");
    this.weaponArea.className = "scoundrel-weapon";
    gameCol.appendChild(this.weaponArea);

    const weaponLabel = document.createElement("div");
    weaponLabel.className = "sol-section-label";
    weaponLabel.textContent = "Equipped Weapon";
    this.weaponArea.appendChild(weaponLabel);
    this.weaponCardArea = document.createElement("div");
    this.weaponCardArea.className = "sol-weapon-cards";
    this.weaponArea.appendChild(this.weaponCardArea);
  }

  public setupCards() {
    let drawCardData = Solitaire.generateDeck(
      (c) =>
        [Rank.A, Rank.K, Rank.Q, Rank.J].includes(c.rank) &&
        [Suit.Diamonds, Suit.Hearts].includes(c.suit),
    );
    drawCardData = drawCardData.sort(() => Math.random() - 0.5);
    this.drawStack = new Stack("Draw", drawCardData, 0, 0, true, () => {});
    this.discardStack = new Stack("Discard", [], 0, 0, true, () => {});
    this.tableau = [];
    const stackRow = document.createElement("div");
    stackRow.className = "sol-stack-row";
    stackRow.appendChild(this.drawStack.node);
    stackRow.appendChild(this.discardStack.node);
    this.stacksContainer.appendChild(stackRow);
  }

  public enterRoom() {
    const cardsToDraw = 4 - this.tableau.length;
    const drawnCardData = [];
    for (let i = 0; i < cardsToDraw; i += 1) {
      const cardData = this.drawStack.popTopCard();
      if (cardData)
        drawnCardData.push(cardData);
    }

    for (const cardData of drawnCardData) {
      cardData.faceDown = false;
      const card = new Card(cardData, 0, 0, null, null, this.selectFromTableau.bind(this));
      card.setDraggable(false);
      card.node.style.position = "relative";
      this.tableau.push(card);
      const wrap = document.createElement("div");
      wrap.className = "sol-room-card-wrap";
      wrap.appendChild(card.node);
      const label = document.createElement("div");
      label.className = "sol-room-card-label";
      label.textContent = this.cardLabel(cardData);
      wrap.appendChild(label);
      this.roomCardArea.appendChild(wrap);
    }

    this.runButton.disabled = this.ranLastRoom;
    this.ranLastRoom = false;
    this.usedHealthThisRoom = false;
  }

  public run() {
    if (this.tableau.length === 0 || this.ranLastRoom)
      return;
    this.ranLastRoom = true;
    this.tableau = this.tableau.sort(() => Math.random() - 0.5);
    for (const card of this.tableau) {
      card.cardData.faceDown = true;
      this.drawStack.placeCardBelow(card.cardData);
    }
    for (const card of this.tableau) {
      const wrap = card.node.parentElement;
      if (wrap && wrap.classList.contains("sol-room-card-wrap")) {
        wrap.remove();
      } else {
        card.node.remove();
      }
      card.destroy();
    }
    this.tableau = [];
    this.enterRoom();
  }

  private cardLabel(cd: CardData): string {
    const str = this.rankToStrength(cd.rank);
    switch (cd.suit) {
      case Suit.Diamonds: return `🗡️ ${str}`;
      case Suit.Hearts: return `❤️ +${str}`;
      case Suit.Spades: return `💀 ${str}`;
      case Suit.Clubs: return `💀 ${str}`;
      default: return "";
    }
  }

  public rankToStrength(rank: Rank): number {
    switch (rank) {
      case Rank.A: return 14;
      case Rank.J: return 11;
      case Rank.Q: return 12;
      case Rank.K: return 13;
      case Rank.Ten: return 10;
      case Rank.Nine: return 9;
      case Rank.Eight: return 8;
      case Rank.Seven: return 7;
      case Rank.Six: return 6;
      case Rank.Five: return 5;
      case Rank.Four: return 4;
      case Rank.Three: return 3;
      case Rank.Two: return 2;
      default: return parseInt(rank, 10);
    }
  }

  public getWeaponStrength() {
    if (!this.weapon)
      return 0;
    let str = this.rankToStrength(this.weapon.cardData.rank);
    if (this.weaponFoes.length > 0) {
      str = Math.min(str, this.rankToStrength(this.weaponFoes[this.weaponFoes.length - 1].cardData.rank));
    }
    return str;
  }

  public selectFromTableau(card: Card) {
    this.runButton.disabled = true;
    switch (card.cardData.suit) {
      case Suit.Diamonds:
        this.equipWeapon(card);
        this.removeCardFromTableauAndDestroy(card);
        if (this.tableau.length === 1)
          this.enterRoom();
        break;
      case Suit.Hearts:
        if (!this.usedHealthThisRoom) {
          this.usedHealthThisRoom = true;
          this.modifyHealth(this.rankToStrength(card.cardData.rank));
        }
        const heartCardData = card.cardData;
        this.removeCardFromTableauAndDestroy(card);
        this.discardStack.pushCard(heartCardData);
        if (this.tableau.length === 1)
          this.enterRoom();
        break;
      case Suit.Spades:
        this.fightEnemy(card);
        break;
      case Suit.Clubs:
        this.fightEnemy(card);
        break;
    }
  }

  public removeCardFromTableau(card: Card, removeNode: boolean = true): number {
    const index = this.tableau.findIndex((c) => c.cardData.rank === card.cardData.rank && c.cardData.suit === card.cardData.suit);
    if (index !== -1) {
      this.tableau.splice(index, 1);
      if (removeNode) {
        // Remove the wrapper div if card is inside one
        const wrap = card.node.parentElement;
        if (wrap && wrap.classList.contains("sol-room-card-wrap")) {
          wrap.remove();
        } else {
          card.node.remove();
        }
      }
    }
    return index;
  }

  public removeCardFromTableauAndDestroy(card: Card) {
    this.removeCardFromTableau(card, true);
    card.destroy();
  }

  public equipWeapon(card: Card) {
    if (!this.weapon) {
      this.weapon = new Card(card.cardData, 0, 0, null, null, null);
      this.weapon.setDraggable(false);
      this.weapon.node.style.position = "relative";
      this.weaponCardArea.appendChild(this.weapon.node);
    } else {
      this.weapon.updateCardData(card.cardData);
      for (const weaponFoe of this.weaponFoes) {
        weaponFoe.node.remove();
        this.discardCard(weaponFoe);
      }
      this.weaponFoes = [];
    }
  }

  public discardCard(card: Card) {
    this.discardStack.pushCard(card.cardData);
  }

  public fightEnemy(card: Card) {
    let canUseWeapon = false;
    if (this.weapon) {
      if (this.weaponFoes.length === 0) {
        canUseWeapon = true;
      } else {
        const lastWeaponFoeRank = this.rankToStrength(this.weaponFoes[this.weaponFoes.length - 1].cardData.rank);
        canUseWeapon = lastWeaponFoeRank > this.rankToStrength(card.cardData.rank);
      }
    }
    this.fightWeaponButton!.disabled = !canUseWeapon;
    this.fightFistsButton!.disabled = false;
    this.fightingEnemy = card;
  }

  public fightEnemyWithWeapon() {
    this.fightFistsButton!.disabled = true;
    this.fightWeaponButton!.disabled = true;
    const weaponStrength = this.getWeaponStrength();
    const damage = Math.min(weaponStrength - this.rankToStrength(this.fightingEnemy.cardData.rank), 0);
    this.modifyHealth(damage);
    this.weaponFoes.push(this.fightingEnemy);
    // Re-parent card to weapon area
    this.fightingEnemy.node.style.position = "relative";
    this.fightingEnemy.setDraggable(false);
    this.weaponCardArea.appendChild(this.fightingEnemy.node);
    this.removeCardFromTableau(this.fightingEnemy, false);
    if (this.tableau.length === 1)
      this.enterRoom();
  }

  public fightEnemyWithFists() {
    this.fightFistsButton!.disabled = true;
    this.fightWeaponButton!.disabled = true;
    this.modifyHealth(-this.rankToStrength(this.fightingEnemy.cardData.rank));
    const fistCardData = this.fightingEnemy.cardData;
    this.removeCardFromTableauAndDestroy(this.fightingEnemy);
    this.discardStack.pushCard(fistCardData);
    if (this.tableau.length === 1)
      this.enterRoom();
  }

  public modifyHealth(amount: number) {
    this.health += amount;
    if (this.health > 20)
      this.health = 20;
    if (this.healthLabel) {
      this.healthLabel.textContent = `♥ ${this.health}`;
      this.healthLabel.style.color = this.health <= 5 ? "#cc3333" : this.health <= 10 ? "#c9a84c" : "#77bb77";
    }
    if (this.health <= 0)
      this.showGameOver();
  }

  public showGameOver() {
    const overlay = document.createElement("div");
    overlay.className = "sol-overlay";
    const msg = document.createElement("div");
    msg.className = "sol-overlay-msg sol-game-over";
    msg.textContent = "Game Over";
    overlay.appendChild(msg);
    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:12px;margin-top:20px;";
    const newGameBtn = document.createElement("button");
    newGameBtn.className = "sol-btn";
    newGameBtn.textContent = "New Game";
    newGameBtn.addEventListener("click", () => this.onNewGame());
    const backBtn = document.createElement("button");
    backBtn.className = "sol-btn";
    backBtn.textContent = "Back";
    backBtn.addEventListener("click", () => this.onBack());
    btnRow.append(newGameBtn, backBtn);
    const container = document.createElement("div");
    container.style.cssText = "display:flex;flex-direction:column;align-items:center;";
    container.append(msg, btnRow);
    overlay.innerHTML = "";
    overlay.appendChild(container);
    this.appNode.appendChild(overlay);
  }
}
