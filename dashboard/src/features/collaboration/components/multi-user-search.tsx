import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@apollo/client/react";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Button } from "@/common/components/ui/button";
import { Avatar, AvatarFallback } from "@/common/components/ui/avatar";
import { Search, X } from "lucide-react";
import {
  GetUserByExactMatchDocument,
  type GetUserByExactMatchQuery,
  type GetUserByExactMatchQueryVariables,
  type SearchUser,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";

/**
 * Multi-user search component with debounced search to prevent rate limiting
 */
export function MultiUserSearch({
  selectedUsers,
  onUsersChange,
}: {
  selectedUsers: SearchUser[];
  onUsersChange: (users: SearchUser[]) => void;
}) {
  const { t } = useTranslations();
  const [inputValue, setInputValue] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce the search keyword to avoid hitting rate limits
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Only debounce if input has sufficient length
    if (inputValue.length >= 2) {
      // Set a new timer - 500ms delay to balance UX and rate limit protection
      debounceTimerRef.current = setTimeout(() => {
        setDebouncedKeyword(inputValue);
      }, 500);
    } else {
      // Clear with minimal delay for short inputs to avoid cascading renders
      debounceTimerRef.current = setTimeout(() => {
        setDebouncedKeyword("");
      }, 10);
    }

    // Cleanup timer on unmount or input change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [inputValue]);

  const { data: searchData, loading: searchLoading } = useQuery<
    GetUserByExactMatchQuery,
    GetUserByExactMatchQueryVariables
  >(GetUserByExactMatchDocument, {
    variables: {
      keyword: debouncedKeyword,
    },
    skip: !debouncedKeyword || debouncedKeyword.length < 2,
  });

  const availableUsers = useMemo(() => {
    if (!searchData?.getUserByExactMatch) return [];

    // Filter out already selected users
    const selectedUsernames = selectedUsers.map((user) => user.username);
    return searchData.getUserByExactMatch.filter(
      (user) => !selectedUsernames.includes(user.username),
    );
  }, [searchData, selectedUsers]);

  const handleUserSelect = (user: SearchUser) => {
    onUsersChange([...selectedUsers, user]);
    setInputValue("");
    setDebouncedKeyword("");
    setIsOpen(false);
  };

  const handleUserRemove = (username: string) => {
    onUsersChange(selectedUsers.filter((user) => user.username !== username));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Only open popover if there's text and it's at least 2 characters
    if (value.length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleInputFocus = () => {
    // Only open if there's already text in the input and it's at least 2 characters
    if (inputValue.length >= 2) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Don't close immediately on blur, let the popover handle it
    // This prevents the auto-blur issue
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const getInitials = (username: string) => {
    return username
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Show loading state when input is being debounced
  const isDebouncing =
    inputValue !== debouncedKeyword && inputValue.length >= 2;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="user-search">{t("collaboration.searchUsers")}</Label>
        <div className="relative" ref={containerRef}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="user-search"
            placeholder={t("collaboration.typeToSearchUsers")}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            className="pl-10"
          />
          {isOpen && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 w-full rounded-md border bg-popover p-0 shadow-md">
              <div className="max-h-60 overflow-auto">
                {isDebouncing || searchLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {t("collaboration.searching")}
                  </div>
                ) : availableUsers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {inputValue.length < 2
                      ? t("collaboration.typeAtLeast2Characters")
                      : t("collaboration.noUsersFound")}
                  </div>
                ) : (
                  <div className="p-1">
                    {availableUsers.map((user) => (
                      <button
                        key={user.username}
                        onClick={() => handleUserSelect(user)}
                        className="flex w-full items-center space-x-3 rounded-sm p-2 text-left hover:bg-accent"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(user.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">{user.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedUsers.length > 0 && (
        <div className="space-y-2">
          <Label>{t("collaboration.selectedUsers")}</Label>
          <div className="space-y-2">
            {selectedUsers.map((user) => (
              <div
                key={user.username}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(user.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{user.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUserRemove(user.username)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
