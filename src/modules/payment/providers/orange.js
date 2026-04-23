const axios = require('axios');
const https = require('https');
const fs = require('fs');
const { parseStringPromise } = require('xml2js');

function getAgent() {
  return new https.Agent({
    cert: fs.readFileSync(process.env.OM_CERT_PATH),
    key:  fs.readFileSync(process.env.OM_KEY_PATH),
    rejectUnauthorized: true,
  });
}

// Orange : l'OTP est généré par le client via USSD *144*4*6*{montant}#
// Ici on confirme uniquement le paiement avec l'OTP saisi
async function confirmPayment({ phoneNumber, amount, otp, orderId }) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<COMMAND>
  <TYPE>OMPREQ</TYPE>
  <customer_msisdn>${phoneNumber}</customer_msisdn>
  <merchant_msisdn>${process.env.MERCHANT_MSISDN}</merchant_msisdn>
  <api_username>${process.env.OM_API_USERNAME}</api_username>
  <api_password>${process.env.OM_API_PASSWORD}</api_password>
  <amount>${amount}</amount>
  <PROVIDER>101</PROVIDER>
  <PROVIDER2>101</PROVIDER2>
  <PAYID>12</PAYID>
  <PAYID2>12</PAYID2>
  <otp>${otp}</otp>
  <reference_number>WI${otp}</reference_number>
  <ext_txn_id>${orderId}</ext_txn_id>
</COMMAND>`;

  const response = await axios.post(process.env.OM_URL, xml, {
    httpsAgent: getAgent(),
    headers: { 'Content-Type': 'text/xml' },
    timeout: 30000,
  });

  const parsed = await parseStringPromise(`<RESPONSE>${response.data}</RESPONSE>`, {
    explicitArray: false,
    trim: true,
  });

  const code    = parsed.RESPONSE.status;
  const message = parsed.RESPONSE.message;

  if (code !== '200') {
    throw new Error(message || `Orange Money erreur (code ${code})`);
  }

  return {
    code,
    message,
    orangeTransactionId: parsed.RESPONSE.transID,
  };
}

module.exports = { confirmPayment };
