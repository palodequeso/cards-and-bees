import { CARD_PACKS, TABLE_BACKGROUNDS, Preferences } from '../game/preferences';

export default class SettingsPanel {
    overlay: HTMLDivElement;
    panel: HTMLDivElement;

    constructor() {
        this.overlay = document.createElement("div");
        this.overlay.className = "settings-overlay";
        this.overlay.style.display = "none";
        this.overlay.addEventListener("click", (e) => {
            if (e.target === this.overlay) this.close();
        });

        this.panel = document.createElement("div");
        this.panel.className = "settings-panel";
        this.overlay.appendChild(this.panel);
        document.body.appendChild(this.overlay);
    }

    open() {
        this.render();
        this.overlay.style.display = "flex";
    }

    close() {
        this.overlay.style.display = "none";
    }

    render() {
        this.panel.innerHTML = "";

        // Header
        const header = document.createElement("div");
        header.className = "settings-header";
        const title = document.createElement("h2");
        title.textContent = "Settings";
        header.appendChild(title);
        const closeBtn = document.createElement("button");
        closeBtn.className = "settings-close";
        closeBtn.textContent = "×";
        closeBtn.addEventListener("click", () => this.close());
        header.appendChild(closeBtn);
        this.panel.appendChild(header);

        // Card Style section
        const cardSection = document.createElement("div");
        cardSection.className = "settings-section";
        const cardLabel = document.createElement("h3");
        cardLabel.textContent = "Card Style";
        cardSection.appendChild(cardLabel);

        const cardGrid = document.createElement("div");
        cardGrid.className = "settings-card-grid";
        for (const pack of CARD_PACKS) {
            const item = document.createElement("div");
            item.className = "settings-card-item";
            if (pack.id === Preferences.cardPack) item.classList.add("selected");

            const preview = document.createElement("div");
            preview.className = "settings-card-preview";
            preview.style.backgroundImage = `url(./static/poker/${pack.id}/as.png)`;
            preview.style.imageRendering = pack.pixelated ? "pixelated" : "auto";
            item.appendChild(preview);

            const name = document.createElement("div");
            name.className = "settings-card-name";
            name.textContent = pack.name;
            item.appendChild(name);

            item.addEventListener("click", () => {
                Preferences.cardPack = pack.id;
                this.render();
            });
            cardGrid.appendChild(item);
        }
        cardSection.appendChild(cardGrid);
        this.panel.appendChild(cardSection);

        // Table Background section
        const bgSection = document.createElement("div");
        bgSection.className = "settings-section";
        const bgLabel = document.createElement("h3");
        bgLabel.textContent = "Table Background";
        bgSection.appendChild(bgLabel);

        const bgGrid = document.createElement("div");
        bgGrid.className = "settings-bg-grid";
        for (const bg of TABLE_BACKGROUNDS) {
            const swatch = document.createElement("div");
            swatch.className = "settings-bg-swatch";
            if (bg.id === Preferences.tableBackground) swatch.classList.add("selected");
            swatch.style.background = bg.value;
            swatch.title = bg.name;

            const label = document.createElement("div");
            label.className = "settings-bg-label";
            label.textContent = bg.name;
            swatch.appendChild(label);

            swatch.addEventListener("click", () => {
                Preferences.tableBackground = bg.id;
                this.render();
            });
            bgGrid.appendChild(swatch);
        }
        bgSection.appendChild(bgGrid);
        this.panel.appendChild(bgSection);
    }
}
