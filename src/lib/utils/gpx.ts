export interface GpxData {
  distance: number; // km 단위
  date: string;     // YYYY-MM-DD 포맷
  error?: string;
}

/**
 * GPX XML 텍스트를 파싱하여 총 러닝 거리(km)와 러닝 시작 날짜를 구합니다.
 * 브라우저의 DOMParser를 사용하므로 클라이언트 사이드에서 작동합니다.
 */
export function parseGpxFile(xmlText: string): GpxData {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    // XML 파싱 에러 검사
    const parserError = xmlDoc.getElementsByTagName("parsererror");
    if (parserError.length > 0) {
      return { 
        distance: 0, 
        date: "", 
        error: "GPX 파일 형식이 유효하지 않습니다. 올바른 XML 문서가 아닙니다." 
      };
    }

    const trkpts = xmlDoc.getElementsByTagName("trkpt");
    if (trkpts.length === 0) {
      return { 
        distance: 0, 
        date: "", 
        error: "GPX 파일 내에 위치 기록(Trackpoint)이 존재하지 않습니다." 
      };
    }

    // 1. 날짜 추출 (기본값: 오늘)
    let dateStr = "";
    
    // metadata 또는 첫 번째 trkpt에서 시간 데이터 탐색
    const metadataTime = xmlDoc.getElementsByTagName("time");
    if (metadataTime.length > 0) {
      // 문서 전역 혹은 메타데이터의 첫 시간 태그 확인
      const firstTime = metadataTime[0].textContent;
      if (firstTime) {
        dateStr = firstTime.split("T")[0]; // YYYY-MM-DD
      }
    }

    // 첫 번째 trkpt 내부의 time 태그 확인 (메타데이터에 없을 경우)
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const firstPtTime = trkpts[0].getElementsByTagName("time");
      if (firstPtTime.length > 0 && firstPtTime[0].textContent) {
        dateStr = firstPtTime[0].textContent.split("T")[0];
      }
    }

    // 포맷 유효성 체크 실패 시 오늘 날짜
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      dateStr = `${yyyy}-${mm}-${dd}`;
    }

    // 2. 하버사인 공식을 활용한 누적 거리 계산
    let totalDistance = 0; // km
    const R = 6371; // 지구 반지름 (km)

    const deg2rad = (deg: number) => (deg * Math.PI) / 180;

    let prevLat = parseFloat(trkpts[0].getAttribute("lat") || "");
    let prevLon = parseFloat(trkpts[0].getAttribute("lon") || "");

    for (let i = 1; i < trkpts.length; i++) {
      const lat = parseFloat(trkpts[i].getAttribute("lat") || "");
      const lon = parseFloat(trkpts[i].getAttribute("lon") || "");

      // 유효하지 않은 위경도 값은 패스
      if (isNaN(lat) || isNaN(lon) || isNaN(prevLat) || isNaN(prevLon)) {
        continue;
      }

      const dLat = deg2rad(lat - prevLat);
      const dLon = deg2rad(lon - prevLon);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(prevLat)) *
          Math.cos(deg2rad(lat)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const d = R * c;

      totalDistance += d;

      prevLat = lat;
      prevLon = lon;
    }

    // 소수점 첫째 자리 반올림
    const roundedDistance = Math.round(totalDistance * 10) / 10;

    return {
      distance: roundedDistance,
      date: dateStr
    };
  } catch (err: any) {
    return {
      distance: 0,
      date: "",
      error: `GPX 파싱 중 알 수 없는 오류 발생: ${err.message || String(err)}`
    };
  }
}
