const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const SERVICE_KEY = process.env.MOLIT_SERVICE_KEY;

// CODEF 대법원 경매 모의 데이터
const mockAuctionCases = [
  {
    resCaseNo: "2024타경10284",
    resCourtName: "서울중앙지방법원",
    resBuildingType: "apt",
    resRegionCode: "11680",
    resAppraisementAmt: 1850000000,
    resMinLowerPrice: 1280000000,
    resAuctionState: "낙찰",
    resAddress: "서울특별시 강남구 대치동 941 은마아파트 102동 5층",
    resArea: 84.99
  },
  {
    resCaseNo: "2024타경54210",
    resCourtName: "수원지방법원 성남지원",
    resBuildingType: "apt",
    resRegionCode: "41135",
    resAppraisementAmt: 1250000000,
    resMinLowerPrice: 875000000,
    resAuctionState: "낙찰",
    resAddress: "경기도 성남시 분당구 정자동 한솔마을 12층",
    resArea: 101.82
  },
  {
    resCaseNo: "2024타경33102",
    resCourtName: "인천지방법원",
    resBuildingType: "villa",
    resRegionCode: "28185",
    resAppraisementAmt: 320000000,
    resMinLowerPrice: 224000000,
    resAuctionState: "낙찰",
    resAddress: "인천광역시 연수구 옥련동 다세대주택 2층",
    resArea: 59.94
  }
];

// 아파트 실거래가 API
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

    res.json({ success: true, type: 'apt', data: items });
  } catch (error) {
    console.error('APT API Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 빌라/다세대 실거래가 API
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

    res.json({ success: true, type: 'villa', data: items });
  } catch (error) {
    console.error('Villa API Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// CODEF 경매 사건 모의 API
app.get('/api/codef-auction-mock', (req, res) => {
  const { regionCode, buildingType } = req.query;

  let result = mockAuctionCases;
  if (regionCode) {
    result = result.filter(item => item.resRegionCode === regionCode);
  }
  if (buildingType) {
    result = result.filter(item => item.resBuildingType === buildingType);
  }

  res.json({ resultCode: "0000", resultMessage: "성공", data: result });
});

app.listen(PORT, () => {
  console.log(`PropValue Backend Server running on port ${PORT}`);
});