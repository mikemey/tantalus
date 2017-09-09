const express = require('express')
const passport = require('passport')

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
const loginSlug = usersSlug + '/login'
const accountSlug = usersSlug + '/account'
const registerSlug = usersSlug + '/register'

const createUsersRouter = logger => {
  const router = express.Router()

  router.post(loginSlug, passport.authenticate('local'), (req, res) => {
    const links = apiLinks({ account: accountSlug })
    return res.status(201).send(links)
  })

  router.post(registerSlug, (req, res) => {
    const username = req.body.username
    const password = req.body.password
    const confirmation = req.body.confirmation

    return checkRegistration(username, password, confirmation)
      .then(() => Account.register(username, password))
      .then(() => security.authenticate(req, res))
      .then(() => {
        logger.info('new user registration: %s', username)
        return res.status(201).send()
      })
      .catch(err => {
        logger.warn(err.message)
        switch (err.name) {
          case UserExistsErrorName:
            return responseError(res, userExistsMessage)
          case ClientErrorName:
            return responseError(res, err.message)
          default:
            return responseError(res, err.message, 500)
        }
      })
  })

  return router
}

module.exports = createUsersRouter
