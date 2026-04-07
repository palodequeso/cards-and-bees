export const CARD_PACKS = [
    { id: "8bit", name: "8-Bit Pixel", pixelated: true },
    { id: "classic", name: "Classic", pixelated: false },
    { id: "traditional", name: "Traditional", pixelated: false },
];

export const TABLE_BACKGROUNDS = [
    { id: "felt-green", name: "Green Felt", value: "radial-gradient(ellipse at 50% 50%, #1c3828 0%, #0e1f14 100%)" },
    { id: "felt-blue", name: "Blue Felt", value: "radial-gradient(ellipse at 50% 50%, #1a2a3c 0%, #0c1520 100%)" },
    { id: "felt-red", name: "Red Felt", value: "radial-gradient(ellipse at 50% 50%, #3c1a1a 0%, #1a0c0c 100%)" },
    { id: "felt-purple", name: "Purple Felt", value: "radial-gradient(ellipse at 50% 50%, #2a1a3c 0%, #140c20 100%)" },
    { id: "dark", name: "Dark", value: "#111" },
    { id: "midnight", name: "Midnight Blue", value: "#0f1923" },
    { id: "charcoal", name: "Charcoal", value: "#1e1e1e" },
    { id: "walnut", name: "Walnut Wood", value: "linear-gradient(160deg, #3e2723 0%, #4e342e 30%, #3e2723 60%, #5d4037 100%)" },
    { id: "mahogany", name: "Mahogany", value: "linear-gradient(160deg, #2c1006 0%, #3d1a0c 50%, #2c1006 100%)" },
];

export class Preferences {
    static listeners: Array<() => void> = [];

    static get cardPack(): string {
        return localStorage.getItem("cardPack") || "8bit";
    }
    static set cardPack(pack: string) {
        localStorage.setItem("cardPack", pack);
        this.notify();
    }
    static get cardPath(): string {
        return `./static/poker/${this.cardPack}/`;
    }
    static get isPixelated(): boolean {
        const pack = CARD_PACKS.find(p => p.id === this.cardPack);
        return pack ? pack.pixelated : false;
    }
    static get tableBackground(): string {
        return localStorage.getItem("tableBackground") || "felt-green";
    }
    static set tableBackground(bg: string) {
        localStorage.setItem("tableBackground", bg);
        this.notify();
    }
    static get tableBackgroundValue(): string {
        const bg = TABLE_BACKGROUNDS.find(b => b.id === this.tableBackground);
        return bg ? bg.value : TABLE_BACKGROUNDS[0].value;
    }
    static onChange(cb: () => void) {
        this.listeners.push(cb);
    }
    static notify() {
        for (const cb of this.listeners) cb();
    }
}
