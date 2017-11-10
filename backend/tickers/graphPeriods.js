const moment = require('moment')
const now = () => moment.utc()

const _100min = '100min'
const _1d = '1d'
const _1w = '1w'
const _1m = '1m'
const _3m = '3m'
const _1y = '1y'

const cutoffDate = period => {
  switch (period) {
    case _100min: return now().subtract(100, 'minutes')
    case _1d: return now().subtract(1, 'day')
    case _1w: return now().subtract(1, 'week')
    case _1m: return now().subtract(1, 'month')
    case _3m: return now().subtract(3, 'months')
    case _1y: return now().subtract(1, 'year')
    default:
      throw new Error(`Unsupported period: '${period}'`)
  }
}

module.exports = {
  _1w, _1y,
  supportedPeriods: [_100min, _1d, _1w, _1m, _3m, _1y],
  cutoffDate
}
