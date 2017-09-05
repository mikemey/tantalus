const cors = require('cors')
const csrf = require('csurf')
const session = require('express-session')

const mongoose = require('mongoose')
mongoose.Promise = Promise

const MongoStore = require('connect-mongo')(session)

const init = (app, config, log) => {
  if (config.disableSecurity) return echoDisabledMessage(log)

  setupSession(app, config)
  setupCrossRequestsProtection(app, config, log)
}

const echoDisabledMessage = log => {
  log.warn('--------- SERVER IS UNPROTECTED ---------')
}

const setupSession = (app, config) => {
  app.use(session({
    name: 'tantalus.sid',
    secret: config.secret,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: mongoose.connection })
  }))
}

const setupCrossRequestsProtection = (app, config, log) => {
  app.use(cors())

  const csrfMiddlewares = [csrfProtection, csrfTokenGeneration]
  app.all('*', ...csrfMiddlewares)
  app.use(csrfErrorHandler(log))
}

const csrfProtection = csrf({
  cookie: false,
  value: req => req.headers['x-xsrf-token']
})

const csrfTokenGeneration = (req, res, next) => {
  const token = req.csrfToken()
  res.cookie('XSRF-TOKEN', token)
  next()
}

const csrfErrorHandler = log => (err, req, res, next) => {
  if (err.code !== 'EBADCSRFTOKEN') return next(err)

  const error = err.message
  log.warn('CSRF error: %s', error)
  return res.status(403).json({ error })
}

module.exports = {
  init
}
