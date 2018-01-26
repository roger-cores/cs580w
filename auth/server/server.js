"use strict";

const express = require('express');
const bodyParser = require('body-parser');
const statusCodes = require('./../codes.json');
const bcrypt = require('bcryptjs');
const uuidv4 = require('uuid/v4');
const https = require('https');
const fs = require('fs');

function serveTest(port, options, model){
  const app = express();
  app.locals.model = model;
  app.locals.port = port;
  app.locals.options = options;
  app.use(bodyParser.json())
  setupRoutes(app);
  return app;
}

function serve(port, options, model) {
  const app = express();
  app.locals.model = model;
  app.locals.port = port;
  app.locals.options = options;
  app.use(bodyParser.json())
  setupRoutes(app);

  https.createServer({
    key: fs.readFileSync(`${options.sslDir}/key.pem`),
    cert: fs.readFileSync(`${options.sslDir}/cert.pem`),
  }, app).listen(port, function(){
    console.log(`listening on port ${port}`);
  });
}

function requestAbsoluteUrl(req) {
  const port = req.app.locals.port;
  const url = `${req.protocol}://${req.hostname}:${port}${req.originalUrl}`;
  return url.substring(0, url.lastIndexOf('?'));
}

function setupRoutes(app){
  app.use('/users/:id', loadUser());
  app.put('/users/:id', register());
  app.put('/users/:id/auth', login());
  app.get('/users/:id', loadToken(), authenticateUser());
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

function loadToken(){
  return function(req, res, next){
    const user = req.user;
    if(user === null || typeof user === 'undefined'){
      res.status(statusCodes.NOT_FOUND).send({ status: "ERROR_NOT_FOUND", info: `user ${req.params.id} not found`});
    }

    let authHeader = req.get('Authorization');
    if(typeof authHeader === 'undefined'){
      res.status(statusCodes.UNAUTHORIZED).send({ status: "ERROR_UNAUTHORIZED", info: `/users/${req.params.id} requires a bearer authorization header`});
    }
    authHeader = authHeader.replace('Bearer ', '');
    req.app.locals.model.tokens.getTokenByIdAndUser(authHeader, req.user._id)
      .then(function(token){
        if(token === null || typeof token === 'undefined'){
          res.status(statusCodes.UNAUTHORIZED).send({ status: "ERROR_UNAUTHORIZED", info: `/users/${req.params.id} requires a bearer authorization header`});
        } else {
          req.token = token;
          next();
        }
      })
      .catch(function(err){
        console.error(err);
        res.sendStatus(statusCodes.INTERNAL_SERVER);
      });
  };
}

function login(){
  return function(req, res, next){
    if(req.body.pw === null || typeof req.body.pw === 'undefined') {
      res.status(statusCodes.UNAUTHORIZED).send({ status: "ERROR_UNAUTHORIZED", info: `/users/${req.params.id}/auth requires a valid 'pw' password query parameter`});
    }

    const user = req.user;
    if(user === null || typeof user === 'undefined'){
      res.status(statusCodes.NOT_FOUND).send({ status: "ERROR_NOT_FOUND", info: `user ${req.params.id} not found`});
    } else {
      if(bcrypt.compareSync(req.body.pw, user.pwd)){
        //res.status(statusCodes.OK).send({ status: "OK", authToken: user.token.token});
        //TODO change to: create new authToken, save user and respond to client
        const token = {
          _id: uuidv4(),
          timestamp: +new Number(Date.now()),
          userId: user._id
        };
        req.app.locals.model.tokens.newToken(token)
          .then(function(id){
            res.status(statusCodes.OK).send({status: "OK", authToken: id});
          })
          .catch(function(err){
            console.error(err);
            res.sendStatus(statusCodes.INTERNAL_SERVER);
          });
      } else res.status(statusCodes.UNAUTHORIZED).send({ status: "ERROR_UNAUTHORIZED", info: `/users/${req.params.id}/auth requires a valid 'pw' password query parameter`});
    }
  };
}

function authenticateUser(){
  return function(req, res, next){
    const user = req.user;
    const token = req.token;
    if((token.timestamp + (req.app.locals.options.authTimeout * 1000)) >= (+new Number(Date.now()))) {
      delete user['token'];
      delete user['pwd'];
      res.status(statusCodes.OK).send(user);
    } else {
      res.status(statusCodes.UNAUTHORIZED).send({ status: "ERROR_UNAUTHORIZED", info: `/users/${req.params.id} requires a bearer authorization header`});
    }
  };
}

function register(){
  return function(req, res, next){
    const user = req.user;
    if(user === null || typeof user === 'undefined'){
      req.body._id = req.params.id;
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(req.query.pwd, salt);
      req.body.pwd = hash;
      let nToken = {
        _id: uuidv4(),
        timestamp: +new Number(Date.now())
      };

      req.app.locals.model.users.newUser(req.body)
        .then(function(id){
          nToken.userId = id;
          return req.app.locals.model.tokens.newToken(nToken);
        })
        .then(function(id){
          res.setHeader('Location', requestAbsoluteUrl(req));
          res.status(statusCodes.CREATED).send({ status: "CREATED", authToken: id});
        })
        .catch((err) => {
          console.error(err);
          res.sendStatus(statusCodes.INTERNAL_SERVER);
        });
    } else {
      res.setHeader('Location', requestAbsoluteUrl(req));
      res.status(statusCodes.SEE_OTHER).send({status: 'EXISTS', info: `user ${req.params.id} already exists`});
    }
  };
}

module.exports = {
  serve: serve,
  serveTest: serveTest
}
