const cors = require('cors')
const csrf = require('csurf')
const session = require('express-session')

const MongoStore = require('connect-mongo')(session)
const mongoose = require('./mongoConnection').mongoose

const Account = require('../users/userAccount')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy

const init = (app, config, log) => {
  if (config.disableSecurity) {
    log.warn('--------- SERVER IS UNPROTECTED ---------')
    return
  }

  setupSession(app, config)
  setupCrossRequestsProtection(app, config, log)
  setupUserAuthentication(app, config, log)
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

const setupUserAuthentication = (app, config, log) => {
  app.use(passport.initialize())
  app.use(passport.session())

  passport.use(new LocalStrategy(Account.authenticate()))
  passport.serializeUser(Account.serializeUser())
  passport.deserializeUser(Account.deserializeUser())
}

const requiresAuth = passport.authenticate('local')
const authenticate = (req, res, next) => new Promise((resolve, reject) => {
  passport.authenticate('local',
    (err, user, info) => resolve({ err, user, info })
  )(req, res, next)
})

module.exports = {
  init,
  requiresAuth,
  authenticate
}
