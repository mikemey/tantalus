const moment = require('moment')
const now = () => moment.utc()

const _1d = '1d'
const _1w = '1w'
const _1m = '1m'
const _3m = '3m'
const _1y = '1y'

const cutoffDate = period => {
  switch (period) {
    case '1d': return now().subtract(1, 'd').toDate()
    case '1w': return now().subtract(1, 'w').toDate()
    case '1m': return now().subtract(1, 'M').toDate()
    case '3m': return now().subtract(3, 'M').toDate()
    case '1y': return now().subtract(1, 'y').toDate()
    default:
      throw new Error(`Unsupported period: '${period}'`)
  }
}

module.exports = {
  _1w, _1y,
  supportedPeriods: [_1d, _1w, _1m, _3m, _1y],
  cutoffDate
}
