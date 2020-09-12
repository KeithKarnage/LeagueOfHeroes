"use strict";


// - - - - - - - - - - - - - - - - - - - - - - - - - 
//. Classes
// - - - - - - - - - - - - - - - - - - - - - - - - - 
class Game {
	constructor(S) {
		game = this;
console.log('new game')
		objID = 0;
		// this.player;
		this.players = {};
		this.input = {};
		this.updates = [];
		this.team = 0;
		// this.pos = vec();
		this.screen = vec();
		this.field = vec(512,512);
		this.scale = 1;
		this.cam = new Obj({});

		this.buttons = [
			new Obj({x:100,y:100}),
			new Obj({x:100,y:200}),
			new Obj({x:100,y:300}),
		];
		// this.skillPrepped = null;
		this.objIDs = {};

		this.objects = {};
		this.op = ObjectPool(Obj);
		this.bp = BroadPhase({w:100,h:100,size:12});

		this.gameOver = false;
		this.waveTimer = 4000;

		// this.op.newObject({
		// 	team: 1,
		// 	type: 2, //  BASE
		// 	pos: _tVec.copy(this.field).scl(0.8)
		// });
		// 0 = server
		// 1 = client
		// 2 = local game (one player)
		server = !S;
		client = S;
		if(S===2) {
			local = true;
			client = false;
			this.addUser({socket:{id:1}},1);
			this.addUser({socket:{id:0}},0);
		}

		this.teams = [
			{buildings:[]},
			{buildings:[]}
		];
		//  CREATE BASES AND TURRETS

		if(!client) {
			ROCKS.forEach((R,i) => {
				_obj = new Obj({
					type: 7,
					team: 2,
					x:R[0]*32,
					y:R[1]*32,
					subtype: i
				});
				this.objects[_obj.id] = _obj;

				_obj = new Obj({
					type: 7,
					team: 2,
					x:(16-R[0])*32,
					y:(16-R[1])*32,
					subtype: i
				});
				this.objects[_obj.id] = _obj;
			});

			FORESTS.forEach((R,i) => {
				_obj = new Obj({
					type: 8,
					team:2,
					x:R[0]*32,
					y:R[1]*32,
					subtype: i,
					// zIndex: -1000
				});
				this.objects[_obj.id] = _obj;

				_obj = new Obj({
					type: 8,
					team:2,
					x:(16-R[0])*32,
					y:(16-R[1])*32,
					subtype: i,
					// zIndex: -1000
				});
				this.objects[_obj.id] = _obj;
			});
			//  FRIENDLY BASES
			BASES.forEach(B => {
				_obj = new Obj({
					type: B[0],
					team: 0,
					x: B[1],
					y: B[2]
				});
				this.objects[_obj.id] = _obj;
				this.teams[0].buildings.push(_obj);
			});
			//  EMENY BASES
			BASES.forEach(B => {
				_obj = new Obj({
					type: B[0],
					team: 1,
					x: game.field.x - B[1],
					y: game.field.y - B[2]
				});
				this.objects[_obj.id] = _obj;
				this.teams[1].buildings.push(_obj);
			});
			
			
			
			
			simulate(0);
		}
		if(!server) this.resize();
	};
	endGame(losers) {
		this.gameOver = 5000;
		console.log('game over')
		if(server) {
			for(_id in this.players)
				this.players[_id].user.socket.emit('gameOver',losers)
		}
	};
	resize() {
		this.screen.x = innerWidth<innerHeight?innerWidth:innerHeight;
		this.screen.y = this.screen.x;
		this.scale = 3*innerWidth/512;
		// this.scale = 1;
		// this.pos.x = 0;
		// this.pos.y = innerHeight/2 - this.screen.y/2;
		this.cam.size.x = this.screen.x/this.scale;
		this.cam.size.y = this.screen.y/this.scale;
		this.buttons.forEach(B => {
			B.size.x = 16*this.scale;
			B.size.y = 16*this.scale;
		});
		


	};
	addObj(obj,objID) {
		switch(obj[0]) {
			case 1:
				if(this.objects[obj[4]]) {
					//  obj[4] IS OBJECT THAT FIRED PROJECTILE
					this.objects[obj[4]].attack({
						aTarget: this.objects[obj[7]],
						pos: obj[2],
						objID: objID,
						id: obj[4],
						damage: obj[8]
					});
				}
			break;
			case 2:
			case 3:
			case 4:
				this.objects[objID] = new Obj({
					type: obj[0],
					pos: obj[2],
					id: objID,
					life: obj[5],
					team: obj[6]
				});
			break;
			case 5:
				this.objects[objID] = game.op.newObject({
					type: obj[0],
					pos: obj[2],
					id: objID,
					life: obj[5],
					team: obj[6],
					subtype: obj[9],
					aTarget: {}
				});
				// console.log(this.objects[objID])
				this.objects[objID].effect = effects[obj[9]];
			break;
			case 7:
			case 8:
				this.objects[objID] = new Obj({
					type: obj[0],
					pos: obj[2],
					id: objID,
					life: obj[5],
					team: obj[6],
					subtype: obj[9]
				});
			break;
		}
	};
	removeUser(id) {
		delete this.objects[id];
		delete this.input[id];
		delete this.players[id];

		removeAnimations(id);

		if(server) {
			for(_id in this.players)
				this.players[_id].user.socket.emit('removeUser',id)
		}
	};
	addUser(user,team) {

		//  team FOR SERVER OR LOCAL
		//  user.team  FOR CLIENT
		//  MAKE GAME OBJECT FOR PLAYER
		_obj = new Obj({id:user.objID,team:user.team===undefined?team:user.team});
		
		game.objIDs[user.socket.id] = _obj.id;

		
		//  USER ASSOCIATED WITH CLIENT
		if((client
		&& user.socket.id === socket.id)
		|| local) {

			this.team = client?user.team:team;
			this.player = _obj;
			// this.enemyTeam = 1 - this.team;
			this.cam.mTarget = _obj;
			if(client)
				socket.emit('changeHero',{id:_obj.id,hero});

			
			//  FOR DEBUG REMOVE LATER
			// game.bp.debugID = _obj.id;

		}
		//  INVERT TEAM 1
		if(team === 1)
			// _obj.pos.copy(_obj.mTarget.copy(this.field));
			_obj.home.copy(this.field).scl(0.9);
		else _obj.home.copy(this.field).scl(0.1);

		_obj.pos.copy(_obj.mTarget.copy(_obj.home));



		//  ADD THAT OBJECT TO THE GAME
		this.objects[_obj.id] = _obj;
		//  STORE user DATA AND ASSOCIATED GAME OBJECT IN players
		this.players[_obj.id] = { user:user, team:user.team||team, objID:_obj.id };
		//  EACH PLAYER GETS IT'S OWN INPUT
		this.input[_obj.id] = [];

		if(local) assignButtonFunctions(_obj.id,hero);
		else assignButtonFunctions(_obj.id,0);

		//  TELL THE CLIENT HE HAS BEEN ADDED TO A GAME
		if(server)
			user.socket.emit('gameFound');

	};
	//  AFTER THE SERVER HAS ADDED BOTH PLAYERS
	//  BOTH PLAYERS ARE GIVEN ALL THE PLAYER DATA
	usersAdded() {
		for(let i in this.players) {
			for(let j in this.players) {
				_obj = this.players[j];
				this.players[i].user.socket.emit('addPlayer',{team:_obj.team, objID:_obj.objID,socket:{id:_obj.user.socket.id}});
				// this.players[i].user.socket.emit('addPlayer',this.players[j].user)

			}
		}
	};
	//  SEND GAME STATE UPDATES TO USERS
	updateUsers() {
		_update = {id:updateID++};
		for(_id in this.objects) {
			_obj = this.objects[_id];
			// if(_obj.type === 2)
			_update[_id] = [
				//  0
				_obj.type, 
				//  1
				_obj.mTarget,
				//  2
				_obj.pos,
				//  3
				_obj.vel,
				//  4
				_obj.parent,
				//  5
				_obj.life,
				//  6
				_obj.team,
				//  7
				_obj.aTarget?_obj.aTarget.id:null,
				//  8
				_obj.damage,
				//  9
				_obj.subtype,
				//  10
				_obj.visible

			];
		}
		for(_id in this.players)
			this.players[_id].user.socket.emit('update',JSON.stringify(_update))
	};
	releaseWave() {
		for(_id=0; _id<4; _id++) {
			_obj = this.op.newObject({
				type: 4,
				team: 0,
				pos: vec(100,115 + _id*10),
				path: 0,
				// range: 10
			});
			this.objects[_obj.id] = _obj;
			_obj = this.op.newObject({
				type: 4,
				team: 1,
				pos: vec(397 - _id*10,412),
				path: 1,
				// range: 10
			});
			this.objects[_obj.id] = _obj;
			_obj = this.op.newObject({
				type: 4,
				team: 0,
				pos: vec(115 + _id*10,100),
				path: 1,
				// range: 10
			});
			this.objects[_obj.id] = _obj;
			_obj = this.op.newObject({
				type: 4,
				team: 1,
				pos: vec(412,397 - _id*10),
				path: 0,
				// range: 10
			});
			this.objects[_obj.id] = _obj;
		}
		// _obj = this.op.newObject({
		// 		type: 4,
		// 		team: 0,
		// 		pos: vec(90,90),
		// 		path: 0
		// 	});
		// 	this.objects[_obj.id] = _obj;
		// 	_obj = this.op.newObject({
		// 		type: 4,
		// 		team: 1,
		// 		pos: vec(422,422),
		// 		path: 1
		// 	});
		// 	this.objects[_obj.id] = _obj;
	};
	//  UPDATE GAME LOOP
	update(T) {
		// console.log('game')
		if(game.gameOver)
			game.gameOver -= T;
		if(game.gameOver < 0) {
			// game.gameOver = 0;
			if(server) {
				for(_id in this.players)
					removeUser(this.players[_id].user)
				animations.length = 0;
				game = null;
				toRender = null;
			} else {
				animations.length = 0;
				game = null;
				toRender = null;
				showButtons();
			}
			return;
		}
		buttonCooldowns.forEach(B => {
			for(_id in B) {
				B[_id] -= T;
				if(B[_id] < 0)
					B[_id] = 0;
			}	
		})
		
		processAnimations(T);







		if(!client) {
			//  PROCESS WAVE TIMING
			this.waveTimer -= T;
			if(this.waveTimer < 0) {
				this.waveTimer += 10000;
				this.releaseWave()
			};
			
			//  PROCESS INPUT
			for(_id in this.input) {
				//  SEPERATE IDS FOR EACH PLAYER
				_input = this.input[_id]
				if(_input) {
					//  POSSIBLY MULTIPLE INPUTS
					_input.forEach(I => {
						// console.log(I)
						if(I) {
							_obj = this.objects[this.players[_id].objID];
							//  UPDATE SCENE OBJECTS WITH SERVER DATA

							//  IF A BUTTON WAS PRESSED
							if(I[0].button)
								skills[I[0].button].pressed(_id);
							//  IF A SKILL WAS ACTIVATED
							else if(I[0].activate) {
								skills[I[0].activate].activate(_id,I[0]);
							// game.player.skillPrepped = null;
							}
							//  AN ACTOR WAS TARGETED
							else if(I[0].target !== undefined) {
								// console.log(I[0].target)
								_obj.aTarget = this.objects[I[0].target];
								// _obj.aTarget.targeting.push(_obj.id);

							}
							//  SET MOVE TARGET
							else {
								_obj.mTarget.copy(I[0]);
								// if(_obj.aTarget)
									// _obj.aTarget.targeting.splice(_obj.id)
								_obj.aTarget = null;
							}
						}
					})
					//  CLEAR PROCESSED INPUT
					this.input[_id].length = 0;
				}
			}
		}

		// UPDATE OBJECTS
		for(_id in this.objects) {
			_obj = this.objects[_id];
			// if(_obj.type === 6)


			//  ON DEATH
			if((!client || _obj.type === 6)
			&& _obj.life <= 0) {
				switch(_obj.type) {
					//  PLAYER
					case 0:						
						if(!_obj.deathTime) {
							_obj.deathTime = Date.now();
							_obj.pos.copy(_obj.home);
							_obj.mTarget.copy(_obj.home);
						}
						else {
							if(Date.now() > _obj.deathTime + 10000) {	
								_obj.life = _obj.mLife;
								_obj.deathTime = null;
							}
						}
					break;
					//  1 IS PROJECTILES
					//  BASE (GAME ENDING)
					case 2:
						delete game.objects[_obj.id];
						if(!game.gameOver)
							game.endGame(_obj.team);
					break;
					//  TURRET
					case 3:
						// _obj.targeting.forEach(O => game.objects[O].aTarget = null);
						delete game.objects[_obj.id];
						// _obj.dead = true;
					break;
					//  BADDIE
					case 4:
					case 5:
					case 6:
						delete game.objects[_obj.id];
						// if(_obj.)
						_obj.release();
					break;
				}
			}
			//  HEAL CLOSE TO BASE
			// if(_obj.pos.dist(_obj.home) < 25)
				// _obj.life = Math.min(_obj.life + 1,_obj.mLife);

			//  UPDATE ATTACK TIMERS
			_obj.aTime = Math.max(_obj.aTime - T,0);
			_obj.visible = Math.max(_obj.visible - T,0);

			if(_obj.deathTime)
				continue;
			
			//  HANDLE OBJECT TYPES INDIVIDUALLY
			switch(_obj.type) {
				case 0:
					//  ENEMY PLAYER AI
					if(local && _obj.team === 1) {
						// console.log(_obj.path)
						//  IF ATTACK TARGET IS DEAD OR OUT OF RANGE
						if(_obj.aTarget
						&& (_obj.aTarget.life === 0
						|| _obj.pos.dist(_obj.aTarget.pos) > _obj.aRange * 1.5))
							_obj.aTarget = null;
						//  IF THERE IS NO TARGET, LOOK FOR ONE
						if(!_obj.aTarget) {
							_obj.findNearestEnemy();
						}
					
						//  IF THERE IS NO ATTACK TARGET AND IT STILL HAS A PATH TO FOLLOW
						if(!_obj.aTarget
						&& _obj.path.length) {
							//  FIRST TWO MOVE TARGETS ARE FRIENDLY TURRETS
							if(_obj.path.length > 3)
								_obj.mTarget.copy(game.teams[_obj.team].buildings[_obj.path[0]].pos);
							//  THE REST ARE ENEMY TURRETS
							else _obj.mTarget.copy(game.teams[_obj.eTeam].buildings[_obj.path[0]].pos);
							//  IF CLOSE ENOUGH TO TARGET
							if(_obj.path.length > 1
							&& _obj.pos.dist(_obj.mTarget) < 20)
								_obj.path.shift();

							// _obj.vel.copy(_obj.mTarget).sub(_obj.pos).unit().scl(_obj.mSpeed);
						}
					}


					//  PLAYER MOVEMENT
					if(_obj.aTarget
					&& _obj.aTarget.life === 0) {
						_obj.aTarget = null;
						_obj.findNearestEnemy();
					}
					//  OBJECT HAS ATTACK TARGET
					if(_obj.aTarget) {
						//  IS OUT OF ATTACK RANGE
						if(_obj.pos.dist(_obj.aTarget.pos) > _obj.aRange)
							//  SET MOVE TARGET TO ATTACK TARGET'S POSITION
							_obj.mTarget.copy(_obj.aTarget.pos);
						//  IS IN RANGE OF ATTACK TARGET
						else {
							//  SET MOVE TARGET TO CURRENT POSITION (STOP MOVING)
							_obj.mTarget.copy(_obj.pos);
							//  ATTACK IF READY
							if(!client
							&& _obj.aTime <= 0) {

								
								_obj.attack();
							}
						}
						// else _obj.vel.clr();
					}
					//  MOVEMENT
					//  IF THE OBJECT IS FURTHER FROM ITS MOVE TARGET THAN 0
					if(_obj.pos.dist(_obj.mTarget) > 1)
						//  SUBTRACT THE OBJECT'S POSITION TO MAKE _tVec POINT AT THE mTarget
						//  COPY THAT TO THE OBJECT'S VELOCITY, MAKE IT A UNIT VECTOR, THEN SCALE TO SPEED
						_obj.vel.copy(_obj.mTarget).sub(_obj.pos).unit().scl(_obj.mSpeed);
					else _obj.vel.clr();

					if(_obj.vel.mag() > 0.1
					&& !isAnimated(_obj.id,'bounce'))
						registerAnimation([_obj.id,'bounce',x=>x,_obj.size.y/2,125,[_obj.id,'bounce',x=>x,- _obj.size.y/2,125]])
				break;
				//  PROJECTILES
				case 1:
					
					//  aTarget CAN DISAPPEAR IF SOMEONE DISCONNECTS
					if(_obj.aTarget) {

						//  HOMING PROJECTILES
						if(_obj.pos.dist(_obj.aTarget.pos) > 100) {
							delete game.objects[_obj.id];
							_obj.release();
						}
						if(_obj.pos.dist(_obj.aTarget.pos) > 1) {
							//  SET VELOCITY TO POINT AT TARGET (HOME IN)
							_obj.vel.copy(_obj.aTarget.pos).sub(_obj.pos).unit().scl(_obj.mSpeed);
							if(_obj.aTarget.life === 0) {
								_obj.mTarget.copy(_obj.aTarget.pos);
								_obj.aTarget = null;
							}
						} else {
							if(!client)
								_obj.aTarget.takeDamage(_obj.damage);
							delete game.objects[_obj.id];
							_obj.release();
						}
					}
					if(!_obj.aTarget) {
						if(_obj.pos.dist(_obj.mTarget) > 1)
							_obj.vel.copy(_obj.mTarget).sub(_obj.pos).unit().scl(_obj.mSpeed);
						else {
							_obj.release();
							delete game.objects[_obj.id]
						};
					};
				break;
				//  BASES DON"T UPDATE MOVEMENT
				case 2:
				case 3:
					if(!client) {

						if(_obj.aTarget
						&& (_obj.aTarget.life === 0
						|| _obj.pos.dist(_obj.aTarget.pos) > _obj.aRange))
							_obj.aTarget = null;
						//  IF THERE IS NO TARGET, LOOK FOR ONE
						if(!_obj.aTarget) {
							_obj.findNearestEnemy();
						};
						//  ATTACK IF READY
						if(_obj.aTarget
						&& _obj.aTime <= 0) {

							_obj.aTime = _obj.aSpeed;
							_obj.attack();
						}
					}
				break;
				// case 0:
				case 4:
					if(!client) {
						// console.log(_obj.path)
						//  IF ATTACK TARGET IS DEAD OR OUT OF RANGE
						if(_obj.aTarget
						&& (_obj.aTarget.life === 0
						|| _obj.pos.dist(_obj.aTarget.pos) > _obj.aRange * 1.5))
							_obj.aTarget = null;
						//  IF THERE IS NO TARGET, LOOK FOR ONE
						if(!_obj.aTarget) {
							_obj.findNearestEnemy();
						}
					
						//  IF THERE IS NO ATTACK TARGET AND IT STILL HAS A PATH TO FOLLOW
						if(!_obj.aTarget
						&& _obj.path.length) {
							//  FIRST TWO MOVE TARGETS ARE FRIENDLY TURRETS
							if(_obj.path.length > 3)
								_obj.mTarget.copy(game.teams[_obj.team].buildings[_obj.path[0]].pos);
							//  THE REST ARE ENEMY TURRETS
							else _obj.mTarget.copy(game.teams[_obj.eTeam].buildings[_obj.path[0]].pos);
							//  IF CLOSE ENOUGH TO TARGET
							if(_obj.path.length > 1
							&& _obj.pos.dist(_obj.mTarget) < 20)
								_obj.path.shift();

							// _obj.vel.copy(_obj.mTarget).sub(_obj.pos).unit().scl(_obj.mSpeed);
						}
					};
					//  OBJECT HAS ATTACK TARGET
					if(_obj.aTarget) {
						//  IS OUT OF ATTACK RANGE
						if(_obj.pos.dist(_obj.aTarget.pos) > _obj.aRange)
							//  SET MOVE TARGET TO ATTACK TARGET'S POSITION
							_obj.mTarget.copy(_obj.aTarget.pos);
						//  IS IN RANGE OF ATTACK TARGET
						else {
							//  SET MOVE TARGET TO CURRENT POSITION (STOP MOVING)
							_obj.mTarget.copy(_obj.pos);
							//  ATTACK IF READY
							if(!client
							&& _obj.aTime <= 0) {

								_obj.aTime = _obj.aSpeed;
								_obj.attack();
							}
						}
						// else _obj.vel.clr();
					}
					//  MOVEMENT
					//  IF THE OBJECT IS FURTHER FROM ITS MOVE TARGET THAN 0
					if(_obj.pos.dist(_obj.mTarget) > 1)
						//  SUBTRACT THE OBJECT'S POSITION TO MAKE _tVec POINT AT THE mTarget
						//  COPY THAT TO THE OBJECT'S VELOCITY, MAKE IT A UNIT VECTOR, THEN SCALE TO SPEED
						_obj.vel.copy(_obj.mTarget).sub(_obj.pos).unit().scl(_obj.mSpeed);
					else _obj.vel.clr();

				break;
				//  EFFECTS OBJECTS
				case 5:
					if(_obj.aTime <= 0) {
						_obj.life -= T;

					}
				break;
				//  PARTICLE
				case 6:

					_obj.life -= T;
				break;
				default:
					
				break;
			}


			// if(_obj.type !== 2) {
				//  UPDATE POSITION
				_tVec.copy(_obj.vel).scl(simT/1000);
				_obj.pos.add(_tVec);
			// }
		}
		//  ADD OBJECTS TO BROAD PHASE FOR COLLISION
		this.bp.grid = [];
		this.bp.populateGrid(this.objects);
		// }

		//  COLLISION
		for(_id in this.objects) {
			_obj = this.objects[_id];
			switch(_obj.type) {
				case 0:
				case 4:
					//  NOT IN WOODS
					_obj.parent = null;
					objList = game.bp.findMatches(_obj,true,true);

					objList.forEach(O => {
						_id2 = rectCollision(_obj,O);
						if(_id2) {
							if(O.type === 8) {
								
								
								if(pointCollision(_obj.pos,O)) {
									// if(_obj.team === 0)
										// console.log(_obj.aTime)
									//  IF WE'RE ALLOWED TO BE INVISIBLE
									if(_obj.visible === 0)
										//  WE ARE IN THESE WOODS
										_obj.parent = O.subtype;
									if(client
									&& _obj.team === game.team)
										_obj.parent = O.subtype;
									// if(_obj.team === 0)
										// console.log(_obj.aTime)
								}
							}
							else _obj.pos.add(_id2)
						}
					})
				break;
				case 5:
					if(_obj.aTime <= 0) {
						if(!server)
							effects[_obj.subtype].fx(_obj.id);

						objList = game.bp.findMatches(_obj);


						objList.forEach(O => {
							_id2 = circleCollision(_obj,O);
							if(_id2) {
								if(!client) {

									//  IF THE OBJECT IS NOT IN OUR TARGET INDEX

									if(!_obj.aTarget[O.id]) {
										//  ADD TO TARGET INDEX
										_obj.aTarget[O.id] = Date.now();
										//  CAUSE DAMAGE
										effects[_obj.subtype].affect(O.id)
									}
									//  IT IS IN OUR TARGET INDEX
									else {
										//  CHECK TO SEE HOW LONG SINCE LAST CAUSED DAMAGE
										if(Date.now() - _obj.aTarget[O.id] > 250) {
											effects[_obj.subtype].affect(O.id)
											_obj.aTarget[O.id] = Date.now()
										}
									}
								}
							}
						})
					} else  
					// {
						// if(!server)
						// 	effects[_obj.subtype].preFX(_obj.id);
					// }
				break;
			}
		};

		//  CLIENT
		if(client) {
		//  PROCESS UPDATES
			while(this.updates.length) {
				_update = this.updates.shift();
				
				//  KEEP TRACK OF UPDATE ORDER
				if(_update.id > lastID) {
					lastID = _update.id;
					ooo = false;
				} else ooo = true;
				//  KEEP TRACK OF KNOWN OBJECTS
				objList = Object.keys(this.objects)
				for(_id in _update) {
					_obj = this.objects[_id];
					//  KNOWN OBJECT
					if(_obj) {
						objList.splice(objList.indexOf(_id),1);
						switch(_obj.type) {
							// case 0:
								// _obj.mTarget.copy(_update[_id][1]);
							// break;
							// case 1:
							// case 2:
							default:
								if(_update[_id][1]) {
									_obj.mTarget.copy(_update[_id][1]);
									_obj.aTarget = this.objects[_update[_id][7]];
								}
							break;
						}
						
						//  OUT OF ORDER UPDATES DON'T AFFECT SPEED OR POSITION TO REDUCE JITTERING
						if(!ooo) {
							if(!isAnimated(game.player.id,'x')) {
								_obj.pos.copy(_update[_id][2]);
								_obj.vel.copy(_update[_id][3]);
								_obj.life = _update[_id][5];
								_obj.visible = _update[_id][10];
							}
						}
					}
					//  UNKOWN OBJECT
					else {
						//  .id IS NOT AN OBJECT
						if(_id !== 'id')
							this.addObj(_update[_id],_id);
					}
					
				}
				//  MISSING
				objList.forEach(id => {
					if(this.objects[id].type !== 6)
						delete this.objects[id];
				})
			
			}
		};
		if(!server && this.cam.mTarget && this.cam.mTarget.pos)
			this.cam.pos.copy(this.cam.mTarget.pos);
	};
	render() {
		if(game) {
			ctx = canvas.context;
			ctx.save();
			// ctx.translate(this.pos.x,this.pos.y);

			ctx.scale(this.scale,this.scale);
			_tVec.copy(this.cam.pos);
			if(this.team === 1) {
				_tVec.x = this.field.x - _tVec.x;
				_tVec.y = this.field.y - _tVec.y;
			}
			ctx.translate(-_tVec.x+this.cam.size.x/2,-_tVec.y+this.cam.size.y/2);
			// ctx.fillStyle = 'black';
			// ctx.fillRect(0,0,this.screen.x,this.screen.y);
			ctx.fillStyle = 'sienna';
			ctx.fillRect(0,0,this.field.x,this.field.y)

			toRender = Object.keys(this.objects);
			toRender.sort((O1,O2) => {
				return (game.objects[O1].y + game.objects[O1].zIndex) - (game.objects[O2].y + game.objects[O2].zIndex)
			})
			// console.log(toRender)


			// for(_id in this.objects) {
			toRender.forEach(id => {
				_obj = this.objects[id];
				_tVec.copy(_obj.pos);
				if(this.team === 1) {
					_tVec.x = game.field.x - _tVec.x;
					_tVec.y = game.field.y - _tVec.y;
				}
				ctx.save();
				ctx.translate(_tVec.x,_tVec.y);
				if(_obj.skillPrepped) {
					ctx.strokeStyle = 'lightgreen';
					// ctx.strokeRect(-skills[_obj.skillPrepped].radius,-skills[_obj.skillPrepped].radius,skills[_obj.skillPrepped].radius*2,skills[_obj.skillPrepped].radius*2);
					ctx.beginPath();
					ctx.arc(0,0,skills[_obj.skillPrepped].radius,0,Math.PI*2);
					ctx.stroke();
				}
				//  CHANCGE COLOUR FOR EACH OBJECT
				switch(_obj.type) {
					case 0:
						if(_obj.parent !== null
						&& !_obj.visible)
							ctx.globalAlpha = 0.5;
						if(game.player.parent === null
						&&_obj.parent !== game.player.parent)
							ctx.globalAlpha = 0;
						switch(_obj.subtype) {
							case 0: ctx.fillStyle = 'darkred'; break;
							case 1: ctx.fillStyle = 'yellow'; break;
							case 2: ctx.fillStyle = 'darkgrey'; break;

						}
					break;
					case 1: ctx.fillStyle = 'black'; break;
					case 2: ctx.fillStyle = 'grey'; break;
					case 3: ctx.fillStyle = 'lightgrey'; break;
					case 4: ctx.fillStyle = 'pink'; break;
					case 5: 
						if(_obj.aTime <= 0)
							ctx.strokeStyle = 'red'; 
						else ctx.strokeStyle = 'orange'; 
					break;
					case 6: 

						ctx.fillStyle = particles[_obj.subtype].fillStyle;
					break;
					case 7: ctx.fillStyle = 'darkslategrey'; break;
					case 8: ctx.fillStyle = 'darkgreen'
				}
				if(_obj.type === 5)
					ctx.strokeRect(-_obj.size.x/2,-_obj.size.y/2-_obj.bounce,_obj.size.x,_obj.size.y);
				//  DRAW OBJECT
				else ctx.fillRect(-_obj.size.x/2,-_obj.size.y/2-_obj.bounce,_obj.size.x,_obj.size.y);
				//  DRAW LIFE BAR FOR EBERTHINS THA NEEDS IT
				switch(_obj.type) {
					// case 1:
					// case 5:
					// case 6:
					// case 7:
					// case 8:
					// break;
					// default:
					case 0:
					case 2:
					case 3:
					case 4:
						ctx.fillStyle = 'black';
						ctx.fillRect(-5,-_obj.size.y,10,2);
						// if(_obj.type === 0)
							// console.log(_obj.team,this.team)
						if(_obj.team === this.team) {

							if(_obj.type === 0) {
								// console.log(_obj.team,this.team)

								ctx.fillStyle = 'blue';	
							}
							else ctx.fillStyle = 'green'; 
						}
						else ctx.fillStyle = 'red';
						ctx.fillRect(-5,-_obj.size.y,_obj.life/_obj.mLife*10,2);
					break;
				}
				if(_obj.type !== 1) {
					
				}
				// ctx.fillStyle = 'black';
				// ctx.fillText(_obj.id,0,0)

				ctx.restore();




			});
			// this.bp.drawBroadPhaseGrid(canvas.context);
			ctx.restore();

			//  DRAW BUTTONS
			this.buttons.forEach(B => {

				ctx.strokeStyle = 'black';
				//  IF THIS SKILL IS PREPPED, DRAW IT GREEN
				if(this.player
				&& B.parent === this.player.skillPrepped)
					ctx.strokeStyle = 'green';
				ctx.strokeRect(B.pos.x-B.size.x/2,B.pos.y-B.size.y/2,B.size.x,B.size.y)
				//  PARTIALLY FILL UNREADY SKILLS
				ctx.fillStyle = 'rgba(0,0,0,0.3)';
				if(B.parent) {

					ctx.fillRect(B.pos.x-B.size.x/2,B.pos.y-B.size.y/2,B.size.x*(buttonCooldowns[this.player.id][B.parent]/skills[B.parent].cooldown),B.size.y)
				}

			});
			if(game.gameOver) {
				ctx.save();
				ctx.font = '48px futura';
				ctx.fillStyle = 'black';
				ctx.textAlign = 'center';  //  'centre'
				ctx.fillText(innerWidth/2,innerHeight/2,'GAME OVER')
				ctx.restore();
			}
		}
	};
};


