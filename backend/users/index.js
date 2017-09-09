const express = require('express')

const { responseError } = require('../utils/responses')
const Account = require('./userAccount')
const security = require('../utils/security')

const createUsersRouter = logger => {
  const router = express.Router()

  router.post('/register', (req, res) => {
    const username = req.body.username
    const password = req.body.password
    const confirmation = req.body.confirmation

    if (!username) return responseError(res, 'Username missing')
    if (!password) return responseError(res, 'Password missing')
    if (!confirmation) return responseError(res, 'Password confirmation missing')
    if (password !== confirmation) return responseError(res, 'Password does not match confirmation')

    return Account.register(username, password)
      .then(() => security.authenticate(req, res))
      .then(() => {
        logger.info('new user registration: %s', username)
        return res.status(201).send()
      })
      .catch(err => {
        logger.warn(err.message)
        return err.name === 'UserExistsError'
          ? responseError(res, 'Username is already registered')
          : responseError(res, err.message, 500)
      })
  })

  return router
}

module.exports = createUsersRouter
