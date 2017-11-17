const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')

const pjson = require('../package.json')

const mongoConnection = require('./utils/mongoConnection')
const security = require('./utils/security')

const createTickersRouter = require('./tickers')
const createUsersRouter = require('./users')
const createInvestRouter = require('./invest')
const createSimexRouter = require('./simex')

const TransactionsService = require('./transactions/transactionsService')

const suppressRequestLog = [
  '/api/simex/transactions',
  '/api/invest/transactions',
  '/api/tickers/graph',
  '/api/tickers/latest'
]

const methodsWithBody = ['POST', 'PUT']

const requestLogger = () => {
  morgan.token('clientIP', req => req.headers['x-forwarded-for'] || req.connection.remoteAddress)
  morgan.token('errorBody', req => methodsWithBody.includes(req.method)
    ? `\n${JSON.stringify(req.body, null, ' ')}`
    : ''
  )
  return morgan(':date[iso] [:clientIP] :method :url [:status] [:res[content-length] bytes] - :response-time[0]ms :user-agent :errorBody', {
    skip: (req, res) =>
      suppressRequestLog.some(excludePath => req.originalUrl.startsWith(excludePath)) ||
      res.statusCode === 304
  })
}

const createServer = (config, tantalusLogger) => mongoConnection.initializeAll(config, tantalusLogger)
  .then(() => new Promise((resolve, reject) => {
    const app = express()

    app.use(bodyParser.json())
    app.use(requestLogger())

    security.init(app, config, tantalusLogger)
    app.use('/tantalus', express.static('frontend/'))
    app.use('/api', createApiRouter(config, tantalusLogger))

    const server = app.listen(8000, () => {
      tantalusLogger.info(`Started on port ${server.address().port}`)
      return resolve({ app, server })
    })
    server.once('error', err => {
      tantalusLogger.error(`server error: ${err.message}`)
      tantalusLogger.log(err)
      return reject(err)
    })
  }))

const createApiRouter = (config, tantalusLogger) => {
  const router = express.Router()
  router.use('/', createUsersRouter(tantalusLogger))
  router.use('/tickers', createTickersRouter(tantalusLogger))
  router.get('/version', createVersionEndpoint(tantalusLogger))

  createSimexEndpoints(router, config, tantalusLogger)
  return router
}

const createVersionEndpoint = tantalusLogger => {
  const version = `v${pjson.version}`
  tantalusLogger.info(`server version: ${version}`)
  return (req, res) => res.status(200).send(version)
}

const createSimexEndpoints = (router, config, tantalusLogger) => {
  if (config.simex) {
    const transactionService = TransactionsService(tantalusLogger, config)
    transactionService.scheduleCacheUpdate()

    router.use('/invest', createInvestRouter(tantalusLogger, transactionService))
    router.use('/simex', createSimexRouter(tantalusLogger, transactionService))
  }
}

module.exports = createServer
