const express = require('express')

const { responseError } = require('../utils/responses')
const Account = require('./userAccount')

const createUsersRouter = logger => {
  const router = express.Router()

  router.post('/register', (req, res) => {
    const username = req.body.username
    const password = req.body.password

    if (!username || !password) return responseError(res, 'username or password missing')

    return Account.register(username, password)
      .then(() => res.status(201).send())
  })

  return router
}

module.exports = createUsersRouter
