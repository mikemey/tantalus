const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')

const pjson = require('../package.json')

const mongoConnection = require('./utils/mongoConnection')
const security = require('./utils/security')

const requestLogger = () => {
  morgan.token('clientIP', req => req.headers['x-forwarded-for'] || req.connection.remoteAddress)
  return morgan(':date[iso] [:clientIP] :method :url [:status] [:res[content-length] bytes] - :response-time[0]ms :user-agent')
}

const createServer = (config, log) => mongoConnection.initializeAll(config, log)
  .then(() => new Promise((resolve, reject) => {
    const app = express()

    app.use(bodyParser.json())
    app.use(requestLogger())

    security.init(app, config, log)
    app.use('/tantalus', express.static('frontend/'))
    app.use('/api', createApiRouter(log))

    const server = app.listen(8000, () => {
      log.info(`Started on port ${server.address().port}`)
      return resolve({ app, server })
    })
    server.once('error', err => {
      log.info('server error: ' + err)
      return reject(err)
    })
  }))

const createApiRouter = log => {
  const createTickersRouter = require('./tickers')
  const createUsersRouter = require('./users')

  const router = express.Router()
  router.use('/tickers', createTickersRouter(log))
  router.use('/users', createUsersRouter(log))
  router.get('/version', createVersionEndpoint(log))

  return router
}

const createVersionEndpoint = log => {
  const version = `v${pjson.version}`
  log.info(`server version: ${version}`)
  return (req, res) => res.status(200).send(version)
}

module.exports = createServer
