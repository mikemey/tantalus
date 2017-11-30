const { MongoClient } = require('mongodb')

const mongoose = require('mongoose')
mongoose.Promise = Promise

const tickersCollectionName = 'tickers'
const graphsCollectionName = 'graphs'
const transactionCollectionName = 'transactions'
const simulationReportsCollectionName = 'simulationreports'
const traderReportsCollectionName = 'traderreports'

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
  logger.info(`Connecting to DB: '${mongoUrl}'`)
  return MongoClient.connect(mongoUrl)
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
    })
}

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
