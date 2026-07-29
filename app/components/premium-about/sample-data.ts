// 프리미엄 작명 소개 페이지(app/naming/about) 전용 정적 샘플 데이터.
// 실제 API를 호출하지 않는다 — 상품 소개 목적의 예시라, 실제 서비스가 실시간으로 계산해 내는
// 리포트 한 건을 그대로 옮겨와 고정값으로 둔 것이다(CLAUDE.md 2.1 결정적 계산 결과의 스냅샷).
// 1993년 8월 23일 양력 08시 40분생 남자, 김(金)씨 — 일간 丙(화), 신약, 용신 木(목)·火(화).

import type {
  Candidate,
  Element,
  ElementDistribution,
  Hanja,
  Manseryeok,
  ManseryeokPillar,
  Saju,
  Surname,
  YongsinResult,
} from "@/lib/naming/types";
import type { NamingReport } from "@/lib/llm/explain";

export const SAMPLE_BIRTH_LINE = "1993년 8월 23일 양력 08시 40분생 · 남자";

export const SAMPLE_SAJU: Saju = {
  year: { stem: "癸", branch: "酉" },
  month: { stem: "庚", branch: "申" },
  day: { stem: "丙", branch: "子" },
  hour: { stem: "壬", branch: "辰" },
};

export const SAMPLE_ELEMENT_DISTRIBUTION: ElementDistribution = {
  木: 0.53,
  火: 0.93,
  土: 0.68,
  金: 2.53,
  水: 3.33,
};

export const SAMPLE_YONGSIN: YongsinResult = {
  strength: "신약",
  yongsin: ["木", "火"],
  reason:
    "일간 丙(화)을 기준으로 비겁·인성(木·火)의 세력 점수를 계산하면 전체의 절반에 못 미쳐 신약으로 " +
    "판정됩니다. 신약한 사주는 일간을 생조하는 오행을 용신으로 삼으므로, 일간을 낳아주는 木(목)과 " +
    "일간과 같은 火(화)를 채워 균형을 잡습니다.",
};

export const SAMPLE_SURNAME: Surname = {
  hangul: "김",
  hanja: "金",
  strokeOriginal: 8,
  initialElement: "木",
};

function pillar(
  label: ManseryeokPillar["label"],
  stem: ManseryeokPillar["stem"],
  branch: ManseryeokPillar["branch"],
  hiddenStems: ManseryeokPillar["hiddenStems"]
): ManseryeokPillar {
  return { label, stem, branch, hiddenStems };
}

export const SAMPLE_MANSERYEOK: Manseryeok = {
  year: pillar(
    "년주",
    { hanja: "癸", reading: "계", element: "水", tenGod: "정관" },
    { hanja: "酉", reading: "유", element: "金", tenGod: "정재", isVoid: true },
    [{ stem: "庚", reading: "경", element: "金", days: 30, tenGod: "정재", isMain: true }]
  ),
  month: pillar(
    "월주",
    { hanja: "庚", reading: "경", element: "金", tenGod: "편재" },
    { hanja: "申", reading: "신", element: "金", tenGod: "편재", isVoid: true },
    [
      { stem: "戊", reading: "무", element: "土", days: 7, tenGod: "식신", isMain: false },
      { stem: "壬", reading: "임", element: "水", days: 7, tenGod: "편관", isMain: false },
      { stem: "庚", reading: "경", element: "金", days: 16, tenGod: "편재", isMain: true },
    ]
  ),
  day: pillar(
    "일주",
    { hanja: "丙", reading: "병", element: "火", tenGod: "비견" },
    { hanja: "子", reading: "자", element: "水", tenGod: "정관", isVoid: false },
    [
      { stem: "壬", reading: "임", element: "水", days: 10, tenGod: "편관", isMain: false },
      { stem: "癸", reading: "계", element: "水", days: 20, tenGod: "정관", isMain: true },
    ]
  ),
  hour: pillar(
    "시주",
    { hanja: "壬", reading: "임", element: "水", tenGod: "편관" },
    { hanja: "辰", reading: "진", element: "土", tenGod: "식신", isVoid: false },
    [
      { stem: "乙", reading: "을", element: "木", days: 9, tenGod: "정인", isMain: false },
      { stem: "癸", reading: "계", element: "水", days: 3, tenGod: "정관", isMain: false },
      { stem: "戊", reading: "무", element: "土", days: 18, tenGod: "식신", isMain: true },
    ]
  ),
  voidBranches: ["申", "酉"],
};

