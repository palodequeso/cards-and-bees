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
        const express = require('express');
        app.get("/", (req, res) => {
            res.sendFile(path.join(__dirname, '../index.html'));
        });
        app.use('/dist/frontend', express.static(path.join(__dirname, '../dist/frontend')));
        app.use('/static', express.static(path.join(__dirname, '../static')));

        app.use("/colyseus", monitor());
    },


    beforeListen: () => {
        //
    }
});
