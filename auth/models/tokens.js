"use strict";

const assert = require('assert');
const ObjectID = require('mongodb').ObjectID;

const TOKEN = 'tokens';

function Tokens(db){
  this.db = db;
  this.tokens = db.collection(TOKEN);
}

Tokens.prototype.newToken = function(token){
  return this.tokens.insertOne(token)
    .then(function(results) {
      return new Promise((resolve) => resolve(results.insertedId));
    });
}

Tokens.prototype.getTokenByIdAndUser = function(id, userId){
  return this.tokens.findOne({_id: id, userId: userId})
    .then(function(token){
      return new Promise((resolve) => resolve(token));
    });
}

module.exports = {
  Tokens: Tokens
}
