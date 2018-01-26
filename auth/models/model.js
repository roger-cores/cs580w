"use strict";

const users = require('./users.js');
const tokens = require('./tokens.js');

function Model(db){
  this.users = new users.Users(db);
  this.tokens = new tokens.Tokens(db);
}

module.exports = {
  Model: Model
}
