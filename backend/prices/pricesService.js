const requests = require('../utils/requests')
const fmt = require('../utils/formats')

const getSolidiPrices = () => requests
  .getHtml('https://www.solidi.co/index')
  .then($ => {
    const buy = fmt.rate($('#buybtcrate').val())
    const sell = fmt.rate($('#sellbtcrate').val())
    return { name: 'solidi', buy, sell }
  })

const readAskBid = (name, json) => {
  const buy = fmt.rate(json.ask)
  const sell = fmt.rate(json.bid)
  return { name, buy, sell }
}

const getLakebtcPrices = () => requests
  .getJson('https://api.LakeBTC.com/api_v2/ticker')
  .then(({ btcgbp }) => readAskBid('lakebtc', btcgbp))

const getCoinfloorPrices = () => requests
  .getJson('https://webapi.coinfloor.co.uk:8090/bist/XBT/GBP/ticker/')
  .then(responseJson => readAskBid('coinfloor', responseJson))

const addDuration = execPromise => {
  const start = Date.now()
  return execPromise()
    .then(result => Object.assign(result, { duration: fmt.duration(start) }))
}

const withDuration = execPromises => execPromises.map(addDuration)

module.exports = {
  getPrices: () => Promise.all(withDuration([
    getSolidiPrices,
    getLakebtcPrices,
    getCoinfloorPrices
  ]))
}
