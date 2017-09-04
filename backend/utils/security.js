const cookieParser = require('cookie-parser')
const cors = require('cors')
const csrf = require('csurf')
const session = require('express-session')

const init = (app, config, log) => {
  if (config.disableSecurity) return echoDisabledMessage(log)

  setupCrossRequest(app, config)
}

const echoDisabledMessage = log => {
  log.warn('--------- SERVER IS UNPROTECTED ---------')
}

const setupCrossRequest = (app, config) => {
  app.use(cookieParser())
  app.use(session({
    secret: config.secret,
    resave: false,
    saveUninitialized: false
  }))
  app.use(cors())
  app.use(csrf())

  const csrfProtection = csrf({ cookie: false })
  const csrfMiddleware = [csrfProtection, csrfTokenGeneration]

  app.all('*', csrfMiddleware)
}

const csrfTokenGeneration = (req, res, next) => {
  res.cookie('XSRF-TOKEN', req.csrfToken())
  res.locals.csrftoken = req.csrfToken()
  next()
}

module.exports = {
  init
}
