import { useEffect, useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";

type FloatingChatbotLauncherProps = {
  onOpen: () => void;
  label?: string;
};

const HINT_LS_KEY = "bidassistance.chatbot_hint_dismissed_v1";

export function FloatingChatbotLauncher({
  onOpen,
  label = "AI 챗봇",
}: FloatingChatbotLauncherProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [autoCollapsed, setAutoCollapsed] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const isCollapsed = useMemo(() => {
    // 스크롤했거나 시간이 지나면 축소, 대신 hover/focus 시 확장
    return (isScrolled || autoCollapsed) && !isHovered && !isFocused;
  }, [isScrolled, autoCollapsed, isHovered, isFocused]);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 처음 로드 후 일정 시간이 지나면 자동 축소(발견성 확보 후 과한 점유 방지)
  useEffect(() => {
    const t = window.setTimeout(() => setAutoCollapsed(true), 9000);
    return () => window.clearTimeout(t);
  }, []);


  useEffect(() => {
    const dismissed = localStorage.getItem(HINT_LS_KEY) === "1";
    if (!dismissed) {
      setShowHint(true);
      const t = window.setTimeout(() => setShowHint(false), 6500);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, []);

  const dismissHint = () => {
    localStorage.setItem(HINT_LS_KEY, "1");
    setShowHint(false);
  };

  const handleOpen = () => {
    dismissHint();
    onOpen();
  };

  return (
    <div
      className="fixed z-40"
      style={{
        right: "max(1.5rem, env(safe-area-inset-right))",
        bottom: "max(1.5rem, env(safe-area-inset-bottom))",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 힌트 툴팁 (첫 방문 1회) */}
      {showHint ? (
        <div className="absolute bottom-full right-0 mb-2">
          <div className="relative">
            <div className="rounded-lg border bg-white shadow-md px-3 py-2 text-sm">
              AI 챗봇으로 바로 질문해보세요
              <button
                type="button"
                className="ml-2 text-xs text-muted-foreground hover:underline"
                onClick={dismissHint}
              >
                닫기
              </button>
            </div>
            <div className="absolute right-4 top-full h-0 w-0 border-x-8 border-x-transparent border-t-8 border-t-white" />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleOpen}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="group"
        aria-label="AI 챗봇 열기"
      >
        <div className="relative shadow-lg rounded-full">
          {/* 첫 노출 시 살짝 눈에 띄게(힌트가 살아있을 때만) */}
          {showHint ? (
            <span className="absolute inset-0 rounded-full animate-ping bg-blue-600/20" />
          ) : null}

          <Button
            className={cn(
              "rounded-full h-12 transition-all duration-200 ease-out",
              isCollapsed
                ? "w-12 px-0"
                : "w-auto px-4 gap-2"
            )}
          >
            <MessageSquare className="h-5 w-5" />
            <span
              className={cn(
                "whitespace-nowrap text-sm font-medium transition-all duration-200",
                isCollapsed ? "w-0 overflow-hidden opacity-0" : "opacity-100"
              )}
            >
              {label}
            </span>

            {/* 스크린리더용 라벨(축소 상태에서도 텍스트 의미 유지) */}
            <span className="sr-only">{label} 열기</span>
          </Button>
        </div>
      </button>
    </div>
  );
}
