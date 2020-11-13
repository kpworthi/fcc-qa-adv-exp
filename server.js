
"use strict";
require('dotenv').config()
const express = require("express");
const myDB = require('./connection');
const fccTesting = require("./freeCodeCamp/fcctesting.js");
const pug = require('pug');
const passport = require('passport');
const session = require('express-session');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const cookieParser = require('cookie-parser');
const passportSocketIo = require('passport.socketio');
const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });


const routes = require('./routes');
const auth = require('./auth');

fccTesting(app); //For FCC testing purposes
app.use("/public", express.static(process.cwd() + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  key: 'express.sid',
  store: store,
  saveUninitialized: true,
  cookie: { secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'pug');

function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');

  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

/*User schema/model setup
var userSchema = new mongoose.Schema({
  username: String,
  password: String
});
var User = mongoose.model('User', userSchema);*/

//Connection to DB and all things dependant
myDB(async client => {
  const myDataBase = client.db('database').collection('users')

  routes(app, myDataBase);
  auth(app, myDataBase);

  io.use(
    passportSocketIo.authorize({
      cookieParser: cookieParser,
      key: 'express.sid',
      secret: process.env.SESSION_SECRET,
      store: store,
      success: onAuthorizeSuccess,
      fail: onAuthorizeFail
    })
  );

  let currentUsers = 0;
  io.on('connection', socket => {
    let userName = socket.request.user.name;
    currentUsers++;
    io.emit('user', {
        name: userName,
        currentUsers,
        connected: true
      });
    console.log('user ' + socket.request.user.name + ' connected');

    socket.on('disconnect', socket => {
      currentUsers--;
      io.emit('user', {
        name: userName,
        currentUsers,
        connected: false
      });
      console.log('A user has disconnected.');
    });

    socket.on('chat message', data => {
      io.emit('chat message', {
        name: userName,
        message: data
      });
    });
  });
  
}).catch(e => {
  app.route('/').get((req, res) => {
    res.render(process.cwd() + '/views/pug/index', { title: e, message: 'Unable to login' });
  });
});



//Port init
http.listen(process.env.PORT || 3000, () => {
  console.log("Listening on port " + process.env.PORT);
});