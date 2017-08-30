const requests = require('../utils/requests')
const fmt = require('../utils/formats')

const getSolidiPrices = () => {
  const start = Date.now()
  return requests
    .getHtml('https://www.solidi.co/index')
    .then($ => {
      const buy = fmt.rate($('#buybtcrate').val())
      const sell = fmt.rate($('#sellbtcrate').val())
      const duration = fmt.duration(start)
      return { name: 'solidi', buy, sell, duration }
    })
}

const getLakebtcPrices = () => {
  const start = Date.now()
  return requests
    .getJson('https://api.LakeBTC.com/api_v2/ticker')
    .then(({ btcgbp }) => {
      const buy = fmt.rate(btcgbp.ask)
      const sell = fmt.rate(btcgbp.bid)
      const duration = fmt.duration(start)
      return { name: 'lakebtc', buy, sell, duration }
    })
}

const getCoinfloorPrices = () => {
  const start = Date.now()
  return requests
    .getJson('https://webapi.coinfloor.co.uk:8090/bist/XBT/GBP/ticker/')
    .then(responseJson => {
      const buy = fmt.rate(responseJson.ask)
      const sell = fmt.rate(responseJson.bid)
      const duration = fmt.duration(start)
      return { name: 'coinfloor', buy, sell, duration }
    })
}

const addDuration = execFn => {
  const start = Date.now()
  return execFn().then(result => Object.assign(result, fmt.duration(start)))
}

module.exports = {
  getPrices: () => Promise.all([
    addDuration(getSolidiPrices),
    addDuration(getLakebtcPrices),
    addDuration(getCoinfloorPrices)
  ])
}
