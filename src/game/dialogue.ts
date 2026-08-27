// 气泡文案按本地时间分段，集中管理后续可以独立增加方言、节日或随机事件。
type DialoguePeriod = {
  startHour: number;
  endHour: number;
  lines: string[];
};

const addresses = ["靓仔", "靓女"];

const periods: DialoguePeriod[] = [
  {
    startHour: 0,
    endHour: 9,
    lines: [
      "{{address}}，食早餐未？肠粉要趁热食喎。",
      "{{address}}，豆浆油条唔够饱，来碟虾饺啦。",
      "早晨 {{address}}，我先去叹一盅早茶。",
    ],
  },
  {
    startHour: 9,
    endHour: 12,
    lines: [
      "{{address}}，开工啦，唔好净系睇住我。",
      "{{address}}，今日搬砖顺利未？我巡下场先。",
      "认真做嘢啊 {{address}}，摸鱼我会记低嘅。",
    ],
  },
  {
    startHour: 12,
    endHour: 14,
    lines: [
      "{{address}}，够钟食饭啦，烧鹅饭考虑下？",
      "{{address}}，午休唔好卷，叉烧饭先系正经事。",
      "食饱先有力跑啊 {{address}}，晏昼见。",
    ],
  },
  {
    startHour: 14,
    endHour: 15,
    lines: [
      "{{address}}，食饱就继续开工啦。",
      "{{address}}，我散完步返嚟，你都唔好偷懒。",
    ],
  },
  {
    startHour: 15,
    endHour: 18,
    lines: [
      "{{address}}，够钟饮茶啦，唔好等我叫多次。",
      "下午茶时间到，{{address}}，来件蛋挞先。",
      "{{address}}，饮啖茶食件点心，先有力继续跑。",
    ],
  },
  {
    startHour: 18,
    endHour: 24,
    lines: [
      "{{address}}，收工啦，今晚食宵夜未？",
      "{{address}}，今日辛苦晒，带我一齐落班啦。",
      "六点后唔讲工作，{{address}}，我去搵地方躺平。",
    ],
  },
];

export function getRoachDialogue(now: Date = new Date()): string {
  const hour = now.getHours();
  const period = periods.find(
    (candidate) => hour >= candidate.startHour && hour < candidate.endHour,
  );
  const selectedPeriod = period ?? periods[periods.length - 1];
  const line =
    selectedPeriod.lines[
      Math.floor(Math.random() * selectedPeriod.lines.length)
    ];
  const address = addresses[Math.floor(Math.random() * addresses.length)];
  return line.replace("{{address}}", address);
}
