const rp = require('request-promise')
const moment = require('moment')
const fs = require('fs')

const config = JSON.parse(fs.readFileSync('cf.config.json', 'utf8'))

const baseUrl = action => config.baseUrl + `/${action}/`

const options = action => {
  return {
    uri: baseUrl(action),
    method: 'GET',
    headers: config.headers,
    json: true
  }
}

const requestAction = action => rp(options(action))
  .then(result => {
    console.log('') // newline before promise output
    return result
  })

const amountStr = v => `Ƀ ${v}`
const priceStr = v => `£/Ƀ ${v}`
const volumeStr = v => `£ ${v}`

const balance = () => {
  requestAction('balance')
    .then(console.log)
    .catch(err => console.log(err))

  return 'requesting balance...'
}

const openOrders = () => {
  requestAction('open_orders')
    .then(orders => orders
      .sort((oA, oB) => oB.price - oA.price)
      .forEach(order => {
        const amount = amountStr(order.amount)
        const price = priceStr(order.price)
        console.log(`[${order.datetime}] type: ${order.type}, xbt: ${amount}, xbt_gbp: ${price}`)
      })
    )
    .catch(err => console.log(err))

  return 'requesting open orders...'
}

const transactions = (showAll = false) => {
  requestAction('user_transactions')
    .then(txs => txs
      .map(tx => {
        tx.date = moment.utc(tx.datetime)
        return tx
      })
      .sort((a, b) => a.date - b.date)
      .filter(cutoff(showAll))
      .forEach(tx => {
        const date = tx.date.format('YYYY-MM-DD HH:mm:ss')
        const amount = amountStr(tx.xbt)
        const price = priceStr(tx.xbt_gbp)
        const volume = volumeStr(tx.gbp)
        console.log(`[${date}] type: ${tx.type}, gbp: ${volume}, xbt: ${amount}, xbt_gbp: ${price}`
        )
      })
    )
    .catch(err => console.log(err))

  return 'requesting user transactions...'
}

const cutoff = all => {
  const now = moment().utc()
  return all
    ? () => true
    : tx => now.diff(tx.date, 'days') <= config.recentDays
}

module.exports = {
  balance, openOrders, transactions
}
