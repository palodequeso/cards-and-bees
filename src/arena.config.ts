import * as path from 'path';
import Arena from "@colyseus/arena";
import { monitor } from "@colyseus/monitor";

import FreePlayPokerRoom from "./rooms/freePlayPookerRoom";

export default Arena({
    getId: () => "Your Colyseus App",

    initializeGameServer: (gameServer) => {
        gameServer.define('game_room', FreePlayPokerRoom);

    },

    initializeExpress: (app) => {
        app.get("/", (req, res) => {
            res.sendFile(path.join(__dirname, '../index.html'));
        });
        app.get('/dist/frontend/*', (_, res) => {
            res.sendFile(path.join(__dirname, '../dist/frontend/' + _.params[0]));
        });
        app.get('/static/*', (_, res) => {
            res.sendFile(path.join(__dirname, '../static/' + _.params[0]));
        });

        app.use("/colyseus", monitor());
    },


    beforeListen: () => {
        //
    }
});
