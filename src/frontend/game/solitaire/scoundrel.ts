import Card, { Rank, Suit } from "../card";
import Stack from "../stack";
import Solitaire from "./solitaire";

export default class SocoundrelSolitaire extends Solitaire {
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

  constructor(htmlNode: HTMLDivElement) {
    super(htmlNode, "scoundrel");
    this.setupCards();
    this.setupControls();
    this.enterRoom();
  }

  public setupCards() {
    // draw cards is every card except A, K, Q, J of Diamonds and Hearts
    let drawCardData = Solitaire.generateDeck(
      (c) =>
        [Rank.A, Rank.K, Rank.Q, Rank.J].includes(c.rank) &&
        [Suit.Diamonds, Suit.Hearts].includes(c.suit),
    );
    // shuffle draw cards
    drawCardData = drawCardData.sort(() => Math.random() - 0.5);
    console.log(drawCardData);
    this.drawStack = new Stack("Draw", drawCardData, 100, 100, true, () => {});
    this.discardStack = new Stack("Discard", [], 200, 100, true, () => {});
    this.tableau = [];
    this.appNode.append(this.drawStack.node);
    this.appNode.append(this.discardStack.node);
  }

  public setupControls() {
    this.runButton = document.createElement("button");
    this.runButton.innerHTML = "Run";
    this.runButton.style.position = "absolute";
    this.runButton.style.left = "324px";
    this.runButton.style.top = "100px";
    this.runButton.disabled = true;
    this.runButton.addEventListener("click", this.run.bind(this));
    this.appNode.append(this.runButton);
    this.healthLabel = document.createElement("div");
    this.healthLabel.classList.add("health-label");
    this.healthLabel.style.position = "absolute";
    this.healthLabel.style.fontSize = "32px";
    this.healthLabel.style.left = "24px";
    this.healthLabel.style.top = "36px";
    this.healthLabel.style.color = "#661111";
    this.healthLabel.style.fontWeight = "bold";
    this.healthLabel.innerHTML = "Health: 20";
    this.appNode.append(this.healthLabel);
    this.fightWeaponButton = document.createElement("button");
    this.fightWeaponButton.innerHTML = "Fight with Weapon";
    this.fightWeaponButton.style.position = "absolute";
    this.fightWeaponButton.style.left = "324px";
    this.fightWeaponButton.style.top = "164px";
    this.fightWeaponButton.disabled = true;
    this.fightWeaponButton.addEventListener("click", () => {
      if (this.weapon) {
        this.fightEnemyWithWeapon();
      }
    });
    this.appNode.append(this.fightWeaponButton);
    this.fightFistsButton = document.createElement("button");
    this.fightFistsButton.innerHTML = "Fight with Fists";
    this.fightFistsButton.style.position = "absolute";
    this.fightFistsButton.style.left = "324px";
    this.fightFistsButton.style.top = "228px";
    this.fightFistsButton.disabled = true;
    this.fightFistsButton.addEventListener("click", () => {
      this.fightEnemyWithFists();
    });
    this.appNode.append(this.fightFistsButton);

    // some extra labels
    const roomLabel = document.createElement("div");
    roomLabel.classList.add("room-label");
    roomLabel.style.position = "absolute";
    roomLabel.style.fontSize = "20px";
    roomLabel.style.left = "12px";
    roomLabel.style.top = "316px";
    roomLabel.style.color = "#333";
    roomLabel.style.fontWeight = "bold";
    roomLabel.innerHTML = "Dungeon<br>Room";
    this.appNode.append(roomLabel);

    const weaponLabel = document.createElement("div");
    weaponLabel.classList.add("weapon-label");
    weaponLabel.style.position = "absolute";
    weaponLabel.style.fontSize = "20px";
    weaponLabel.style.left = "12px";
    weaponLabel.style.fontWeight = "bold";
    weaponLabel.style.top = "448px";
    weaponLabel.style.color = "#333";
    weaponLabel.innerHTML = "Weapon<br>Equipped";
    this.appNode.append(weaponLabel);

    const bugWarningLabel = document.createElement("div");
    bugWarningLabel.classList.add("bug-warning-label");
    bugWarningLabel.style.position = "absolute";
    bugWarningLabel.style.fontSize = "16px";
    bugWarningLabel.style.left = "200px";
    bugWarningLabel.style.top = "36px";
    bugWarningLabel.style.color = "#000000";
    bugWarningLabel.style.fontWeight = "bold";
    bugWarningLabel.innerHTML = "Note: This game is still in development. There may be bugs and incomplete features.<br>Specifically the room tableau cards can make ghosts it seems.";
    this.appNode.append(bugWarningLabel);
  }

  public enterRoom() {
    console.log("enter room");
    // draw up to 4 cards from draw stack
    const cardsToDraw = 4 - this.tableau.length;
    const drawnCardData = [];
    for (let i = 0; i < cardsToDraw; i += 1) {
      const cardData = this.drawStack.popTopCard();
      if (cardData) {
        drawnCardData.push(cardData);
      }
    }
    console.log("room cards", drawnCardData);

    for (const cardData of drawnCardData) {
      cardData.faceDown = false;
      const card = new Card(
        cardData,
        this.tableau.length * 100 + 100,
        300,
        null,
        null,
        this.selectFromTableau.bind(this),
      );
      card.setDraggable(false);
      this.tableau.push(card);
      this.appNode.append(card.node);
    }

    this.runButton.disabled = this.ranLastRoom;
    this.ranLastRoom = false;
    this.usedHealthThisRoom = false;
    console.log('run button disabled', this.runButton.disabled);
  }

