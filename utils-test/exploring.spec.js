const moment = require('moment')

const requests = require('../utils/requests')
const ExchangeConnector = require('../trader/exchangeConnector')
const { amountString, volumeString } = require('../utils/ordersHelper')

const helpers = require('./helpers')

xdescribe('exploring', () => {
  const log = console.log

  xdescribe('lakebtc', () => {
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

  xdescribe('migrating data', () => {
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

    xit('mongo queries', () => {
      const db = {}
      const ISODate = {}

      // -------------------
      db.tickers.find(
        { created: { $gte: new ISODate('2017-08-02T05:26:00Z') } },
        { projection: { _id: false, created: true, tickers: true } }
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
  })

  it('should print colors', () => {
    const colormsg = (msg, col) => console.log(`\x1b[${col}m${msg}\x1b[0m`)
    Array.from({ length: 200 }, (_, ix) => ix)
      .forEach(c => colormsg(`THIS is color # ${c}`, c))
  })

  xdescribe('Simex queries', () => {
    const config = {
      exchangeHost: 'https://msm-itc.com/api/simex',
      clientId: 'haumea'
    }
    const exchangeConnector = ExchangeConnector(config)

    xit('all accounts', () => {
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

  const fs = require('fs')

  const output = simulationId => {
    const filename = `sim_${simulationId}.csv`
    if (fs.existsSync(filename)) {
      fs.truncateSync(filename, 0)
    }
    return msg => fs.appendFileSync(filename, `${msg}\n`)
  }

  xdescribe('simulation reports', () => {
    const mongoConn = require('../utils/mongoConnection')

    let mongodb
    const simReportColl = () => mongodb.collection(mongoConn.simulationReportsCollectionName)
    const traderReportColl = () => mongodb.collection(mongoConn.traderReportsCollectionName)

    const testConfig = {
      mongodb: {
        url: 'mongodb://127.0.0.1:27017',
        dbName: 'copy'
      }
    }

    before(() => mongoConn.connect(testConfig, console)
      .then(() => { mongodb = mongoConn.db })
    )

    xit('analyze clientIds', () => {
      const simulationId = 'sec'

      return traderReportColl().find({ simulationId }, { projection: { clientId: 1, _id: 0 } }).toArray()
        .then(reports => {
          const batchLengths = reports.map(report => report.clientId.slice(2, 6))

          const maxBatchLength = batchLengths.reduce((prev, curr) => Math.max(prev, curr), 0)
          // record => {
          console.log('reports: ' + batchLengths.length)
          console.log('maxBatchLength: ' + maxBatchLength)
          const counters = new Array(maxBatchLength + 1).fill(0)
          batchLengths.forEach(bl => counters[Number(bl)]++)

          counters.forEach((counter, ix) => {
            if (counter > 0) console.log(`batch length: ${ix} - count ${counter}`)
          })
          console.log('distinct batch lengths: ' + counters.filter(c => c).length)

          // reports.forEach(report => console.log(report.clientId.slice(2, 6)))
          // let clientIdCounts = []
        })
    })

    xit('export as csv', () => {
      const simulationId = 'sec'

      const getSimReports = simReportColl().find({ simulationId }).toArray()
      const getTraderReports = traderReportColl().find({ simulationId }).toArray()
      return Promise.all([
        getSimReports,
        getTraderReports
      ]).then(([simReports, traderReports]) => {
        const simreport = simReports[0]
        const write = output(simreport.simulationId)
        // const write = console.log

        // write(`SimulationId,${simreport.simulationId}`)
        // write(`static investment,"${(simreport.staticInvestment / 100).toFixed(2)}"`)

        const createIterationBuckets = traderReports => traderReports
          .sort((r1, r2) => r1.iteration - r2.iteration || r2.fullVolume - r1.fullVolume)
          .reduce((iterations, report) => {
            const bucket = iterations[report.iteration] || []
            bucket.push(report)
            if (bucket.length === 1) {
              iterations[report.iteration] = bucket
            }
            return iterations
          }, [])
          .slice(1)

        const iterationBuckets = createIterationBuckets(traderReports)

        const staticHeaders = ['rank']
        const rankColumnIx = 0
        const dataColumnOffset = staticHeaders.length

        const headers = staticHeaders.concat(...iterationBuckets.map((_, ix) => {
          const it = ix + 1
          return [`vol it_${it}`]
          // return [`vol it_${it}`, `cid it_${it}`, `invD it_${it}`]
        }))

        const csvdata = []
        iterationBuckets.forEach((itBucket, itBucketIx) => {
          const it = itBucketIx + 1
          console.log('writing iteration: ' + it)
          itBucket.slice(0, 100).forEach((report, rowIx) => {
            if (csvdata[rowIx] === undefined) csvdata[rowIx] = []
            csvdata[rowIx][rankColumnIx] = rowIx + 1

            const itColumnOffset = dataColumnOffset + itBucketIx * 3
            csvdata[rowIx][itColumnOffset] = (report.investDiff / 100).toFixed(2)
            // csvdata[rowIx][itColumnOffset + 1] = report.clientId
            // csvdata[rowIx][itColumnOffset + 2] = (report.investDiff / 100).toFixed(2)
          })
        })

        const rowToString = row => row.reduce((fullString, cell) => {
          fullString += `"${cell}",`
          return fullString
        }, '')

        write(rowToString(headers))
        csvdata.map(rowToString).forEach(write)
      })
    })

    xit('convert clientIds from string', () => {
      const clientIds = [
        'T( 240)_B(  12 / 3)_S(   -2 / 5)',
        'T( 340)_B(14.8 / 3)_S( -1.6 / 5)',
        'T( 440)_B(  10 / 4)_S( -1.2 / 4)'
      ]

      clientIds.forEach(clientId => {
        const timeslotSeconds = clientId.slice(2, 6)
        const br = clientId.slice(10, 14)
        const bs = clientId.slice(16, 18)
        const sr = clientId.slice(22, 27)
        const ss = clientId.slice(29, 31)

        console.log(`  clientId: '${clientId}',`)
        console.log(`  timeslotSeconds: ${timeslotSeconds},`)
        console.log('  buying: {')
        console.log(`    ratio: ${br},`)
        console.log(`    useTimeslots: ${bs}`)
        console.log('  },')
        console.log('  selling: {')
        console.log(`    ratio: ${sr},`)
        console.log(`    useTimeslots: ${ss}`)
        console.log('  }')
        console.log('},{')
      })
    })

    xit('client id queries', () => {
      return traderReportColl()
        .aggregate([
          {
            $group: {
              _id: '$clientId',
              count: { $sum: 1 },
              diffTotal: { $sum: '$investDiff' }
            }
          },
          {
            $project: {
              count: 1,
              avgDiff: { $divide: ['$diffTotal', '$count'] }
            }
          },
          { $sort: { avgDiff: -1 } },
          { $limit: 20 }
        ])
        .toArray()
        .then(result => {
          result.forEach((r, ix) => {
            console.log(`[${r._id}]: count (${r.count}) -- ${r.avgDiff}`)
            // console.log(`----- entry ${ix} -----`)
            // console.log(`   count ${iter}: ${r.count}`)
            // console.log(`totalVol ${iter}: ${r.iterationVolume}`)
            // console.log(`top10 ${iter}:`)
            // console.log(r.top10)
          })
        })
    })

    xit('generation volumes', () => {
      // const simulationId = 'improve'
      return traderReportColl()
        .aggregate([
          // { $sort: { fullVolume: -1 } },
          {
            $group: {
              _id: { simid: '$simulationId', it: '$iteration' },
              count: { $sum: 1 },
              diffTotal: { $sum: '$absoluteDiff' }
              // accounts: {
              //   $push: { clientId: '$clientId', fullVolume: '$fullVolume', investDiff: '$investDiff' }
              // }
            }
          },
          // { $project: { count: 1, iterationVolume: 1, top10: { $slice: ['$accounts', 10] } } },
          { $project: { avgDiff: { $divide: ['$diffTotal', '$count'] } } },
          { $sort: { avgDiff: -1 } },
          { $limit: 30 }
        ])
        .toArray()
        .then(result => {
          result.forEach((r, ix) => {
            console.log(`[${r._id.simid} - ${r._id.it}]: ${r.avgDiff}`)
            // console.log(`----- entry ${ix} -----`)
            // console.log(`   count ${iter}: ${r.count}`)
            // console.log(`totalVol ${iter}: ${r.iterationVolume}`)
            // console.log(`top10 ${iter}:`)
            // console.log(r.top10)
          })
        })
    })
  })
})
