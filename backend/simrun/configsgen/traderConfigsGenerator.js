const { cartesianProduct } = require('js-combinatorics')
const deepAssign = require('assign-deep')

const { clientId } = require('./traderConfigUtils')

const TraderConfigsGenerator = () => {
  const countDecimals = value => {
    if (Math.floor(value) === value) return 0
    return value.toString().split('.')[1].length || 0
  }

  const createParameterRange = rangeConfig => {
    const multipier = Math.pow(10, countDecimals(rangeConfig.step))
    const start = rangeConfig.start * multipier
    const end = rangeConfig.end * multipier
    const step = rangeConfig.step * multipier

    const length = Math.floor((end - start) / step) + 1
    return Array.from({ length }, (_, ix) => (start + (ix * step)) / multipier)
  }

  const extractRanges = rangesConfig => {
    const { timeslotSeconds, buying, selling } = rangesConfig
    const bRatio = buying.ratio
    const bUseTimeslots = buying.useTimeslots
    const sRatio = selling.ratio
    const sUseTimeslots = selling.useTimeslots
    return [timeslotSeconds, bRatio, bUseTimeslots, sRatio, sUseTimeslots]
      .map(createParameterRange)
  }

  const createConfiguration = (additionalConfig = {}) => params => {
    return deepAssign({
      clientId: clientId(params[0], params[1], params[2], params[3], params[4]),
      timeslotSeconds: params[0],
      buying: {
        ratio: params[1],
        useTimeslots: params[2]
      },
      selling: {
        ratio: params[3],
        useTimeslots: params[4]
      }
    }, additionalConfig)
  }

  const createGenerator = rangesConfig => {
    const commonTraderConfig = rangesConfig.commonTraderConfig
    return cartesianProduct(...extractRanges(rangesConfig))
      .lazyMap(createConfiguration(commonTraderConfig))
  }

  return { createGenerator }
}

module.exports = TraderConfigsGenerator
