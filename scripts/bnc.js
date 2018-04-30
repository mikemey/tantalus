const fs = require('fs')
const path = require('path')
const moment = require('moment')
const Binance = require('binance-api-node').default

const configFile = path.join(__dirname, 'bnc.config.json')
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'))

const BTC_SYMBOL = 'BTC'

const binanceClient = Binance({
  apiKey: config.APIKEY,
  apiSecret: config.APISECRET
})

const toBtc = v => `Ƀ ${v.toFixed(4)}`
const toNum = str => Number(str)
const toDatetime = timeMs => moment(timeMs).format('YYYY-MM-DD HH:mm:ss')

const internalBalance = () => binanceClient.accountInfo()
  .then(({ balances }) => balances
    .map(({ asset, free, locked }) => {
      const total = toNum(free) + toNum(locked)
      return { asset, total }
    })
    .filter(balance => balance.total > 0)
  )

const internalPrices = () => binanceClient.prices()
  .then(prices => {
    Object.keys(prices)
      .forEach(tradingPair => {
        prices[tradingPair] = toNum(prices[tradingPair])
      })
    return prices
  })

const balance = () => {
  Promise.all([internalBalance(), internalPrices()])
    .then(([balances, prices]) => {
      console.log() // newline before output
      const btcTotal = balances
        .map(balance => {
          balance.btcValue = balance.asset === BTC_SYMBOL
            ? balance.total
            : balance.total * prices[`${balance.asset}${BTC_SYMBOL}`]
          return balance
        })
        .filter(balance => balance.btcValue >= config.btcThreshold)
        .sort((a, b) => b.btcValue - a.btcValue)
        .reduce((sum, balance) => {
          console.log(` ${balance.asset.padEnd(7)} ${toBtc(balance.btcValue)}  [${balance.total}]`)
          return sum + balance.btcValue
        }, 0)

      console.log(`total:   ${toBtc(btcTotal)}`)
    })
    .catch(err => console.log(err))
  return 'requesting balance...'
}

const openOrders = () => {
  binanceClient.openOrders()
    .then(orders => {
      console.log() // newline before output
      orders.forEach(order => {
        const leftQty = order.origQty - order.executedQty
        console.log(`[${toDatetime(order.time)}] ${order.side} ${order.symbol}: qty: ${leftQty}, price: ${order.price}`)
      })
    })
  return 'requesting open orders...'
}

const transactions = symbol => {
  symbol = symbol.toUpperCase()
  if (!symbol.endsWith(BTC_SYMBOL)) {
    symbol = symbol + BTC_SYMBOL
  }
  binanceClient.myTrades({ symbol })
    .then(result => {
      console.log() // newline before output
      result
        .sort((a, b) => a.time - b.time)
        .forEach(trade => {
          const side = trade.isBuyer ? ' buy' : 'sell'
          const inBtc = toBtc(trade.price * trade.qty)
          console.log(`[${toDatetime(trade.time)}]: ${side} btc: ${inBtc}, price: ${toNum(trade.price)}, qty: ${toNum(trade.qty)}, fee: ${toNum(trade.commission)} ${trade.commissionAsset}`)
        })
    })
  return 'requesting user transactions...'
}

module.exports = {
  balance, openOrders, transactions
}
