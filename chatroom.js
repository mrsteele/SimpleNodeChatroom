console.log('Started node');

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io').listen(http);
var sanitize = require('validator').sanitize;
	
app.get('/', function(req, res){
	res.sendfile('chatroom.html');
});
http.listen(1337, function(){
	console.log("listening");
});

var clients = {};
var all_socks = {};
var logs = { r1 : [], r2 : [], r3 : [] };

function s(v){
	return sanitize(v).escape();
}

io.sockets.removeAllListeners('log_in');
io.sockets.removeAllListeners('post_comment');
io.sockets.removeAllListeners('change_rooms');

// used to send to all sockets registered with a certain username
function sendToSockets(name, user, data){
	if(clients[user]){
		for(var i in clients[user].socks) {
			clients[user].socks[i].emit(name, data);
		}
		return true;
	}else{
		return false;
	}
}
function getAllInRoom(room){
	var returning = new Array();
	io.sockets.clients(room).forEach(function(socket){
		if(!(returning.indexOf(all_socks[socket.id]) > -1)){
			returning.push(all_socks[socket.id]);
		}
	});
	return returning;
}
function logit(room, message){
	logs[room].push(message);
	io.sockets.in(room).emit("log_message", { message: message } );
}
function getUserRoom(id){
	var rooms = io.sockets.manager.roomClients[id];
    for (var room in rooms) {
        if (room.length > 0) { // if not the global room ''
            return room.substr(1); // remove leading '/'
        }
    }
}
function inRoom(user, room){
	if(room == undefined){
		return false;
	}
	var found = false;
	io.sockets.clients(room).every(function(socket){
		if(all_socks[socket.id] == user){
			found = true;
			return false;
		}
	});
	return found;
}
function joinRoom(socket, room){
	if(!inRoom(all_socks[socket.id], room)){
		io.sockets.in(room).emit("user_logged_in", { username: all_socks[socket.id] } );
		logit(room, '<div class="info"><strong>'+all_socks[socket.id]+'</strong> joined '+room+'.</div>');
	}
	socket.join(room);
	socket.emit("changed_rooms", { room: room, logs: logs[room], users: getAllInRoom(room) } );
}
function leaveRoom(socket){
	room = getUserRoom(socket.id);
	socket.leave(room);
	if(!inRoom(all_socks[socket.id], room)){
		io.sockets.in(room).emit("user_logged_out", { username: all_socks[socket.id] } );
		logit(room, '<div class="info"><strong>'+all_socks[socket.id]+'</strong> left '+room+'.</div>');
	}
}

// this all runs when a client first connects
io.sockets.on('connection', function(socket) {
	socket.on('log_in', function(vars){
		vars['username'] = s(vars.username);
		all_socks[socket.id] = vars.username;
		socket.emit('return_username', { username: vars.username });
		
		if(clients.hasOwnProperty(vars.username)){
			clients[vars.username].socks[socket.id] = socket; // user already exists
		}else{
			clients[vars.username] = { data: vars, socks: {} }; // create new user
			clients[vars.username].socks[socket.id] = socket;
		}
		joinRoom(socket, 'r1');
	});
	socket.on('post_comment', function(data){
		logit(getUserRoom(socket.id), '<div class="message"><strong>'+all_socks[socket.id]+'</strong>: '+s(data.message)+'</div>');
	});
	socket.on('change_rooms', function (data) {
		leaveRoom(socket);
		joinRoom(socket, data.room);
	});
	
	socket.on('disconnect', function () {
		if(clients[all_socks[socket.id]]){
			delete clients[all_socks[socket.id]].socks[socket.id];
			if(Object.keys(clients[all_socks[socket.id]].socks).length == 0){
				leaveRoom(socket);
				delete clients[all_socks[socket.id]];
			}
			delete all_socks[socket.id];
		}
    });
});
