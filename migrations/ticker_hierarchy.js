const moment = require('moment')
const rp = require('request-promise')

const fs = require('fs')
const fmt = require('../schedule/formats')

const serverMoment = serverTime => moment.unix(serverTime / 1000)

const outFile = 'binance_tickers.raw.json'
let latestTradeId = 1
let currentMoment = serverMoment(1578038470040)
// const lastMoment = serverMoment(1578638470040)
const lastMoment = serverMoment(1609265732129)
let processTrades = true

const getTradesFromId = fromId => rp({
  uri: `https://api.binance.com/api/v3/historicalTrades?limit=1000&symbol=BTCEUR&fromId=${fromId}`,
  json: true,
  headers: {
    'X-MBX-APIKEY': 'use-binance-api-key'
  }
}).then(body => body.map(trade => ({ id: trade.id, p: trade.price, t: trade.time, m: serverMoment(trade.time) })))

const convertToDbTicker = tick => ({
  created: tick.m.toISOString(),
  tickers: [{ name: 'binance', bid: fmt.rate(tick.p) }]
})

const pickTickFilter = tick => {
  if (tick.m.isAfter(currentMoment) && tick.m.isBefore(lastMoment)) {
    currentMoment = tick.m.clone().add(20, 'hours')
    return true
  }
  return false
}

const scheduleRead = () => setTimeout(readTrades, 5000)
const readTrades = async () => {
  const dailyTicks = await getTradesFromId(latestTradeId)
    .then(ticks => {
      const lastTick = ticks[ticks.length - 1]
      latestTradeId = lastTick.id
      processTrades = lastTick.m.isBefore(lastMoment)
      return ticks.filter(pickTickFilter).map(convertToDbTicker)
    })
  console.log('days in packet:', dailyTicks.length, '\tlatest trade-id:', latestTradeId)
  dailyTicks.forEach(tick => fs.appendFileSync(outFile, JSON.stringify(tick) + '\n'))

  if (processTrades) {
    scheduleRead()
  }
}

scheduleRead()

// console.log('wanted: 2020-12-29T18:16:00.004Z')
// console.log('   got:', serverMoment(1609265732129).toISOString())
