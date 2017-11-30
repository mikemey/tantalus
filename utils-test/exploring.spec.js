/* global describe before beforeEach it */
const moment = require('moment')

const requests = require('../utils/requests')
const ExchangeConnector = require('../trader/exchangeConnector')
const { amountString, volumeString } = require('../utils/ordersHelper')

const helpers = require('./helpers')

xdescribe('exploring', () => {
  const log = console.log

  describe('lakebtc', () => {
    it('orders', () => requests
      .getJson('https://api.LakeBTC.com/api_v2/bcorderbook?symbol=btcgbp')
      .then(body => {
        console.log(JSON.stringify(body))
      }))

    it('trades', () => requests
      .getJson('https://api.lakebtc.com/api_v2/bctrades?symbol=btcgbp')
      .then(body => {
        console.log(body)
      }))

    it('trades', () => requests
      .getJson('https://api.lakebtc.com/api_v2/bctrades?symbol=btcgbp')
      .then(body => {
        console.log(body)
      }))
  })

  describe('migrating data', () => {
    xit('insert', () => {
      const tickerData = [{
        created: new Date(),
        tickers: [
          { name: 'solidi', buy: 3675.14, sell: 'N/A', duration: 601 },
          { name: 'lakebtc', buy: 3815.68, duration: 194 },
          { name: 'coinfloor', buy: 3755, sell: 3753, duration: 194 },
          { name: 'coindesk', buy: 3757.99, sell: 999.71, duration: 238 }
        ]
      }]
      return helpers.dropDatabase()
        .then(() => helpers.insertTickers(tickerData))
    })

    it('CHECK', () => {
      const expectedTicker = [
        { name: 'solidi', bid: 3675.14, ask: 'N/A' },
        { name: 'lakebtc', bid: 'N/A', ask: 3815.68 },
        { name: 'coinfloor', bid: 3753, ask: 3755 },
        { name: 'coindesk', ask: 3757.99 }
      ]
      return helpers.getTickers().then(tickers => {
        tickers.should.have.length(1)
        const actualTicker = tickers[0]
        actualTicker.tickers.should.deep.equal(expectedTicker)
      })
    })
  })

  it('mongo queries', () => {
    const db = {}
    const ISODate = {}

    // -------------------
    db.tickers.find(
      { created: { $gte: new ISODate('2017-08-02T05:26:00Z') } },
      { _id: false, created: true, tickers: true }
    ).sort({ created: -1 })
    // -------------------
    db.tickers.aggregate([{
      $sort: { created: -1 }
    }, {
      $group: {
        _id: { $dayOfYear: '$created' },
        closing: { $first: '$tickers' }
      }
    }])
  })

  it('should print colors', () => {
    const colormsg = (msg, col) => console.log(`\x1b[${col}m${msg}\x1b[0m`)
    Array.from({ length: 200 }, (_, ix) => ix)
      .forEach(c => colormsg(`THIS is color # ${c}`, c))
  })

  describe('Simex queries', () => {
    const config = {
      exchangeHost: 'https://msm-itc.com/api/simex',
      clientId: 'haumea'
    }
    const exchangeConnector = ExchangeConnector(config)

    it('all accounts', () => {
      log('ALL ACCOUNTS')
      return exchangeConnector.getAllAccounts()
        .then(accounts => accounts
          .sort((a, b) => a.clientId < b.clientId ? -1 : a.clientId > b.clientId ? 1 : 0)
          .forEach(acc => {
            log(`${acc.clientId}:`)
            log(`\t${volumeString(acc.balances.gbp_available)} \t ${amountString(acc.balances.xbt_available)}`)
            log(`\t${volumeString(acc.balances.gbp_reserved)} \t ${amountString(acc.balances.xbt_reserved)}`)
          }))
        .catch(log)
        .then(process.exit)
    })

    it('transaction request', () => {
      return exchangeConnector.getTransactions()
        .then(transactions => {
          log(moment.unix(transactions[0].date))
          log(moment.unix(transactions[transactions.length - 1].date))
          const transactionCsv = tx => {
            const time = moment.unix(tx.date).format('HH:mm:ss')
            return `${tx.tid},${time},${(tx.amount / 10000).toFixed(4)},${tx.price / 100}`
            // log(`${time},${(tx.amount / 10000).toFixed(4)},${tx.price / 100}`)
          }
          transactions.map(transactionCsv).forEach(x => console.log(x))
        })
    })
  })
})
