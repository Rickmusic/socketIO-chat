var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
let currentUsers = [];
let servercolor = "#FF0000"
let storage = [];
app.use(express.static(__dirname));

// Serving our html file from our server //
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

// Handles the user connected and disconnected events//
io.on('connection', function (socket) {

    // Generates client as a user //
    socket.on('newuser', function (username, callback) {
        if (valid_name(username) === true) {
            socket.emit("createUser", username);
            // Updates all other users of user added event //
            io.emit('updateUsers', currentUsers);
            socket.nickname = username;
            callback(true);
            getHistory();
        }
        else {
            callback(false);
        }

    });
    // Sends event of users removed event //
    socket.on('disconnect', function () {
        currentUsers.splice(currentUsers.indexOf(socket.nickname), 1);
        io.emit('updateUsers', currentUsers);
    });

    // Handles Chat message sent //
    socket.on('chat message', function (msg, user, color) {
        // Emits the message to all clients /
        // Catches commands //
        let messageObject = genMessageObject(msg, user, color);
        store(messageObject);
        io.emit('chat message', messageObject);
        if (msg[0] === "/") {
            let warning = processCommand(msg, socket);
            io.emit('chat message', genMessageObject(warning, "[Server]", servercolor))
        }

    });

    // Handles users setting nickname or resetting nickname //
    socket.on('nicknamechange', function (nick) {
        console.log(socket.nickname);
    });
});


// //
http.listen(port, function () {
    console.log('listening on *:' + port);
});

// Generates user names
function genUsername() {
    let name = "username" + usercount;
    currentUsers.push(name);
    return name;
}

function store(msg) {
    storage.push(msg);
    if(msg.length > 200){
        storage.shift();
    }
}

function getHistory() {
    storage.forEach(function(entry) {
        io.emit('chat message', entry);
    });
}
// Creates message object using message content provided by user.
function genMessageObject(msg, user, color) {
    let message = {
        content: msg,
        timestamp: new Date(),
        user: user,
        color: color,
    };
    return message;
}

function valid_name(username) {
    if(!currentUsers.includes(username)) {
        currentUsers.push(username);
        return true;
    }
    else{
        return false;
    }


}

function processCommand(msg, socket) {
    let words = msg.split(" ");
    let warning = "";
    // Handles nick name change //
    if (words[0] === "/nick" && words.length === 2) {
        if(changenick(words[1], socket)){
            warning = "Nickname changed";
        }
        else{
            warning = "something went wrong changing nickname";
        }
    }
    else if (words[0] === "/nickcolor") {
        if (colorchange(words[1], socket)) {
            warning = "Color successfully changed"
        }
        else {
            warning = "Color could not be changed to " + words[1] + " expecting RRGGBB";
        }
    }
    else {
        warning = "Command not known try /nick nickname or /nickcolor RRGGBB";
    }

    return warning;

}

function changenick(nickname, socket) {
    if (valid_name(nickname) === true) {
        currentUsers.splice(currentUsers.indexOf(socket.nickname), 1);
        socket.emit("createUser", nickname);
        // Updates all other users of user added event //
        io.emit('updateUsers', currentUsers);
        socket.nickname = nickname;
        return true;
    }
    else{
        return false;
    }
}

function colorchange(hexval, socket) {
    if(isNaN(parseInt(hexval,16))){
        return false;
    }
    else{
        socket.emit("changeColor", "#"+hexval);
        return true;
    }

}