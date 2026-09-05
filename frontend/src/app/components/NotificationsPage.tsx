import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
	Bell,
	AlertCircle,
	FileText,
	RefreshCw,
	XCircle,
	Settings,
	CheckCheck,
	Trash2,
    Search,
    Plus,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { toast } from "sonner";

// Helper for generic local storage
function useStickyState<T>(defaultValue: T, key: string): [T, (v: T) => void] {
    const [value, setValue] = useState<T>(() => {
        const stickyValue = localStorage.getItem(key);
        return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    });
    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(value));
    }, [key, value]);
    return [value, setValue];
}

const SETTINGS_KEY = "notifications.settings.v1";

type NotificationSettings = {
    deadline: boolean;
    correction: boolean;
};

import { fetchWishlist } from "../api/wishlist";
import { deleteAlarm, fetchAlarms, type AlarmItem } from "../api/alarms";
import { getUserKeywords, addUserKeyword, deleteUserKeyword } from "../api/community";
import type { UserKeyword } from "../types/community";

export type NotificationItem = {
	id: number;
	bidId: number;
	type: string;
	title: string;
	message: string;
	time: string;
	read: boolean;
	urgent: boolean;
};

const READ_STORAGE_KEY = "notifications.read.v1";

function safe_json_parse<T>(raw: string | null, fallback: T): T {
	if (!raw) return fallback;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

function get_user_id(): number | null {
	const raw = localStorage.getItem("userId");
	if (!raw) return null;
	const n = Number(raw);
	return Number.isFinite(n) ? n : null;
}

function now_ms(): number {
	return Date.now();
}

function to_relative_time(iso: string): string {
	const t = new Date(iso).getTime();
	if (!Number.isFinite(t)) return iso;

	const diff = Math.max(0, now_ms() - t);
	const sec = Math.floor(diff / 1000);
	if (sec < 30) return "방금";
	if (sec < 60) return `${sec}초 전`;

	const min = Math.floor(sec / 60);
	if (min < 60) return `${min}분 전`;

	const hour = Math.floor(min / 60);
	if (hour < 24) return `${hour}시간 전`;

	const day = Math.floor(hour / 24);
	if (day < 7) return `${day}일 전`;

	return new Date(iso).toLocaleDateString();
}

function infer_type_and_title(content: string, alarmType?: string): { type: string; title: string; urgent: boolean } {
    if (alarmType === "KEYWORD") {
        return { type: "KEYWORD", title: "키워드 알림", urgent: false };
    }

	const c = content ?? "";
	if (/(마감|마감임박|마감 임박|D-?\d+)/i.test(c)) {
		return { type: "deadline", title: "마감 임박", urgent: true };
	}
	if (/(정정|변경|수정)/i.test(c)) {
		return { type: "correction", title: "정정 공고", urgent: false };
	}
	if (/(재공고|재입찰|재등록)/i.test(c)) {
		return { type: "reannouncement", title: "재공고", urgent: false };
	}
	if (/(낙찰|탈락|유찰|결과)/i.test(c)) {
		return { type: "result", title: "입찰 결과", urgent: true };
	}
	return { type: "general", title: "알림", urgent: false };
}

function load_read_map(): Record<string, boolean> {
	return safe_json_parse<Record<string, boolean>>(localStorage.getItem(READ_STORAGE_KEY), {});
}

function save_read_map(map: Record<string, boolean>) {
	localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(map));
}

function to_notification_items(alarms: AlarmItem[], read_map: Record<string, boolean>): NotificationItem[] {
	return alarms
		.slice()
		.sort((a, b) => {
			const ta = new Date(a.date).getTime();
			const tb = new Date(b.date).getTime();
			return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
		})
		.map((a) => {
			const meta = infer_type_and_title(a.content, a.alarmType);
			return {
				id: Number(a.alarmId),
				bidId: Number(a.bidId),
				type: meta.type,
				title: meta.title,
				message: a.content,
				time: to_relative_time(a.date),
				read: !!read_map[String(a.alarmId)],
				urgent: meta.urgent,
			};
		});
}

function to_iso_like(v: string): string {
    const s = String(v ?? "").trim();
    if (!s) return "";
    return s.includes(" ") && !s.includes("T") ? s.replace(" ", "T") : s;
}

