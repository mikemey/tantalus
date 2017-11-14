const express = require('express')

const { responseError, clientError, defaultErrorHandler } = require('../utils/jsonResponses')
const { Account } = require('./userModel')
const security = require('../utils/security')

const UserExistsErrorType = 'UserExistsError'
const userExistsMessage = 'Username is already registered'

const checkRegistration = (username, password, confirmation) => new Promise((resolve, reject) => {
  if (!username) reject(clientError('Username missing'))
  if (!password) reject(clientError('Password missing'))
  if (!confirmation) reject(clientError('Password confirmation missing'))
  if (password !== confirmation) reject(clientError('Password does not match confirmation'))
  resolve()
})

const createAccountsRouter = logger => {
  const router = express.Router()

  router.post('/login', (req, res, next) => security.authenticate(req, res, next)
    .then(({ err, user, info }) => {
      if (err) throw clientError(err)
      if (!user) return responseError(res, 'Login failed', 401)
      return loginUser(req, res, user)
    })
    .catch(errorHandler(res))
  )

  const loginUser = (req, res, user) => new Promise((resolve, reject) => {
    req.logIn(user, function (err) {
      if (err) throw clientError(err)

      return res.status(204).send()
    })
  })

  router.post('/register', (req, res, next) => {
    const username = req.body.username
    const password = req.body.password
    const confirmation = req.body.confirmation

    return checkRegistration(username, password, confirmation)
      .then(() => Account.register(username, password))
      .then(() => security.authenticate(req, res, next))
      .then(({ err, user, info }) => {
        if (err) responseError(res, err, 500)
        if (!user) responseError(res, 'authentication failed', 500)
        logger.info(`new user registration: ${username}`)
        return res.status(204).send()
      })
      .catch(errorHandler(res))
  })

  router.get('/account', (req, res) => {
    const picked = (({ username }) => ({ username }))(req.user)
    return res.status(200).json(picked)
  })

  router.post('/logout', (req, res) => {
    req.logout()
    return res.status(204).send()
  })

  const errorHandler = res => err => {
    logger.error(err.message)
    switch (err.name) {
      case UserExistsErrorType:
        return responseError(res, userExistsMessage)
      default:
        return defaultErrorHandler(res)(err)
    }
  }

  return router
}

module.exports = createAccountsRouter
