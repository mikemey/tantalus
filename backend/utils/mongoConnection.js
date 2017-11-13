const { MongoClient } = require('mongodb')

const mongoose = require('mongoose')
mongoose.Promise = Promise

const tickersCollectionName = 'tickers'
const graphsCollectionName = 'graphs'
const transactionCollectionName = 'transactions'

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

const initializeDirectConnection = (config, log) => {
  const mongoUrl = config.mongodb.url
  log.info('Connecting to DB: \'%s\'', mongoUrl)
  return MongoClient.connect(mongoUrl)
    .then(ensureAllIndices)
    .then(db => {
      log.info('DB connection established.')
      module.exports.db = db
      module.exports.error = null
    })
    .catch(error => {
      log.error('No connection to DB: %s', mongoUrl, error)
      module.exports.db = null
      module.exports.error = error
    })
}

const initializeMongooseConnection = config =>
  mongoose.connect(config.mongodb.url, { useMongoClient: true })

const initializeAll = (config, log) => initializeDirectConnection(config, log)
  .then(() => initializeMongooseConnection(config))

module.exports = {
  initializeDirectConnection,
  initializeAll,
  ensureAllIndices,
  mongoose,
  tickersCollectionName,
  graphsCollectionName,
  transactionCollectionName
}
