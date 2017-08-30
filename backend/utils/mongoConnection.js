const { MongoClient } = require('mongodb')

const init = (config, log) => {
  const mongoUrl = config.mongodb.url
  log.info('Connecting to DB: \'%s\'', mongoUrl)
  return MongoClient.connect(mongoUrl)
    .then(db => {
      log.info('DB connection established.')
      module.exports.db = db
      module.exports.error = null
      return db
    })
    .catch(error => {
      log.error('No connection to DB: %s', mongoUrl, error)
      module.exports.db = null
      module.exports.error = error
    })
}

module.exports = {
  init
}
