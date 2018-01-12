const express = require('express')

const { clientError, defaultErrorHandler } = require('../utils/jsonResponses')
const { Balance } = require('./userModel')

const BALANCE_SLUG = '/balance'

const checkNewBalanceEntry = (amount, price, asset) => new Promise((resolve, reject) => {
  if (!amount) reject(clientError('amount is missing'))
  if (!price) reject(clientError('price is missing'))
  if (!asset) reject(clientError('asset is missing'))
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
    return Promise.all(newEntries.map(en => checkNewBalanceEntry(en.amount, en.price, en.asset)))
      .then(() => balanceService.setBalance(req.user._id, newEntries))
      .then(() => res.status(204).send())
      .catch(defaultErrorHandler(res, logger))
  })

  router.post(BALANCE_SLUG, (req, res) => {
    const amount = req.body.amount
    const price = req.body.price
    const asset = req.body.asset

    return checkNewBalanceEntry(amount, price, asset)
      .then(() => balanceService.addBalance(req.user._id, { amount, price, asset }))
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
    .then(userBalance => userBalance.entries)

  return {
    addBalance: updateBalance(true),
    setBalance: updateBalance(false),
    getBalanceEntries
  }
}

module.exports = createBalanceRouter