function hanja(
  char: string,
  reading: string,
  strokeOriginal: number,
  element: Element | null,
  radical: string,
  meaning: string,
  hun: string
): Hanja {
  return {
    char,
    readings: [reading],
    strokeOriginal,
    strokeActual: strokeOriginal,
    radical,
    element,
    meaning,
    isNameAllowed: true,
    isForbidden: false,
    forbiddenReason: null,
    isCommon: element !== null,
    hun,
    verificationStatus: "confirmed",
  };
}

const HANJA_DO = hanja("桃", "도", 13, "木", "木", "peach tree", "복숭아");
const HANJA_YUN = hanja("允", "윤", 8, null, "儿", "sincere and trustworthy", "진실로");
const HANJA_RA = hanja("蘿", "라", 15, "木", "艸", "creeping vine", "쑥");
const HANJA_ON = hanja("熅", "온", 10, "火", "火", "warm ember", "숯불");
const HANJA_TAE = hanja("台", "태", 5, null, "口", "star", "별");
const HANJA_HO = hanja("昊", "호", 8, null, "日", "vast sky", "하늘");

export const SAMPLE_CANDIDATES: Candidate[] = [
  {
    hangul: "도윤",
    hanja: [HANJA_DO, HANJA_YUN],
    numerologyNumbers: [21, 21, 16, 29],
    phoneticElements: ["木", "火", "土"],
    frequency: 1523,
    highlights: [{ key: "wonhaeng", label: "자원오행 용신 일치" }],
  },
  {
    hangul: "라온",
    hanja: [HANJA_RA, HANJA_ON],
    numerologyNumbers: [25, 23, 18, 33],
    phoneticElements: ["木", "火", "土"],
    frequency: 980,
    highlights: [{ key: "wonhaeng", label: "자원오행 용신 일치" }],
  },
  {
    hangul: "태호",
    hanja: [HANJA_TAE, HANJA_HO],
    numerologyNumbers: [13, 13, 16, 21],
    phoneticElements: ["木", "火", "土"],
    frequency: 2210,
    highlights: [{ key: "phoneticFlow", label: "발음오행 상생" }],
  },
];

