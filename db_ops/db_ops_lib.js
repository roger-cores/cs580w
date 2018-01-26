'use strict';

const assert = require('assert');
const mongo = require('mongodb').MongoClient;


//Builds an object value updater function
function newMapper(argName, body) {
  //It is necessary that this function returns the mapped value for Array.map() to work.
  return new Function(argName, `${body}; return ${argName}`);
}

//print msg on stderr and exit.
function error(msg) {
  console.error(msg);
  process.exit(1);
}

//export error() so that it can be used externally.
module.exports.error = error;


function createDocuments(doc, db, done){
  db.collection(doc.collection)
    .insertMany(doc.args)
    .then(r => {
      if(r === null || r.insertedCount <= 0){
        console.error("\nSomething Went Wrong");
      }
      done(null, r);
    })
    .catch(err => {
      console.error(err);
      done(err);
    });
}

function findDocuments(query, db, done){
  db.collection(query.collection)
    .find(query.args || {})
    .toArray()
    .then(docs => {
      if(docs == null || docs.length == 0){
        console.error("\nNo documents matched your search query");
      } else {
        console.log(docs);
      }
      done();
    })
    .catch(err => {
      console.log(err);
      done();
    });
}

function deleteDocuments(query, db, done){
  db.collection(query.collection)
    .deleteMany(query.args || {})
    .then(r => {
      if(r == null || r.deletedCount <=0){
        console.error("\nNo documents were deleted. Possibly because your query did not match any document.");
      }
      done(null, r);
    })
    .catch(err => {
      console.error(err);
      done(err);
    });
}

function updateDocuments(query, db, done){

  let docCount = 0;
  let objectTransformer = newMapper(query.fn[0], query.fn[1]);

  db.collection(query.collection)
    .find(query.args || {})
    .toArray()
    .then(docs => {
      docs = docs.map(objectTransformer);
      if(docs.length == 0) {
        console.error("\nNo documents matched your search query. No documents were updated");
        done(new Error("No documents matched your search query. No documents were updated"));
      }
      docs.forEach(doc => {
        db.collection(query.collection)
          .save(doc)
          .then(() => {
            //Since iterations are asynchronous, count the number of docs updated
            //When count gets to docs.length, exit
            docCount++;
            if(docCount === docs.length) done(null, null);
          })
          .catch(err => {
            console.error(err);
            done(err);
          });
      });
    }).catch(err => {
      console.error(err);
      done(err);
    });
}

//perform op on mongo db specified by url.
function dbOp(url, op, donex) {

  if(donex === undefined) donex = done;

  mongo.connect(url, (err, db) => {
    if(err !== null){
      throw err;
    } else {
      let opObject = JSON.parse(op);

      let done = function(){
        db.close();
        process.exit(0);
      }

      switch(opObject.op){
        case "create":
          createDocuments(opObject, db, donex);
          break;
        case "read":
          findDocuments(opObject, db, donex);
          break;
        case "update":
          if(!opObject.fn || !opObject.fn[0] || !opObject.fn[1]){
            console.error("\nMapper function is invalid");
            done();
          }
          updateDocuments(opObject, db, donex);
          break;
        case "delete":
          deleteDocuments(opObject, db, donex);
          break;
        default:
          throw "OP is invalid";
          break;
      }
    }
  });
}

//make main dbOp() function available externally
module.exports.dbOp = dbOp;
module.exports.create = createDocuments;
module.exports.read = findDocuments;
module.exports.update = updateDocuments;
module.exports.delete = deleteDocuments;
