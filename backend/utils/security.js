const cors = require('cors')
const csrf = require('csurf')
const session = require('express-session')

const MongoStore = require('connect-mongo')(session)
const mongoose = require('./mongoConnection').mongoose

const Account = require('../users/userAccount')
const passport = require('passport')

const { responseError } = require('./jsonResponses')

const init = (app, config, log) => {
  if (config.disableSecurity) {
    setupTestUser(app, config)
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
  if (err.code !== 'EBADCSRFTOKEN') {
    log.warn('ERROR: %s', err)
    return next(err)
  }

  const error = err.message
  log.warn('CSRF error: %s', error)
  return res.status(403).json({ error })
}

const setupUserAuthentication = (app, config, log) => {
  app.use(passport.initialize())
  app.use(passport.session())

  passport.use(Account.createStrategy())
  passport.serializeUser(Account.serializeUser())
  passport.deserializeUser(Account.deserializeUser())

  app.use(requiresAuth)
}

const setupTestUser = (app, config) => {
  if (!config.testUser) {
    throw new Error('disabled security requires test user')
  }
  app.use((req, res, next) => {
    req.user = config.testUser
    return next()
  })
}

const unprotectedRoutes = [
  '/api/version',
  '/api/users/register',
  '/api/users/login'
]

const unprotectedRoutePrefixes = [
  '/tantalus/'
]

const bypassAuthorization = route =>
  unprotectedRoutes.includes(route) ||
  unprotectedRoutePrefixes.find(prefix => route.startsWith(prefix)) !== undefined

const requiresAuth = (req, res, next) => {
  if (bypassAuthorization(req.url)) return next()

  return req.user
    ? next()
    : responseError(res, 'Authorization required', 401)
}

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
