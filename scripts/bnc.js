const fs = require('fs')
const path = require('path')
const moment = require('moment')
const Binance = require('binance-api-node').default

const configFile = path.join(__dirname, 'bnc.config.json')
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'))

const BTC_SYMBOL = 'BTC'
const SAVINGS_NAME_PATTERN = /^LD/

const binanceClient = Binance({
  apiKey: config.APIKEY,
  apiSecret: config.APISECRET
})

const requestOptions = (options = {}) => {
  return Object.assign({ useServerTime: true }, options)
}

const toBtc = v => `Ƀ ${v.toFixed(4)}`
const toDatetime = time => moment(time).format('YYYY-MM-DD HH:mm:ss')
const currentTime = () => `${toDatetime(moment())}`
const requestLog = message => `[${currentTime()}] ${message}`
const printNewline = () => console.log()

const internalBalance = () => binanceClient.accountInfo(requestOptions())
  .then(({ balances }) => balances
    .map(({ asset, free, locked }) => {
      const total = Number(free) + Number(locked)
      const isSavings = asset.match(SAVINGS_NAME_PATTERN)
      asset = asset.replace(SAVINGS_NAME_PATTERN, '')
      return { asset, total, isSavings }
    })
    .filter(balance => balance.total > 0)
  )

const internalPrices = () => binanceClient.prices(requestOptions())
  .then(prices => {
    Object.keys(prices)
      .forEach(tradingPair => {
        prices[tradingPair] = Number(prices[tradingPair])
      })
    return prices
  })

const balance = () => {
  Promise.all([internalBalance(), internalPrices()])
    .then(([balances, prices]) => {
      printNewline()
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
          const assetName = balance.asset + (balance.isSavings ? ' (S)' : '')
          console.log(` ${assetName.padEnd(8)} ${toBtc(balance.btcValue)}  [${balance.total}]`)
          return sum + balance.btcValue
        }, 0)

      console.log(' total'.padEnd(9), toBtc(btcTotal))
      console.log(`===== ${currentTime()} =====`)
    })
    .catch(err => console.log(err))
  return requestLog('requesting balance...')
}

const openOrders = () => {
  binanceClient.openOrders(requestOptions())
    .then(orders => {
      printNewline()
      orders.forEach(order => {
        const leftQty = order.origQty - order.executedQty
        console.log(`[${toDatetime(order.time)}] ${order.side} ${order.symbol}: qty: ${leftQty}, price: ${order.price}`)
      })
    })
  return requestLog('requesting open orders...')
}

const transactions = symbol => {
  if (!symbol) return 'parameter "symbol" required!'

  symbol = symbol.toUpperCase()
  if (!symbol.endsWith(BTC_SYMBOL)) {
    symbol = symbol + BTC_SYMBOL
  }
  binanceClient.myTrades(requestOptions({ symbol }))
    .then(result => {
      printNewline()
      result
        .sort((a, b) => a.time - b.time)
        .forEach(trade => {
          const side = trade.isBuyer ? ' buy' : 'sell'
          const inBtc = toBtc(trade.price * trade.qty)
          console.log(`[${toDatetime(trade.time)}]: ${side} btc: ${inBtc}, price: ${Number(trade.price)}, qty: ${Number(trade.qty)}, fee: ${Number(trade.commission)} ${trade.commissionAsset}`)
        })
    })
  return requestLog('requesting user transactions...')
}

module.exports = {
  balance, openOrders, transactions
}
