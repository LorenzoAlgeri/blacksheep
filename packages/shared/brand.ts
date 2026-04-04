/**
 * BLACK SHEEP — Brand Constants
 * Colors from official Adobe Color palette
 */

export const colors = {
  green: "#334B31",
  gold: "#BE8305",
  black: "#1F1F1F",
  purple: "#65305C",
  navy: "#031240",
  burgundy: "#731022",
  cream: "#FFFFF3",
} as const;

export const fonts = {
  heading: "'Bebas Neue', sans-serif",
  body: "'Source Sans 3', sans-serif",
} as const;

export const social = {
  instagram: "https://www.instagram.com/blacksheep",
  facebook: "https://www.facebook.com/blacksheep",
  tiktok: "https://www.tiktok.com/@blacksheep",
} as const;

export const venue = {
  name: "BLACK SHEEP",
  tagline: "(B)LACK(S)HEEP NO (B)ULLSHIT",
  city: "Milano",
  genre: "Hip-Hop / R&B",
} as const;

export const brand = {
  colors,
  fonts,
  social,
  venue,
} as const;

export default brand;
