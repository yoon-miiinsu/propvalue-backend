const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const SERVICE_KEY = process.env.MOLIT_SERVICE_KEY;
const CODEF_CLIENT_ID = process.env.CODEF_CLIENT_ID;
const CODEF_CLIENT_SECRET = process.env.CODEF_CLIENT_SECRET;

// 1. CODEF OAuth 2.0 토큰 발급 함수
async function getCodefToken() {
  if (!CODEF_CLIENT_ID || !CODEF_CLIENT_SECRET) {
    console.warn("CODEF API Key가 환경변수에 설정되지 않았습니다.");
    return null;
  }

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

// 2. 실제 CODEF 경매 사건 조회 API (제공해주신 강제/임의경매 Service Code 사용)
app.get('/api/codef-auction-real', async (req, res) => {
  const { regionCode, buildingType } = req.query;

  try {
    const token = await getCodefToken();
    if (!token) {
      return res.json({ success: false, message: 'CODEF 인증 토큰 발급 실패 (키 설정을 확인하세요)', data: [] });
    }

    // 제공해주신 CODEF 엔드포인트 호출 (강제경매: ef32e73392d4..., 임의경매: 7a6a322178d7...)
    const response = await fetch('https://api.codef.io/v1/kr/court/auction/item-list', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        organization: "0002", // 대법원
        reqRegionCode: regionCode || "",
        reqBuildingType: buildingType || ""
      })
    });

    const result = await response.json();
    const auctionList = result.data || [];

    res.json({
      success: true,
      resultCode: result.result?.code || "0000",
      data: Array.isArray(auctionList) ? auctionList : [auctionList]
    });
  } catch (error) {
    console.error('CODEF Real API Call Error:', error.message);
    res.status(500).json({ success: false, error: 'CODEF 실시간 경매 데이터 요청 실패' });
  }
});

// 3. 국토부 아파트 매매 실거래가 API
app.get('/api/apt-trades', async (req, res) => {
  const { lawdCd, dealYmd } = req.query;
  if (!lawdCd || !dealYmd) {
    return res.status(400).json({ success: false, message: 'LAWD_CD와 DEAL_YMD가 필요합니다.' });
  }

  try {
    const url = `http://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?serviceKey=${SERVICE_KEY}&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}&numOfRows=100&_type=json`;
    const response = await fetch(url);
    const data = await response.json();
    
    let items = data.response?.body?.items?.item || [];
    if (!Array.isArray(items)) {
      items = items ? [items] : [];
    }

    res.json({ success: true, type: 'apt', dealYmd, data: items });
  } catch (error) {
    console.error('APT API Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. 국토부 빌라/다세대 매매 실거래가 API
app.get('/api/villa-trades', async (req, res) => {
  const { lawdCd, dealYmd } = req.query;
  if (!lawdCd || !dealYmd) {
    return res.status(400).json({ success: false, message: 'LAWD_CD와 DEAL_YMD가 필요합니다.' });
  }

  try {
    const url = `http://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade?serviceKey=${SERVICE_KEY}&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}&numOfRows=100&_type=json`;
    const response = await fetch(url);
    const data = await response.json();

    let items = data.response?.body?.items?.item || [];
    if (!Array.isArray(items)) {
      items = items ? [items] : [];
    }

    res.json({ success: true, type: 'villa', dealYmd, data: items });
  } catch (error) {
    console.error('Villa API Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`PropValue Real-Data Backend Server running on port ${PORT}`);
});