function ms_until(iso: string): number | null {
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return null;
    return t - Date.now();
}

function build_deadline_notifications_from_wishlist(
    wishlist: any[],
    read_map: Record<string, boolean>,
): NotificationItem[] {
    const out: NotificationItem[] = [];

    for (const w of wishlist) {
        const bidId = Number(w?.bidId);
        if (!Number.isFinite(bidId) || bidId <= 0) continue;

        const endRaw = w?.bidEnd;
        const endIso = to_iso_like(String(endRaw ?? ""));
        if (!endIso) continue;

        const remain = ms_until(endIso);
        if (remain == null) continue;

        const isExpired = remain <= 0;
        const isImminent = remain > 0 && remain <= 7 * 24 * 60 * 60 * 1000;

        if (!isExpired && !isImminent) continue;


        const localId = Number(`9${bidId}${isExpired ? 2 : 1}`);

        out.push({
            id: localId,
            bidId,
            type: "deadline",
            title: isExpired ? "마감됨" : "마감 임박",
            message: isExpired
                ? `[장바구니] "${w?.title ?? "공고"}" 공고가 마감되었습니다. (마감: ${new Date(endIso).toLocaleString("ko-KR")})`
                : `[장바구니] "${w?.title ?? "공고"}" 공고가 곧 마감됩니다. (마감: ${new Date(endIso).toLocaleString("ko-KR")})`,
            time: isExpired ? "방금/최근" : "곧",
            read: !!read_map[String(localId)],
            urgent: true,
        });
    }
    return out;
}

