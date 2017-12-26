const express = require('express')

const { clientError, defaultErrorHandler } = require('../utils/jsonResponses')
const { UserKeys } = require('./userModel')

const KEYS_SLUG = '/keys'

const isEmptyObject = obj => Object.keys(obj).length === 0 && obj.constructor === Object

const createKeysRouter = logger => {
  const router = express.Router()
  const userKeysService = UserKeysService()

  const checkKeys = (name, credentials) => new Promise((resolve, reject) => {
    if (!name) reject(clientError('Key name missing'))
    if (!credentials || isEmptyObject(credentials)) reject(clientError('Key credentials missing'))
    resolve()
  })

  router.get(KEYS_SLUG, (req, res) => userKeysService.getUserKeys(req.user._id)
    .then(userKeys => res.status(200).send(userKeys.keys))
  )

  router.put(KEYS_SLUG, (req, res) => {
    const name = req.body.name
    const credentials = req.body.credentials

    return checkKeys(name, credentials)
      .then(() => userKeysService.addUserKeys(req.user._id, { name, credentials }))
      .then(() => res.status(204).send())
      .catch(defaultErrorHandler(res, logger))
  })

  return router
}

const UserKeysService = () => {
  const addUserKeys = (userId, newKey) => UserKeys.find().byUserId(userId)
    .then(userKeys => {
      if (!userKeys) {
        userKeys = new UserKeys({ userId, keys: [newKey] })
      } else {
        userKeys.keys = userKeys.keys.filter(key => key.name !== newKey.name)
        userKeys.keys.push(newKey)
      }
      return userKeys.save()
    })

  const getUserKeys = userId => UserKeys.find().byUserId(userId)

  return {
    addUserKeys,
    getUserKeys
  }
}

module.exports = createKeysRouter
