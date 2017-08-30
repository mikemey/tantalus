const createTickersRepo = require('./tickersRepo')

const TickerService = () => {
  const tickersRepo = createTickersRepo()

  const getLatest = () => tickersRepo.getLatest()

  return {
    getLatest
  }
}

module.exports = TickerService
