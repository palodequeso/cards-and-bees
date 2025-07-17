import { Schema, type, ArraySchema, MapSchema } from '@colyseus/schema';

export class CardState extends Schema {
    @type({ map: 'string' }) value = new MapSchema<string>();
    @type('boolean') isFaceDown = true;
    @type('number') x = 0;
    @type('number') y = 0;
}

export class PlayerState extends Schema {
    @type('string') id = '';
    @type('string') name = '';
    @type('boolean') ready = false;
    @type([ CardState ]) hand = new ArraySchema<CardState>();
    @type([ CardState ]) played = new ArraySchema<CardState>();
}

export class CardStack extends Schema {
    @type('string') id = '';
    @type([ CardState ]) stack = new ArraySchema<CardState>();
    @type('number') x = 0;
    @type('number') y = 0;
    @type('boolean') isFaceDown = true;
}

export class ChatMessage extends Schema {
    @type('string') date = '';
    @type('string') name = '';
    @type('string') message = '';
}

export class RoomState extends Schema {
    @type('boolean') isGameStarted = false;
    @type('string') name: string = '';
    @type('number') currentTurnPlayerIndex: number = 0;
    @type([ ChatMessage ]) chatMessages = new ArraySchema<ChatMessage>();
    @type([ PlayerState ]) players = new ArraySchema<PlayerState>();
    @type([ CardState ]) tableCards = new ArraySchema<CardState>();
    @type([ CardStack ]) cardStacks = new ArraySchema<CardStack>();
}
