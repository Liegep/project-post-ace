import { useI18n, useSetClientLocale } from "@/i18n/I18nContext";
import { Locale, LOCALE_LABELS, LOCALE_FLAGS } from "@/i18n/translations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";

interface LanguageSelectorProps {
  /** When true, this selector controls the client-facing locale (persisted to DB) */
  forClient?: boolean;
  clientLocale?: Locale;
}

export const LanguageSelector = ({ forClient, clientLocale }: LanguageSelectorProps) => {
  const { locale, setLocale } = useI18n();
  const saveClientLocale = useSetClientLocale();

  const currentValue = forClient ? (clientLocale ?? "pt") : locale;

  const handleChange = (v: string) => {
    if (forClient) {
      saveClientLocale(v as Locale);
    } else {
      setLocale(v as Locale);
    }
  };

  return (
    <Select value={currentValue} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-[140px] text-xs">
        <Globe className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(LOCALE_LABELS) as Locale[]).map((loc) => (
          <SelectItem key={loc} value={loc}>
            {LOCALE_FLAGS[loc]} {LOCALE_LABELS[loc]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