export function NotificationsPage() {
	const [items, setItems] = useState<NotificationItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

    const [keywords, setKeywords] = useState<UserKeyword[]>([]);
    const [newKeyword, setNewKeyword] = useState("");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    
    const [settings, setSettings] = useStickyState<NotificationSettings>({ deadline: true, correction: true }, SETTINGS_KEY);

    const userId = get_user_id();

	const refresh = async () => {
		if (!userId) {
			setItems([]);
			setError("로그인이 필요합니다.");
			return;
		}

		setLoading(true);
		setError(null);

		try {
			// 1) Wishlist & Alarms
			const wishlist = await fetchWishlist(userId);
			const bid_ids = new Set(wishlist.map((w) => Number(w.bidId)).filter((n) => Number.isFinite(n)));
			const alarms = await fetchAlarms(userId);

            // [NEW] Keyword Alarms (unrestricted)
            const keywordAlarms = alarms.filter(a => a.alarmType === "KEYWORD");
            
            // [OLD] Wishlist Alarms (restricted)
			const cart_scoped = alarms.filter((a) => bid_ids.has(Number(a.bidId)) && a.alarmType !== "KEYWORD");

			// Merge
            const read_map = load_read_map();
            const serverItems = to_notification_items([...keywordAlarms, ...cart_scoped], read_map);
            const localDeadlineItems = build_deadline_notifications_from_wishlist(wishlist as any[], read_map);

            const merged = [...localDeadlineItems, ...serverItems].sort((a, b) => {
                // Urgent first
                if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
                // Unread first
                if (a.read !== b.read) return a.read ? 1 : -1;
                // Latest first (approx by ID if time parsing fails, but relative time logic is fine for display)
                return b.id - a.id;
            });

            setItems(merged);

            // Load Keywords
            const ks = await getUserKeywords(userId);
            setKeywords(ks);

        } catch (e) {
			const msg = e instanceof Error ? e.message : "알림을 불러오지 못했습니다.";
			setError(msg);
			setItems([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		refresh();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

    // [NEW] Filter items based on settings
    const visibleItems = useMemo(() => {
        return items.filter(item => {
            if (item.type === "deadline" && !settings.deadline) return false;
            if ((item.type === "correction" || item.type === "reannouncement") && !settings.correction) return false;
            return true;
        });
    }, [items, settings]);

	const unreadCount = useMemo(() => visibleItems.filter((n) => !n.read).length, [visibleItems]);

	const getIcon = (type: string) => {
		switch (type) {
			case "deadline":
				return <AlertCircle className="h-5 w-5 text-orange-600" />;
			case "correction":
				return <FileText className="h-5 w-5 text-blue-600" />;
			case "reannouncement":
				return <RefreshCw className="h-5 w-5 text-purple-600" />;
			case "result":
				return <XCircle className="h-5 w-5 text-red-600" />;
            case "KEYWORD":
                return <Search className="h-5 w-5 text-blue-600" />;
			default:
				return <Bell className="h-5 w-5 text-green-600" />;
		}
	};


	const markRead = (id: number) => {
		setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
		const map = load_read_map();
		map[String(id)] = true;
		save_read_map(map);
	};

	const markAllRead = () => {

        const visibleIds = new Set(visibleItems.map(n => n.id));
		setItems((prev) => prev.map((n) => visibleIds.has(n.id) ? { ...n, read: true } : n));
		const map = load_read_map();
		visibleItems.forEach((n) => {
			map[String(n.id)] = true;
		});
		save_read_map(map);
	};


    const removeOne = async (alarmId: number) => {
		try {
			await deleteAlarm(alarmId);
			setItems((prev) => prev.filter((n) => n.id !== alarmId));
			const map = load_read_map();
			delete map[String(alarmId)];
			save_read_map(map);
            toast.success("알림이 삭제되었습니다.");
		} catch (e) {
			const msg = e instanceof Error ? e.message : "알림 삭제에 실패했습니다.";
			setError(msg);
		}
	};

    const handleAddKeyword = async () => {
        if (!userId) { toast.error("로그인이 필요합니다."); return; }
        if (!newKeyword.trim()) { toast.error("키워드를 입력해주세요."); return; }
        try {
            await addUserKeyword({
                userId,
                keyword: newKeyword.trim(),
                minPrice: minPrice ? Number(minPrice) : null,
                maxPrice: maxPrice ? Number(maxPrice) : null,
            });
            toast.success("키워드가 추가되었습니다.");
            setNewKeyword(""); setMinPrice(""); setMaxPrice("");
            getUserKeywords(userId).then(setKeywords);
        } catch(e) { toast.error("키워드 추가 실패"); }
    };

    const handleDeleteKeyword = async (id: number) => {
        if(!confirm("삭제하시겠습니까?")) return;
        try {
            await deleteUserKeyword(id);
            if(userId) getUserKeywords(userId).then(setKeywords);
            toast.success("삭제되었습니다.");
        } catch(e) { toast.error("삭제 실패"); }
    };

    const formatPrice = (p: number | null) => p ? new Intl.NumberFormat("ko-KR").format(p) : "제한없음";

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader className="flex flex-row items-start justify-between gap-4">
					<div>
						<CardTitle className="flex items-center gap-2">
							<Bell className="h-5 w-5" />
							알림 센터
							{unreadCount > 0 && <Badge variant="secondary">{unreadCount}</Badge>}
						</CardTitle>
						<CardDescription>
							관심 공고(장바구니) 및 키워드 알림을 모아볼 수 있습니다.
						</CardDescription>
					</div>

					<div className="flex items-center gap-2">
						<Button variant="outline" onClick={refresh} disabled={loading}>
							<RefreshCw className={["h-4 w-4", loading ? "animate-spin" : ""].join(" ")} />
							새로고침
						</Button>
						<Button variant="outline" onClick={markAllRead} disabled={visibleItems.length === 0}>
							<CheckCheck className="h-4 w-4" />
							모두 읽음
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{error && (
						<div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
							{error}
						</div>
					)}

					<Tabs defaultValue="all">
						<TabsList>
							<TabsTrigger value="all">전체</TabsTrigger>
							<TabsTrigger value="urgent">긴급</TabsTrigger>
                            <TabsTrigger value="keyword">키워드</TabsTrigger>
							<TabsTrigger value="settings">설정</TabsTrigger>
						</TabsList>

						<TabsContent value="all" className="mt-4 space-y-3">
							{loading && <div className="text-sm text-gray-500">로딩 중...</div>}
							{!loading && visibleItems.length === 0 && (
								<div className="text-sm text-gray-500">표시할 알림이 없습니다.</div>
							)}
							{visibleItems.map((n) => (
								<NotificationCard key={n.id} item={n} onMarkRead={markRead} onDelete={removeOne} getIcon={getIcon} />
							))}
						</TabsContent>

						<TabsContent value="urgent" className="mt-4 space-y-3">
							{visibleItems.filter((n) => n.urgent).map((n) => (
                                <NotificationCard key={n.id} item={n} onMarkRead={markRead} onDelete={removeOne} getIcon={getIcon} />
							))}
							{!loading && visibleItems.filter((n) => n.urgent).length === 0 && (
								<div className="text-sm text-gray-500">긴급 알림이 없습니다.</div>
							)}
						</TabsContent>

                        <TabsContent value="keyword" className="mt-4 space-y-3">
                            {visibleItems.filter((n) => n.type === "KEYWORD").map((n) => (
                                <NotificationCard key={n.id} item={n} onMarkRead={markRead} onDelete={removeOne} getIcon={getIcon} />
                            ))}
                            {!loading && visibleItems.filter((n) => n.type === "KEYWORD").length === 0 && (
                                <div className="text-sm text-gray-500">키워드 알림이 없습니다.</div>
                            )}
                        </TabsContent>

						<TabsContent value="settings" className="mt-4 space-y-6">
                            {/* [Keyword Settings] */}
                            <div className="rounded-xl border bg-white p-4 space-y-4">
                                <Label className="text-base font-semibold">관심 키워드 등록</Label>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                                    <div className="md:col-span-2 space-y-1">
                                        <Label className="text-xs text-gray-500">키워드</Label>
                                        <Input value={newKeyword} onChange={e=>setNewKeyword(e.target.value)} placeholder="예: 서버, AI" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-gray-500">최소 가격</Label>
                                        <Input type="number" value={minPrice} onChange={e=>setMinPrice(e.target.value)} placeholder="0" />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="space-y-1 flex-1">
                                            <Label className="text-xs text-gray-500">최대 가격</Label>
                                            <Input type="number" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} placeholder="제한없음" />
                                        </div>
                                        <Button onClick={handleAddKeyword} size="icon" className="shrink-0 mb-[2px]">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                                    {keywords.map(k => (
                                        <div key={k.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border text-sm">
                                            <div>
                                                <div className="font-medium">{k.keyword}</div>
                                                <div className="text-xs text-gray-500">{formatPrice(k.minPrice)} ~ {formatPrice(k.maxPrice)}</div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-red-500" onClick={()=>handleDeleteKeyword(k.id)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                    {keywords.length === 0 && <div className="text-xs text-gray-400 p-2">등록된 키워드가 없습니다.</div>}
                                </div>
                            </div>

                            {/* [Legacy Settings: Wishlist/Correction] */}
							<div className="rounded-xl border bg-white p-4 space-y-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Settings className="h-4 w-4 text-gray-600" />
										<Label>마감 임박 알림 / 마감 알림</Label>
									</div>
									<Switch 
                                        checked={settings.deadline} 
                                        onCheckedChange={(c) => setSettings({...settings, deadline: c})} 
                                    />
								</div>
                                <div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Settings className="h-4 w-4 text-gray-600" />
										<Label>정정 / 재공고 알림</Label>
									</div>
									<Switch 
                                        checked={settings.correction} 
                                        onCheckedChange={(c) => setSettings({...settings, correction: c})} 
                                    />
								</div>
                                <div className="text-xs text-gray-400">
                                    * 위 설정은 브라우저에 저장되어 재방문 시에도 유지됩니다.
                                </div>
							</div>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	);
}

function NotificationCard({ item, onMarkRead, onDelete, getIcon }: { item: NotificationItem, onMarkRead: (id:number)=>void, onDelete: (id:number)=>void, getIcon: (t:string)=>any }) {
    return (
        <div
            className={[
                "w-full rounded-xl border bg-white p-4 transition",
                item.read ? "opacity-80" : "border-blue-200",
            ].join(" ")}
        >
            <div className="flex items-start justify-between gap-4">
                <button
                    onClick={() => onMarkRead(item.id)}
                    className="flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-lg"
                    type="button"
                >
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getIcon(item.type)}</div>
                        <div>
                            <div className="flex items-center gap-2">
                                <div className="font-semibold">{item.title}</div>
                                {item.urgent && <Badge>긴급</Badge>}
                                {!item.read && <Badge variant="secondary">NEW</Badge>}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">{item.message}</div>
                        </div>
                    </div>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                    <div className="text-xs text-gray-500 whitespace-nowrap">{item.time}</div>
                    <Button
                        size="icon"
                        variant="ghost"
                        aria-label="알림 삭제"
                        onClick={() => onDelete(item.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
