const jwt = require('jsonwebtoken');
const { appConfig } = require('./src/config/appConfig');

const adminToken = jwt.sign(
  { userId: 'cmtwslb4000008wq8c2y3ybuk', accountType: 'admin', tokenType: 'access' },
  appConfig.jwtSecret,
  { expiresIn: '1h' }
);

const learnerToken = jwt.sign(
  { userId: 'cmtwsuac90001wx17xgeaaddz', accountType: 'learner', tokenType: 'access' },
  appConfig.jwtSecret,
  { expiresIn: '1h' }
);

const otherLearnerToken = jwt.sign(
  { userId: 'cmtvdr4ta0039d0alx9zhu52g', accountType: 'learner', tokenType: 'access' },
  appConfig.jwtSecret,
  { expiresIn: '1h' }
);

console.log('ADMIN=' + adminToken);
console.log('LEARNER=' + learnerToken);
console.log('OTHER=' + otherLearnerToken);
