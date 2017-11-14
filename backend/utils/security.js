const cors = require('cors')
const csrf = require('csurf')
const session = require('express-session')
const cookieParser = require('cookie-parser')

const MongoStore = require('connect-mongo')(session)
const mongoose = require('./mongoConnection').mongoose

const { Account } = require('../users/userModel')
const passport = require('passport')

const { responseError } = require('./jsonResponses')

const XSRF_COOKIE = 'XSRF-TOKEN'

const init = (app, config, logger) => {
  if (config.disableSecurity) {
    setupTestUser(app, config)
    return
  }

  setupSession(app, config)
  setupCrossRequestsProtection(app, config, logger)
  setupUserAuthentication(app, config)
}

const setupSession = (app, config) => {
  app.use(cookieParser())
  app.use(session({
    name: 'tantalus.sid',
    secret: config.secret,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: mongoose.connection })
  }))
}

const setupCrossRequestsProtection = (app, config, logger) => {
  app.use(cors())

  const csrfMiddlewares = [csrfProtection, csrfTokenGeneration]
  app.all(/^\/(?!api\/simex).*/, ...csrfMiddlewares)
  app.use(csrfErrorHandler(logger))
}

const csrfProtection = csrf({
  cookie: true,
  value: req => req.cookies[XSRF_COOKIE]
})

const csrfTokenGeneration = (req, res, next) => {
  const token = req.csrfToken()
  res.cookie(XSRF_COOKIE, token)
  next()
}

const csrfErrorHandler = logger => (err, req, res, next) => {
  if (err.code !== 'EBADCSRFTOKEN') {
    logger.error(`ERROR: ${err.message}`)
    logger.log(err)
    return next(err)
  }

  const message = err.message
  logger.info(`CSRF error: ${message}`)
  return res.status(403).json({ error: message })
}

const setupUserAuthentication = (app, config) => {
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
  '/tantalus/',
  '/api/simex'
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
