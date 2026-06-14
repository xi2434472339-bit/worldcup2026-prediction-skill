export interface TeamOption {
  name: string;
  group: string;
  code: string;
}

export const TEAMS: TeamOption[] = [
  { name: "墨西哥", group: "A", code: "MX" },
  { name: "南非", group: "A", code: "ZA" },
  { name: "韩国", group: "A", code: "KR" },
  { name: "捷克", group: "A", code: "CZ" },
  { name: "加拿大", group: "B", code: "CA" },
  { name: "波黑", group: "B", code: "BA" },
  { name: "卡塔尔", group: "B", code: "QA" },
  { name: "瑞士", group: "B", code: "CH" },
  { name: "巴西", group: "C", code: "BR" },
  { name: "摩洛哥", group: "C", code: "MA" },
  { name: "海地", group: "C", code: "HT" },
  { name: "苏格兰", group: "C", code: "GB-SCT" },
  { name: "美国", group: "D", code: "US" },
  { name: "巴拉圭", group: "D", code: "PY" },
  { name: "澳大利亚", group: "D", code: "AU" },
  { name: "土耳其", group: "D", code: "TR" },
  { name: "德国", group: "E", code: "DE" },
  { name: "库拉索", group: "E", code: "CW" },
  { name: "科特迪瓦", group: "E", code: "CI" },
  { name: "厄瓜多尔", group: "E", code: "EC" },
  { name: "荷兰", group: "F", code: "NL" },
  { name: "日本", group: "F", code: "JP" },
  { name: "瑞典", group: "F", code: "SE" },
  { name: "突尼斯", group: "F", code: "TN" },
  { name: "比利时", group: "G", code: "BE" },
  { name: "埃及", group: "G", code: "EG" },
  { name: "伊朗", group: "G", code: "IR" },
  { name: "新西兰", group: "G", code: "NZ" },
  { name: "西班牙", group: "H", code: "ES" },
  { name: "佛得角", group: "H", code: "CV" },
  { name: "沙特", group: "H", code: "SA" },
  { name: "乌拉圭", group: "H", code: "UY" },
  { name: "法国", group: "I", code: "FR" },
  { name: "塞内加尔", group: "I", code: "SN" },
  { name: "伊拉克", group: "I", code: "IQ" },
  { name: "挪威", group: "I", code: "NO" },
  { name: "阿根廷", group: "J", code: "AR" },
  { name: "阿尔及利亚", group: "J", code: "DZ" },
  { name: "奥地利", group: "J", code: "AT" },
  { name: "约旦", group: "J", code: "JO" },
  { name: "葡萄牙", group: "K", code: "PT" },
  { name: "刚果金", group: "K", code: "CD" },
  { name: "乌兹别克斯坦", group: "K", code: "UZ" },
  { name: "哥伦比亚", group: "K", code: "CO" },
  { name: "英格兰", group: "L", code: "GB-ENG" },
  { name: "克罗地亚", group: "L", code: "HR" },
  { name: "加纳", group: "L", code: "GH" },
  { name: "巴拿马", group: "L", code: "PA" },
];

export function teamFlag(code: string): string {
  const specialFlags: Record<string, string> = {
    "GB-ENG": "🏴",
    "GB-SCT": "🏴",
  };
  if (specialFlags[code]) return specialFlags[code];
  const country = code.includes("-") ? code.split("-")[0] : code;
  return country
    .toUpperCase()
    .replace(/./g, (character) =>
      String.fromCodePoint(127397 + character.charCodeAt(0)),
    );
}

export function teamByName(name: string) {
  return TEAMS.find((team) => team.name === name);
}
