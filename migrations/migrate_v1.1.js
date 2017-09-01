/* global db */

db.tickers.find().forEach(rec => {
  const safe = input => input !== undefined ? input : 'N/A'
  const newticker = rec.tickers.map(tick => {
    if (tick.ask) return tick
    switch (tick.name) {
      case 'solidi':
        return {
          name: tick.name,
          bid: safe(tick.buy),
          ask: safe(tick.sell)
        }
      case 'lakebtc':
      case 'coinfloor':
        return {
          name: tick.name,
          bid: safe(tick.sell),
          ask: safe(tick.buy)
        }
      case 'coindesk':
        return {
          name: tick.name,
          ask: safe(tick.buy)
        }
      default:
        return { name: 'xxx' }
    }
  })
  db.tickers.update({ '_id': rec._id }, { $set: { tickers: newticker } })
})
