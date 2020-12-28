const createServer = require('../backend/app')
const mongo = require('../utils/mongoConnection')
const { TantalusLogger } = require('../utils/tantalusLogger')

const accountCollectionName = 'accounts'
const defaultTestConfig = {
  mongodb: {
    url: 'mongodb://127.0.0.1:27017',
    dbName: 'tantalus-test'
  },
  secret: 'test-secret'
}

const defaultTestUser = {
  username: 'default-test-user'
}

const createQuietLogger = () => {
  return {
    info: () => { },
    error: console.error,
    log: () => { }
  }
}

const startTestServer = (callback, disableSecurity = true, testUser = defaultTestUser, configOverride) => {
  const testConfig = disableSecurity
    ? Object.assign({ disableSecurity: true, testUser }, defaultTestConfig)
    : defaultTestConfig

  Object.assign(testConfig, configOverride)
  process.env.TESTING = 'true'

  return createServer(testConfig, TantalusLogger(createQuietLogger(), 'test'))
    .then(({ app, server }) => {
      callback(app, server)
    })
}

const mongodb = () => mongo
  .connect(defaultTestConfig, createQuietLogger())
  .then(() => mongo.db)

const closeMongodb = () => mongo.close()

const closeAll = server => {
  const serverClosedPromise = () => server
    ? new Promise((resolve) => { server.close(resolve) })
    : Promise.resolve()

  return serverClosedPromise().then(closeMongodb)
}

const dropDatabase = () => mongodb()
  .then(db => db.dropDatabase())
  .then(() => mongo.ensureAllIndices(mongo.db))

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

const getMetadata = () => getData(mongo.metadataCollectionName)
const insertMetadata = metadata => insertData(mongo.metadataCollectionName, metadata)

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
  closeMongodb,
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
  insertTraderReports,

  getMetadata,
  insertMetadata
}
