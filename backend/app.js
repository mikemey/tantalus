const express = require('express')
const bodyParser = require('body-parser')

const createPriceRouter = require('./prices/prices')

const addDefaultRoute = (app, log) => {
  app.all('*', (req, res) => {
    log.info(`invalid request: ${req.path}`)
    res.redirect('/prices')
  })
}

const createServer = log => {
  return new Promise((resolve, reject) => {
    const app = express()

    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: true }))

    app.use('/prices', createPriceRouter(log))

    addDefaultRoute(app, log)

    const server = app.listen(8000, () => {
      log.info(`Started on port ${server.address().port}`)
      return resolve({ app, server })
    })
    server.once('error', err => {
      log.info('server error: ' + err)
      return reject(err)
    })
  })
}

module.exports = createServer
