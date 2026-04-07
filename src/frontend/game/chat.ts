import { Room } from "colyseus";

export default class Chat {
  private toggleNode: HTMLButtonElement;
  private panelNode: HTMLDivElement;
  private textInputNode: HTMLInputElement;
  private messagesNode: HTMLDivElement;
  private messages: any[] = [];
  private sendChat: (message: string) => void;
  private collapsed = true;

  constructor(room: Room, sendChat: (message: string) => void) {
    this.sendChat = sendChat;

    this.toggleNode = document.createElement("button");
    this.toggleNode.id = "chat-toggle";
    this.toggleNode.textContent = "💬";
    this.toggleNode.title = "Toggle chat";
    this.toggleNode.addEventListener("click", () => this.togglePanel());

    this.panelNode = document.createElement("div");
    this.panelNode.id = "chat-area";
    this.panelNode.classList.add("collapsed");

    this.messagesNode = document.createElement("div");
    this.messagesNode.id = "chat-messages";
    this.panelNode.appendChild(this.messagesNode);

    this.textInputNode = document.createElement("input");
    this.textInputNode.id = "chat-input";
    this.textInputNode.type = "text";
    this.textInputNode.placeholder = "Say something…";
    this.textInputNode.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const msg = this.textInputNode.value.trim();
        if (msg) {
          this.sendChat(msg);
          this.textInputNode.value = "";
        }
      }
    });
    this.panelNode.appendChild(this.textInputNode);

    this.messages = room.state.chatMessages;
  }

  togglePanel() {
    this.collapsed = !this.collapsed;
    this.panelNode.classList.toggle("collapsed", this.collapsed);
    if (!this.collapsed) {
      this.textInputNode.focus();
      this.messagesNode.scrollTop = this.messagesNode.scrollHeight;
    }
  }

  public renderMessages() {
    this.messagesNode.innerHTML = "";
    for (const message of this.messages) {
      const row = document.createElement("div");
      row.classList.add("chat-message");
      const time = document.createElement("span");
      time.className = "chat-time";
      time.textContent = new Date(message.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const name = document.createElement("span");
      name.className = "chat-name";
      name.textContent = message.name + ":";
      const text = document.createElement("span");
      text.textContent = " " + message.message;
      row.append(time, name, text);
      this.messagesNode.appendChild(row);
    }
    if (!this.collapsed) {
      this.messagesNode.scrollTop = this.messagesNode.scrollHeight;
    }
  }

  get toggleEl() { return this.toggleNode; }
  get panelEl() { return this.panelNode; }
}
