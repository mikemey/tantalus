const express = require('express')

const { responseError, clientError, defaultErrorHandler } = require('../utils/jsonResponses')
const { Balance } = require('./userModel')

const BALANCE_SLUG = '/balance'

const ALLOWED_BALANCE_ENTRY_FIELDS = ['amount', 'price', 'asset', 'link']

const checkNewBalanceEntry = entry => new Promise((resolve, reject) => {
  if (!entry.amount) reject(clientError('amount is missing'))
  if (!entry.price) reject(clientError('price is missing'))
  if (!entry.asset) reject(clientError('asset is missing'))

  const unknownFields = Object.keys(entry)
    .filter(field => !ALLOWED_BALANCE_ENTRY_FIELDS.includes(field))

  if (unknownFields.length) reject(clientError(`invalid parameters: ${unknownFields}`))
  resolve()
})

const createBalanceRouter = logger => {
  const router = express.Router()
  const balanceService = BalanceService()

  router.get(BALANCE_SLUG, (req, res) => balanceService.getBalanceEntries(req.user._id)
    .then(entries => res.status(200).send({ entries }))
  )

  router.put(BALANCE_SLUG, (req, res) => {
    const newEntries = req.body
    if (!newEntries.map) return responseError(res, 'no data provided')

    return Promise.all(newEntries.map(checkNewBalanceEntry))
      .then(() => balanceService.setBalance(req.user._id, newEntries))
      .then(() => res.status(204).send())
      .catch(defaultErrorHandler(res, logger))
  })

  router.post(BALANCE_SLUG, (req, res) => {
    return checkNewBalanceEntry(req.body)
      .then(() => balanceService.addBalance(req.user._id, req.body))
      .then(() => res.status(204).send())
      .catch(defaultErrorHandler(res, logger))
  })

  return router
}

const BalanceService = () => {
  const updateBalance = addSingle => (userId, update) => Balance.find().byUserId(userId)
    .then(balance => {
      if (!balance) {
        const entries = addSingle ? [update] : update
        balance = new Balance({ userId, entries })
      } else {
        if (addSingle) balance.entries.push(update)
        else balance.entries = update
      }
      return balance.save()
    })

  const getBalanceEntries = userId => Balance
    .find().byUserId(userId)
    .then(userBalance => userBalance
      ? userBalance.entries
      : []
    )

  return {
    addBalance: updateBalance(true),
    setBalance: updateBalance(false),
    getBalanceEntries
  }
}

module.exports = createBalanceRouter
