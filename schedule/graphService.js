const moment = require('moment')

const ScheduleRepo = require('./scheduleRepo')
const { supportedPeriods, cutoffDate, _1w } = require('../backend/tickers/graphPeriods')

const NOT_AVAIL = 'N/A'
const LIMIT_RESULTS = 100

const ut = require('util')
const GraphService = (log, metadataService) => {
  const scheduleRepo = ScheduleRepo()

  const createGraphDatasets = () => {
    const begin = process.hrtime()
    return internalGraphDatasets()
      .then(() => {
        const duration = process.hrtime(begin)
        log.info(ut.format('Execution time (hr): %ds %dms', duration[0], duration[1] / 1000000))
      })
  }

  const graphCollector = period => {

  }

  const internalGraphDatasets = async () => {
    const since = cutoffDate(_1w)
    let bucketEnd = moment.utc()
    const sliceDuration = bucketEnd.diff(since) / LIMIT_RESULTS
    let bucketStart = bucketEnd.clone().subtract(sliceDuration)
    const weekGraph = []
    // {
    //   label: 'coinfloor bid',
    //   data: [
    //     { x: _6daysAgo, y: 2222 },
    //     { x: _5daysAgo, y: 2222 }
    //   ]
    // }, {
    //   label: 'coinfloor ask',
    //   data: [
    //     { x: _6daysAgo, y: null },
    //     { x: _5daysAgo, y: null }
    //   ]
    // }

    const tickerCursor = scheduleRepo.getTickersSortedCursor(since.toDate())

    const flattenTicker = fullTicker => {
      fullTicker.tickers = fullTicker.tickers.reduce((flattened, tick) => {
        if (tick.name === 'coindesk') {
          flattened.push(flatPrice(tick, 'ask', false))
        } else {
          flattened.push(flatPrice(tick, 'bid', true))
          flattened.push(flatPrice(tick, 'ask', true))
        }
        return flattened
      }, [])
      fullTicker.moment = moment.utc(fullTicker.created)
      return fullTicker
    }

    const createNextTicker = cursor => {
      const data = {
        fetchNext: true,
        currentTicker: null
      }
      const consumed = () => {
        data.fetchNext = true
        data.currentTicker = null
      }
      const current = async () => {
        if (data.fetchNext && await cursor.hasNext()) {
          data.fetchNext = false
          data.currentTicker = flattenTicker(await cursor.next())
        }
        return data.currentTicker
      }
      return { consumed, current }
    }

    const getExchangeGraph = ticker => {
      let exchangeGraph = weekGraph.find(graph => graph.label === ticker.name)
      if (!exchangeGraph) {
        exchangeGraph = { label: ticker.name, data: [], sum: 0, count: 0 }
        weekGraph.push(exchangeGraph)
      }
      return exchangeGraph
    }

    const nextTicker = createNextTicker(tickerCursor)
    let counter = 0
    while (bucketEnd.isAfter(since)) {
      counter += 1
      // console.log('== #', counter + ':', bucketStart.toISOString(), '>>', bucketEnd.toISOString(), '=======')

      let current = await nextTicker.current()
      let tickerInBucket = current && current.moment.isAfter(bucketStart)
      while (tickerInBucket) {
        // delete current.moment
        // console.log('falls into this bucket:', current)
        current.tickers.forEach(exchTicker => {
          if (exchTicker.value) {
            const exchangeGraph = getExchangeGraph(exchTicker)
            exchangeGraph.sum += exchTicker.value
            exchangeGraph.count += 1
            exchangeGraph.bucketDate = current.created
          }
        })
        nextTicker.consumed()
        current = await nextTicker.current()
        tickerInBucket = current && current.moment.isAfter(bucketStart)
      }

      weekGraph.forEach(exchGraph => {
        if (exchGraph.count > 0) {
          exchGraph.data.push({
            x: exchGraph.bucketDate,
            y: Math.round(exchGraph.sum / exchGraph.count)
          })
          exchGraph.sum = 0
          exchGraph.count = 0
          // exchGraph.bucketDate = (current && current.created) || ''
        }
      })
      bucketEnd = bucketStart.clone()
      bucketStart = bucketStart.subtract(sliceDuration)
    }

    weekGraph.forEach(exchGraph => {
      delete exchGraph.sum
      delete exchGraph.count
      delete exchGraph.bucketDate
    })

    sortGraphDataWithProviders(weekGraph)
    // console.log(JSON.stringify(weekGraph, null, ' '))
    return scheduleRepo.storeGraphData(_1w, weekGraph)
  }

  const flatPrice = (tick, key, attachQualifier) => ({
    name: attachQualifier ? `${tick.name} ${key}` : tick.name,
    value: chartValueFrom(tick[key])
  })

  const chartValueFrom = tickVal => !tickVal || tickVal === NOT_AVAIL
    ? null
    : tickVal

  //   const internalGraphDatasetsOld = () => {
  //     const since = cutoffDate(_1w)
  //     let steptime = process.hrtime()
  //     return scheduleRepo.getTickersSorted(since.toDate())
  //       .then(res => {
  //         console.log('====== before')
  //         console.log(JSON.stringify(res, null, ' '))
  //         const duration = process.hrtime(steptime)
  //         // log.info(ut.format('%s getTickersSorted (hr): %ds %dms', period, duration[0], duration[1] / 1000000))
  //         steptime = process.hrtime()
  //         return res
  //       })
  //       .then(flattenTickers)
  //       .then(res => {
  //         const duration = process.hrtime(steptime)
  //         // log.info(ut.format('%s flattenTickers (hr): %ds %dms', period, duration[0], duration[1] / 1000000))
  //         steptime = process.hrtime()
  //         return res
  //       })
  //       .then(sumupTickers(since))
  //       .then(res => {
  //         const duration = process.hrtime(steptime)
  //         // log.info(ut.format('%s sumupTickers (hr): %ds %dms', period, duration[0], duration[1] / 1000000))
  //         steptime = process.hrtime()
  //         return res
  //       })
  //       .then(createGraphData)
  //       .then(res => {
  //         const duration = process.hrtime(steptime)
  //         // log.info(ut.format('%s createGraphData (hr): %ds %dms', period, duration[0], duration[1] / 1000000))
  //         steptime = process.hrtime()
  //         return res
  //       })
  //       .then(sortGraphDataWithProviders)
  //       .then(res => {
  //         console.log('====== after')
  //         console.log(JSON.stringify(res, null, ' '))
  //         const duration = process.hrtime(steptime)
  //         // log.info(ut.format('%s sortGraphDataWithProviders (hr): %ds %dms', period, duration[0], duration[1] / 1000000))
  //         steptime = process.hrtime()
  //         return res
  //       })
  //       .then(graphData => scheduleRepo.storeGraphData(_1w, graphData))
  //       .then(storedPeriods => {
  //         metadataService.setGraphsCount(storedPeriods.length)
  //         log.info('stored graph periods: ' + storedPeriods.length)
  //       })
  //   }

  return {
    createGraphDatasets,
    LIMIT_RESULTS
  }
}

