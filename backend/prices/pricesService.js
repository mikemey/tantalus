const requests = require('../utils/requests')
const fmt = require('../utils/formats')

const transformAskBid = (name, json) => {
  const buy = fmt.rate(json.ask)
  const sell = fmt.rate(json.bid)
  return { name, buy, sell }
}

const getSolidiPrices = () => requests
  .getHtml('https://www.solidi.co/index')
  .then($ => transformAskBid('solidi', {
    ask: fmt.rate($('#buybtcrate').val()),
    bid: fmt.rate($('#sellbtcrate').val())
  }))

const getLakebtcPrices = () => requests
  .getJson('https://api.LakeBTC.com/api_v2/ticker')
  .then(({ btcgbp }) => transformAskBid('lakebtc', btcgbp))

const getCoinfloorPrices = () => requests
  .getJson('https://webapi.coinfloor.co.uk:8090/bist/XBT/GBP/ticker/')
  .then(responseJson => transformAskBid('coinfloor', responseJson))

const getCoindeskPrices = () => requests
  .getJson('https://api.coindesk.com/site/headerdata.json?currency=BTC')
  .then(responseJson => {
    const rate = responseJson.bpi.GBP.rate_float
    return transformAskBid('coindesk', { ask: rate, bid: rate })
  })

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
    getCoinfloorPrices,
    getCoindeskPrices
  ]))
}
