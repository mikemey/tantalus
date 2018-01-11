const express = require('express')

const usersSlug = '/users'

const createUsersRouter = logger => {
  const router = express.Router()

  const createAccountRouter = require('./accounts')
  const createKeysRouter = require('./keys')
  const createBalanceRouter = require('./balance')

  router.use(usersSlug, createAccountRouter(logger))
  router.use(usersSlug, createKeysRouter(logger))
  router.use('/', createBalanceRouter(logger))

  return router
}

module.exports = createUsersRouter
