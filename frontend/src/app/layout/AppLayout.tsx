import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { ChatbotFloatingButton } from "../components/ChatbotFloatingButton";
import { ChatbotModal } from "../components/ChatbotModal";
import { X } from "lucide-react";
import {
  consume_reco_popup_trigger,
  is_reco_popup_suppressed_today,
  RecommendedBidsModal,
} from "../components/RecommendedBidsModal";
import { fetchWishlist } from "../api/wishlist";
import { fetchAlarms } from "../api/alarms";
import { fetch_notices_from_community } from "../api/notices";
import {
  LayoutDashboard,
  Search,
  ShoppingCart,
  Users,
  User,
  LogOut,
  Menu,
} from "lucide-react";
import { logout as apiLogout, checkLogin, persistLogin } from "../api/auth";

type SideItem = {
  label: string;
  to: string;
  icon: ReactNode;
  match: (path: string) => boolean;
  badge?: number;
};

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  const [query, setQuery] = useState("");
  const [wishlistCount, setWishlistCount] = useState<number>(0);

  const [notificationUnread, setNotificationUnread] = useState<number>(0);
  const [hasNewNotice, setHasNewNotice] = useState(false);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [recoOpen, setRecoOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);

  const [authTick, setAuthTick] = useState(0);

  const NOTIFICATION_READ_KEY = "notifications.read.v1";
  const NOTICE_LAST_SEEN_KEY = "notice.last_seen_id.v1";

  const loadReadMap = () => {
    try {
      const raw = localStorage.getItem(NOTIFICATION_READ_KEY);
      if (!raw) return {} as Record<string, boolean>;
      return JSON.parse(raw) as Record<string, boolean>;
    } catch {
      return {} as Record<string, boolean>;
    }
  };

  const saveNoticeLastSeen = (id: number) => {
    if (!Number.isFinite(id) || id <= 0) return;
    localStorage.setItem(NOTICE_LAST_SEEN_KEY, String(id));
  };

  const loadNoticeLastSeen = () => {
    const raw = localStorage.getItem(NOTICE_LAST_SEEN_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : 0;
  };

  useEffect(() => {
    const sync = () => setAuthTick((v) => v + 1);

    window.addEventListener("pageshow", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    checkLogin()
      .then((data) => {
        if (ignore) return;
        if (data) persistLogin(data);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [location.pathname]);

  const isAuthed = useMemo(
    () => !!localStorage.getItem("userId"),
    [location.pathname, authTick]
  );


  useEffect(() => {
    let ignore = false;

    const run = async () => {
      try {
        const notices = await fetch_notices_from_community();
        const latestId = notices.reduce(
          (mx, n) => Math.max(mx, Number(n.id) || 0),
          0
        );
        const lastSeen = loadNoticeLastSeen();
        if (!ignore) setHasNewNotice(latestId > lastSeen);

        if (location.pathname.startsWith("/notice") && latestId > 0) {
          saveNoticeLastSeen(latestId);
          if (!ignore) setHasNewNotice(false);
        }
      } catch {
        if (!ignore) setHasNewNotice(false);
      }

      // 알림: 로그인 사용자만
      const rawUserId = localStorage.getItem("userId");
      const userId = rawUserId ? Number(rawUserId) : NaN;
      if (!Number.isFinite(userId)) {
        if (!ignore) setNotificationUnread(0);
        return;
      }

      try {
        const alarms = await fetchAlarms(userId);
        const readMap = loadReadMap();
        const unread = alarms.filter((a) => !readMap[String(a.alarmId)]).length;
        if (!ignore) setNotificationUnread(unread);
      } catch {
        if (!ignore) setNotificationUnread(0);
      }

    };

    run();
    return () => {
      ignore = true;
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!localStorage.getItem("userId")) {
      setWishlistCount(0);
      return;
    }

    const raw = localStorage.getItem("userId");
    const userId = raw ? Number(raw) : NaN;

    if (!Number.isFinite(userId)) {
      setWishlistCount(0);
      return;
    }

    fetchWishlist(userId)
      .then((items) => setWishlistCount(items.length))
      .catch(() => setWishlistCount(0));
  }, [location.pathname]);

  const onSubmitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/bids?q=${encodeURIComponent(q)}`);
  };

  const onLogout = () => {

    void apiLogout();
    window.dispatchEvent(new Event("auth:changed"));
    window.location.replace("/");
  };

  const sideItems: SideItem[] = [
    {
      label: "대시보드",
      to: "/dashboard",
      icon: <LayoutDashboard size={18} />,
      match: (p) => p.startsWith("/dashboard"),
    },
    {
      label: "공고 찾기",
      to: "/bids",
      icon: <Search size={18} />,
      match: (p) => p.startsWith("/bids"),
    },
    {
      label: "장바구니",
      to: "/cart",
      icon: <ShoppingCart size={18} />,
      match: (p) => p.startsWith("/cart"),
      badge: wishlistCount,
    },
    {
      label: "커뮤니티",
      to: "/community",
      icon: <Users size={18} />,
      match: (p) => p.startsWith("/community"),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <header className="border-b bg-slate-900 text-white">
        <div className="h-16 w-full flex items-center">
          <div className="flex items-center gap-3 h-16 md:w-[260px] w-auto pl-5">
            {!isHome && (
              <button
                type="button"
                className="md:hidden h-10 w-10 rounded-md bg-white/10 hover:bg-white/15 transition flex items-center justify-center"
                aria-label="메뉴 열기"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate("/")}
              aria-label="홈으로"
              className="h-16 flex items-center"
            >
              <img
                src="/logo.png"
                alt="입찰인사이트 로고"
                className="h-16 w-auto block object-contain"
                aria-hidden="true"
              />
            </button>
          </div>

          <div className="flex-1 h-16 flex items-center justify-end gap-2 px-5">
            <HeaderPill
              onClick={() => navigate("/notice")}
              label="공지사항"
              dot={hasNewNotice}
            />
            <HeaderPill
              onClick={() => navigate("/notifications")}
              label="알림"
              badge={notificationUnread}
            />
          </div>
        </div>
      </header>

      {!isHome && mobileOpen && (
        <div className="fixed inset-0 z-[9999]">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="메뉴 닫기"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-[280px] bg-slate-900 text-white shadow-xl">
            <SideBarContent
              items={sideItems}
              pathname={location.pathname}
              isAuthed={isAuthed}
              onLogout={onLogout}
              onNavigate={(to) => navigate(to)}
            />
          </aside>
        </div>
      )}

      {isHome && (
        <section className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700">
          <div className="w-full px-5 py-6">
            <form
              onSubmit={onSubmitSearch}
              className="w-full max-w-[760px] mx-auto"
            >
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="공고를 키워드로 검색해보세요 (공고명/기관/예산/마감)"
                  className="w-full h-12 rounded-full bg-white text-slate-900 placeholder:text-slate-400 pl-5 pr-14
                  border border-blue-500/80 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1 h-10 w-12 rounded-full bg-blue-600 hover:bg-blue-500 transition flex items-center justify-center"
                  aria-label="검색"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                      stroke="white"
                      strokeWidth="2"
                    />
                    <path
                      d="M21 21l-4.35-4.35"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {isHome ? (
        <main className="flex-1">
          <Outlet />
        </main>
      ) : (
        <div className="flex-1 min-h-0 flex">
          <aside className="hidden md:flex w-[260px] shrink-0 bg-slate-900 text-white border-r border-white/10">
            <SideBarContent
              items={sideItems}
              pathname={location.pathname}
              isAuthed={isAuthed}
              onLogout={onLogout}
              onNavigate={(to) => navigate(to)}
            />
          </aside>

          <main className="flex-1 min-w-0 min-h-0 bg-slate-50 dark:bg-slate-900">
            <div className="h-full min-h-0 pl-0 pr-6 py-6">
              <div className="w-full max-w-[1280px] pl-8">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      )}

      <footer className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-4 text-sm text-gray-500 dark:text-gray-400">
        <div className="w-full px-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-xs leading-relaxed flex flex-wrap gap-x-2 gap-y-1">
            <span>(주)입찰인사이트</span>
            <span className="text-slate-300">|</span>
            <span>대표 전보윤</span>
            <span className="text-slate-300">|</span>
            <span>사업자등록번호 000-00-00000</span>
            <span className="text-slate-300">|</span>
            <span>대구광역시 북구 고성로 141</span>
            <span className="text-slate-300">|</span>
            <span>고객센터 053-000-0000</span>
            <span className="text-slate-300">|</span>
            <span>support@bidsight.co.kr</span>
          </div>

          <div className="flex gap-4 text-xs">
            <button
              onClick={() => navigate("/terms")}
              className="hover:text-gray-600"
            >
              이용약관
            </button>
            <button
              onClick={() => navigate("/privacy")}
              className="hover:text-gray-600"
            >
              개인정보처리방침
            </button>
            <button
              onClick={() => navigate("/support")}
              className="hover:text-gray-600"
            >
              고객지원
            </button>
          </div>
        </div>
      </footer>

      <ChatbotFloatingButton onClick={() => setChatbotOpen(!chatbotOpen)} />
      <RecommendedBidsModal open={recoOpen} onOpenChange={setRecoOpen} />

      {/* Chatbot Floating Panel */}
      {chatbotOpen && (
        <>
          {/* Overlay */}
          <button
            type="button"
            onClick={() => setChatbotOpen(false)}
            className="fixed inset-0 bg-black/20 z-[70] transition-opacity"
            aria-label="챗봇 닫기"
          />

          {/* Floating Chat Panel at Bottom-Right */}
          <div
            className="fixed bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] right-4 md:right-6 
                       w-[calc(100vw-2rem)] md:w-[739px] lg:w-[893px]
                       h-[min(680px,calc(100vh-10rem))]
                       z-[80] bg-white shadow-2xl rounded-2xl
                       transform transition-all duration-300 ease-out"
            style={{
              transform: chatbotOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)',
              opacity: chatbotOpen ? 1 : 0
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setChatbotOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-md bg-white/90 p-2 shadow-md hover:bg-slate-50
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              aria-label="AI 도우미 닫기"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Chatbot Content */}
            <div className="h-full">
              <ChatbotModal onClose={() => setChatbotOpen(false)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function HeaderPill({
  label,
  onClick,
  dot,
  badge,
}: {
  label: string;
  onClick: () => void;
  dot?: boolean;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="relative px-4 h-10 rounded-full bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 transition text-sm"
    >
      <span>{label}</span>

      {typeof badge === "number" && badge > 0 && (
        <span className="ml-2 inline-flex min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[11px] font-bold items-center justify-center align-middle">
          {badge > 99 ? "99+" : badge}
        </span>
      )}

      {dot && (
        <span
          aria-label="새 소식"
          className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-600 ring-2 ring-slate-900"
        />
      )}
    </button>
  );
}

function SideBarContent({
  items,
  pathname,
  isAuthed,
  onLogout,
  onNavigate,
}: {
  items: SideItem[];
  pathname: string;
  isAuthed: boolean;
  onLogout: () => void | Promise<void>;
  onNavigate: (to: string) => void;
}) {
  return (
    <div className="h-full w-full flex flex-col">
      <div className="px-5 py-4">
        <div className="text-sm font-semibold tracking-wide text-slate-200">
          MENU
        </div>
      </div>

      <nav className="px-4 flex flex-col gap-1">
        {items.map((it) => (
          <SideNavLink
            key={it.to}
            to={it.to}
            label={it.label}
            icon={it.icon}
            active={it.match(pathname)}
            badge={it.badge}
          />
        ))}
      </nav>

      <div className="flex-1" />

      <div className="px-4 pb-4">
        <div className="border-t border-white/10 pt-3">
          {isAuthed ? (
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => onNavigate("/profile")}
                className="w-full h-11 px-3 rounded-md flex items-center gap-3 text-slate-100 hover:bg-white/5 transition"
              >
                <User size={18} />
                <span className="text-sm font-medium">마이페이지</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="w-full h-11 px-3 rounded-md flex items-center gap-3 text-slate-100 hover:bg-white/5 transition"
              >
                <LogOut size={18} />
                <span className="text-sm font-medium">로그아웃</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate("/login")}
              className="w-full h-11 px-3 rounded-md flex items-center gap-3 text-slate-100 hover:bg-white/5 transition"
            >
              <User size={18} />
              <span className="text-sm font-medium">로그인</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SideNavLink({
  to,
  label,
  icon,
  active,
  badge,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  badge?: number;
}) {
  return (
    <NavLink
      to={to}
      className={[
        "relative h-11 px-3 rounded-md",
        "flex items-center gap-3",
        "transition",
        active
          ? "bg-white/10 text-white"
          : "text-slate-200 hover:bg-white/5 hover:text-white",
      ].join(" ")}
    >
      <span className={active ? "text-white" : "text-slate-200"}>{icon}</span>
      <span className="text-sm font-medium">{label}</span>

      {!!badge && badge > 0 && (
        <span className="ml-auto min-w-[20px] h-[20px] px-1 rounded-full bg-blue-600 text-white text-[12px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
    </NavLink>
  );
}
