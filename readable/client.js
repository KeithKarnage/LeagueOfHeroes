"use strict";

alert('Failed to load images from "http://www.opengamea... " \nerror code - 404: file not found \nFailed to load sounds from "http://www.freesound.c... " \nerror code - 404: file not found')

let socket,//Socket.IO client
    Canvas = (w = innerWidth, h = innerHeight) => {
        let canvas = document.createElement('canvas');
        canvas.context = canvas.getContext('2d');
        canvas.width = w;
        canvas.height = h;
        return canvas;
    },
    resize = () => {
        let x = canvas.width;

        canvas.width = canvas.height;
        canvas.height = x;

        // canvas.width = innerHeight;
        // canvas.height = innerWidth;
        document.getElementById('message').innerHTML = canvas.width+', '+canvas.height
        if(game) game.resize();
    },
    canvas = Canvas(),
    ctx,
    oneP = () => {
        // console.log('oneP')
        hideButtons();
        game = new Game(2);
    },
    manyP = () => {
        // console.log('manyP');
        socket.emit('findGame');
        hideButtons();
        document.getElementById('message').innerHTML = 'Searching for opponent...'
        // game = new Game(1);
    },
    gameFound = () => {
        game = new Game(1);
        document.getElementById('message').innerHTML = 'Welcome!'
    },
    hideButtons = () => {
        document.getElementById('buttons').style.visibility = 'hidden';
        document.getElementById('div').style.visibility = 'hidden';
    },
    showButtons = () => {
        document.getElementById('buttons').style.visibility = 'visible';  
        document.getElementById('div').style.visibility = 'visible';
    },
    closeHeroes = () => {
        document.getElementById('images').style.width = 0;
        document.getElementById('open').style.visibility = 'visible';
        document.getElementById('heroData').style.visibility = 'hidden';
    },
    openHeroes = () => {
        document.getElementById('images').style.width = '100%';
        document.getElementById('open').style.visibility = 'hidden';
        document.getElementById('heroData').style.visibility = 'visible';
    },
    hero = 0,
    heroPicked = null,
    pickHero = H => {
        hero = H;
        document.getElementById('heroName').innerHTML = Object.keys(HEROES)[H];
        document.getElementById('heroStats').innerHTML = HEROES[Object.keys(HEROES)[H]].statLine;
        console.log(HEROES[Object.keys(HEROES)[H]])
        if(game) {
            if(client)
                socket.emit('changeHero',{id:game.player.id,hero:H})
            else assignButtonFunctions(game.player.id,H);

        }
    },
    touches = [],
    addControls = () => {
        addEventListener('mousedown',touchHandler,false);
        // addEventListener('mousemove',touchHandler,false);
        addEventListener('touchstart',touchHandler,false);

        addEventListener('keydown', keyHandler, false);

    },
    touchHandler = e => {
        e.preventDefault();
        switch(e.type) {
            case 'mousedown':
                if(game) {
                    // _tVec.copy(game.cam.pos);
                    // if(game.team === 1)
                    //     _tVec.scl(-1).add(game.field);
                    // touches.push({
                    //     x: e.clientX/game.scale+_tVec.x-game.cam.size.x/2,
                    //     y: e.clientY/game.scale+_tVec.y-game.cam.size.y/2,
                    // });
                    // console.log(e.clientX,e.clientY)
                    touches.push({
                        x: e.clientX,
                        y: e.clientY
                    })
                };
            break;
            // case 'mousemove':
            //     if(game) {
                    // console.log({
                    //         x: e.clientX/game.scale+(game.field.x -game.cam.pos.x)-game.cam.size.x/game.scale/2,
                    //         y: e.clientY/game.scale+(game.field.y -game.cam.pos.y)-game.cam.size.y/game.scale/2,
                    //     })
                    // console.log(game.cam.pos)
            //     }
            // break;
            case 'touchstart':
                if(game) {
                    // _tVec.copy(game.cam.pos);
                    // if(game.team === 1)
                        // _tVec.scl(-1).add(game.field);
                    if(e.touches.length) {
                        touches.push({
                            // x: e.touches[0].clientX/game.scale+_tVec.x-game.cam.size.x/2,
                            // y: e.touches[0].clientY/game.scale+_tVec.y-game.cam.size.y/2,
                            x: e.touches[0].clientX,
                            y: e.touches[0].clientY
                        });
                    }
                };
                
            break;
        }
    },
    keyHandler = e => {
        // console.log(e.keyCode)
        if(game) {
            if(buttonFunctions[game.player.id][e.keyCode - 49]) {
                if(client)
                    buttonFunctions[game.player.id][e.keyCode - 49].pressed(game.player.id);
                touches.push({x:0,y:0,button:game.buttons[e.keyCode-49].parent})
            }
        }
    };
document.body.prepend(canvas);
canvas.context.fillStyle = 'cornflowerblue';
canvas.context.fillRect(0,0,innerWidth,innerHeight);

document.getElementById('rightside').addEventListener('mousedown',(e)=>{heroPicked={x:e.clientX,y:e.clientY}},false);
document.getElementById('rightside').addEventListener('touchstart',(e)=>{heroPicked={x:e.touches[0].clientX,y:e.touches[0].clientY}},false);

addEventListener('orientationchange',resize);


addControls();
simulate(0);






/**
 * Binde Socket.IO and button events
 */
function bind() {


    socket.on("connect", () => {
        console.log("connec")
    });

    socket.on("disconnect", () => {
        console.log("discon")
    });

    socket.on("error", () => {
        console.log("error")
    });

    socket.on('connected', data => {
        console.log(data)
    });
    socket.on('gameFound', data => {
        gameFound();
    });
    socket.on('addPlayer', data => {
        game.addUser(data);
    });
    socket.on('changedHero', data => {
        assignButtonFunctions(data.id,data.hero);
    });
    socket.on('removeUser', data => {
        if(game) game.removeUser(data);
    });
    socket.on('gameOver', data => {
        game.endGame(data);
    });

    socket.on('update', data => {
        receiveUpdate(data);
    })
}

/**
 * Client module init
 */
function init() {
    socket = io({ upgrade: false, transports: ["websocket"] });
    bind();
}

window.addEventListener("load", init, false);
