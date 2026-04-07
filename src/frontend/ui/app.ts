import Bee from "./bee";
import SettingsPanel from "./settings";
import { Client } from "colyseus.js";
import Game from "../game/game";
import ScoundrelSolitaire from "../game/solitaire/scoundrel";
import KlondikeSolitaire from "../game/solitaire/klondike";
import { Preferences } from "../game/preferences";

function buildWSUrl() {
  const host = window.document.location.host.replace(/:.*/, "");
  return location.protocol.replace("http", "ws") + "//" + host + (location.port ? ":" + location.port : "");
}

const gameStateRoomName = "game_room";

export default class App {
  private appNode: HTMLDivElement;
  private sections: { [key: string]: HTMLDivElement } = {};
  private client: Client | null = null;
  private username: string | null = null;
  private rooms: any[] = [];
  private room: any = null;
  private game: Game;
  private settings: SettingsPanel;

  constructor(appNode: HTMLDivElement) {
    this.appNode = appNode;
    this.settings = new SettingsPanel();
    this.createBees();
    this.setupSections();
    this.bindButtons();
    this.connectToServer();
    this.applyTableBackground();
    Preferences.onChange(() => this.applyTableBackground());
  }

  setupSections() {
    this.sections["main-menu"] = this.appNode.querySelector("#main-menu") as HTMLDivElement;
    this.sections["solitaire-menu"] = this.appNode.querySelector("#solitaire-menu") as HTMLDivElement;
    this.sections["game"] = this.appNode.querySelector("#game") as HTMLDivElement;
    this.sections["rooms"] = this.appNode.querySelector("#rooms") as HTMLDivElement;
  }

  showSection(sectionName: string) {
    for (const section in this.sections) {
      if (section !== sectionName) {
        this.sections[section].style.display = "none";
      } else {
        this.sections[section].style.display = section === "game" ? "flex" : "block";
      }
    }
  }

  bindButtons() {
    (this.appNode.querySelector("#main-menu-solitaire") as HTMLButtonElement).onclick = () => this.showSection("solitaire-menu");
    (this.appNode.querySelector("#main-menu-play-together") as HTMLButtonElement).onclick = this.playTogether.bind(this);
    (this.appNode.querySelector("#create-room") as HTMLButtonElement).onclick = this.createRoom.bind(this);
    (this.appNode.querySelector("#back-from-rooms") as HTMLButtonElement).onclick = () => this.showSection("main-menu");
    (this.appNode.querySelector("#back-from-solitaire") as HTMLButtonElement).onclick = () => this.showSection("main-menu");
    (this.appNode.querySelector("#refresh-rooms") as HTMLButtonElement).onclick = () => this.getAvailableRooms();
    (this.appNode.querySelector("#open-settings") as HTMLButtonElement).onclick = () => this.settings.open();
    this.appNode.querySelectorAll(".solitaire-game").forEach((button) => {
      (button as HTMLButtonElement).onclick = (e) => {
        const gameType = (e.target as HTMLButtonElement).dataset.gamename;
        this.startSolitaireGame(gameType);
      };
    });
  }

  applyTableBackground() {
    const gameDiv = this.appNode.querySelector("#game") as HTMLDivElement;
    const bgValue = Preferences.tableBackgroundValue;
    gameDiv.style.background = bgValue;
    // Also update pixelated rendering preference
    const style = Preferences.isPixelated ? "pixelated" : "auto";
    document.documentElement.style.setProperty("--card-rendering", style);
  }

  playTogether() {
    const username = (this.appNode.querySelector("#main-menu-username-input") as HTMLInputElement).value.trim();
    if (!username) return;
    this.username = username;
    this.showSection("rooms");
    this.getAvailableRooms();
  }

  startSolitaireGame(gameType: string) {
    this.showSection("game");
    const gameDiv = this.appNode.querySelector("#game") as HTMLDivElement;
    gameDiv.innerHTML = "";
    const goBack = () => {
      gameDiv.innerHTML = "";
      this.showSection("solitaire-menu");
    };
    const restart = () => this.startSolitaireGame(gameType);

    switch (gameType) {
      case "scoundrel":
        new ScoundrelSolitaire(gameDiv, goBack, restart);
        break;
      case "klondike":
        new KlondikeSolitaire(gameDiv, 1, goBack, restart);
        break;
      case "klondike-draw-3":
        new KlondikeSolitaire(gameDiv, 3, goBack, restart);
        break;
    }
  }

  createBees() {
    const beesContainer = this.appNode.querySelector("#bees");
    for (let i = 0; i < 4; i++) {
      beesContainer.appendChild(new Bee().node);
    }
  }

  connectToServer() {
    this.client = new Client(buildWSUrl());
  }

  async createRoom() {
    try {
      const roomName = (this.appNode.querySelector("#room-name-input") as HTMLInputElement).value.trim();
      this.room = await this.client.joinOrCreate(gameStateRoomName, {
        username: this.username,
        name: roomName || "Room",
        private: false,
        game: "freePlayPoker",
      });
      this.enterGame();
    } catch (e) {
      console.error(e);
    }
  }

  enterGame() {
    this.showSection("game");
    this.game = new Game(this.appNode.querySelector("#game") as HTMLDivElement, this.room, this.client as any, this.username);
  }

  async joinRoom(room) {
    try {
      this.room = await this.client.join(room.name, { username: this.username });
      this.enterGame();
    } catch (e) {
      console.error(e);
    }
  }

  async getAvailableRooms() {
    const grid = this.appNode.querySelector("#rooms-grid") as HTMLDivElement;
    grid.innerHTML = '<div class="room-card-empty">Loading…</div>';

    this.rooms = await this.client.getAvailableRooms(gameStateRoomName);
    grid.innerHTML = "";
    if (this.rooms.length === 0) {
      grid.innerHTML = '<div class="room-card-empty">No rooms yet — create one!</div>';
      return;
    }

    for (const room of this.rooms) {
      const card = document.createElement("div");
      card.className = "room-card";
      const nameDiv = document.createElement("div");
      nameDiv.className = "room-card-name";
      nameDiv.textContent = room.metadata?.name || "Unnamed Room";
      const playersDiv = document.createElement("div");
      playersDiv.className = "room-card-players";
      playersDiv.textContent = `${room.clients} / ${room.maxClients} players`;
      const joinBtn = document.createElement("button");
      joinBtn.textContent = "Join";
      joinBtn.onclick = () => this.joinRoom(room);
      card.append(nameDiv, playersDiv, joinBtn);
      grid.appendChild(card);
    }
  }
}
