const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { parseStringPromise } = require('xml2js');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// 제공해주신 국토부 API 인증키 및 엔드포인트
const API_KEY = '69f25c72ab33dc1f4c3188e6898dfd9a5e363e209c89e6a2f6c6566fc9dc2038';
const API_URL = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade';

app.get('/api/apt-trades', async (req, res) => {
  const { lawdCd, dealYmd } = req.query;

  if (!lawdCd || !dealYmd) {
    return res.status(400).json({ success: false, message: 'LAWD_CD와 DEAL_YMD가 필요합니다.' });
  }

  try {
    const response = await axios.get(API_URL, {
      params: {
        serviceKey: API_KEY,
        LAWD_CD: lawdCd,
        DEAL_YMD: dealYmd
      },
      responseType: 'text'
    });

    const parsedData = await parseStringPromise(response.data, { explicitArray: false });
    const items = parsedData?.response?.body?.items?.item || [];
    const itemList = Array.isArray(items) ? items : (items ? [items] : []);

    res.json({
      success: true,
      count: itemList.length,
      data: itemList
    });
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`백엔드 서버 실행 성공: http://localhost:${PORT}`);
});