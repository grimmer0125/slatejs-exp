var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3001;

app.get('/', function(req, res){
  res.send('<h1>Hello world</h1>')
});

io.on('connection', function(socket){
  console.log('connected client id:', socket.id);

  socket.on('cursor', function(data){
    console.log('get client update cursor:', data);
    socket.broadcast.emit('cursor', data);
  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
