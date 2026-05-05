import {
  Image as ImageIcon,
  Layers,
  Film,
  CircleDot,
  Sparkles,
  CreditCard,
  FileText,
  Palette,
  type LucideIcon,
} from "lucide-react";

export type ArtType =
  | "single_post"
  | "carousel"
  | "reels"
  | "story"
  | "logo"
  | "business_card"
  | "text"
  | "other";

export interface ArtTypeConfig {
  value: ArtType;
  labelKey: string; // i18n key
  fallbackLabel: string;
  icon: LucideIcon;
  color: string; // tailwind color class for icon
}

export const ART_TYPES: ArtTypeConfig[] = [
  { value: "single_post", labelKey: "artTypeSinglePost", fallbackLabel: "Post único", icon: ImageIcon, color: "text-blue-500" },
  { value: "carousel", labelKey: "artTypeCarousel", fallbackLabel: "Carrossel", icon: Layers, color: "text-purple-500" },
  { value: "reels", labelKey: "artTypeReels", fallbackLabel: "Reels", icon: Film, color: "text-pink-500" },
  { value: "story", labelKey: "artTypeStory", fallbackLabel: "Story", icon: CircleDot, color: "text-orange-500" },
  { value: "logo", labelKey: "artTypeLogo", fallbackLabel: "Logotipo", icon: Sparkles, color: "text-amber-500" },
  { value: "business_card", labelKey: "artTypeBusinessCard", fallbackLabel: "Cartão de visita", icon: CreditCard, color: "text-emerald-500" },
  { value: "text", labelKey: "artTypeText", fallbackLabel: "Texto", icon: FileText, color: "text-slate-500" },
  { value: "other", labelKey: "artTypeOther", fallbackLabel: "Outros", icon: Palette, color: "text-rose-500" },
];

export const getArtTypeConfig = (value?: string | null): ArtTypeConfig => {
  return ART_TYPES.find((a) => a.value === value) ?? ART_TYPES[0];
};
