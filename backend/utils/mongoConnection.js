const { MongoClient } = require('mongodb')

const mongoose = require('mongoose')
mongoose.Promise = Promise

const tickersCollectionName = 'tickers'
const graphsCollectionName = 'graphs'

const initializeDirectConnection = (config, log) => {
  const mongoUrl = config.mongodb.url
  log.info('Connecting to DB: \'%s\'', mongoUrl)
  return MongoClient.connect(mongoUrl)
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
  mongoose,
  tickersCollectionName,
  graphsCollectionName
}
