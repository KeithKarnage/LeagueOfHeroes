"use strict";

/**
 * User sessions
 * @param {Array} users
 */
let users = {},
	waiting = [];

/**
 * Find opponent for a user
 * @param {User} user
 */
// function findOpponent(user) {
// 	for (let i = 0; i < users.length; i++) {
// 		if (
// 			user !== users[i] &&
// 			users[i].opponent === null
// 		) {
// 			new Game(user, users[i]).start();
// 		}
// 	}
// }

function findGame(user) {
	// console.log(game)
	if(user)
		waiting.push(user.socket.id);
	// console.log('finding game',users,waiting)
	if(waiting.length > 1) {
		if(game === null)
			game = new Game(0);
		if(game) {
			game.addUser(users[waiting.shift()],0);
			game.addUser(users[waiting.shift()],1);
			game.usersAdded();
		}
	}
	

}

/**
 * Remove user session
 * @param {User} user
 */
function removeUser(user) {
	if(game) {
		game.removeUser(game.objIDs[user.socket.id]);
		if(Object.keys(game.players).length < 1) {
			game = null;
			// console.log(game)
			findGame();
		}
	}
	else {
		// if(users.indexOf(user) !== -1)
		delete users[user.socket.id];
			// users.splice(users.indexOf(user), 1);
		if(waiting.indexOf(user.socket.id) !== -1)
			waiting.splice(waiting.indexOf(user.socket.id), 1);
		// console.log(users,waiting)
	}
}



/**
 * User session class
 */
class User {

	/**
	 * @param {Socket} socket
	 */
	constructor(socket) {
		this.socket = socket;
		// this.game = null;
	}


	/**
	 * Start new game
	 * @param {Game} game
	 * @param {User} opponent
	 */
	start(game) {
		// this.game = game;
		this.socket.emit("start");
	}

	/**
	 * Terminate game
	 */
	end() {
		// this.game = null;
		this.socket.emit("end");
	}

}

/**
 * Socket.IO on connect event
 * @param {Socket} socket
 */
module.exports = {

	io: (socket) => {
		const user = new User(socket);
		users[user.socket.id] = user;
		// findOpponent(user);

		socket.on("disconnect", () => {
			console.log("Disconnected: " + socket.id);
			removeUser(user);
		});

		socket.on('findGame', () => {
			findGame(user);
		});

		socket.on('input', data => {
			receiveInput(JSON.parse(data));
		});

		socket.on('changeHero', data => {
			// console.log('daata,',data)
			assignButtonFunctions(data.id,data.hero)
		});

		// socket.on("guess", (guess) => {
		// 	console.log("Guess: " + socket.id);
		// 	if (user.setGuess(guess) && user.game.ended()) {
		// 		user.game.score();
		// 		user.game.start();
		// 		storage.get('games', 0).then(games => {
		// 			storage.set('games', games + 1);
		// 		});
		// 	}
		// });

		socket.emit('connected', socket.id)
		console.log("Connected: " + socket.id);
	},

	// stat: (req, res) => {
	// 	storage.get('games', 0).then(games => {
	// 		res.send(`<h1>Games played: ${games}</h1>`);
	// 	});
	// }
};
