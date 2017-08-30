const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const mongodb = require('./utils/mongoConnection')

const createTickersRouter = require('./tickers/tickers')

const requestLogger = () =>
  morgan(':date[iso] [:remote-addr] :method :url [:status] [:res[content-length] bytes] - :response-time[0]ms :user-agent')

const createServer = (config, log) => mongodb.init(config, log)
  .then(() => new Promise((resolve, reject) => {
    const app = express()

    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: true }))
    app.use(requestLogger())

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
  const router = express.Router()
  router.use('/tickers', createTickersRouter(log))

  return router
}

module.exports = createServer
