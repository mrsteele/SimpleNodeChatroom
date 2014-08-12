var http = require('http'),
	fs = require('fs'),
	sanitize = require('validator').sanitize;
	
var app = http.createServer(function (request, response) {
	fs.readFile("client.html", 'utf-8', function (error, data) {
		response.writeHead(200, {'Content-Type': 'text/html'});
		response.write(data);
		response.end();
	});
}).listen(1337);

var io = require('socket.io').listen(app);

// this all runs when a client first connects
io.sockets.on('connection', function(socket) {
	/*
	var clients = {};
	socket.on('log_in', function(data){
		clients[data] = socket.id;
	});
	
	}
	*/
	socket.on('message_to_server', function(data) { 
		var escaped_message = sanitize(data["message"]).escape();
		var escaped_name = sanitize(data["name"]).escape();
		io.sockets.emit("message_to_client",{ name: escaped_name, message: escaped_message }); 
	});
	socket.on('server_user_logged_in', function(data) { 
		var escaped_name = sanitize(data["name"]).escape();
		io.sockets.emit("user_logged_in",{ name: escaped_name }); 
	});
	socket.on('server_user_logged_out', function(data) { 
		var escaped_name = sanitize(data["name"]).escape();
		io.sockets.emit("user_logged_out",{ name: "1"+escaped_name }); 
	});
	socket.on('disconnect', function () {
        console.log('A socket with sessionID ' + socket.id 
            + ' disconnected!');
    });
});
