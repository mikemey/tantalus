const fs = require('fs')
const path = require('path')
const util = require('util')
const binance = require('node-binance-api')

const configFile = path.join(__dirname, 'bnc.config.json')
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'))

const BTC_SYMBOL = 'BTC'

binance.options({
  APIKEY: config.APIKEY,
  APISECRET: config.APISECRET,
  useServerTime: true,
  test: true
})

const btcStr = v => `Ƀ ${v.toFixed(4)}`

const balancePromise = util.promisify(binance.balance)
const pricesPromise = util.promisify(binance.prices)

const toNum = str => Number(str)

const internalBalance = () => balancePromise()
  .then(balances => Object
    .keys(balances)
    .map(symbol => {
      const total = toNum(balances[symbol].available) + toNum(balances[symbol].onOrder)
      return { symbol, total }
    })
    .filter(balance => balance.total > 0)
  )

const internalPrices = () => pricesPromise()
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
          balance.btcValue = balance.symbol === BTC_SYMBOL
            ? balance.total
            : balance.total * prices[`${balance.symbol}${BTC_SYMBOL}`]
          return balance
        })
        .filter(balance => balance.btcValue >= config.btcThreshold)
        .sort((a, b) => b.btcValue - a.btcValue)
        .reduce((sum, balance) => {
          console.log(` ${balance.symbol.padEnd(7)} ${btcStr(balance.btcValue)}  [${balance.total}]`)
          return sum + balance.btcValue
        }, 0)

      console.log(`total:   ${btcStr(btcTotal)}`)
    })
    .catch(err => console.log(err))
  return 'requesting balance...'
}

module.exports = {
  balance
}
