const axios = require('axios');

const BASE_URL       = process.env.OM_URL;
const API_USERNAME   = process.env.OM_API_USERNAME;
const API_PASSWORD   = process.env.OM_API_PASSWORD;
const MERCHANT_MSISDN = process.env.MERCHANT_MSISDN;

// Étape 1 : obtenir un token d'accès Orange Money
async function getToken() {
  const credentials = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');
  const res = await axios.post(
    `${BASE_URL}token`,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  return res.data.access_token;
}

// Étape 2 : initier le paiement (envoie OTP au client)
async function initiatePayment({ phoneNumber, amount, currency = 'XOF', orderId }) {
  const token = await getToken();
  const res = await axios.post(
    `${BASE_URL}webpayment`,
    {
      merchant_key:   MERCHANT_MSISDN,
      currency,
      order_id:       orderId,
      amount:         String(amount),
      return_url:     '',
      cancel_url:     '',
      notif_url:      '',
      lang:           'fr',
      reference:      orderId,
      msisdn_to_debit: phoneNumber,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  // Retourne le pay_token (équivalent de notre OTP session)
  return {
    payToken: res.data.pay_token,
    notifToken: res.data.notif_token,
    raw: res.data,
  };
}

// Étape 3 : confirmer / vérifier le statut du paiement
async function checkPaymentStatus(payToken) {
  const token = await getToken();
  const res = await axios.get(
    `${BASE_URL}webpayment/${payToken}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  // status : SUCCESS | FAILED | PENDING
  return res.data;
}

module.exports = { initiatePayment, checkPaymentStatus };
