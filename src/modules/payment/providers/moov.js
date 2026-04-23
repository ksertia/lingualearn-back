const axios = require('axios');
const https = require('https');

const BASE_URL  = process.env.MOOV_URL;
const USERNAME  = process.env.MOOV_USERNAME;
const PASSWORD  = process.env.MOOV_PASSWORD;

// Moov utilise un certificat auto-signé en UAT — on désactive la vérification SSL
const agent = new https.Agent({ rejectUnauthorized: false });

// Initier un paiement Moov Money (envoi OTP au client)
async function initiatePayment({ phoneNumber, amount, orderId }) {
  const res = await axios.post(
    BASE_URL,
    {
      username:    USERNAME,
      password:    PASSWORD,
      msisdn:      phoneNumber,
      amount:      String(amount),
      reference:   orderId,
      description: `Paiement LinguaLearn #${orderId}`,
    },
    {
      httpsAgent: agent,
      headers: { 'Content-Type': 'application/json' },
    }
  );

  // Moov retourne { status, message, otpReference, ... }
  const { status, message, otpReference } = res.data;
  if (status !== '0' && status !== 0) {
    throw new Error(`Moov Money: ${message || 'Erreur inconnue'}`);
  }

  return { otpReference, raw: res.data };
}

// Confirmer le paiement avec le code OTP saisi par l'utilisateur
async function confirmPayment({ phoneNumber, amount, orderId, otpCode, otpReference }) {
  const res = await axios.post(
    BASE_URL.replace('otpRequest', 'otpValidation'),
    {
      username:     USERNAME,
      password:     PASSWORD,
      msisdn:       phoneNumber,
      amount:       String(amount),
      reference:    orderId,
      otpCode,
      otpReference,
    },
    {
      httpsAgent: agent,
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const { status, message } = res.data;
  if (status !== '0' && status !== 0) {
    throw new Error(`Moov Money: ${message || 'OTP invalide ou expiré'}`);
  }

  return res.data;
}

module.exports = { initiatePayment, confirmPayment };
