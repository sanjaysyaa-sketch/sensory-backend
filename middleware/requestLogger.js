// middleware/requestLogger.js
module.exports = function (req, res, next) {
  const localTime = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' });
  const ip = req.ip || req.connection?.remoteAddress || '-';
  console.log(`[${localTime}] ${ip} ${req.method} ${req.originalUrl} query=${JSON.stringify(req.query)}`);
  next();
};
