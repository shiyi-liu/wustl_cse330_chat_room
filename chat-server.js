// Require the packages we will use:
var http = require("http"),
	socketio = require("socket.io"),
	fs = require("fs");

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp){
	// This callback runs when a new connection is made to our HTTP server.
	
	fs.readFile("client.html", function(err, data){
		// This callback runs when the client.html file has been read from the filesystem.
		
		if(err) return resp.writeHead(500);
		resp.writeHead(200);
		resp.end(data);
	});
});
app.listen(3456);



//create array to store users
let users = [];
let rooms = []; 
let usersObj = []; 

// Create class for rooms
let Room = function(name, creator, password){
	this.name=name; 
	this.creator = creator;
	this.password = password; 
	this.banned = [];
	this.users = [];
	this.badwords = [];
}

// Create class for users
let User = function(username, socketId){
	this.username = username; 
	this.socketId = socketId;
}

let a = new Room("test", "ok", null);
let b = new Room("test2", "ok", "hey");
rooms.push(a);
rooms.push(b);


// Do the Socket.IO magic:
var io = socketio.listen(app);

io.sockets.on("connection", function(socket){
	// This callback runs when a new Socket.IO connection is established.
	socket.room = null;
	// when a user leaves the page
	socket.on("disconnect", function(data){
		console.log(socket.username);
		console.log(users);
		if(users.indexOf(socket.username)>-1){
			for(let i=0;i<rooms.length;i++){
				if(rooms[i].users.indexOf(socket.username)>-1){
					rooms[i].users.splice(rooms[i].users.indexOf(socket.username),1);
				}
			}
			console.log(users.indexOf(socket.username));
			users.splice(users.indexOf(socket.username),1);
			console.log(users);
			io.sockets.emit("allusers", users);
			if(socket.room!=null)
				io.in(socket.room.name).emit("roomusers", socket.room);
		}

	});

	socket.on("dm", function(data){
		console.log("DM between" + data.user1 + data.user2);
		let kickedUser = data["user2"];
		let creator = data['user1'];
		let room = data.room;

		let kickedId = null;
		for (let j=0; j<usersObj.length; j++){
			if (usersObj[j].username == kickedUser){
				kickedId = usersObj[j].socketId;
			}
		}
		for(let i=0; i<rooms.length; i++){
			if(rooms[i].name == room.name){
				rooms[i].users.splice(rooms[i].users.indexOf(kickedUser),1);
			}
		}
		let roomname = creator + kickedUser;
		io.to(kickedId).emit('dmleave', {room:room, user:creator, roomname:roomname, creator:creator});
		
		let creatorId = null;
		for (let j=0; j<usersObj.length; j++){
			if (usersObj[j].username == creator){
				creatorId = usersObj[j].socketId;
			}
		}
		for(let i=0; i<rooms.length; i++){
			if(rooms[i].name == room.name){
				rooms[i].users.splice(rooms[i].users.indexOf(creator),1);
			}
		}
		io.to(creatorId).emit("dmleave", {room:room, user:kickedUser, roomname:roomname, creator:creator});
	});

	socket.on("ban", function(word){
		console.log("Room " + socket.room.name);
		for(let i=0; i<rooms.length; i++){
			if(rooms[i].name == socket.room.name){
				console.log("badword pushed"+word);
				rooms[i].badwords.push(word);
			}
		}
	})

	// create a room and join 
	socket.on("create", function(room){
		let t = true;
		for(let i=0; i<rooms.length; i++){
			if(rooms[i].name == room.name){
				t = false;
			}
		}
		if(t){
			socket.room = room;
			console.log(room.name);
			room.users.push(socket.username);
			rooms.push(room);
			socket.join(room.name);
			console.log(room.users);
			io.sockets.emit("allrooms", rooms);
			io.sockets.emit("allusers", users);
			io.in(socket.room.name).emit("roomusers", socket.room);
			// call the function to open a div for creator to manage members
			io.to(socket.id).emit('manageMembers', socket.room);
			socket.emit("roomnoexist",socket.room);
			// Create a new obj for room
		}
		else{socket.emit("roomexist","");}
	})


	socket.on("create2", function(room){
		let t = true;
		for(let i=0; i<rooms.length; i++){
			if(rooms[i].name == room.name){
				t = false;
			}
		}
		if(t){
			socket.room = room;
			console.log(room.name);
			room.users.push(socket.username);
			rooms.push(room);
			socket.join(room.name);
			console.log(room.users);
			io.sockets.emit("allrooms", rooms);
			io.sockets.emit("allusers", users);
			io.in(socket.room.name).emit("roomusers", socket.room);
			// call the function to open a div for creator to manage members
			socket.emit("roomnoexist2",socket.room);
			// Create a new obj for room
		}
		else{
			socket.room = room;
			console.log(room.name);
			room.users.push(socket.username);
			socket.join(room.name);
			console.log(room.users);
			io.sockets.emit("allrooms", rooms);
			io.sockets.emit("allusers", users);
			io.in(socket.room.name).emit("roomusers", socket.room);
			// call the function to open a div for creator to manage members
			socket.emit("roomnoexist2",socket.room);
		}
	})

	// join a existing room
	socket.on("join", function(room){
		// get the equivelant of room obj on server side
		for(let i=0; i<rooms.length; i++){
			if(rooms[i].name == room.name){
				// check if banned
				console.log("rooms bannedlist");
				console.log(rooms[i].banned);
				let bannedList = rooms[i].banned;
				let username = null; 
				let userid = null; 
				for (let i=0; i<usersObj.length; i++){
					if (socket.id == usersObj[i].socketId){
						username = usersObj[i].username;
						userid = usersObj[i].socketId;
					}
				}
				if (bannedList == null){
					console.log("the first branch");
					socket.room = rooms[i]; 
					rooms[i].users.push(socket.username);
					socket.join(room.name);
					io.sockets.emit("allrooms", rooms); 
					io.sockets.emit("allusers", users);
					io.in(socket.room.name).emit("roomusers", socket.room);
					// acquire the id of room creator and send an updated member management list
					let creatorId = null;
					for (let j=0; j<usersObj.length; j++){
						if (usersObj[j].username == room.creator){
							creatorId = usersObj[j].socketId;
						}
					}
					io.to(creatorId).emit('manageMembers', socket.room);
				}else{
					if (!bannedList.includes(username)){
						console.log("the second branch");
						console.log(bannedList);
						socket.room = rooms[i]; 
						rooms[i].users.push(socket.username);
						socket.join(room.name);
						console.log(rooms[i].users);
						io.sockets.emit("allrooms", rooms); 
						io.sockets.emit("allusers", users);
						io.in(socket.room.name).emit("roomusers", socket.room);
						// acquire the id of room creator and send an updated member management list
						let creatorId = null;
						for (let j=0; j<usersObj.length; j++){
							if (usersObj[j].username == room.creator){
								creatorId = usersObj[j].socketId;
							}
						}
						io.to(creatorId).emit('manageMembers', socket.room);

					}else{
						console.log("running into ban join");
						io.to(userid).emit('gotBanned', room);
					}
				}
				
			}
		}
	})

	socket.on("leave", function(room){
		console.log(room.name);
		for(let i=0; i<rooms.length; i++){
			if(rooms[i].name == room.name){
				socket.room = null;
				rooms[i].users.splice(rooms[i].users.indexOf(socket.username),1);
				io.sockets.emit("allusers", users);
				io.in(room.name).emit("roomusers", rooms[i]);
			}
		}
		socket.leave(room.name);
		socket.emit("allusers", users);
		io.sockets.emit("allrooms", rooms);
	})

	socket.on("deleteRoom", function(room){
		console.log(room.name);
		if(room.creator == socket.username){
			rooms.splice(rooms.indexOf(room),1);
		}
		let kickedId = null;
		console.log(room.users);
		for(let i=0; i<room.users.length; i++){
			if(usersObj.indexOf(room.users[i])>-1){
				console.log(usersObj[usersObj.indexOf(room.users[i])].username + " is kicked.");
				kickedId = usersObj[usersObj.indexOf(room.users[i])].socketId;
				io.to(kickedId).emit('gotKicked', room);
			}
		}
		socket.leave(room.name);
		socket.emit("allusers", users);
		io.sockets.emit("allrooms", rooms);
	})

	socket.on('user_to_server', function(data) {
		// This callback runs when the server receives a new message from the client.
		let t = true;
		if(users.includes(data.user)){
			t = false;
			socket.emit("userexist","");
		}
		if(t){
			socket.username = data.user;
			socket.room = null;
			let newUser = new User (data.user, socket.id);
			usersObj.push(newUser);
			users.push(data["user"]);
			io.sockets.emit("allusers", users);
			socket.emit("loggedin",{user:data["user"] }) // broadcast the message to other users
			
			
			for(let i=0;i<rooms.length;i++)
				io.in(rooms[i].name).emit("roomusers", rooms[i]);
			io.sockets.emit("allrooms", rooms);
			if(socket.room!=null)
				io.in(socket.room.name).emit("roomusers", socket.room);
		}
	});

	socket.on('message_to_server', function(data) {
		// This callback runs when the server receives a new message from the client.
		
		console.log("message: "+data["message"]); // log it to the Node.JS output
		console.log(data["ifJoined"]);
		// verify if its a global message or a room chat
		if (data["ifJoined"] == true){
			// sending to all clients in 'game' room, including sender from 
			if(rooms.indexOf(socket.room>-1)){
				console.log("Bad words " + rooms[rooms.indexOf(socket.room)].badwords);
				let good = true;
				for(let i=0; i<rooms[rooms.indexOf(socket.room)].badwords.length; i++){
					if(data.message.includes(rooms[rooms.indexOf(socket.room)].badwords[i])){
						good = false;
					}
				}
				if(!good){
					socket.emit("nopebadword","")
				}
				else{
					io.in(data["roomJoined"]).emit("message_to_client", {user:socket.username, message:data["message"]}); // call function on roomMessage and send room chatlog
				}
			}
		}else{
			io.sockets.emit("message_to_client",{user:socket.username, message:data["message"] }) // broadcast the message to other users
		}
		
	});

	socket.on('kickusers', function(data) {
		let kickedUser = data["kickedUser"];
		let room = data['roomObj'];

		let kickedId = null;
		for (let j=0; j<usersObj.length; j++){
			if (usersObj[j].username == kickedUser){
				kickedId = usersObj[j].socketId;
			}
		}
		io.to(kickedId).emit('gotKicked', room);
		
		for(let i=0; i<rooms.length; i++){
			if(rooms[i].name == room.name){
				rooms[i].users.splice(rooms[i].users.indexOf(kickedUser),1);
			}
		}

		let creatorId = null;
		for (let j=0; j<usersObj.length; j++){
			if (usersObj[j].username == room.creator){
				creatorId = usersObj[j].socketId;
			}
		}

		io.to(creatorId).emit("manageMembers", room);
		console.log("Room users: "+ room.users);


	});

	socket.on('banusers', function(data) {
		let room = data['roomObj']; 
		let user = data['bannedUser'];
		console.log("ban users working");
		room.banned.push(user); // add banned username to banned list of th eroom obj
		for (let i=0; i<rooms.length; i++){
			if (rooms[i].name == room.name){
				rooms[i].banned.push(user);
			}
		}
		console.log(room.banned);
		// kick out the user if is in room
		if (room.users.includes(user)){
			// find the socket id for banned user
			let bannedId = null;
			for (let j=0; j<usersObj.length; j++){
				if (usersObj[j].username == user){
					bannedId = usersObj[j].socketId;
				}
			}
			io.to(bannedId).emit('gotKicked', room);
			
			for(let i=0; i<rooms.length; i++){
				if(rooms[i].name == room.name){
					rooms[i].users.splice(rooms[i].users.indexOf(user),1);
				}
			}

			let creatorId = null;
			for (let j=0; j<usersObj.length; j++){
				if (usersObj[j].username == room.creator){
					creatorId = usersObj[j].socketId;
				}
			}

			io.to(creatorId).emit("manageMembers", room);
			console.log("Room users: "+ room.users);
		}
	});

});