const { MongoClient } = require('mongodb')
const mongoose = require('mongoose')
mongoose.Promise = Promise

const tickersCollectionName = 'tickers'
const graphsCollectionName = 'graphs'
const transactionCollectionName = 'transactions'
const simulationReportsCollectionName = 'simulationreports'
const traderReportsCollectionName = 'traderreports'
const metadataCollectionName = 'metadata'

const PRODUCTION_ENV = 'PROD'

class MongoConnectionError extends Error {
  constructor (message) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

const defaultIndexOptions = { background: true, unique: true }

const ALL_INDEX_SPECS = [{
  collection: tickersCollectionName,
  fields: { created: 1 },
  options: { name: 'ix_created' }
}, {
  collection: graphsCollectionName,
  fields: { period: 1 },
  options: { name: 'ix_period' }
}, {
  collection: transactionCollectionName,
  fields: { tid: 1 },
  options: { name: 'ix_tid' }
}]

const connect = (config, logger) => {
  if (module.exports.db) return Promise.resolve()

  const url = config.mongodb.url
  const dbName = config.mongodb.dbName
  logger.info('connection to DB...')
  return initializeDirectConnection(url, dbName)
    .then(() => initializeMongooseConnection(url, dbName))
    .then(() => {
      logger.info('DB connections established.')
    })
    .catch(error => {
      cleanupInstances()
      logger.error(`No connection to DB: ${url}`, error)
      return close().then(() => { throw error })
    })
}

const close = () => closeDirectConnection().then(closeMongoose)

const data = {
  mongoClient: null
}

const cleanupInstances = () => {
  data.mongoClient = null
  module.exports.db = null
}

const initializeDirectConnection = (url, dbName) => {
  return checkProductionEnvironment(dbName)
    .then(() => MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }))
    .then(client => {
      data.mongoClient = client
      return client.db(dbName)
    })
    .then(ensureAllIndices)
    .then(db => { module.exports.db = db })
}

const checkProductionEnvironment = dbName => new Promise((resolve, reject) => {
  if (dbName === 'tantalus') {
    if (process.env.NODE_ENV !== PRODUCTION_ENV) {
      const msg = `Access to production database with invalid NODE_ENV: ${process.env.NODE_ENV}`
      reject(new MongoConnectionError(msg))
    }
  }
  resolve()
})

const ensureAllIndices = db =>
  Promise.all(ALL_INDEX_SPECS
    .map(indexSpec => {
      const fullOptions = Object.assign({}, defaultIndexOptions, indexSpec.options)
      return db.collection(indexSpec.collection)
        .createIndex(indexSpec.fields, fullOptions)
    })
  ).then(() => db)

const closeDirectConnection = () =>
  (data.mongoClient
    ? data.mongoClient.close()
    : Promise.resolve()
  ).then(cleanupInstances)

const initializeMongooseConnection = (url, dbName) => {
  const mongooseUrl = `${url}/${dbName}`
  return mongoose.connect(mongooseUrl, { useCreateIndex: true, useNewUrlParser: true, useUnifiedTopology: true })
}

const closeMongoose = () => mongoose.connection.close()

module.exports = {
  connect,
  close,
  ensureAllIndices,
  mongoose,
  tickersCollectionName,
  graphsCollectionName,
  transactionCollectionName,
  simulationReportsCollectionName,
  traderReportsCollectionName,
  metadataCollectionName
}
