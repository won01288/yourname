import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// 링크 공유(카카오톡·트위터 등) 시 노출되는 미리보기 이미지.
// yourname_logo.svg의 초승달+원 아이콘 + 워드마크를 사이트 다크 배경 위에 재현한다.
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "유어네임 — 사주 기반 정통 작명";

export default async function Image() {
  const fontDir = path.join(process.cwd(), "app", "fonts");
  const [bold, medium] = await Promise.all([
    readFile(path.join(fontDir, "SUIT-ExtraBold.ttf")),
    readFile(path.join(fontDir, "SUIT-Medium.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#17140F",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -120,
            left: -100,
            width: 560,
            height: 560,
            borderRadius: "50%",
            background: "#8A5CB8",
            opacity: 0.28,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -160,
            right: -120,
            width: 620,
            height: 620,
            borderRadius: "50%",
            background: "#C99A56",
            opacity: 0.2,
          }}
        />
        <div style={{ position: "relative", width: 120, height: 120, display: "flex" }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              border: "6px solid #8B7FE8",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 18,
              left: 40,
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "#8B7FE8",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 6,
              left: 16,
              width: 68,
              height: 68,
              borderRadius: "50%",
              background: "#17140F",
            }}
          />
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 72,
            fontFamily: "SUIT",
            fontWeight: 800,
            color: "#F2ECE1",
            letterSpacing: -1,
          }}
        >
          유어네임
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 28,
            fontFamily: "SUIT",
            fontWeight: 500,
            color: "#C9BFAE",
          }}
        >
          사주 기반 정통 작명
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "SUIT", data: bold, weight: 800, style: "normal" },
        { name: "SUIT", data: medium, weight: 500, style: "normal" },
      ],
    }
  );
}