class Obj {
	constructor(O) {
		this.id = client?parseInt(O.id):objID++;
		this._effect = null;
		this.team = O.team;
		this.eTeam = 1 - O.team;
		this.subtype = O.subtype || 0;
		this.type = O.type || 0;

		
		
		
		
		this.home = vec();

		this.pos = vec(O.x,O.y);
		if(O.pos) this.pos.copy(O.pos);
		this.zIndex = O.zIndex || 0;

		this.skillPrepped = null;
		this.aTarget = O.aTarget || null;

		this.mTarget = vec().copy(this.pos);
		this.vel = vec();
		
		this.aRange = OBJECTS[this.type].range;
		this.aTime = 0;
		this.aSpeed = 500;

		this.visible = true;
		this.parent = null;
		// this.targeting = [];
		this.size = vec().copy(OBJECTS[this.type].size);
		this.mSpeed = OBJECTS[this.type].speed; //  PIXELS PER SECOND
		this.mLife = OBJECTS[this.type].life;
		this.life = this.mLife;
		this.damage = OBJECTS[this.type].damage;

		this.bounce = 0;
		this.offset = vec();
		this.path = [];
		
		switch(this.type) {
			case 0:
				if(local && this.team === 1)
					this.path = PATHS[Math.floor(Math.random()*2)].slice();
			break;
			case 4:
				if(!client)
					this.path = PATHS[O.path].slice();
				// console.log(this.path)
			break;
			case 7:
				this.size.x *= ROCKS[this.subtype][2];
				this.size.y *= ROCKS[this.subtype][3];
			break;
			case 8:
				this.size.x *= FORESTS[this.subtype][2];
				this.size.y *= FORESTS[this.subtype][3];
				this.zIndex = -1000;
			break;
		}
		
	};
	init(O) {


		this.id = O.id || this.id;
		
		this._effect = null;
		this.team = O.team;
		this.eTeam = 1 - O.team;
		this.subtype = O.subtype || 0;
		this.type = O.type;

		this.size.copy(OBJECTS[O.type].size);
		this.aRange = O.range || OBJECTS[O.type].range;

		this.skillPrepped = null;
		this.aTarget = O.aTarget || null;

		this.vel.clr();
		

		this.pos.copy(O.pos);
		this.zIndex = O.zIndex || 0;
		// this.vel.copy(O.vel);
		this.mSpeed = OBJECTS[O.type].speed;
		this.mLife = OBJECTS[this.type].life;
		this.life = this.mLife;
		// if(this.type !== 1)
		this.damage = OBJECTS[this.type].damage || O.damage;
		this.bounce = 0;
		this.offset.clr();


		this.visible = true;
		this.parent = O.parent || null;
		switch(this.type) {
			case 4:
				if(!client)
					this.path = PATHS[O.path].slice();
				// console.log(this.path)
			break;
			// case 7:
			// 	this.size.x *= ROCKS[this.subtype][2];
			// 	this.size.y *= ROCKS[this.subtype][3];
			// break;
		}
	};
	initParticle(id) {
		this.size.scl(particles[this.subtype].scale);
		this.life = particles[this.subtype].life;


		switch(particles[this.subtype].direction) {
			// 0 - up, 1 - right, 2 - down, 3 - left, 4 - in, 5 - out
			case 0: this.vel.y = -1; break;
			case 1: this.vel.x = 1;	break;
			case 2: this.vel.y = 1; break;
			case 3: this.vel.x = -1; break;
			case 4:
				this.vel.copy(game.objects[id].pos).sub(this.pos).unit();
			break;
			case 5:
				this.vel.copy(this.pos).sub(game.objects[id].pos).unit();
			break;

		}
		if(particles[this.subtype].direction < 4
		&& client && game.team === 1)
			this.vel.scl(-1);
		this.vel.scl(particles[this.subtype].speed);
	}
	set x(val) { this.pos.x = val };
	get x() { return this.pos.x };
	set y(val) { this.pos.y = val };
	get y() { return this.pos.y };
	set effect(O) {

		this._effect = O;
		this.size.scl(O.scale);
		this.aTime = O.delay;
		this.life = O.duration;
	};
	findNearestEnemy() {
		//  RANGE BOX
		//  SET TEMP VEC TO 1,1  SCALE TO ATTACK RANGE, SUBTRACT FROM OBJ POS
		_obj2.pos.copy(this.pos);//.sub(_tVec.copy(ONES).scl(this.aRange));
		//  DOUBLE IT AND MAKE IT THE SIZE
		_obj2.size.copy(_tVec.copy(ONES).scl(this.aRange*2));


		//  COPY THE ID
		_obj2.id = this.id;
		_obj2.team = this.team;
		//  FIND ENEMIES IN RANGE
		
		objList = game.bp.findMatches(_obj2);

		//  IF ENEMIES ARE IN RANGE
		if(objList.length) {
			// if(this.team === 1)

			//  CLOSEST ENEMY
			_id2 = null;
			//  CYCLE THROUGH ENEMIES
			
			objList.forEach(O => {
				// console.log(O.visible)
				if(O.type !== 7
				&& O.type !== 8) {
					// if(O.type === 0){
					if(O.parent !== null) {
						// console.log(O.visible)
						return;
					}
					//  FIRST IS AUTOMATICALLY THE CLOSEST
					if(!_id2)
						_id2 = O.id;
					//  CHECK DISTANCE, REPLACE ID IF NECESSARY
					if(game.objects[_id2]
					&& this.pos.dist(O.pos) < this.pos.dist(game.objects[_id2].pos))
						_id2 = O.id;
				}
			})
			this.aTarget = game.objects[_id2]
		//  NO ENEMIES IN RANGE, NO ATTACK TARGET
		} else this.aTarget = null
	};
	attack(O) {
		O = O || this;
		switch(this.type) {
			case 0:
			case 2:
			case 3:
			case 4:
				game.op.newObject({
					type: 1,
					aTarget: O.aTarget,
					pos: O.pos,
					parent: O.id,
					id: O.objID,
					damage: this.damage

					// vel: _tVec.copy(this.aTarget.pos).sub(this.pos).unit().scl(OBJECTS[1].speed);
				});
				this.aTime = this.aSpeed;
				this.visible = 1000;
				// console.log(this.aTime)
			break;
		}
	};
	takeDamage(D) {
		this.life = Math.max(this.life - D,0);
	};
};
let vec = (x,y) => new Vec(x,y);
class Vec {
	constructor(x=0,y=0) {
		this.x = x;
		this.y = y;
		this.m = 0;
		return this;
	};
	copy(v) {
		this.x = v.x;
		this.y = v.y;
		return this;
	};
	vFrD(d) {
		this.x = Math.cos(d);
		this.y = Math.sin(d);
		return this;
	};
	clr() {
		this.x = 0;
		this.y = 0;
		return this;
	};
	add(v) {
		this.x += v.x;
		this.y += v.y;
		return this;
	};
	sub(v) {
		this.x -= v.x;
		this.y -= v.y;
		return this;
	};
	scl(v) {
		this.x *= v;
		this.y *= v;
		return this;
	};
	dir() {
		return Math.atan2(this.y,this.x);
	};
	dist(v) {
		return Math.sqrt((v.x-this.x)*(v.x-this.x) + (v.y-this.y)*(v.y-this.y));
	};
	mag() {
		this.m = Math.sqrt(this.x*this.x +this.y*this.y);
		return this.m;
	};
	unit() {
		if(this.x === 0
		&& this.y === 0) {
			this.x = 1;
			this.y = 1;
			return this;
		}

		this.mag();
		this.x /= this.m;
		this.y /= this.m;
		this.mag();

		return this;
	};
};
let updateID = 1,
	lastID = 0,
	ooo = false, //  OUR OF ORDER UPDATES
	objID = 1,
	OBJECTS = {
		0: {
			size: {x:8,y:8},
			speed: 50,
			life: 500,
			range: 40,
			damage: 20
		},
		//  PROJECTILE
		1: {
			size: {x:2,y:2},
			speed: 100,
			life: 20, //  DAMAGE
		},
		//  BASE
		2: {
			size: {x:24,y:24},
			speed: 0,
			life: 1000,
			range: 60,
			damage: 50
		},
		//  TURRET
		3: {
			size: {x:16,y:16},
			speed: 0,
			life: 500,
			range: 45,
			damage: 20
		},
		//  BADDIE
		4: {
			size: {x:6,y:6},
			speed: 45,
			life: 100,
			range: 20,
			damage: 5
		},
		//  EFFECT
		5: {
			size: {x:1,y:1}
		},
		6:{
			size: {x:1,y:1}
		},
		7: {
			size: {x:32,y:32},
			life: 1
		},
		8: {
			size: {x:32,y:32},
			life: 1
		}
	},
	 //  TYPE,  X,  Y
	BASES = [
		[2,80,80],
		[3,130,130],
		[3,130,280],
		[3,280,130]
	],
	//  X,Y,W,H   * 32
	ROCKS = [
		[1,11,2,10],
		[3,14,2,4],
		[7,15,6,2],
		[6,6.5,1,2],
		[9,9,2,1],
		[6.75,8.5,0.5,2],
		[2,5.5,2,1],
		[5.5,2,1,2]
	],
	FORESTS = [
		[2.5,9,1,6],
		[6,8.5,1,2],
		[7,13.5,6,1],
		[7,6,2,1]
	],
	//  BUILDING NUMBERS
	PATHS = [
		[1,2,3,1,0],
		[1,3,2,1,0]
	],
	HEROES = {
		FireQueen:{skills:['boots','splosion','flamePillars'],
					speed:50,
					damage:35,
					range:35,
					aSpeed:400,
					statLine:'A fire elemental that likes to make things explode, and summons pillars of flame.'
				},
		WindSpirit:{skills:['boots','gale','leafAttack'],
					speed:60,
					damage:25,
					range:50,
					aSpeed:250,
					statLine:'A quick little faerie that can slow her enemies with gale winds, and cut them open with razor sharp leaves.'
				},
		RockMonster:{skills:['boots','rockFall','earthquake'],
					speed:40,
					damage:60,
					range:25,
					aSpeed:500,
					statLine:'A lumbering golem that hits like a truck.  He can rain rocks on his enemies and rumble the ground beneath their feet.'
				}
	},
	
	ONES = vec(1,1),
	//  KEEP TRACK OF KNOWN OBJECTS
	objList = [],

	animations = [];

	//  ANIMATION
	//  0-OBJECT ID, 1-PROPERTY, 2-EASING FORMULA, 3-CHANGE, 4-DURATION, 5-APPENDED ANIMATIONS, 6-START POINT, 7-CUMULATIVE TIME
	let processAnimations = T => {
		animations.forEach(A => {
			//  ADD T TO CUMULATIVE TIME (A[7]), MAX OUT AT DURATION (A[4])
			A[7] = Math.min(A[7]+T,A[4]);
			//  SET PROPERTY (A[1]) ON OBJECT WITH ID (A[0])
			//  TO BE EASING FUNCTION (A[2] TAKES 0-1, RETURNS 0-1)
			//  WITH ARGUMENT CUMULATIVE TIME OVER DURATION (A[7]/A[4] GIVES 0-1 COMPLETENESS OF ANIMATION)
			//  MULTIPLY THAT BY THE DESIRED CHANGE(A[3]) AND ADD IT TO THE ORIGINAL POSITION (A[6])
			if(game.objects[A[0]])
			// && game.objects[A[0]][A[1]])
				game.objects[A[0]][A[1]] = A[2](A[7]/A[4]) * A[3] + A[6];
			// if(A[1] === 'mSpeed')

			//  IF CUMULATIVE TIME EQUALS DURATION WE ARE COMPLETE
			if(A[7] === A[4]) {
				animations.splice(animations.indexOf(A),1);
				if(A[5])
					registerAnimation(A[5])
			}
		})
	},
	registerAnimation = A => {
		if(game.objects[A[0]])
		// && game.objects[A[0]][A[1]])
			animations.push([A[0],A[1],A[2],A[3],A[4],A[5],game.objects[A[0]][A[1]],0])
	},
	linear = x => x,
	anm,
	isAnimated = (id,prop) => {
		anm = false;
		animations.forEach(A => {
			if(A[0] === id
			&& A[1] === prop)
				anm = true;
		});
		return anm;
	},
	removeAnimations = (id,prop) => {
		animations.forEach(A => {
			if(A[0] === id
			&& prop?A[1] === prop:1)
				animations.splice(animations.indexOf(A),1);
		})
	},
	buttonFunctions = [


    ],
    buttonCooldowns = [],
    assignButtonFunctions = (id,h) => {
    	// console.log('assigning buttons,',id,h)
    	buttonCooldowns[id] = {};
    	buttonFunctions[id] = [];
    	HEROES[Object.keys(HEROES)[h]].skills.forEach((S,i) => {
    		buttonFunctions[id].push(skills[S]);
	    	buttonCooldowns[id][S] = 0;
	    	// console.log(i, game.buttons)
	    	if(game)
		    	game.buttons[i].parent = S;
    	});
		if(game && game.objects[id]) {
	    	game.objects[id].mSpeed = HEROES[Object.keys(HEROES)[h]].speed;
	    	game.objects[id].damage = HEROES[Object.keys(HEROES)[h]].damage;
	    	game.objects[id].aRange = HEROES[Object.keys(HEROES)[h]].range;
	    	game.objects[id].aSpeed = HEROES[Object.keys(HEROES)[h]].aSpeed;
		}
    	// console.log(buttonFunctions);
    	// game.objects[id].subtype = h;
    	if(server) {
    		// console.log('sending changes')
			for(_id in game.players) {
				// console.log(_id,game.players[_id])
				game.players[_id].user.socket.emit('changedHero',{id:id,hero:h});
			}
		} else {
			// console.log(id,game.objects)
			if(game && game.objects[id])
				game.objects[id].subtype = h;
		}
    },
    skills = {
    	boots: {
    		pressed: (id) => {
    			if(buttonCooldowns[id].boots === 0)
	    			skills.boots.activate(id);

    		},
    		activate: (id) => {	
				registerAnimation([id,'mSpeed',linear,50,2000,[id,'mSpeed',linear,-50,2000,]]);
				buttonCooldowns[id].boots = skills.boots.cooldown;

			},
			cooldown: 10000
    	},
    	dash: {
    		pressed: (id,skill='dash') => {
    			if(!server) {
					if(buttonCooldowns[id][skill] === 0) {
						if(game.player.skillPrepped === skill)
							game.player.skillPrepped = null;
						else game.player.skillPrepped = skill
					}
				}
    		},
    		activate: (id,pos,skill='dash') => {
    			game.objects[id].mTarget.copy(pos);
    			_tVec.copy(pos).sub(game.objects[id].pos);
    			registerAnimation([id,'x',linear,_tVec.x,250]);
    			registerAnimation([id,'y',linear,_tVec.y,250]);
				buttonCooldowns[id][skill] = skills[skill].cooldown;
			
    		},
    		cooldown: 2000,
    		radius: 50
    	},
    	splosion: {
    		pressed: (id,skill='splosion') => {
    			if(!server) {
					if(buttonCooldowns[id][skill] === 0) {
						if(game.player.skillPrepped === skill)
							game.player.skillPrepped = null;
						else game.player.skillPrepped = skill
					}
				}
    		},
    		activate: (id,pos,skill='splosion') => {
    			game.objects[id].visible = 1000;
    			if(!client) {
    				_obj3 = game.op.newObject({pos:pos,type:5,team:game.objects[id].team,aTarget:{},subtype:0});
    				_obj3.effect = effects[0];
    				// _obj3.size.scl(10);
    				game.objects[_obj3.id] = _obj3;
    			}
				buttonCooldowns[id][skill] = skills[skill].cooldown;

    			// }
    		},
    		cooldown: 2000,
    		radius: 75
    	},
    	
    	
    	gale: {
    		pressed: (id,skill='gale') => {
    			if(!server) {
					if(buttonCooldowns[id][skill] === 0) {
						if(game.player.skillPrepped === skill)
							game.player.skillPrepped = null;
						else game.player.skillPrepped = skill
					}
				}
    		},
    		activate: (id,pos,skill='gale') => {
    			game.objects[id].visible = 1000;
    			if(!client) {
    				_obj3 = game.op.newObject({pos:pos,type:5,team:game.objects[id].team,aTarget:{},subtype:1})
    				_obj3.effect = effects[1];
    				game.objects[_obj3.id] = _obj3;
    			}

    			buttonCooldowns[id][skill] = skills[skill].cooldown;
    		},
    		cooldown: 12000,
    		radius: 75
    	},
    	leafAttack: {
    		pressed: (id,skill='leafAttack') => {
    			if(!server) {
					if(buttonCooldowns[id][skill] === 0) {
						if(game.player.skillPrepped === skill)
							game.player.skillPrepped = null;
						else game.player.skillPrepped = skill
					}
				}
    		},
    		activate: (id,pos,skill='leafAttack') => {
    			game.objects[id].visible = 1000;
    			if(!client) {
    				_obj3 = game.op.newObject({pos:pos,type:5,team:game.objects[id].team,aTarget:{},subtype:2})
    				_obj3.effect = effects[2];
    				game.objects[_obj3.id] = _obj3;
    				
    			}


    			buttonCooldowns[id][skill] = skills[skill].cooldown;
    		},
    		cooldown: 8000,
    		radius: 65
    	},
    	flamePillars: {
    		pressed: (id,skill='flamePillars') => {
    			if(!server) {
					if(buttonCooldowns[id][skill] === 0) {
						if(game.player.skillPrepped === skill)
							game.player.skillPrepped = null;
						else game.player.skillPrepped = skill
					}
				}
    		},
    		activate: (id,pos,skill='flamePillars') => {
    			game.objects[id].visible = 1000;
    			if(!client) {

    				for(let i=0; i<10; i++) {
    					// setTimeout(() => {
    						_tVec.copy(pos).sub(game.objects[id].pos).unit().scl((i+1)/10).scl(75).add(game.objects[id].pos);
	    					_obj3 = game.op.newObject({pos:_tVec,type:5,team:game.objects[id].team,aTarget:{},subtype:3});
		    				_obj3.effect = effects[3];
		    				// _obj3.size.scl(10);
		    				_obj3.aTime = 200 + 200*i;
		    				game.objects[_obj3.id] = _obj3;
		    			// },200*i);		
    				}    				
    			}
				buttonCooldowns[id][skill] = skills[skill].cooldown;
    		},
    		cooldown: 10000,
    		radius: 75
    	},
    	rockFall: {
    		pressed: (id,skill='rockFall') => {
    			if(!server) {
					if(buttonCooldowns[id][skill] === 0) {
						if(game.player.skillPrepped === skill)
							game.player.skillPrepped = null;
						else game.player.skillPrepped = skill
					}
				}
    		},
    		activate: (id,pos,skill='rockFall') => {
    			game.objects[id].visible = 1000;
    			if(!client) {


    					// setTimeout(() => {
    						// _tVec.copy(pos).sub(game.objects[id].pos).unit().scl((i+1)/10).scl(75).add(game.objects[id].pos);
	    					_obj3 = game.op.newObject({pos:pos,type:5,team:game.objects[id].team,aTarget:{},subtype:4});
		    				_obj3.effect = effects[4];
		    				// _obj3.size.scl(10);
		    				// _obj3.aTime = 200 + 200*i;
		    				game.objects[_obj3.id] = _obj3;
		    			// },200*i);		
    				// }    				
    			}
				buttonCooldowns[id][skill] = skills[skill].cooldown;
    		},
    		cooldown: 2000,
    		radius: 75
    	},
    	earthquake: {
    		pressed: (id,skill='earthquake') => {
    			if(!server) {
					if(buttonCooldowns[id][skill] === 0) {
						if(game.player.skillPrepped === skill)
							game.player.skillPrepped = null;
						else game.player.skillPrepped = skill
					}
				}
    		},
    		activate: (id,pos,skill='earthquake') => {
    			game.objects[id].visible = 1000;
    			if(!client) {


    					// setTimeout(() => {
    						// _tVec.copy(pos).sub(game.objects[id].pos).unit().scl((i+1)/10).scl(75).add(game.objects[id].pos);
	    					_obj3 = game.op.newObject({pos:pos,type:5,team:game.objects[id].team,aTarget:{},subtype:5});
		    				_obj3.effect = effects[5];
		    				// _obj3.size.scl(10);
		    				// _obj3.aTime = 200 + 200*i;
		    				game.objects[_obj3.id] = _obj3;
		    			// },200*i);		
    				// }    				
    			}
				buttonCooldowns[id][skill] = skills[skill].cooldown;
    		},
    		cooldown: 2000,
    		radius: 75
    	}
    	
    	

    },
    pID = 0,
    //  EFFECTS LIST
    effects = [
	    //  0 - EXPLOSION
	    {
	    	scale: 10,
	    	delay: 350,
	    	duration: 350,
	    	//  SHOULD BE CALLED EVERY FRAME OF DURATION (MAKE PARTICLES)
	    	fx: id => {
	    		// console.log('wtf')

	    		if(game.objects[id]) {
	    			//  RANDOM SPOT INSIDE EFFECT
		    		_tVec.x = (Math.random()*game.objects[id].size.x) + game.objects[id].x - game.objects[id].size.x/2;
		    		_tVec.y = (Math.random()*game.objects[id].size.y) + game.objects[id].y - game.objects[id].size.y/2;
		    		_obj3 = game.op.newObject({
		    			pos:_tVec,
		    			type:6,
		    			subtype:1,
		    			id:client?'p'+pID:null
		    		});
		    		pID = (pID + 1) % 10000


		    		_obj3.initParticle(id);
		    		game.objects[_obj3.id] = _obj3;

		    	}
	    	},
	    	//  SHOULD BE CALLED FOUR TIMES A SECOND FOR EACH OBJECT CAUGHT IN THE EFFECT
	    	affect: id => {
	    		game.objects[id].takeDamage(25);
	    	},
	    },
	    //. 1 - GALE SLOW
	    {
	    	scale: 30,
	    	delay: 600,
	    	duration: 1000,
	    	fx: id => {
	    		// console.log('wtf2')
	    		if(game.objects[id]) {
		    		//. RANDOM SPOT ON LEFT EDGE
		    		_tVec.x = game.objects[id].pos.x - (game.objects[id].size.x/2);
		    		_tVec.y = game.objects[id].pos.y + Math.random() * game.objects[id].size.y - game.objects[id].size.y/2;
		    		_obj3 = game.op.newObject({
		    			pos:_tVec,
		    			type:6,
		    			subtype:2,
		    			id:client?'p'+pID:null
		    		});
		    		pID = (pID + 1) % 10000


		    		_obj3.initParticle(id);
		    		game.objects[_obj3.id] = _obj3;

		    	}
	    	},
	    	affect: id => {
	    		registerAnimation([id,'mSpeed',linear,-25,2000,[id,'mSpeed',linear,25,2000,]]);
	    	}
	    },
	    //. 2 - LEAF ATTACK
	    {
	    	scale: 50,
	    	delay: 400,
	    	duration: 1200,
	    	fx: id => {
	    		if(game.objects[id]) {
		    		//. RANDOM SPOT ON LEFT EDGE
		    		_tVec.x = game.objects[id].pos.x - (game.objects[id].size.x/2);
		    		_tVec.y = game.objects[id].pos.y + Math.random() * game.objects[id].size.y - game.objects[id].size.y/2;
		    		_obj3 = game.op.newObject({
		    			pos:_tVec,
		    			type:6,
		    			subtype:0,
		    			id:client?'p'+pID:null
		    		});
		    		pID = (pID + 1) % 10000



		    		_obj3.initParticle(id);
		    		game.objects[_obj3.id] = _obj3;

		    	}
	    	},
	    	affect: id => {
	    		game.objects[id].takeDamage(15);
	    	}
	    },
	    //. 3 - PILLARS OF FIRE
	    {
	    	scale: 6,
	    	delay: 500,
	    	duration: 5000,
	    	//  SHOULD BE CALLED EVERY FRAME OF DURATION (MAKE PARTICLES)
	    	fx: id => {
	    		// console.log('wtf')

	    		if(game.objects[id]) {
	    			//  RANDOM SPOT INSIDE EFFECT
		    		_tVec.x = (Math.random()*game.objects[id].size.x) + game.objects[id].x - game.objects[id].size.x/2;
		    		_tVec.y = (Math.random()*game.objects[id].size.y) + game.objects[id].y - game.objects[id].size.y/2;
		    		_obj3 = game.op.newObject({
		    			pos:_tVec,
		    			type:6,
		    			subtype:3,
		    			id:client?'p'+pID:null
		    		});
		    		pID = (pID + 1) % 10000

		    		// console.log(pID)

		    		_obj3.initParticle(id);
		    		game.objects[_obj3.id] = _obj3;

		    	}
	    	},
	    	//  SHOULD BE CALLED FOUR TIMES A SECOND FOR EACH OBJECT CAUGHT IN THE EFFECT
	    	affect: id => {
	    		game.objects[id].takeDamage(25);
	    	},
	    },
	    //. 4 - ROCKFALL
	    {
	    	scale: 60,
	    	delay: 300,
	    	duration: 5000,
	    	fx: id => {
	    		if(game.objects[id]) {
	    			//  RANDOM SPOT ABOVE EFFECT
		    		_tVec.x = (Math.random()*game.objects[id].size.x) + game.objects[id].x - game.objects[id].size.x/2;
		    		_tVec.y = (Math.random()*game.objects[id].size.y) + game.objects[id].y - game.objects[id].size.y;
		    		_obj3 = game.op.newObject({
		    			pos:_tVec,
		    			type:6,
		    			subtype:4,
		    			id:client?'p'+pID:null
		    		});
		    		pID = (pID + 1) % 10000


		    		_obj3.initParticle(id);
		    		game.objects[_obj3.id] = _obj3;

		    	}
	    	},
	    	affect: id => {
	    		game.objects[id].takeDamage(5);
	    	},
	    },
	    //  5 - EARTHQUAKE
	    {
	    	scale: 75,
	    	delay: 500,
	    	duration: 2000,
	    	fx: id => {
	    		if(game.objects[id]) {
	    			//  RANDOM SPOT BELOW EFFECT
		    		_tVec.x = (Math.random()*game.objects[id].size.x) + game.objects[id].x - game.objects[id].size.x/2;
		    		_tVec.y = (Math.random()*game.objects[id].size.y) + game.objects[id].y - game.objects[id].size.y/2;
		    		_obj3 = game.op.newObject({
		    			pos:_tVec,
		    			type:6,
		    			subtype:5,
		    			id:client?'p'+pID:null
		    		});
		    		pID = (pID + 1) % 10000


		    		_obj3.initParticle(id);
		    		game.objects[_obj3.id] = _obj3;

		    	}
	    	},
	    	affect: id => {game.objects[id].takeDamage(10);},

	    }
    ],
    particles = [
	    //  0
	    {
	    	scale: 2,
	    	life: 350,
	    	// 0 - up, 1 - right, 2 - down, 3 - left, 4 - in, 5 - out
	    	direction: 1,
	    	speed: 150,
	    	fillStyle: 'lightgreen'
	    },
	    //  1
	    {
	    	scale:5,
	    	life: 100,
	    	// 0 - up, 1 - right, 2 - down, 3 - left, 4 - in, 5 - out
	    	direction: 5,
	    	speed: 20,
	    	fillStyle: 'red'
	    },
	    //  2
	    {
	    	scale: 3,
	    	life: 450,
	    	direction: 1,
	    	speed: 75,
	    	fillStyle: 'rgba(255,255,255,0.3)'
	    },
	    {
	    	scale:3,
	    	life: 70,
	    	// 0 - up, 1 - right, 2 - down, 3 - left, 4 - in, 5 - out
	    	direction: 0,
	    	speed: 200,
	    	fillStyle: 'red'
	    },
	    //. 4 - ROCKFALL
	    {
	    	scale: 4,
	    	life: 350,
	    	direction: 2,
	    	speed: 100,
	    	fillStyle: 'grey'
	    },
	    //. 5 - EARTHQUAKE
	    {
	    	scale: 15,
	    	life: 100,
	    	direction: 0,
	    	speed: 10,
	    	fillStyle: 'saddlebrown'
	    },

    ];


	










