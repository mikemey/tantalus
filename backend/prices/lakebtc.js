const requests = require('../utils/requests')
const fmt = require('../utils/formats')

const getPrices = () => {
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

module.exports = {
  getPrices
}
