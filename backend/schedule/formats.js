const duration = start => Date.now() - start

const rate = input => {
  const num = Number(input)
  if (isNaN(num)) {
    return input
  }
  return Number(num.toFixed(2))
}

module.exports = {
  rate,
  duration
}
