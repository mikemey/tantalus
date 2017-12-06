const { MongoClient } = require('mongodb')

const mongoose = require('mongoose')
mongoose.Promise = Promise

const tickersCollectionName = 'tickers'
const graphsCollectionName = 'graphs'
const transactionCollectionName = 'transactions'
const simulationReportsCollectionName = 'simulationreports'
const traderReportsCollectionName = 'traderreports'

const PRODUCTION_ENV = 'PROD'

class MongoConnectionError extends Error {
  // eslint-disable-next-line space-before-function-paren
  constructor(message) {
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

const ensureAllIndices = db =>
  Promise.all(ALL_INDEX_SPECS
    .map(indexSpec => {
      const fullOptions = Object.assign({}, defaultIndexOptions, indexSpec.options)
      return db.collection(indexSpec.collection)
        .createIndex(indexSpec.fields, fullOptions)
    })
  ).then(() => db)

const initializeDirectConnection = (config, logger) => {
  const mongoUrl = config.mongodb.url
  return checkProductionEnvironment(logger, mongoUrl)
    .then(() => MongoClient.connect(mongoUrl))
    .then(ensureAllIndices)
    .then(db => {
      logger.info('DB connection established.')
      module.exports.db = db
      module.exports.error = null
    })
    .catch(error => {
      logger.error(`No connection to DB: ${mongoUrl}`, error)
      module.exports.db = null
      module.exports.error = error
      throw error
    })
}

const checkProductionEnvironment = (logger, mongoUrl) => new Promise((resolve, reject) => {
  if (mongoUrl.endsWith('tantalus')) {
    if (process.env.NODE_ENV !== PRODUCTION_ENV) {
      const msg = `Access to production database with invalid NODE_ENV: ${process.env.NODE_ENV}`
      logger.error(msg)
      reject(new MongoConnectionError(msg))
    }
  }
  resolve()
})

const initializeMongooseConnection = config =>
  mongoose.connect(config.mongodb.url, { useMongoClient: true })

const initializeAll = (config, logger) => initializeDirectConnection(config, logger)
  .then(() => initializeMongooseConnection(config))

module.exports = {
  initializeDirectConnection,
  initializeAll,
  ensureAllIndices,
  mongoose,
  tickersCollectionName,
  graphsCollectionName,
  transactionCollectionName,
  simulationReportsCollectionName,
  traderReportsCollectionName
}
