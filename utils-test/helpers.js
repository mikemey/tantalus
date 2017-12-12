const createServer = require('../backend/app')
const mongo = require('../utils/mongoConnection')
const { TantalusLogger } = require('../utils/tantalusLogger')

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

const connectMongoose = () => mongo.mongoose.connect(defaultTestConfig.mongodb.url, { useMongoClient: true })
const closeMongoose = () => mongo.mongoose.connection.close()

const createQuietLogger = () => {
  return {
    info: () => { },
    error: console.error,
    log: () => { }
  }
}

const startTestServer = (callback, disableSecurity = true, testUser = defaultTestUser, configOverride) => {
  const testConfig = disableSecurity
    ? Object.assign({
      disableSecurity: true,
      testUser
    }, defaultTestConfig
    )
    : defaultTestConfig

  Object.assign(testConfig, configOverride)
  process.env.TESTING = 'true'

  return createServer(testConfig, TantalusLogger(createQuietLogger(), 'test'))
    .then(({ app, server }) => {
      callback(app, server)
    })
}

let db
const mongodb = () => {
  if (!db) {
    return mongo.initializeDirectConnection(defaultTestConfig, createQuietLogger())
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

const dropDatabase = () => mongodb()
  .then(db => db.dropDatabase())
  .then(() => mongo.ensureAllIndices(db))

const dbCollection = collectionName => mongodb().then(db => db.collection(collectionName))

const getData = (collectionName, find) => dbCollection(collectionName)
  .then(collection => collection.find(find).toArray())

const insertData = (collectionName, data) => dbCollection(collectionName)
  .then(collection => collection.insertMany(data))

const getTickers = () => getData(mongo.tickersCollectionName)
const insertTickers = tickers => insertData(mongo.tickersCollectionName, tickers)

const getGraphData = period => getData(mongo.graphsCollectionName, { period })
const insertGraphData = graphdata => insertData(mongo.graphsCollectionName, graphdata)

const getAccounts = () => getData(accountCollectionName)
const insertAccounts = accounts => insertData(accountCollectionName, accounts)

const getTransactions = () => getData(mongo.transactionCollectionName)
const insertTransactions = transactions => insertData(mongo.transactionCollectionName, transactions)

const getSimulationReports = () => getData(mongo.simulationReportsCollectionName)
const getTraderReports = () => getData(mongo.traderReportsCollectionName)
const insertTraderReports = traderReports => insertData(mongo.traderReportsCollectionName, traderReports)

const copyWithoutIDField = (obj, defaultId = '_id') => obj.map
  ? obj.map(copyObjectWithoutField(defaultId))
  : copyObjectWithoutField(defaultId)(obj)

const copyObjectWithoutField = deleteField => obj => {
  const copy = Object.assign({}, obj)
  delete copy[deleteField]
  return copy
}

module.exports = {
  startTestServer,
  mongodb,
  connectMongoose,
  closeMongoose,
  dropDatabase,
  closeAll,
  defaultTestConfig,

  getTickers,
  insertTickers,
  getAccounts,
  insertAccounts,
  insertGraphData,
  getGraphData,
  copyWithoutIDField,

  getTransactions,
  insertTransactions,

  getSimulationReports,
  getTraderReports,
  insertTraderReports
}