export const SAMPLE_REPORT: NamingReport = {
  summary:
    "태어난 날의 천간이 火(화)인 丙(병) 일간인데, 사주 여덟 자 안에 水(수) 3.33, 金(금) 2.53으로 " +
    "물과 쇠의 기운이 크게 몰려 있어 정작 나를 지탱할 火(화)와 이를 살려줄 木(목)은 빈약합니다. " +
    "그래서 이 사주는 신약(스스로를 버티는 힘이 살짝 부족한 상태)이고, 부족한 기운을 채워 균형을 " +
    "잡아주는 용신은 木(목)·火(화)입니다. 아래 세 후보 모두 이 木(목)·火(화)의 흐름을 이름 글자에 " +
    "담아, 넘실대는 물 위에 뜬 작은 태양에게 땔감과 빛을 더해주는 방향으로 지어졌습니다.",
  sajuStory: {
    title: "물 위에 뜬 작은 태양",
    body:
      "**넓은 물 위에 홀로 뜬 해**\n\n" +
      "이 사주는 마치 가을 강물 위에 홀로 떠 있는 작은 태양과 같습니다. 庚(경)·申(신)·酉(유)·" +
      "子(자)가 만든 물과 쇠의 기운이 사방에서 출렁이고, 정작 그 물결을 데워야 할 丙(병)의 " +
      "빛은 상대적으로 여립니다.\n\n" +
      "**땔감과 빛이 필요한 이유**\n\n" +
      "그래서 이 사주에는 스스로를 지켜줄 火(화)의 땔감과, 그 땔감을 대어 줄 木(목)의 기운이 " +
      "필요합니다. 물이 많다는 것은 나쁜 것이 아니라 그만큼 담을 그릇이 크다는 뜻이기도 " +
      "합니다 — 다만 그 그릇 안에서 스스로 빛나는 법을 함께 익힐 때 비로소 온전해집니다.\n\n" +
      "**이름에 담을 방향**\n\n" +
      "이름은 그 땔감과 빛을 대신 채워주는 역할을 합니다. 잔잔한 날에도 작은 온기 하나쯤은 늘 " +
      "지니고, 스스로 지치지 않고 꾸준히 자기 빛을 낼 수 있는 사람으로 자라나시길 바랍니다.",
  },
  candidates: [
    {
      hangul: "도윤",
      explanation:
        "丙(병) 일간의 사주는 물과 쇠의 기운이 강해 스스로를 지탱할 火(화)와 이를 살려줄 木(목)이 " +
        "아쉬운 신약 사주입니다. 桃(복숭아나무 도)는 부수 오행이 木(목)으로 용신과 그대로 맞닿아 " +
        "있어, 이른 봄 가장 먼저 꽃을 피우는 나무처럼 생기를 불어넣습니다.\n\n" +
        "允(진실로 윤)은 자원오행 배속표 밖의 한자라 이 항목은 판단을 비워 두었지만, 발음오행은 " +
        "성씨 金(김)에서 시작해 火(화)·土(토)로 순하게 흐르고, 원형이정 네 자리 수리 모두 81수리 " +
        "기준 길격입니다. 화려하게 채우기보다 담백하고 한결같은 인상을 주는 이름입니다.",
      hanjaGlosses: [
        { char: "桃", hun: "복숭아", meaningKo: "이른 봄 가장 먼저 꽃을 피우는 복숭아나무를 뜻하는 글자" },
        { char: "允", hun: "진실로", meaningKo: "말과 행동이 한결같아 진실하고 미더움을 뜻하는 글자" },
      ],
      strengths: [
        "이른 봄 가장 먼저 피는 桃(복숭아나무)의 생동감",
        "允(진실로)이 더해 주는 한결같은 인상",
        "성씨부터 이름까지 木→火→土로 순하게 흐르는 발음",
      ],
    },
    {
      hangul: "라온",
      explanation:
        "蘿(담쟁이넝쿨 라)와 熅(숯불 온) 두 글자 모두 부수 오행이 각각 木(목)·火(화)로 이 사주의 " +
        "용신과 정확히 맞닿아 있어, 세 후보 중 자원오행 보완이 가장 뚜렷합니다. 담쟁이넝쿨이 담을 " +
        "타고 넓게 뻗어나가듯, 은은한 숯불이 오래 온기를 지피듯 두 글자 모두에서 부족한 木(목)·" +
        "火(화)의 기운을 채웁니다.\n\n" +
        "발음오행 역시 성씨 金(김)에서 시작해 火(화)·土(토)로 상생하고, 원형이정 네 자리 수리도 " +
        "모두 길격입니다.",
      hanjaGlosses: [
        { char: "蘿", hun: "쑥", meaningKo: "덩굴이 넓게 뻗어나가는 담쟁이넝쿨을 뜻하는 글자" },
        { char: "熅", hun: "숯불", meaningKo: "은은하게 오래 타는 숯불의 따스한 기운을 뜻하는 글자" },
      ],
      strengths: [
        "蘿(담쟁이넝쿨)처럼 뻗어나가는 생명력",
        "熅(은은한 숯불)이 부족한 火 기운을 정면으로 채움",
        "두 글자 모두 용신 木·火와 그대로 맞닿음",
      ],
    },
    {
      hangul: "태호",
      explanation:
        "台(별 태)와 昊(하늘 호)는 둘 다 부수 오행이 명확히 밝혀진 소수의 부수 밖에 있는 한자라, " +
        "세 후보 중 유일하게 자원오행 항목 자체를 평가하지 않습니다. 이는 조건을 못 채운 것이 " +
        "아니라, 근거 없이 배속을 지어내지 않고 이 기준만 정직하게 비워 둔다는 뜻입니다.\n\n" +
        "대신 발음오행은 다른 두 후보와 마찬가지로 성씨 金(김)에서 火(화)·土(토)로 순하게 흐르고, " +
        "원형이정 네 자리 수리도 모두 길격이며, 두 글자 모두 실제 출생 등록 통계에 있는 익숙한 " +
        "이름입니다.",
      hanjaGlosses: [
        { char: "台", hun: "별", meaningKo: "밝게 빛나는 별을 뜻하는 글자" },
        { char: "昊", hun: "하늘", meaningKo: "가없이 넓고 큰 하늘을 뜻하는 글자" },
      ],
      strengths: [
        "台(별)와 昊(하늘)가 만나 스케일이 큰 인상",
        "자원오행은 비워 두되 판단을 지어내지 않는 정직함",
        "실제로 많이 쓰이는 친숙한 두 글자 조합",
      ],
    },
  ],
};
