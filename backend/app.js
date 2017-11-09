const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')

const pjson = require('../package.json')

const mongoConnection = require('./utils/mongoConnection')
const security = require('./utils/security')

const requestLogger = () => {
  morgan.token('clientIP', req => req.headers['x-forwarded-for'] || req.connection.remoteAddress)
  return morgan(':date[iso] [:clientIP] :method :url [:status] [:res[content-length] bytes] - :response-time[0]ms :user-agent', {
    skip: (req, res) => req.baseUrl && req.baseUrl.startsWith('/api/simex')
  })
}

const createServer = (config, log) => mongoConnection.initializeAll(config, log)
  .then(() => new Promise((resolve, reject) => {
    const app = express()

    app.use(bodyParser.json())
    app.use(requestLogger())

    security.init(app, config, log)
    app.use('/tantalus', express.static('frontend/'))
    app.use('/api', createApiRouter(config, log))

    const server = app.listen(8000, () => {
      log.info(`Started on port ${server.address().port}`)
      return resolve({ app, server })
    })
    server.once('error', err => {
      log.info('server error: ' + err)
      return reject(err)
    })
  }))

const createApiRouter = (config, log) => {
  const createTickersRouter = require('./tickers')
  const createUsersRouter = require('./users')

  const router = express.Router()
  router.use('/', createUsersRouter(log))
  router.use('/tickers', createTickersRouter(log))
  router.get('/version', createVersionEndpoint(log))

  createSimexEndpoints(router, config, log)
  return router
}

const createVersionEndpoint = log => {
  const version = `v${pjson.version}`
  log.info(`server version: ${version}`)
  return (req, res) => res.status(200).send(version)
}

const createSimexEndpoints = (router, config, log) => {
  if (config.simex) {
    const createInvestRouter = require('./invest')
    const createSimexRouter = require('./simex')
    const transactionService = require('./simex/transactionsService')(log, config)
    transactionService.startScheduling()

    router.use('/invest', createInvestRouter(log, transactionService))
    router.use('/simex', createSimexRouter(log, transactionService))
  }
}

module.exports = createServer
