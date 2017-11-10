const traderConfig = {
  clientId: 100,
  exchangeHost: 'http://localhost:8000/api/simex',
  timeslotSeconds: 100,
  tickSchedule: '3-58/3 * * * * *',
  buying: {
    ratio: 10, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 3,
    volumeLimitPence: 100000,
    lowerLimitPence: 2000
  },
  selling: {
    ratio: -1, // price change (£/Ƀ) per timeslotSeconds
    useTimeslots: 2
  }
}

module.exports = { traderConfig }
