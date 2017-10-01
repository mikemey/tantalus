const express = require('express')

const usersSlug = '/users'

const createUsersRouter = logger => {
  const router = express.Router()

  const createAccountRouter = require('./accounts')
  const createKeysRouter = require('./keys')

  router.use(usersSlug, createAccountRouter(logger))
  router.use(usersSlug, createKeysRouter(logger))

  return router
}

module.exports = createUsersRouter