  public run() {
    console.log("run");
    // run takes the tableau if it hasn't been touched, and shuffles it and placese it at the end of the draw stack
    if (this.tableau.length === 0 || this.ranLastRoom) {
      return;
    }

    this.ranLastRoom = true;
    // shuffle tableau
    this.tableau = this.tableau.sort(() => Math.random() - 0.5);
    // place tableau at the end of the draw stack
    for (const card of this.tableau) {
      card.cardData.faceDown = true;
      this.drawStack.placeCardBelow(card.cardData);
    }
    // clear tableau
    for (const card of this.tableau) {
      card.node.remove();
      card.destroy();
    }
    this.tableau = [];
    this.enterRoom();
  }

  public rankToStrength(rank: Rank): number {
    switch (rank) {
      case Rank.A:
        return 14;
      case Rank.J:
        return 11;
      case Rank.Q:
        return 12;
      case Rank.K:
        return 13;
      case Rank.Ten:
        return 10;
      case Rank.Nine:
        return 9;
      case Rank.Eight:
        return 8;
      case Rank.Seven:
        return 7;
      case Rank.Six:
        return 6;
      case Rank.Five:
        return 5;
      case Rank.Four:
        return 4;
      case Rank.Three:
        return 3;
      case Rank.Two:
        return 2;
      default:
        return parseInt(rank, 10);
    }
  }

  public getWeaponStrength() {
    if (!this.weapon) {
      return 0;
    }
    let str = this.rankToStrength(this.weapon.cardData.rank);
    if (this.weaponFoes.length > 0) {
      str = Math.min(
        str,
        this.rankToStrength(
          this.weaponFoes[this.weaponFoes.length - 1].cardData.rank,
        ),
      );
    }
    return str;
  }

  public selectFromTableau(card: Card) {
    console.log("card selected", card);
    this.runButton.disabled = true;
    switch (card.cardData.suit) {
      case Suit.Diamonds:
        this.equipWeapon(card);
        this.removeCardFromTableauAndDestroy(card);
        if (this.tableau.length === 1) {
          this.enterRoom();
        }
        break;
      case Suit.Hearts:
        if (!this.usedHealthThisRoom) {
          this.usedHealthThisRoom = true;
          this.modifyHealth(this.rankToStrength(card.cardData.rank));
        }
        const heartCardData = card.cardData;
        this.removeCardFromTableauAndDestroy(card);
        this.discardStack.pushCard(heartCardData);
        if (this.tableau.length === 1) {
          this.enterRoom();
        }
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
    const index = this.tableau.findIndex(
      (c) =>
        c.cardData.rank === card.cardData.rank &&
        c.cardData.suit === card.cardData.suit,
    );
    if (index !== -1) {
      this.tableau.splice(index, 1);
      if (removeNode) {
        card.node.remove();
      }
    }
    return index;
  }

  public removeCardFromTableauAndDestroy(card: Card) {
    // remove card from tableau
    this.removeCardFromTableau(card, true);
    card.destroy();
  }

  public equipWeapon(card: Card) {
    if (!this.weapon) {
      this.weapon = new Card(card.cardData, 100, 424, null, null, null);
      this.appNode.append(this.weapon.node);
    } else {
      // TODO: Discard Weapon and Enemies stacked on weapon
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
    // allow choice of fists or weapon
    // if weapon, check to see if enemy strength is lower than last enemy fought with weapon, if not, must use fists
    let canUseWeapon = false;
    if (this.weapon) {
      if (this.weaponFoes.length === 0) {
        canUseWeapon = true;
      } else {
        const lastWeaponFoeRank = this.rankToStrength(
          this.weaponFoes[this.weaponFoes.length - 1].cardData.rank);
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
    const damage = Math.min(
      weaponStrength - this.rankToStrength(this.fightingEnemy.cardData.rank),
      0,
    );
    console.log("weapon strength", weaponStrength);
    console.log("damage to player", damage);
    this.modifyHealth(damage);
    this.weaponFoes.push(this.fightingEnemy);
    this.positionWeaponFoes();
    // It does need to be removed from the tableau though and then readded here.
    this.removeCardFromTableau(this.fightingEnemy, false);
    if (this.tableau.length === 1) {
      this.enterRoom();
    }
  }

  public fightEnemyWithFists() {
    this.fightFistsButton!.disabled = true;
    this.fightWeaponButton!.disabled = true;
    this.modifyHealth(-this.rankToStrength(this.fightingEnemy.cardData.rank));
    const fistCardData = this.fightingEnemy.cardData;
    this.removeCardFromTableauAndDestroy(this.fightingEnemy);
    this.discardStack.pushCard(fistCardData);
    if (this.tableau.length === 1) {
      this.enterRoom();
    }
  }

  public positionWeaponFoes() {
    let i = 0;
    for (const weaponFoe of this.weaponFoes) {
      weaponFoe.reposition(i * 30 + 200, 424);
      weaponFoe.node.style.zIndex = `${i + 1}`; // Ensure stacking order
      i += 1;
    }
  }

  public modifyHealth(amount: number) {
    console.log("modify health", amount);
    this.health += amount;
    if (this.health > 20) {
      this.health = 20;
    }
    if (this.healthLabel) {
      this.healthLabel.innerHTML = `Health: ${this.health}`;
    }
    if (this.health <= 0) {
      this.showGameOver();
    }
  }

  public showGameOver() {
    const gameOver = document.createElement("div");
    gameOver.classList.add("game-over");
    gameOver.style.fontSize = "48px";
    gameOver.style.color = "red";
    gameOver.style.position = "absolute";
    gameOver.style.left = "50%";
    gameOver.style.top = "50%";
    gameOver.innerHTML = "Game Over";
    this.appNode.append(gameOver);
  }
}
