'use strict';

const assert = require('assert');
const mongo = require('mongodb').MongoClient;
const supertest = require('supertest');
const server = require('./../server/server.js');
const envConfig = require('./../env_config').test;
const model = require('./../models/model');
const statusCodes = require('./../codes');
const url = envConfig.dbUrl;
const collection = 'users';


let request = null;
let db = null;

const user1_data = {
  id: "roger",
  pwd: "roger"
}

const user1_body_data = {
  email: "roger@gmail.com",
  dob: "01/12/1994"
}

describe('Auth API Routes', function(){

  function verify(db, collection, query, condition, callback) {
    const coll = db.collection(collection);
    coll.find(query).toArray(
      function(err, docs) {
      	assert.strictEqual(err, null);
      	condition(docs);
      	if (callback) callback();
      });
  }

  before('connect', function(done){
    mongo.connect(url, function(err, conn) {
      assert.strictEqual(err, null);
      db = conn;
      const model1 = new model.Model(db);
      const app = server.serveTest(envConfig.opts.port, envConfig.opts, model1);
      request = supertest(app);
      done();
    });
  });

  beforeEach(function(done){
    db.collection(collection)
      .deleteMany({}, function(err, r) {
	       assert.strictEqual(err, null);
	       done();
      });
  });

  afterEach(function(done){
    db.collection(collection)
      .deleteMany({}, function(err, r) {
	       assert.strictEqual(err, null);
	       done();
      });
  });

  describe('PUT /users/:id', function(){
    it('should register a user who does not exist in the database', function(done){
      const regEx = new RegExp(`users/${user1_data.id}$`);
      request.put(`/users/${user1_data.id}?pwd=${user1_data.pwd}`)
             .send(user1_body_data)
             .expect(statusCodes.CREATED)
             .expect('Location', regEx)
             .end(function(err, res){
               assert.strictEqual(err, null);
               assert.notEqual(res.body, null);
               assert.notEqual(res.body, undefined);
               assert.strictEqual(res.body.status, 'CREATED');
               assert.notEqual(res.body.authToken, null);
               assert.notEqual(res.body.authToken, undefined);
               verify(db, collection, {_id: user1_data.id}, (docs) => assert.strictEqual(docs.length, 1));
               done(err);
             });
    });

    it('should respond with a 303 when user already exists', function(done){
      request.put(`/users/${user1_data.id}?pwd=${user1_data.pwd}`)
             .send(user1_body_data)
             .end(function(err, res){
               assert.strictEqual(err, null);
               const regEx = new RegExp(`users/${user1_data.id}$`);
               request.put(`/users/${user1_data.id}?pwd=${user1_data.pwd}`)
                      .expect(statusCodes.SEE_OTHER)
                      .expect('Location', regEx)
                      .send(user1_body_data)
                      .end(function(err, resx){
                        assert.strictEqual(err, null);
                        assert.notEqual(resx.body, null);
                        assert.notEqual(resx.body, undefined);
                        assert.strictEqual(resx.body.status, 'EXISTS');
                        assert.strictEqual(resx.body.info, `user ${user1_data.id} already exists`);
                        verify(db, collection, {_id: user1_data.id}, (docs) => assert.strictEqual(docs.length, 1));
                        done(err);
                      });
             });
    });
  });

  describe('PUT /users/:id/auth', function(){
    //user exists
      //password is correct
      it('should respond with 200 when everything is alright', function(done){
        request.put(`/users/${user1_data.id}?pwd=${user1_data.pwd}`)
               .end(function(err, res){
                 assert.strictEqual(err, null);
                 request.put(`/users/${user1_data.id}/auth`)
                         .send({
                           pw: user1_data.pwd
                         })
                        .expect(statusCodes.OK)
                        .end(function(err, resx){
                          assert.strictEqual(err, null);
                          assert.notEqual(resx.body, null);
                          assert.notEqual(resx.body, undefined);
                          assert.strictEqual(resx.body.status, 'OK');
                          assert.notEqual(resx.body.authToken, null);
                          assert.notEqual(resx.body.authToken, undefined);
                          verify(db, collection, {_id: user1_data.id}, (docs) => assert.strictEqual(docs.length, 1));
                          done(err);
                        });
               });
      });
      //password is wrong
      it('should respond with 401 when password is wrong', function(done){
        request.put(`/users/${user1_data.id}?pwd=${user1_data.pwd}`)
               .end(function(err, res){
                 assert.strictEqual(err, null);
                 request.put(`/users/${user1_data.id}/auth`)
                         .send({
                           pw: "wrong password"
                         })
                        .expect(statusCodes.UNAUTHORIZED)
                        .end(function(err, resx){
                          assert.strictEqual(err, null);
                          assert.notEqual(resx.body, null);
                          assert.notEqual(resx.body, undefined);
                          assert.strictEqual(resx.body.status, 'ERROR_UNAUTHORIZED');
                          assert.strictEqual(resx.body.info, `/users/${user1_data.id}/auth requires a valid 'pw' password query parameter`);
                          verify(db, collection, {_id: user1_data.id}, (docs) => assert.strictEqual(docs.length, 1));
                          done(err);
                        });
               });
      });
      //pw parameter not present
      it('should respond with 401 when pw is not present', function(done){
        request.put(`/users/${user1_data.id}?pwd=${user1_data.pwd}`)
               .end(function(err, res){
                 assert.strictEqual(err, null);
                 request.put(`/users/${user1_data.id}/auth`)
                        .expect(statusCodes.UNAUTHORIZED)
                        .end(function(err, resx){
                          assert.strictEqual(err, null);
                          assert.notEqual(resx.body, null);
                          assert.notEqual(resx.body, undefined);
                          assert.strictEqual(resx.body.status, 'ERROR_UNAUTHORIZED');
                          assert.strictEqual(resx.body.info, `/users/${user1_data.id}/auth requires a valid 'pw' password query parameter`);
                          verify(db, collection, {_id: user1_data.id}, (docs) => assert.strictEqual(docs.length, 1));
                          done(err);
                        });
               });
      });
    //user does not exist
    it('should respond with 404 when user is not found', function(done){
      request.put(`/users/${user1_data.id}/auth`)
             .expect(statusCodes.NOT_FOUND)
             .send({
               pw: user1_data.pwd
             })
             .end(function(err, resx){
               assert.strictEqual(err, null);
               assert.notEqual(resx.body, null);
               assert.notEqual(resx.body, undefined);
               assert.strictEqual(resx.body.status, 'ERROR_NOT_FOUND');
               assert.strictEqual(resx.body.info, `user ${user1_data.id} not found`);
               verify(db, collection, {_id: user1_data.id}, (docs) => assert.strictEqual(docs.length, 0));
               done(err);
             });
    });
  });

  describe('GET /users/:id', function(){
    //user exists
      //everything is alright
      it('should respond with 200 when everything is alright', function(done){
        request.put(`/users/${user1_data.id}?pwd=${user1_data.pwd}`)
               .send(user1_body_data)
               .end(function(err, res){
                 assert.strictEqual(err, null);
                 request.get(`/users/${user1_data.id}`)
                        .set('Authorization', `Bearer ${res.body.authToken}`)
                        .expect(statusCodes.OK)
                        .end(function(err, resx){
                          assert.strictEqual(err, null);
                          assert.notEqual(resx.body, null);
                          assert.notEqual(resx.body, undefined);
                          const userObject = {
                            _id: user1_data.id,
                            email: user1_body_data.email,
                            dob: user1_body_data.dob
                          }
                          assert.deepStrictEqual(resx.body, userObject);
                          verify(db, collection, {_id: user1_data.id}, (docs) => assert.strictEqual(docs.length, 1));
                          done(err);
                        });
               });
      });
      //Authorizatin header not present
      it('should respond with 401 when Authorization header is not present in the request', function(done){
        request.put(`/users/${user1_data.id}?pwd=${user1_data.pwd}`)
               .end(function(err, res){
                 assert.strictEqual(err, null);
                 request.get(`/users/${user1_data.id}`)
                        .expect(statusCodes.UNAUTHORIZED)
                        .end(function(err, resx){
                          assert.strictEqual(err, null);
                          assert.notEqual(resx.body, null);
                          assert.notEqual(resx.body, undefined);
                          assert.strictEqual(resx.body.status, 'ERROR_UNAUTHORIZED');
                          assert.strictEqual(resx.body.info, `/users/${user1_data.id} requires a bearer authorization header`);
                          verify(db, collection, {_id: user1_data.id}, (docs) => assert.strictEqual(docs.length, 1));
                          done(err);
                        });
               });
      });
      //authToken is wrong
      it('should respond with 401 when authToken is wrong', function(done){
        request.put(`/users/${user1_data.id}?pwd=${user1_data.pwd}`)
               .end(function(err, res){
                 assert.strictEqual(err, null);
                 request.get(`/users/${user1_data.id}`)
                        .set('Authorization', `Bearer wrong auth token`)
                        .expect(statusCodes.UNAUTHORIZED)
                        .end(function(err, resx){
                          assert.strictEqual(err, null);
                          assert.notEqual(resx.body, null);
                          assert.strictEqual(resx.body.status, 'ERROR_UNAUTHORIZED');
                          assert.strictEqual(resx.body.info, `/users/${user1_data.id} requires a bearer authorization header`);
                          verify(db, collection, {_id: user1_data.id}, (docs) => assert.strictEqual(docs.length, 1));
                          done(err);
                        });
               });
      });
      //authToken is outDated {need to run this test with low toke timeout}
      it('should respond with 401 when authToken is stale (requires low timeout for test to work)', function(done){
        request.put(`/users/${user1_data.id}?pwd=${user1_data.pwd}`)
               .end(function(err, res){
                 assert.strictEqual(err, null);
                 const then = +Date.now();
                 setTimeout(function(){
                   console.log(`After ${((+Date.now()) - then)/1000} seconds with timeout set to ${envConfig.opts.authTimeout} seconds`);
                   request.get(`/users/${user1_data.id}`)
                          .set('Authorization', `Bearer ${res.body.authToken}`)
                          .expect(statusCodes.UNAUTHORIZED)
                          .end(function(err, resx){
                            assert.strictEqual(err, null);
                            assert.notEqual(resx.body, null);
                            assert.strictEqual(resx.body.status, 'ERROR_UNAUTHORIZED');
                            assert.strictEqual(resx.body.info, `/users/${user1_data.id} requires a bearer authorization header`);
                            verify(db, collection, {_id: user1_data.id}, (docs) => assert.strictEqual(docs.length, 1));
                            done(err);
                          });
                        }, (envConfig.opts.authTimeout*1000) + 500);
                 });

      });
    //user does not exist
    it('should respond with 404 when user is not found', function(done){
      request.get(`/users/${user1_data.id}`)
             .expect(statusCodes.NOT_FOUND)
             .end(function(err, resx){
               assert.strictEqual(err, null);
               assert.notEqual(resx.body, null);
               assert.notEqual(resx.body, undefined);
               assert.strictEqual(resx.body.status, 'ERROR_NOT_FOUND');
               assert.strictEqual(resx.body.info, `user ${user1_data.id} not found`);
               verify(db, collection, {_id: user1_data.id}, (docs) => assert.strictEqual(docs.length, 0));
               done(err);
             });
    });
  });

  describe('Handling stale authToken', function(){

    it('stale authToken should be refreshed when login is called', function(done){
      request.put(`/users/${user1_data.id}?pwd=${user1_data.pwd}`)
             .send(user1_body_data)
             .then(function(res){
               setTimeout(function(){
                 request.put(`/users/${user1_data.id}/auth`)
                  .send({
                    pw: user1_data.pwd
                  })
                  .then(function(res1){
                    return request.get(`/users/${user1_data.id}`)
                      .set('Authorization', `Bearer ${res1.body.authToken}`)
                      .expect(statusCodes.OK);
                  })
                  .then(function(res2){
                    const userObject = {
                      _id: user1_data.id,
                      email: user1_body_data.email,
                      dob: user1_body_data.dob
                    }
                    assert.deepStrictEqual(res2.body, userObject);
                    done();
                  })
                  .catch((err)=>done(err));
               }, (envConfig.opts.authTimeout*1000) + 500);
             })
             .catch((err)=>done(err));
    });

  });
});