// - - - - - - - - - - - - - - - - - - - - - - - - - 
//. Timing
// - - - - - - - - - - - - - - - - - - - - - - - - - 
let paused = false,
    timePaused = 0,
    startT = null,
    lastT = 0,
    deltaT = 0,
    simT = 1000/60,
    gameTime = 0,
    simulate = timeStamp => {
    	if(startT === null)
    		startT = Date.now();
        if(!paused) {
            deltaT += timeStamp - lastT;
            lastT = timeStamp;

            begin(timeStamp);
            while(deltaT > simT) {
                deltaT -= simT;
                gameTime += simT;
                update(simT);
            }
            if(!server) render();
        } else {
            deltaT += timeStamp - lastT;
            lastT = timeStamp;
            while(deltaT > simT) {
                deltaT -= simT;
                timePaused += simT;
            }
        }
		if(server) {
			if(game)
				setTimeout(()=>{simulate(Date.now()-startT+simT)},simT);
		}
		else requestAnimationFrame(simulate);
    },
    //  SERVER RECEIVING INPUT FROM PLAYERS
    receiveInput = input => {
    	if(game && game.input[local?game.player.id:input[0]])
    		game.input[local?game.player.id:input[0]].push(input[1]);
    },
    receiveUpdate = update => {
    	if(game) game.updates.push(JSON.parse(update));
    },

    

    //  FREQUENCY OF SERVER UPDATES
    updatePeriod = 50,
    updateTime = 0,
    
    begin = tS => {
    	if(game) {
	    	if(server) {
				if(game
				&& tS > updateTime + updatePeriod) {
					game.updateUsers();
					updateTime = tS;
				}

	    	} else {
	    		// console.log(heroPicked)
				if(game
				&& touches.length) {
					//  CREATE INPUT OBJECT, ID + ALL CURRENT TOUCHES
					_input = [game.player.id,touches.slice()];

					//  KEEP TRACK OF WHETHER A BUTTON HAS BEEN PRESSED
					_id = 0;
					//  PROCESS TOUCHES
					_input[1].forEach(I => {
						//  IGNORE THE TOUCHES TO HEROES
						if(heroPicked !== null
						&& I.x === heroPicked.x
						&& I.y === heroPicked.y) {
							_input.splice(_input.indexOf(I));
							heroPicked = null;
							return;
						}
						//  LOOK FOR TOUCHED BUTTONS
						game.buttons.forEach((B,i) => {
							//  IF BUTTON PRESSED
							if(pointCollision(I,B)) {
								_id = 1;
								if(client)
									buttonFunctions[game.player.id][i].pressed(game.player.id);
								I.button = game.buttons[i].parent;
							}
						});

						//  IF BUTTON PRESSED, NO CHECK FOR OBJECT TOUCHES
						if(_id) return;

						//  IF WE HAVEN'T RETURNED, TRANSLATE TOUCH TO GAME SPACE (FROM SCREEN SPACE)
						_tVec.copy(game.cam.pos);
	                    if(game.team === 1)
	                        _tVec.scl(-1).add(game.field);
	                    I.x = I.x/game.scale + _tVec.x - game.cam.size.x/2;
						I.y = I.y/game.scale + _tVec.y - game.cam.size.y/2;
						//  I DON'T UNDERSTAND WHY I'M DOING THIS AGAIN, BUT IT WORKS 
						if(game.team === 1) {
	                        I.x = game.field.x - I.x;
	                        I.y = game.field.y - I.y;
	                    }


						
						//  IF A SKILL IS PREPPED, CHECK TO SEE IF THE TOUCH IS INSIDE THE RADIUS
						if(game.player.skillPrepped
						&& game.player.pos.dist(I) < skills[game.player.skillPrepped].radius) {
							I.activate = game.player.skillPrepped;
							if(client)
								skills[game.player.skillPrepped].activate(game.player.id,I);
							game.player.skillPrepped = null;
							// _input.splice(_input.indexOf(I,1));
							
							return;
						};
	     //                touches.push({
	     //                    x: e.clientX/game.scale+_tVec.x-game.cam.size.x/2,
	     //                    y: e.clientY/game.scale+_tVec.y-game.cam.size.y/2,
	     //                });
						//  FIND POSSIBLE OBJECT TOUCHES
						colliders = game.bp.findMatches({pos:I,team:game.team,life:1,id:-1});
						colliders.forEach(O => {
							// if(game.player.parent === null
						// &&_obj.parent !== game.player.parent)
							//  IF THE OBJECT ISN'T ON OUR TEAM, AND THE OBJECT IS TOUCHED
							if(O.team !== game.team
							&& O.type !== 7
							&& O.type !== 8
							&& pointCollision(I,O)) {
								
								//  IF THE OTHER OBJECT IS IN THE WOODS
								if(O.parent !== null) {
									//  IF THIS OBJECT IS IN THE SAME WOODS
									if(O.parent === game.player.parent)
										I.target = O.id;
								} else I.target = O.id;
								// console.log(I.target)
							}
						})
					})
					if(client) socket.emit('input',JSON.stringify(_input))
					if(local) receiveInput(_input);
					touches.length = 0;
				}
	    	}
	    }
    	
    },
    update = simT => {
    	if(game) {
	    		if(game.gameOver && game.gameOver <= 0) {
		    		timePaused = 0;
		    		gameTime = 0;
	    		} else game.update(simT);

	    	}

    },
    render = () => {
	    	canvas.context.fillStyle = 'cornflowerblue';
	    	canvas.context.fillRect(0,0,canvas.width,canvas.height);
    	if(game)
    		game.render();
    },
    end = () => {},



    game = null,
    server,
    local = false,
    client = true,

    toRender,

	_tVec = vec(),
	_obj,
	_obj2 = new Obj({}),
	_obj3,
    _input,
    _id,
    _id2,
    _update;
























