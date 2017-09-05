const createServer = require('../backend/app')
const mongoConnection = require('../backend/utils/mongoConnection')

const tickerCollectionName = 'tickers'
const accountCollectionName = 'accounts'
const defaultTestConfig = {
  mongodb: {
    url: 'mongodb://127.0.0.1:27017/tantalus-test'
  },
  secret: 'test-secret'
}

const startTestServer = (callback, disabled = true) => {
  const testConfig = disabled
    ? Object.assign({ disableSecurity: true }, defaultTestConfig)
    : defaultTestConfig // config without disableSecurity property

  return createServer(testConfig, console)
    .then(({ app, server }) => {
      callback(app, server)
    })
}

let db
const mongodb = () => {
  if (!db) {
    return mongoConnection.initializeDirectConnection(defaultTestConfig, console)
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

const connectMongoose = () => mongoConnection.mongoose.connect(defaultTestConfig.mongodb.url, { useMongoClient: true })
const closeMongoose = () => mongoConnection.mongoose.connection.close()

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
