const CAMPUS_FLAGS: Record<string, string> = {
  "42 Central": "🇫🇷",
  "42Network": "🇫🇷",
  "42next": "🇫🇷",
  "Abu Dhabi": "🇦🇪",
  Adelaide: "🇦🇺",
  "Al-Aïn": "🇦🇪",
  Alicante: "🇪🇸",
  Amman: "🇯🇴",
  Amsterdam: "🇳🇱",
  Angouleme: "🇫🇷",
  Antananarivo: "🇲🇬",
  Antwerp: "🇧🇪",
  Bangkok: "🇹🇭",
  Barcelona: "🇪🇸",
  Beirut: "🇱🇧",
  Belgium: "🇧🇪",
  "Belo Horizonte": "🇧🇷",
  Benguerir: "🇲🇦",
  Berlin: "🇩🇪",
  Bucharest: "🇷🇴",
  "Cape-Town": "🇿🇦",
  Chisinau: "🇲🇩",
  Cluj: "🇷🇴",
  CoderDojoSV: "🇺🇸",
  Florence: "🇮🇹",
  Forty2: "🇫🇷",
  Fremont: "🇺🇸",
  Gyeongsan: "🇰🇷",
  "Hack High School - Fremont": "🇺🇸",
  Heilbronn: "🇩🇪",
  Helsinki: "🇫🇮",
  iTouchUP: "🇺🇸",
  IskandarPuteri: "🇲🇾",
  Istanbul: "🇹🇷",
  Johannesburg: "🇿🇦",
  Kazan: "🇷🇺",
  Khouribga: "🇲🇦",
  Kocaeli: "🇹🇷",
  "Kuala Lumpur": "🇲🇾",
  Kyiv: "🇺🇦",
  Lausanne: "🇨🇭",
  "Le Havre": "🇫🇷",
  Lisboa: "🇵🇹",
  London: "🇬🇧",
  Luanda: "🇦🇴",
  Luxembourg: "🇱🇺",
  Lyon: "🇫🇷",
  Madrid: "🇪🇸",
  Malaga: "🇪🇸",
  Milano: "🇮🇹",
  Montrouge: "🇫🇷",
  Moscow: "🇷🇺",
  Mulhouse: "🇫🇷",
  Nablus: "🇵🇸",
  "New Vegas": "🇫🇷",
  Nice: "🇫🇷",
  Novosibirsk: "🇷🇺",
  Paris: "🇫🇷",
  Penang: "🇲🇾",
  Perpignan: "🇫🇷",
  Porto: "🇵🇹",
  Prague: "🇨🇿",
  Quebec: "🇨🇦",
  Rabat: "🇲🇦",
  "Rio de Janeiro": "🇧🇷",
  Rome: "🇮🇹",
  "São-Paulo": "🇧🇷",
  Seoul: "🇰🇷",
  Singapore: "🇸🇬",
  Tétouan: "🇲🇦",
  Tokyo: "🇯🇵",
  Urduliz: "🇪🇸",
  Vienna: "🇦🇹",
  Warsaw: "🇵🇱",
  Wolfsburg: "🇩🇪",
  Yerevan: "🇦🇲",
};

export function getCampusFlag(name: string): string {
  return CAMPUS_FLAGS[name] || "";
}

export function injectCampusFlag() {
  const buttons = document.querySelectorAll<HTMLElement>(
    ".flex.flex-col.justify-center.gap-4 .text-white",
  );
  for (const el of buttons) {
    const text = el.textContent?.trim() || "";
    const flag = CAMPUS_FLAGS[text];
    if (flag) {
      const row = el.parentElement;
      const svg = row?.querySelector("svg");
      if (svg) {
        svg.insertAdjacentHTML("beforebegin", flag);
        svg.remove();
      }
    }
  }
}
