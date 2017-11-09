const createServer = require('../backend/app')
const mongo = require('../backend/utils/mongoConnection')

const accountCollectionName = 'accounts'
const defaultTestConfig = {
  mongodb: {
    url: 'mongodb://127.0.0.1:27017/tantalus-test'
  },
  secret: 'test-secret'
}

const defaultTestUser = {
  username: 'default-test-user'
}

const startTestServer = (callback, disableSecurity = true, testUser = defaultTestUser) => {
  const testConfig = disableSecurity
    ? Object.assign({
      disableSecurity: true,
      testUser
    }, defaultTestConfig
    )
    : defaultTestConfig

  return createServer(testConfig, console)
    .then(({ app, server }) => {
      callback(app, server)
    })
}

let db
const mongodb = () => {
  if (!db) {
    return mongo.initializeDirectConnection(defaultTestConfig, console)
      .then(() => {
        db = mongo.db
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

const getTickers = () => dbCollection(mongo.tickersCollectionName)
  .then(collection => collection.find().toArray())

const insertTickers = tickers => dbCollection(mongo.tickersCollectionName)
  .then(collection => collection.insertMany(tickers))

const insertGraphData = graphdata => dbCollection(mongo.graphsCollectionName)
  .then(collection => collection.insertMany(graphdata))

const getGraphData = period => dbCollection(mongo.graphsCollectionName)
  .then(collection => collection.find({ period }).toArray())

const getAccounts = () => dbCollection(accountCollectionName)
  .then(collection => collection.find().toArray())

const insertAccounts = accounts => dbCollection(accountCollectionName)
  .then(collection => collection.insertMany(accounts))

const connectMongoose = () => mongo.mongoose.connect(defaultTestConfig.mongodb.url, { useMongoClient: true })
const closeMongoose = () => mongo.mongoose.connection.close()

module.exports = {
  startTestServer,
  connectMongoose,
  closeMongoose,
  dropDatabase,
  closeAll,

  getTickers,
  insertTickers,
  getAccounts,
  insertAccounts,
  insertGraphData,
  getGraphData
}
