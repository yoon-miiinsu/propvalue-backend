const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const SERVICE_KEY = process.env.MOLIT_SERVICE_KEY;
const CODEF_CLIENT_ID = process.env.CODEF_CLIENT_ID;
const CODEF_CLIENT_SECRET = process.env.CODEF_CLIENT_SECRET;

// CODEF Token 발급
async function getCodefToken() {
  if (!CODEF_CLIENT_ID || !CODEF_CLIENT_SECRET) return null;
  const authHeader = Buffer.from(`${CODEF_CLIENT_ID}:${CODEF_CLIENT_SECRET}`).toString('base64');
  try {
    const response = await fetch('https://oauth.codef.io/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`
      },
      body: 'grant_type=client_credentials&scope=read'
    });
    const data = await response.json();
    return data.access_token || null;
  } catch (error) {
    console.error('CODEF Token Error:', error.message);
    return null;
  }
}

// CODEF 실시간 경매 API (디버깅 방어 로직 적용)
app.get('/api/codef-auction-real', async (req, res) => {
  const { regionCode, buildingType } = req.query;

  try {
    const token = await getCodefToken();
    if (!token) {
      return res.json({ success: true, data: [] });
    }

    const response = await fetch('https://api.codef.io/v1/kr/court/auction/item-list', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        organization: "0002",
        reqRegionCode: regionCode || "11320",
        reqBuildingType: buildingType === 'apt' ? '01' : '02'
      })
    });

    const result = await response.json();
    let auctionList = result.data || [];
    if (!Array.isArray(auctionList)) auctionList = [auctionList];

    res.json({ success: true, data: auctionList });
  } catch (error) {
    console.error('CODEF API Call Error:', error.message);
    res.json({ success: true, data: [] }); // 에러 시 빈 배열 반환하여 프론트엔드 다운 방지
  }
});

// 국토부 아파트 실거래가 API
app.get('/api/apt-trades', async (req, res) => {
  const { lawdCd, dealYmd } = req.query;
  if (!lawdCd || !dealYmd) return res.status(400).json({ success: false });

  try {
    const url = `http://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?serviceKey=${SERVICE_KEY}&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}&numOfRows=100&_type=json`;
    const response = await fetch(url);
    const data = await response.json();
    
    let items = data.response?.body?.items?.item || [];
    if (!Array.isArray(items)) items = items ? [items] : [];

    res.json({ success: true, type: 'apt', dealYmd, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 국토부 빌라 실거래가 API
app.get('/api/villa-trades', async (req, res) => {
  const { lawdCd, dealYmd } = req.query;
  if (!lawdCd || !dealYmd) return res.status(400).json({ success: false });

  try {
    const url = `http://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade?serviceKey=${SERVICE_KEY}&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}&numOfRows=100&_type=json`;
    const response = await fetch(url);
    const data = await response.json();

    let items = data.response?.body?.items?.item || [];
    if (!Array.isArray(items)) items = items ? [items] : [];

    res.json({ success: true, type: 'villa', dealYmd, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend Server running on port ${PORT}`);
});