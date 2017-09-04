const createServer = require('../backend/app')
const mongoConnection = require('../backend/utils/mongoConnection')
const mongoose = require('mongoose')
mongoose.Promise = Promise

const tickerCollectionName = 'tickers'
const accountCollectionName = 'accounts'
const testConfig = {
  mongodb: {
    url: 'mongodb://127.0.0.1:27017/tantalus-test'
  }
}

const startTestServer = callback => {
  return createServer(testConfig, console)
    .then(({ app, server }) => {
      callback(app, server)
    })
}

let db
const mongodb = () => {
  if (!db) {
    return mongoConnection.init(testConfig, console)
      .then(() => {
        db = mongoConnection.db
        return db
      })
  }
  return Promise.resolve(db)
}

const closeAll = server => {
  const dbClosedPromise = () => db
    ? db.close().then(() => { db = null })
    : Promise.resolve()

  const serverClosedPromise = () => server
    ? new Promise((resolve, reject) => server.close(resolve))
    : Promise.resolve()

  return serverClosedPromise().then(dbClosedPromise)
}

const dropDatabase = () => mongodb().then(db => db.dropDatabase())

const dbCollection = collectionName => mongodb()
  .then(db => db.collection(collectionName))

const getTickers = () => dbCollection(tickerCollectionName)
  .then(collection => collection.find().toArray())

const insertTickers = tickers => dbCollection(tickerCollectionName)
  .then(collection => collection.insertMany(tickers))

const getAccounts = () => dbCollection(accountCollectionName)
  .then(collection => collection.find().toArray())

const connectMongoose = () => mongoose.connect(testConfig.mongodb.url, { useMongoClient: true })
const closeMongoose = () => mongoose.connection.close()

module.exports = {
  startTestServer,
  connectMongoose,
  closeMongoose,
  dropDatabase,
  closeAll,

  getTickers,
  insertTickers,
  getAccounts
}
