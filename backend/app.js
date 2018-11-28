const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const moment = require('moment')

const pjson = require('../package.json')

const mongoConnection = require('../utils/mongoConnection')
const security = require('./utils/security')

const createTickersRouter = require('./tickers')
const createMarketsRouter = require('./tickers/markets')
const createUsersRouter = require('./users')
const createInvestRouter = require('./invest')
const createSimexRouter = require('./simex')
const createSimReportRouter = require('./simreports')

const TransactionsService = require('../transactions/transactionsService')

const suppressRequestLog = [
  '/api/simex/transactions',
  '/api/invest/transactions',
  '/api/tickers/graph',
  '/api/tickers/latest',
  '/api/simex/[^/]*/account',
  '/api/simex/[^/]*/open_orders'
]

const methodsWithBody = ['POST', 'PUT']

const requestLogger = () => {
  morgan.token('clientIP', req => req.headers['x-forwarded-for'] || req.connection.remoteAddress)
  morgan.token('errorBody', req => methodsWithBody.includes(req.method)
    ? `\n${JSON.stringify(req.body, null, ' ')}`
    : ''
  )

  const format = ':date[iso] [:clientIP] :method :url [:status] [:res[content-length] bytes] - :response-time[0]ms :user-agent :errorBody'
  const skip = (req, res) =>
    process.env.TESTING !== undefined ||
    suppressRequestLog.some(excludePath => req.originalUrl.match(excludePath)) ||
    res.statusCode === 304

  return morgan(format, { skip })
}

const createServer = (config, tantalusLogger) => mongoConnection.connect(config, tantalusLogger)
  .then(() => new Promise((resolve, reject) => {
    const app = express()

    app.use(bodyParser.json())
    app.use(requestLogger())

    security.init(app, config, tantalusLogger)
    app.use('/tantalus', express.static('frontend/'))
    app.use('/api', createApiRouter(config, tantalusLogger))

    const server = app.listen(config.port, config.interface, () => {
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
  router.use('/markets', createMarketsRouter(tantalusLogger))
  router.get('/version', createVersionEndpoint(tantalusLogger))

  createSimexEndpoints(router, config, tantalusLogger)
  return router
}

const createVersionEndpoint = tantalusLogger => {
  const now = moment.utc().toISOString()
  const version = `v${pjson.version} (${now})`
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
  router.use('/simreports', createSimReportRouter(tantalusLogger))
}

module.exports = createServer
