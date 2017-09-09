const express = require('express')

const { responseError } = require('../utils/responses')
const Account = require('./userAccount')
const security = require('../utils/security')

const createUsersRouter = logger => {
  const router = express.Router()

  const saveSession = req => new Promise((resolve, reject) => {
    req.session.save(err => {
      if (err) return reject(err)
      resolve()
    })
  })

  router.post('/register', (req, res) => {
    const username = req.body.username
    const password = req.body.password
    const confirmation = req.body.confirmation

    if (!username) return responseError(res, 'username missing')
    if (!password) return responseError(res, 'password missing')
    if (!confirmation) return responseError(res, 'password confirmation missing')
    if (password !== confirmation) return responseError(res, 'password does not match confirmation')

    return Account.register(username, password)
      .then(() => security.authenticate(req, res))
      .then(() => saveSession(req))
      .then(() => {
        logger.info('new user registration: %s', username)
        return res.status(201).send()
      })
      .catch(err => {
        logger.warn(err.message)
        return err.name === 'UserExistsError'
          ? responseError(res, 'username already registered')
          : responseError(res, err.message, 500)
      })
  })

  return router
}

module.exports = createUsersRouter
