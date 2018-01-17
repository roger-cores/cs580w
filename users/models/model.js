"use strict";

const users = require('./users.js');

function Model(db){
  this.users = new users.Users(db);
}

module.exports = {
  Model: Model
}
