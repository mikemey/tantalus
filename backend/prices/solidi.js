const requests = require('../utils/requests')
const fmt = require('../utils/formats')

const getPrices = () => {
  const start = Date.now()
  return requests
    .get('https://www.solidi.co/index')
    .then($ => {
      const buy = fmt.rate($('#buybtcrate').val())
      const sell = fmt.rate($('#sellbtcrate').val())
      const duration = fmt.duration(start)
      return { name: 'solidi', buy, sell, duration }
    })
}

module.exports = {
  getPrices
}
