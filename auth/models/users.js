"use strict";

const assert = require('assert');
const ObjectID = require('mongodb').ObjectID;

const USERS = 'users';

function Users(db){
  this.db = db;
  this.users = db.collection(USERS);
}

Users.prototype.newUser = function(user){
  return this.users.insertOne(user)
    .then(function(results) {
      return new Promise((resolve) => resolve(results.insertedId));
    });
}

Users.prototype.getUser = function(id){
  return this.users.findOne({_id: id})
    .then(function(user){
      return new Promise((resolve) => resolve(user));
    });
}

Users.prototype.updateUser = function(id, updatableObject){
  return this.users.updateOne({_id: id}, {$set: updatableObject})
    .then(function(results){
      return new Promise((resolve) => resolve(results.modifiedCount));
    });
}

module.exports = {
  Users: Users
}
