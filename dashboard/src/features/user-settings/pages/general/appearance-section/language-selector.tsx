import { useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { Button } from "@/common/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/common/components/ui/popover.tsx";
import { useTranslations } from "@/common/hooks/use-translations.ts";
import {
  LANGUAGE_NAMES,
  type SupportedLanguage,
  persistLanguage,
} from "@/i18n";
import { cn } from "@/common/lib/utils/utils.ts";

/**
 * Language selector component
 * Allows users to change the application language
 */
export function LanguageSelector() {
  const { i18n } = useTranslations();
  const [open, setOpen] = useState(false);

  const handleLanguageChange = (lang: SupportedLanguage) => {
    void i18n.changeLanguage(lang);
    persistLanguage(lang);
    setOpen(false);
  };

  const currentLanguageName =
    LANGUAGE_NAMES[i18n.language as SupportedLanguage] || "English";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between"
        >
          <span className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            <span>{currentLanguageName}</span>
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-75 p-0" align="end">
        <div className="max-h-100 overflow-y-auto p-1">
          {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
            <Button
              key={code}
              variant="ghost"
              className={cn(
                "w-full justify-start font-normal",
                i18n.language === code && "bg-accent",
              )}
              onClick={() => handleLanguageChange(code as SupportedLanguage)}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  i18n.language === code ? "opacity-100" : "opacity-0",
                )}
              />
              {name}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
