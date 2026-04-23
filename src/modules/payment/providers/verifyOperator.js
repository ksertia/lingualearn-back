const moovPrefixes   = ['01','02','03','50','51','52','53','60','61','62','63','70','71','72','73'];
const orangePrefixes = ['04','05','06','07','54','55','56','57','64','65','66','67','74','75','76','77'];

function verifyOperator(operator, msisdn) {
  const local = msisdn.replace(/[\s\-\+]/g, '').replace(/^226/, '');
  if (!/^\d{8}$/.test(local)) throw new Error('Numéro invalide (8 chiffres requis après indicatif +226)');

  const prefix = local.substring(0, 2);
  if (operator === 'moov_money' && !moovPrefixes.includes(prefix)) {
    throw new Error('Ce numéro ne correspond pas à un abonné Moov Money');
  }
  if (operator === 'orange_money' && !orangePrefixes.includes(prefix)) {
    throw new Error('Ce numéro ne correspond pas à un abonné Orange Money');
  }
}

module.exports = { verifyOperator };
