"use strict";

const express = require('express');
const bodyParser = require('body-parser');
const statusCodes = require('./../codes.json')

function serve(port, model) {
  const app = express();
  app.locals.model = model;
  app.locals.port = port;
  app.use(bodyParser.json())
  setupRoutes(app);
  app.listen(port, function() {
    console.log(`listening on port ${port}`);
  });
}

function requestUrl(req) {
  const port = req.app.locals.port;
  return `${req.protocol}://${req.hostname}:${port}${req.originalUrl}`;
}

function setupRoutes(app){
  app.use('/users/:id', loadUser());
  app.put('/users/:id', createOrUpdateUser());
  app.get('/users/:id', getUser());
  app.delete('/users/:id', deleteUser());
  app.post('/users/:id', replaceUser());
}

function loadUser(){
  return function(req, res, next){
    req.app.locals.model.users.getUser(req.params.id)
      .then(function(user){
        req.user = user;
        next();
      })
      .catch((err) => {
        console.error(err);
        res.sendStatus(statusCodes.INTERNAL_SERVER);
      });
  };
}

function replaceUser(){
  return function(req, res){
    if(!Object.keys(req.body).length){
      res.sendStatus(statusCodes.BAD_REQUEST);
    } else if(typeof req.user === 'undefined' || req.user === null){
      res.sendStatus(statusCodes.NOT_FOUND);
    } else {
      let user = req.user;
      if(user === null || typeof user === 'undefined'){
        res.sendStatus(statusCodes.NOT_FOUND);
      } else {
        req.app.locals.model.users.replaceUser(req.params.id, req.body)
          .then(function(){
            res.setHeader('Location', requestUrl(req));
            res.sendStatus(statusCodes.SEE_OTHER);
          })
          .catch((err) => {
            console.error(err);
            res.sendStatus(statusCodes.INTERNAL_SERVER);
          });
      }
    }
  };
}

function deleteUser(){
  return function(req, res){
    if(typeof req.user === 'undefined' || req.user === null){
     res.sendStatus(statusCodes.NOT_FOUND);
    } else {
     req.app.locals.model.users.deleteUser(req.params.id)
       .then(function(){
         res.sendStatus(statusCodes.OK);
       })
       .catch((err) => {
         console.error(err);
         res.sendStatus(statusCodes.INTERNAL_SERVER);
       });
    }
  };
}

function getUser(){
  return function(req, res){
    let user = req.user;
    if(user === null || typeof user === 'undefined'){
      res.sendStatus(statusCodes.NOT_FOUND);
    } else res.json(user).sendStatus(statusCodes.OK);
  };
}

function createOrUpdateUser(){
  return function(req, res){
    if(!Object.keys(req.body).length){
      res.sendStatus(statusCodes.BAD_REQUEST);
    } else if(typeof req.user === 'undefined' || req.user === null){
      //create new user here
      req.body._id = req.params.id;
      req.app.locals.model.users.newUser(req.body)
        .then(function(id){
          res.setHeader('Location', requestUrl(req));
          res.sendStatus(statusCodes.CREATED);
        })
        .catch((err) => {
          console.error(err);
          res.sendStatus(statusCodes.INTERNAL_SERVER);
        });
    } else {
      req.app.locals.model.users.updateUser(req.params.id, req.body)
        .then(function(){
          res.sendStatus(statusCodes.NO_CONTENT);
        })
        .catch((err) => {
          console.error(err);
          res.sendStatus(statusCodes.INTERNAL_SERVER);
        });
    }
  };
}

module.exports = {
  serve: serve
}
