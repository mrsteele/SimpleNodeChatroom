var http = require('http'),
	fs = require('fs'),
	sanitize = require('validator').sanitize;
	
var app = http.createServer(function (request, response) {
	fs.readFile("index.html", 'utf-8', function (error, data) {
		response.writeHead(200, {'Content-Type': 'text/html'});
		response.write(data);
		response.end();
	});
}).listen(1337);

var io = require('socket.io').listen(app);
var clients = {};
var all_socks = {};

function s(v){
	return sanitize(v).escape();
}

io.sockets.removeAllListeners('return_username');
io.sockets.removeAllListeners('user_logged_in');
io.sockets.removeAllListeners('recieve_pm');
io.sockets.removeAllListeners('return_pm');
io.sockets.removeAllListeners('user_logged_out');

// this all runs when a client first connects
io.sockets.on('connection', function(socket) {
	
	socket.on('log_in', function(vars){
		vars['username'] = s(vars.username);
		socket.emit('return_username', { username: vars.username, clients: all_socks });
		all_socks[socket.id] = vars.username;
		if(clients.hasOwnProperty(vars.username)){
			console.log("User '"+vars.username+"' already exists. Registering new socket");
			clients[vars.username].socks[socket.id] = socket;
		}else{
			clients[vars.username] = { data: vars, socks: {}};
			clients[vars.username].socks[socket.id] = socket;
			io.sockets.emit("user_logged_in",{ username: vars.username });
		}
	});
	socket.on('send_pm', function(data){
		data.username = s(data.username);
		console.log("Attempting to send message to "+data.username);
		if(clients[data.username]){
			for(var i in clients[data.username].socks) {
				clients[data.username].socks[i].emit('recieve_pm', { sender: all_socks[socket.id], message: sanitize(data.message).escape()});
			}
			if(clients[all_socks[socket.id]]){
				for(var i in clients[all_socks[socket.id]].socks) {
					clients[all_socks[socket.id]].socks[i].emit('return_pm', { username: data.username, message: sanitize(data.message).escape() });
				}
			}
		}else{
			if(clients[all_socks[socket.id]]){
				for(var i in clients[all_socks[socket.id]].socks) {
					clients[all_socks[socket.id]].socks[i].emit('fail_pm', { username: data.username });
				}
			}
		}
	});
	socket.on('disconnect', function () {
		if(clients[all_socks[socket.id]]){
	        console.log('A socket with sessionID ' + socket.id 
	            + ' disconnected!');
	        delete clients[all_socks[socket.id]].socks[socket.id];
	        if(Object.keys(clients[all_socks[socket.id]].socks).length == 0){
		        delete clients[all_socks[socket.id]];
				io.sockets.emit("user_logged_out",{ username: all_socks[socket.id] });
	        }
	        delete all_socks[socket.id];
	    }
    });
});
