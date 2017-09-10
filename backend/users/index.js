const express = require('express')

const { responseError, apiLinks } = require('../utils/jsonResponses')
const Account = require('./userAccount')
const security = require('../utils/security')

const UserExistsErrorName = 'UserExistsError'
const userExistsMessage = 'Username is already registered'

const ClientErrorName = 'ClientError'
const clientError = message => ({ name: ClientErrorName, message })

const checkRegistration = (username, password, confirmation) => new Promise((resolve, reject) => {
  if (!username) reject(clientError('Username missing'))
  if (!password) reject(clientError('Password missing'))
  if (!confirmation) reject(clientError('Password confirmation missing'))
  if (password !== confirmation) reject(clientError('Password does not match confirmation'))
  resolve()
})

const usersSlug = '/users'
const LOGIN_SLUG = usersSlug + '/login'
const ACCOUNT_SLUG = usersSlug + '/account'
const REGISTER_SLUG = usersSlug + '/register'

const createUsersRouter = logger => {
  const router = express.Router()

  router.post(LOGIN_SLUG, (req, res, next) => security.authenticate(req, res, next)
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

      const links = apiLinks({ account: ACCOUNT_SLUG })
      return res.status(201).json(links)
    })
  })

  router.post(REGISTER_SLUG, (req, res, next) => {
    const username = req.body.username
    const password = req.body.password
    const confirmation = req.body.confirmation

    return checkRegistration(username, password, confirmation)
      .then(() => Account.register(username, password))
      .then(() => security.authenticate(req, res, next))
      .then(({ err, user, info }) => {
        if (err) responseError(res, err, 500)
        if (!user) responseError(res, 'authentication failed', 500)
        logger.info('new user registration: %s', username)
        return res.status(201).send()
      })
      .catch(errorHandler(res))
  })

  router.get(ACCOUNT_SLUG, security.requiresAuth, (req, res) => {
    const picked = (({ username }) => ({ username }))(req.user)
    return res.status(200).json(picked)
  })

  const errorHandler = res => err => {
    logger.warn(err.message)
    switch (err.name) {
      case UserExistsErrorName:
        return responseError(res, userExistsMessage)
      case ClientErrorName:
        return responseError(res, err.message)
      default:
        return responseError(res, err.message, 500)
    }
  }

  return router
}

module.exports = createUsersRouter