// // ========================= flattenTickers =====================
// const flattenTickers = allChartTickers => allChartTickers.map(chartTicker => {
//   chartTicker.tickers = chartTicker.tickers.reduce((flattened, tick) => {
//     if (tick.name === 'coindesk') {
//       flattened.push(flatPrice(tick, 'ask', false))
//     } else {
//       flattened.push(flatPrice(tick, 'bid', true))
//       flattened.push(flatPrice(tick, 'ask', true))
//     }
//     return flattened
//   }, [])
//   return chartTicker
// })

// const flatPrice = (tick, key, attachQualifier) => ({
//   name: attachQualifier ? `${tick.name} ${key}` : tick.name,
//   value: chartValueFrom(tick[key])
// })

// const chartValueFrom = tickVal => !tickVal || tickVal === NOT_AVAIL
//   ? null
//   : tickVal

// // ========================= sumupTickers =====================
// const sumupTickers = since => allChartTickers => {
//   const sliceDuration = moment.utc().diff(since) / LIMIT_RESULTS
//   let nextTimestamp = since
//   const dataPointTickers = allChartTickers.reduce((dataPoints, currentTicker) => {
//     const currentCreated = moment.utc(currentTicker.created)
//     if (currentCreated.isAfter(nextTimestamp)) {
//       dataPoints.push([])
//       nextTimestamp = nextTimestamp.add(sliceDuration)
//     }
//     if (dataPoints.length !== 0) {
//       dataPoints[dataPoints.length - 1].push(currentTicker)
//     }
//     return dataPoints
//   }, [])

//   return dataPointTickers.map(sumDataPoints)
// }

// const sumDataPoints = dataPoints => {
//   const created = dataPoints[Math.floor(dataPoints.length / 2)].created
//   const tickers = dataPoints
//     .reduce((tickerSums, curr) => {
//       curr.tickers.forEach(tick => addTickerValues(tickerSums, tick))
//       return tickerSums
//     }, [])
//     .map(averageSums)

//   return { created, tickers }
// }

// const addTickerValues = (tickerSums, tick) => {
//   let tickerSum = tickerSums.find(ts => ts.name === tick.name)
//   if (!tickerSum) {
//     tickerSum = { name: tick.name, sum: 0, count: 0 }
//     tickerSums.push(tickerSum)
//   }
//   if (tick.value) {
//     tickerSum.sum += tick.value
//     tickerSum.count++
//   }
// }

// const averageSums = tickSum => {
//   tickSum.value = Math.round(tickSum.sum / tickSum.count)
//   return tickSum
// }

// // ========================= createGraphData =====================
// const createGraphData = chartPoints => chartPoints.reduce((datasets, chartPoint) => {
//   chartPoint.tickers.forEach(ticker => {
//     addChartPoint(datasets, chartPoint.created, ticker.name, ticker.value)
//   })
//   return datasets
// }, [])

// const addChartPoint = (datasets, created, label, value) => {
//   const dataset = getDatasetFrom(datasets, label)
//   dataset.data.push(chartPoint(created, value || null))
// }

// const getDatasetFrom = (datasets, label) => {
//   let dataset = datasets.find(data => data.label === label)
//   if (!dataset) {
//     dataset = { label, data: [] }
//     datasets.push(dataset)
//   }
//   return dataset
// }

// const chartPoint = (x, y) => { return { x, y } }

// ========================= sortGraphData =====================
const sortGraphDataWithProviders = graphData => graphData.sort((a, b) => sortOrdinalOf(a) - sortOrdinalOf(b))

const sortOrdinalOf = dataset => {
  switch (dataset.label) {
    case 'coinfloor bid':
      return 0
    case 'coinfloor ask':
      return 1
    case 'coindesk':
      return 2
    case 'gdax bid':
      return 3
    case 'gdax ask':
      return 4
    default:
      return 99
  }
}

module.exports = GraphService
