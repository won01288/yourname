import { ImageResponse } from "next/og";

// yourname_logo.svg의 초승달+원 아이콘을 파비콘 크기로 재현.
// 파비콘은 페이지 CSS 변수(테마 토큰)에 접근할 수 없어 고정 색상을 쓴다.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1B1A22",
          borderRadius: 16,
        }}
      >
        <div style={{ position: "relative", width: 40, height: 40, display: "flex" }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              border: "3px solid #8B7FE8",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 6,
              left: 13,
              width: 27,
              height: 27,
              borderRadius: "50%",
              background: "#8B7FE8",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 2,
              left: 5,
              width: 23,
              height: 23,
              borderRadius: "50%",
              background: "#1B1A22",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