let colliders,
	pointCollision = (P,O) => {
		if(P.x > O.pos.x - O.size.x/2
		&& P.x < O.pos.x - O.size.x/2 + O.size.x
		&& P.y > O.pos.y - O.size.y/2
		&& P.y < O.pos.y - O.size.y/2 + O.size.y)
			return true;
	},
	circleCollision = (O1,O2) => {
		//  DISTANCE BETWEEN THEM, mag() CALCULATES THE LENGTH OF THE HYPETENOUSE
		_tVec.copy(O2.pos).sub(O1.pos).mag();
		//  SUBTRACT HALF WIDTHS (RADII) FROM DISTANCE
		_tVec.m -= O1.size.x/2 + O2.size.x/2;
		//  IF THE HALF WIDTHS ARE GREATER THAN THE DISTANCE, THEY ARE COLLIDING
		if(_tVec.m < 0) {
			_id2 = _tVec.m;
			_tVec.unit().scl(_id2);
			//  THE RESULT IS HOW MUCH THEY ARE OVERLAPPING BY
			return _tVec;
		} else return false;

	},
	rectCollision = (O1,O2) => {

		//  DISTANCE BETWEEN THEM
		_tVec.copy(O2.pos).sub(O1.pos);
		//  SEPERATELY SUBTRACT HALF WIDTHS FROM DISTANCES
		_tVec.x = Math.abs(_tVec.x) - (O1.size.x/2 + O2.size.x/2);
		_tVec.y = Math.abs(_tVec.y) - (O1.size.y/2 + O2.size.y/2);
		//  IF THE   IS LESS THAN THE HALF WIDTHS ON BOTH AXES
		//  THE OBJECTS ARE COLLIDING
		if(_tVec.x < 0 && _tVec.y < 0) {

			//  SET THE LARGE AXIS TO ZERO, WE ONLY WANT THE MINIMUM TRANSLATION VECTOR
			if(_tVec.x > _tVec.y) {
				if(O1.x > O2.x)
					_tVec.scl(-1)
				_tVec.y = 0;
			}
			else {
				if(O1.y > O2.y)
					_tVec.scl(-1);
				_tVec.x = 0;
			}
			return _tVec;
		} else return false
	},
	_o,
	ObjectPool = obj => {
		let pool = {
			active: [],
			inactive: []
		};

		pool.newObject = function(options) {
			let _o;
			if(pool.inactive.length < 1) {
				_o = new obj({});
				_o.init(options);
				_o.release = () => {
					pool.active.splice(pool.active.indexOf(_o),1);
					pool.inactive.push(_o);
				}
			} else {
				_o = pool.inactive.shift();
				_o.init(options);
			};
			pool.active.push(_o);
			game.objects[_o.id] = _o;
			return _o;
		};
		return pool;
	},
	rowResult,areaResult,
	_top, _bottom, _right,
	_row, _cells, _cell,
	matchResults, results,knownIDs,
	BroadPhase = options => {
		let bp = {};
		bp.grid = [];

		//  ONLY USED FOR DEBUGGIN GRID I THINK
		// bp.w = options.w;
		// bp.h = options.h;

		bp.size = options.size;

		//  FOR DEBUG REMOVE LATER
		// bp.debugID = 1;
		// bp.debugCells = [];

		//  FIND POINT IN GRID
		bp.findCell = function(point) {
			if(point) {
				return vec(
					Math.floor(point.x/bp.size),
					Math.floor(point.y/bp.size)
				)
			}
		};

		//  FIND ALL THE CELLS IN A ROW
		bp.findCellsRow = function(c1,c2) {
			rowResult = [];
			for(let i=0,iL=c2.x-c1.x+1; i<iL; i++)
				rowResult.push(vec(c1.x+i, c1.y));
			return rowResult;
		};

		bp.findCellsArea = function(obj) {
			areaResult = [];
			if(!obj.size)
				obj.size = vec(1,1);
			_top = bp.findCell({x:obj.pos.x - obj.size.x/2,y:obj.pos.y - obj.size.y/2});
			_right = bp.findCell({x:obj.pos.x+obj.size.x/2,y:obj.pos.y});
			_bottom = bp.findCell({x:obj.pos.x,y:obj.pos.y+obj.size.y/2});
			
			for(let i=0,iL=_bottom.y-_top.y + 1; i<iL; i++) {
				_row = bp.findCellsRow(
					vec(_top.x, _top.y + i),
					vec(_right.x, _top.y + i)
				);
				areaResult = areaResult.concat(_row)
			};

			//  FOR DEBUG, REMOVE LATER
			// if(bp.debugID
			// && bp.debugID === obj.id)
			// 	bp.debugCells = areaResult;

			return areaResult;
		};

		bp.addToGrid = function(obj) {
			_cells = bp.findCellsArea(obj);
			for(let i=0,iL=_cells.length; i<iL; i++) {
				_cell = _cells[i];
				if(!bp.grid[_cell.y])
					bp.grid[_cell.y] = [];
				if(!bp.grid[_cell.y][_cell.x])
					bp.grid[_cell.y][_cell.x] = [];
				bp.grid[_cell.y][_cell.x].push(obj);
			}
		};

		// bp.clearGrid = function() {
		// 	bp.grid = [];
		// };

		bp.populateGrid = function(objects) {
			for(_obj in objects) {
				bp.addToGrid(objects[_obj]);
			}
			// objects.forEach( object => {
			// 	bp.addToGrid(object)
			// });
		};

		bp.findMatches = function(object,bothTeams, print) {

			matchResults = [];
			knownIDs = [];
			results = [];
			//  FIND THE CELLS OCCUPIED BY THE OBJECT
			_cells = bp.findCellsArea(object);




			//  CYCLE THROUGH THEM
			_cells.forEach(cell => {
				
				//  IF THE CELL IN QUESTION EXISTS
				if(bp.grid[cell.y] !== undefined
				&& bp.grid[cell.y][cell.x] !== undefined)
					//  CONCATENATE THE ARRAY AT THAT CELL TO THE RESULTS ARRAY 
					matchResults = matchResults.concat(bp.grid[cell.y][cell.x])
			});

			//  CYCLE THROUGH RESULTS
			matchResults.forEach((obj,i) => {
				
				//  IF IT ISN'T THE SAME OBJECT
				if(obj.id !== object.id
				&& obj.type !== 1
				&& obj.type !== 5
				&& obj.type !== 6
				//  AND WE HAVEN'T SEEN IT ALREADY
				&& results.indexOf(obj) === -1
				
				&& obj.life > 0
				&& obj.type !== 5) {

					if(bothTeams)
						results.push(obj);
					else {
						if(obj.team !== undefined
						&& obj.team !== object.team)	
							results.push(obj);
					}
					
					

					// FOR DEBUG REMOVE LATER
					// if(object.id === bp.debugID)
					// 	obj.debug = true;
				}
			});

			return results;
		};
		// bp.drawBroadPhaseGrid = function(context) {
		// 	let rows = Math.floor(bp.h/bp.size);
		// 	let cols = Math.floor(bp.w/bp.size);

		// 	context.strokeStyle = 'green';
		// 	for(let x=0; x<cols+1; x++) {
		// 		context.beginPath();
		// 		context.moveTo(x*bp.size,0);
		// 		context.lineTo(x*bp.size,bp.h);
		// 		context.stroke();
		// 	}
		// 	for(let y=0; y<rows+1; y++) {
		// 		context.beginPath();
		// 		context.moveTo(0,y*bp.size);
		// 		context.lineTo(bp.w,y*bp.size);
		// 		context.stroke();
		// 	}
		// 	if(bp.debugCells.length > 0) {
		// 		bp.debugCells.forEach(C => {
		// 			context.fillStyle = 'rgba(20,180,70,0.5)';
		// 			context.fillRect(C.x * bp.size,
		// 							 C.y * bp.size,
		// 							 bp.size,bp.size);
		// 		})
		// 	}
		// }
		return bp;
	};

