#!/usr/bin/env nodejs
"use strict";

const assert = require('assert');
const mongo = require('mongodb').MongoClient;
const process = require('process');
const model = require('./models/model');
const server = require('./server/server');
const envConfig = require('./env_config');

const DB_URL = envConfig[process.env.NODE_ENV || 'production'].dbUrl;
const opts = require('./options').options;
const port = opts.port;

mongo.connect(DB_URL).
  then(function(db) {
    const model1 = new model.Model(db);
    server.serve(port, opts, model1);
    //db.close();
  }).
  catch((e) => console.error(e));
