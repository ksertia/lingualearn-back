const axios = require('axios');

const auth = {
  username: process.env.MOOV_USERNAME,
  password: process.env.MOOV_PASSWORD,
};
const getUrl = () => process.env.MOOV_URL;

// Étape 1 — Envoyer l'OTP au client (SMS automatique)
async function sendOtp({ transactionId, phoneNumber, amount }) {
  const response = await axios.post(getUrl(), {
    'request-id': transactionId,
    destination:  phoneNumber,
    amount:       String(amount),
    remarks:      'OTP Merchant',
    'extended-data': { module: 'MERCHOTPPAY' },
  }, {
    auth,
    headers: {
      'Content-Type': 'application/json',
      'command-id':   'process-create-mror-otp',
    },
    timeout: 30000,
  });

  const { status, message } = response.data;
  if (status !== '0' && status !== 0) {
    throw new Error(message || 'Moov Money: envoi OTP échoué');
  }

  // trans-id Moov à conserver pour l'étape de confirmation
  return {
    moovTransId: response.data['trans-id'],
    raw: response.data,
  };
}

// Étape 2 (optionnel) — Renvoyer l'OTP
async function resendOtp({ moovTransId, requestId, phoneNumber, amount }) {
  const response = await axios.post(getUrl(), {
    'request-id': moovTransId,
    destination:  phoneNumber,
    amount:       String(amount),
    remarks:      'RESEND OTP',
    'extended-data': { module: 'MERCHOTPPAY', ext1: requestId },
  }, {
    auth,
    headers: {
      'Content-Type': 'application/json',
      'command-id':   'process-mror-resend-otp',
    },
    timeout: 30000,
  });

  return response.data;
}

// Étape 3 — Confirmer le paiement avec l'OTP saisi
async function confirmPayment({ newRequestId, moovTransId, requestId, phoneNumber, amount, otp }) {
  const response = await axios.post(getUrl(), {
    'request-id': newRequestId,
    destination:  phoneNumber,
    amount:       String(amount),
    remarks:      'Payment',
    'extended-data': {
      module:     'MERCHOTPPAY',
      'trans-id': moovTransId,
      ext1:       requestId,
      ext2:       requestId,
      otp,
    },
  }, {
    auth,
    headers: {
      'Content-Type': 'application/json',
      'command-id':   'process-commit-otppay',
    },
    timeout: 30000,
  });

  const { status, message } = response.data;
  if (status !== '0' && status !== 0) {
    throw new Error(message || 'Moov Money: confirmation OTP échouée');
  }

  return response.data;
}

module.exports = { sendOtp, resendOtp, confirmPayment };
