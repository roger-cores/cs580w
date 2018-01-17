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

Users.prototype.deleteUser = function(id){
  return this.users.deleteOne({_id: id})
    .then(function(results) {
      return new Promise(function(resolve, reject){
        if(results.deletedCount === 1){
          resolve();
        } else {
          reject(new Error(`User with id:'${id}' doesn't exist`));
        }
      });
    });
}

Users.prototype.updateUser = function(id, updatedObject){
  return this.users.updateOne({_id: id}, {$set: updatedObject})
    .then(function(results){
      return new Promise(function(resolve, reject){
        if(results.matchedCount === 1 && (results.modifiedCount === 1 || results.modifiedCount === 0)){
          resolve();
        } else {
          reject(new Error(`Cannot update user ${id}`));
        }
      });
    });
}

Users.prototype.replaceUser = function(id, replaceableUser){
  return this.users.replaceOne({_id: id}, replaceableUser)
    .then(function(results){
      return new Promise(function(resolve, reject){
        if(results.modifiedCount === 1){
          resolve();
        } else {
          reject(new Error(`Replacement of user with id:'${id}' failed!`));
        }
      });
    });
}

module.exports = {
  Users: Users
}
