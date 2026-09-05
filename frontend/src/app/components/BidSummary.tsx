import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../api/client";
import { logBidView, deleteBid } from "../api/bids";
import { getUserProfile } from "../api/users";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import {
    Building,
    MapPin,
    Calendar,
    DollarSign,
    FileText,
    AlertTriangle,
    CheckCircle2,
    Clock,
    TrendingUp,
    ArrowLeft,
    Sparkles,
} from "lucide-react";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import { fetchWishlist, toggleWishlist } from "../api/wishlist";

type Bid = {
    id: number;
    title: string;
    agency: string;
    region: string;
    budget: string;
    deadline: string;
    announcementDate: string;
    type: string;
    status: string;
    description: string;

    bidCreated?: string | null;

    bidUrl?: string;
    documentUrl?: string;
    documentFileName?: string;

    attachments?: Array<{
        id: number;
        fileName: string;
        url: string;
    }>;

    requirements: {
        license: string[];
        location: string;
        experience: string;
        technicalStaff: string;
    };
    risks: { level: "high" | "medium" | "low"; text: string }[];
    checklist: { item: string; checked: boolean }[];
    priceGuidance: {
        recommended: string;
        historical: string;
        competitors: string;
    };
};

type PriceBand = {
    bandRangeText: string;
    adjRateText: string;
    probabilityText: string;
};

type AnalysisStructured = {
    summary: {
        title?: string;
        noticeNo?: string;
        agency?: string;
        region?: string;
        baseAmount?: number;
        estimatedPrice?: number;
        priceRangePercent?: number; // 예가범위
        lowerBoundRate?: number; // 낙찰하한율
    };
    requirements: {
        eligibility?: string[]; // 참가자격
        regionReq?: string[]; // 지역요건
        performance?: string[]; // 실적요건
        documents?: string[]; // 제출서류
        missing?: string[]; // "추가 수집 필요" 같은 표시
    };
    pricePrediction: {
        min?: number;
        max?: number;
        point?: number;
        confidence?: "low" | "medium" | "high";
        basis?: string;
        risks?: string[];

        topBands?: PriceBand[];
    };
    actions72h: string[];
};

type AnalysisDto = {
    analysisContent?: string | null;
    pdfUrl?: string | null;
    predictedPrice?: number | null;
    analysisDate?: string | null;

    structured?: AnalysisStructured | null;
};

function safeFileName(name: string) {
    return name.replace(/[\\/:*?"<>|]/g, "_");
}

function downloadText(content: string, fileName: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
}

function openDownload(url: string) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function buildTextNotice(bid: Bid) {
    const lines: string[] = [];

    lines.push("입찰 공고문(텍스트 버전)");
    lines.push("=".repeat(60));
    lines.push("");
    lines.push(`공고 ID: ${bid.id}`);
    lines.push(`공고명: ${bid.title}`);
    lines.push(`발주기관: ${bid.agency}`);
    lines.push(`지역: ${bid.region}`);
    lines.push(`예산: ${bid.budget}`);
    lines.push(`공고일: ${bid.announcementDate}`);
    lines.push(`마감일: ${bid.deadline}`);
    lines.push(`유형/상태: ${bid.type} / ${bid.status}`);
    lines.push("");
    lines.push("설명");
    lines.push("-".repeat(60));
    lines.push(bid.description || "");
    lines.push("");
    lines.push("자격 요건");
    lines.push("-".repeat(60));
    bid.requirements.license.forEach((x, i) => lines.push(`${i + 1}. ${x}`));
    lines.push("");
    lines.push(`지역 요건: ${bid.requirements.location}`);
    lines.push(`실적 요건: ${bid.requirements.experience}`);
    lines.push(`기술인력 요건: ${bid.requirements.technicalStaff}`);
    lines.push("");
    lines.push("제출 서류 체크리스트");
    lines.push("-".repeat(60));
    bid.checklist.forEach((x) => lines.push(`- [${x.checked ? "x" : " "}] ${x.item}`));
    lines.push("");
    lines.push("리스크");
    lines.push("-".repeat(60));
    bid.risks.forEach((x) => lines.push(`- (${x.level}) ${x.text}`));
    lines.push("");
    lines.push("투찰 가이드");
    lines.push("-".repeat(60));
    lines.push(`추천 투찰 범위: ${bid.priceGuidance.recommended}`);
    lines.push(`과거 데이터: ${bid.priceGuidance.historical}`);
    lines.push(`예상 경쟁: ${bid.priceGuidance.competitors}`);
    lines.push("");

    return lines.join("\n");
}

function levelToKor(level: "high" | "medium" | "low") {
    if (level === "high") return "높음";
    if (level === "medium") return "보통";
    return "낮음";
}

function isLikelyNoticeFile(fileName: string) {
    const n = (fileName || "").toLowerCase();

    const ext = (n.split(".").pop() || "").toLowerCase();
    const goodExt = ["pdf", "hwp", "hwpx", "doc", "docx"].includes(ext);
    const badExt = ["xlsx", "xls", "jpg", "jpeg", "png", "zip"].includes(ext);

    if (badExt) return false;
    if (!goodExt) return false;

    const keywordHit = n.includes("공고");
    return keywordHit;
}

/**
 * 백엔드 변경 없이, 리포트 텍스트를 구조화 데이터로 파싱.
 * - 신규 보고서 포맷(#2 체크박스 / #3 1순위~3순위 구간+확률)에 맞춤
 */
function parseKoreanMarkdownReport(text: string): AnalysisStructured {
    const raw = String(text || "");

    const lines = raw
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

    const result: AnalysisStructured = {
        summary: {},
        requirements: {},
        pricePrediction: {},
        actions72h: [],
    };

    const getNum = (s: string) => Number(String(s).replace(/[^\d]/g, ""));
    const getFloat = (s: string) => Number(String(s).replace(/[^\d.]/g, ""));

    //  섹션 추출 유틸 (2/3/4 섹션 파싱용)
    function extractSectionLines(all: string[], headerPrefix: string) {
        const start = all.findIndex((x) => x.startsWith(headerPrefix));
        if (start < 0) return [];
        const out: string[] = [];
        for (let i = start + 1; i < all.length; i++) {
            const l = all[i];
            if (l.startsWith("# ")) break;
            out.push(l);
        }
        return out;
    }
    function extractSubSection(
        lines: string[],
        header: string,
    ) {
        const start = lines.findIndex((l) => l.startsWith(header));
        if (start < 0) return [];

        const out: string[] = [];
        for (let i = start + 1; i < lines.length; i++) {
            const l = lines[i];
            if (l.startsWith("## ")) break;
            if (l.startsWith("# ")) break;
            out.push(l);
        }

        return out
            .map((l) => l.replace(/^•\s*/, "").trim())
            .filter(Boolean);
    }

    // 체크박스 항목 추출
    function parseCheckboxItems(sectionLines: string[]) {
        return sectionLines
            .map((l) => {
                const m = l.match(/^\-\s*\[\s*[xX ]\s*\]\s*(.+)$/);
                return m ? m[1].trim() : null;
            })
            .filter((v): v is string => !!v);
    }

    // 체크박스 항목을 (참가자격 1개 / 실적 1개 / 나머지 제출서류)로 분리
    function splitReqItems(items: string[]) {
        const eligibility = items[0] ? [items[0]] : [];
        const performance = items[1] ? [items[1]] : [];
        const documents = items.slice(2);
        return { eligibility, performance, documents };
    }

    //"- **키**: 값" 패턴 파싱 (주로 #1 공고 요약)
    const kv = new Map<string, string>();
    for (const l of lines) {
        const m = l.match(/^-?\s*\*\*(.+?)\*\*:\s*(.+)$/);
        if (m) {
            const key = m[1].trim();
            const val = m[2].trim();
            kv.set(key, val);
        }
    }

    //summary 채우기
    const title = kv.get("공고명");
    if (title) result.summary.title = title;

    const noticeNo = kv.get("공고번호");
    if (noticeNo) result.summary.noticeNo = noticeNo;

    const agency = kv.get("수요기관");
    if (agency) result.summary.agency = agency;

    const region = kv.get("지역");
    if (region) result.summary.region = region;

    const baseAmount = kv.get("기초금액");
    if (baseAmount) result.summary.baseAmount = getNum(baseAmount);

    const estimated = kv.get("추정가격");
    if (estimated) result.summary.estimatedPrice = getNum(estimated);

    const pr = kv.get("예가범위");
    if (pr) result.summary.priceRangePercent = getFloat(pr);

    const lb = kv.get("낙찰하한율");
    if (lb) result.summary.lowerBoundRate = getFloat(lb);

    //"지역 요건"은 공고 요약의 지역을 그대로 regionReq에 넣기
    if (result.summary.region) {
        result.requirements.regionReq = [result.summary.region];
    }
    // 참가자격 / 실적 / 제출서류 (신규 포맷)
    const eligibility = extractSubSection(lines, "## 가. 참가자격");
    const performance = extractSubSection(lines, "## 나. 실적");
    const documents = extractSubSection(lines, "## 다. 제출서류");

    if (eligibility.length) result.requirements.eligibility = eligibility;
    if (performance.length) result.requirements.performance = performance;
    if (documents.length) result.requirements.documents = documents;


    // 사정율 구간 TOP 3 파싱 (안정화 버전)
    const topBands: PriceBand[] = [];

    const section3Start = lines.findIndex((l) => l.startsWith("# 3."));

    if (section3Start >= 0) {
        for (let i = section3Start + 1; i < lines.length; i++) {
            const line = lines[i];

            // 다음 섹션 시작 시 종료
            if (line.startsWith("# 4.")) break;

            // 소제목(### ...)은 건너뜀
            if (line.startsWith("##")) continue;


            const m = line.match(
                /(?:•|\-|\d+\.)?\s*.*?구간\s*([\d.]+%\s*~\s*[\d.]+%)\s*,\s*사정율\s*([\d.]+%)\s*,\s*확률\s*([\d.]+%)/
            );

            if (!m) continue;

            topBands.push({
                bandRangeText: m[1],
                adjRateText: m[2],
                probabilityText: m[3],
            });

            // TOP 3까지만
            if (topBands.length >= 3) break;
        }
    }

    if (topBands.length > 0) {
        result.pricePrediction.topBands = topBands;
    }

    // 리스크(기존 포맷 유지)
    const riskLines: string[] = [];
    for (const l of lines) {
        const m = l.match(/^>\s*\*\*리스크\*\*:\s*(.+)$/);
        if (m) riskLines.push(m[1].trim());
    }
    if (riskLines.length) result.pricePrediction.risks = riskLines;
    // 권고 액션(#4)
    const actionStart = lines.findIndex((x) => x.startsWith("# 4."));
    if (actionStart >= 0) {
        for (let i = actionStart + 1; i < lines.length; i++) {
            const l = lines[i];
            if (l.startsWith("# ")) break;

            const m = l.match(/^(?:\-|•|\d+\.)\s*(.+)$/);
            if (!m) continue;

            const text = m[1].trim();
            if (!result.actions72h.includes(text)) {
                result.actions72h.push(text);
            }
        }
    }


    return result;
}

function buildAiAnalysisReport(bid: Bid, completionRate: number) {
    const lines: string[] = [];

    lines.push("AI 분석 리포트");
    lines.push("=".repeat(70));
    lines.push("");
    lines.push(`[기본 정보]`);
    lines.push(`- 공고 ID: ${bid.id}`);
    lines.push(`- 공고명: ${bid.title}`);
    lines.push(`- 발주기관: ${bid.agency}`);
    lines.push(`- 지역: ${bid.region}`);
    lines.push(`- 예산: ${bid.budget}`);
    lines.push(`- 공고일: ${bid.announcementDate}`);
    lines.push(`- 마감일: ${bid.deadline}`);
    lines.push(`- 유형/상태: ${bid.type} / ${bid.status}`);
    lines.push("");

    lines.push(`[핵심 요약]`);
    lines.push(`- 사업 개요: ${bid.description || ""}`);
    lines.push("");

    lines.push(`[입찰 요건 분석]`);
    lines.push(`1) 자격 요건`);
    bid.requirements.license.forEach((x, i) => lines.push(`   ${i + 1}. ${x}`));
    lines.push("");
    lines.push(`2) 지역 요건`);
    lines.push(`- ${bid.requirements.location}`);
    lines.push("");
    lines.push(`3) 실적 요건`);
    lines.push(`- ${bid.requirements.experience}`);
    lines.push("");
    lines.push(`4) 기술인력 요건`);
    lines.push(`- ${bid.requirements.technicalStaff}`);
    lines.push("");

    lines.push(`[제출서류 준비도(체크리스트 기반)]`);
    lines.push(`- 진행률: ${completionRate.toFixed(0)}%`);
    lines.push(`- 완료 항목`);
    bid.checklist.filter((x) => x.checked).forEach((x) => lines.push(`  - ${x.item}`));
    lines.push(`- 미완료 항목`);
    bid.checklist.filter((x) => !x.checked).forEach((x) => lines.push(`  - ${x.item}`));
    lines.push("");

    lines.push(`[리스크/주의사항]`);
    bid.risks.forEach((r, i) => {
        lines.push(`${i + 1}. 중요도(${levelToKor(r.level)}): ${r.text}`);
    });
    lines.push("");

    lines.push(`[투찰 전략 가이드]`);
    lines.push(`- 추천 투찰 범위: ${bid.priceGuidance.recommended}`);
    lines.push(`- 과거 데이터: ${bid.priceGuidance.historical}`);
    lines.push(`- 예상 경쟁: ${bid.priceGuidance.competitors}`);
    lines.push("");

    lines.push(`[권고 액션]`);
    lines.push(`1) 미완료 서류를 우선 확보(특히 실적/재무/인증 관련).`);
    lines.push(`2) 지역/면허/기술인력 요건이 내부 보유 현황과 일치하는지 재검증.`);
    lines.push(`3) 마감 일정 역산하여 결재/제출 프로세스 사전 확정.`);
    lines.push("");

    lines.push("※ 본 리포트는 데모 데이터 기반 생성본이며, 실제 공고문 원문 기준으로 검증이 필요합니다.");
    lines.push("");

    return lines.join("\n");
}

function formatDateTime(dt?: string | null) {
    if (!dt) return "데이터 준비 중";
    const d = new Date(dt);
    if (!Number.isFinite(d.getTime())) return dt;

    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
    ).padStart(2, "0")}`;

    const time = d.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });

    return `${date} ${time}`;
}


function mergeStructured(
    base: AnalysisStructured | null | undefined,
    fill: AnalysisStructured | null | undefined,
): AnalysisStructured | null {
    if (!base && !fill) return null;

    const b = base ?? { summary: {}, requirements: {}, pricePrediction: {}, actions72h: [] };
    const f = fill ?? { summary: {}, requirements: {}, pricePrediction: {}, actions72h: [] };

    return {
        summary: { ...f.summary, ...b.summary },
        requirements: { ...f.requirements, ...b.requirements },
        pricePrediction: { ...f.pricePrediction, ...b.pricePrediction },
        actions72h: (b.actions72h && b.actions72h.length ? b.actions72h : f.actions72h) ?? [],
    };
}

const DEFAULT_CHECKLIST: Array<{ item: string; checked: boolean }> = [
    { item: "사업자등록증", checked: false },
    { item: "법인등기부등본", checked: false },
    { item: "인감증명서/사용인감계", checked: false },
    { item: "실적증명서", checked: false },
];

function getDDayNumber(deadline: string) {
    const end = new Date(deadline);
    if (!Number.isFinite(end.getTime())) return null;

    const now = new Date();

    // 마감 여부는 시간 기준
    const isEnded = end.getTime() <= now.getTime();

    // D-day 숫자는 "날짜" 기준(라벨용)
    const today0 = new Date(now);
    today0.setHours(0, 0, 0, 0);

    const end0 = new Date(end);
    end0.setHours(0, 0, 0, 0);

    const days = Math.round((end0.getTime() - today0.getTime()) / 86400000);

    return { days, isEnded };
}

function checklistStorageKey(bidId: number) {
    return `bid-checklist-${bidId}`;
}

export function BidSummary() {
    const navigate = useNavigate();
    const { bidId } = useParams();
    const numericBidId = Number(bidId);

    const [bid, setBid] = useState<Bid | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);

    const [analysis, setAnalysis] = useState<AnalysisDto | null>(null);
    const [analyzing, setAnalyzing] = useState(false);

    const [wishlistSynced, setWishlistSynced] = useState(false);
    const [adding, setAdding] = useState(false);
    const [alreadyAdded, setAlreadyAdded] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const autoAnalyzeOnceRef = useRef(false);

    useEffect(() => {
        const userIdStr = localStorage.getItem("userId");
        // console.log("[BidSummary] userId from localStorage:", userIdStr);
        if (userIdStr) {
            getUserProfile(userIdStr)
                .then((res) => {
                    // console.log("[BidSummary] User role fetched:", res.data.role);
                    if (res.data.role === 2) setIsAdmin(true);
                })
                .catch((err) => {
                    console.error("[BidSummary] Failed to fetch user profile:", err);
                });
        }
    }, []);

    const handleDelete = async () => {
        if (!bid) return;
        if (!window.confirm("정말로 이 공고를 삭제하시겠습니까? Delete?")) return;
        try {
            await deleteBid(bid.id);
            toast.success("공고가 삭제되었습니다.");
            navigate("/bids");
        } catch (e: any) {
            toast.error(e?.message || "삭제 실패");
        }
    };

    const structured = analysis?.structured ?? null;
    const req = structured?.requirements ?? null;

    const renderListOrEmpty = (title: string, arr?: string[]) => {
        return (
            <div>
                <h4 className="font-semibold mb-3">{title}</h4>
                {!arr || arr.length === 0 ? (
                    <div className="text-sm text-muted-foreground">정보 없음 (추가 수집 필요)</div>
                ) : (
                    <ul className="space-y-2">
                        {arr.map((x, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                                <span className="text-sm">{x}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        );
    };

    const loggedBidIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (!Number.isFinite(numericBidId) || loggedBidIdRef.current === numericBidId) return;

        // 1) localStorage 우선 (로그인 시 auth.ts가 저장)
        const localId = Number(localStorage.getItem("userId"));
        if (Number.isFinite(localId) && localId > 0) {
            logBidView(numericBidId, localId).catch(console.error);
            loggedBidIdRef.current = numericBidId;
            return;
        }

        // 2) localStorage에 없으면 checkLogin으로 시도 (쿠키 기반 인증)
        import("../api/users").then(({ checkLogin }) => {
            checkLogin()
                .then((res) => {
                    const profile = res.data;
                    const userId = Number(profile.userId ?? profile.id);

                    if (Number.isFinite(userId) && userId > 0 && loggedBidIdRef.current !== numericBidId) {
                        logBidView(numericBidId, userId).catch(console.error);
                        loggedBidIdRef.current = numericBidId;
                    }
                })
                .catch(() => {
                    // 비로그인 상태: 로그 남기지 않음
                });
        });
    }, [numericBidId]);

    useEffect(() => {
        if (!Number.isFinite(numericBidId)) {
            setError("잘못된 공고 ID 입니다.");
            setBid(null);
            return;
        }

        const run = async () => {
            try {
                setLoading(true);
                setError(null);

                const res = await api(`/bids/${numericBidId}`, { method: "GET" });

                const data = (res as any)?.data;
                const item =
                    data && typeof data === "object" && !Array.isArray(data)
                        ? data
                        : (data?.items?.[0] ?? null) || (Array.isArray(data) ? data[0] : null);

                if (!item) {
                    setError("상세 정보를 찾을 수 없습니다.");
                    setBid(null);
                    return;
                }

                const reportUrl = item.bidReportURL ? String(item.bidReportURL) : "";
                const bidUrl = item.bidURL ? String(item.bidURL) : "";

                const attachmentsRaw = Array.isArray(item.attachments) ? item.attachments : [];
                const attachments = attachmentsRaw
                    .map((a: any) => ({
                        id: Number(a.id),
                        fileName: String(a.fileName ?? a.filename ?? a.name ?? "첨부파일"),
                        url: String(a.url ?? a.downloadUrl ?? ""),
                    }))
                    .filter((a: any) => Number.isFinite(a.id) && a.id > 0 && !!a.url);

                const noticeAttachment = attachments.find((a: any) => isLikelyNoticeFile(a.fileName));
                const fallbackAttachment = attachments[0];

                const analysisContentFromBid = item.analysisResult?.analysisContent ?? item.analysisResult?.content ?? "";

                const mapped: Bid = {
                    id: Number(item.id ?? item.bid_id ?? item.bidId ?? numericBidId),
                    title: String(item.name ?? item.title ?? ""),
                    agency: String(item.organization ?? item.agency ?? ""),
                    region: String(item.region ?? ""),
                    budget: String(item.estimatePrice ?? item.estimate_Price ?? item.baseAmount ?? ""),
                    deadline: String(item.endDate ?? item.bidEnd ?? ""),
                    announcementDate: String(item.startDate ?? ""),
                    type: "공사",
                    status: "진행중",
                    description: String(analysisContentFromBid ?? ""),
                    bidCreated: item.bidCreated ? String(item.bidCreated) : null,

                    attachments,

                    bidUrl: bidUrl || undefined,
                    documentUrl: noticeAttachment?.url || fallbackAttachment?.url || reportUrl || bidUrl || undefined,
                    documentFileName: noticeAttachment?.fileName
                        ? noticeAttachment.fileName
                        : fallbackAttachment?.fileName
                            ? fallbackAttachment.fileName
                            : reportUrl
                                ? "첨부파일"
                                : bidUrl
                                    ? "공고 링크"
                                    : undefined,

                    requirements: { license: [], location: "", experience: "", technicalStaff: "" },
                    risks: [],
                    checklist: [],
                    priceGuidance: { recommended: "", historical: "", competitors: "" },
                };

                setBid(mapped);
            } catch (e: any) {
                setError(e?.message || "상세 조회 실패");
                setBid(null);
            } finally {
                setLoading(false);
            }
        };

        void run();
    }, [numericBidId]);

    useEffect(() => {
        if (!bid) return;

        const key = checklistStorageKey(bid.id);
        const saved = localStorage.getItem(key);

        if (saved) {
            try {
                setChecklist(JSON.parse(saved));
                return;
            } catch {
                // 파싱 실패 시 초기값
            }
        }

        setChecklist(DEFAULT_CHECKLIST);
    }, [bid?.id]);


    useEffect(() => {
        const sync = async () => {
            setWishlistSynced(false);

            const userIdStr = localStorage.getItem("userId");
            const userId = Number(userIdStr);

            if (!userIdStr || !Number.isFinite(userId) || !bid) {
                setAlreadyAdded(false);
                setWishlistSynced(true);
                return;
            }

            try {
                const items = await fetchWishlist(userId);
                setAlreadyAdded(items.some((it) => it.bidId === bid.id));
            } catch {
                setAlreadyAdded(false);
            } finally {
                setWishlistSynced(true);
            }
        };

        void sync();
    }, [bid?.id]);

    const handleAnalyze = useCallback(async () => {
        if (!bid) return;

        try {
            setAnalyzing(true);

            const res = await api(`/analysis/predict/${bid.id}`, { method: "POST" });


            const dto = (res as any)?.data?.data ?? (res as any)?.data ?? (res as any);


            const rawText = String(dto?.analysisContent ?? "");
            const parsed = rawText ? parseKoreanMarkdownReport(rawText) : null;
            const merged = mergeStructured(dto?.structured, parsed);

            setAnalysis({ ...(dto as AnalysisDto), structured: merged });
            toast.success("AI 분석이 완료되었습니다.");
        } catch (e: any) {
            toast.error(e?.message || "AI 분석 요청에 실패했습니다.");
        } finally {
            setAnalyzing(false);
        }
    }, [bid?.id]);

    useEffect(() => {
        if (!bid) return;
        if (autoAnalyzeOnceRef.current) return;

        if (analysis?.structured || analysis?.analysisContent || analysis?.predictedPrice) {
            autoAnalyzeOnceRef.current = true;

            return;
        }

        autoAnalyzeOnceRef.current = true;
        void handleAnalyze();
    }, [bid?.id, handleAnalyze, analysis?.structured, analysis?.analysisContent, analysis?.predictedPrice]);

    // "제출서류"만 체크리스트에 자동 추가 (자격/실적은 체크리스트에 넣지 않음)
    useEffect(() => {
        const docs = structured?.requirements?.documents ?? [];
        if (!docs.length) return;

        setChecklist((prev) => {
            const seen = new Set(prev.map((x) => x.item));
            const merged = [...prev];

            for (const d of docs) {
                const item = d.trim();
                if (!item) continue;
                if (seen.has(item)) continue;
                seen.add(item);
                merged.push({ item, checked: false });
            }

            if (bid) {
                localStorage.setItem(
                    checklistStorageKey(bid.id),
                    JSON.stringify(merged),
                );
            }

            return merged;

        });
    }, [structured?.requirements?.documents]);

    const completedItems = checklist.filter((item) => item.checked).length;
    const completionRate = checklist.length ? (completedItems / checklist.length) * 100 : 0;

    const handleAddToCart = async () => {
        if (!bid) return;

        const userIdStr = localStorage.getItem("userId");
        const userId = Number(userIdStr);

        if (!userIdStr || !Number.isFinite(userId)) {
            toast.error("로그인이 필요합니다. 다시 로그인 해주세요.");
            return;
        }

        if (alreadyAdded) {
            toast.success("이미 장바구니에 담긴 공고입니다.");
            return;
        }

        try {
            setAdding(true);

            const res = await toggleWishlist(userId, bid.id);

            if ((res as any)?.status !== "success") {
                toast.error((res as any)?.message || "장바구니 담기에 실패했습니다.");
                return;
            }

            const items = await fetchWishlist(userId);
            setAlreadyAdded(items.some((it) => it.bidId === bid.id));

            toast.success("장바구니에 추가됨");
        } catch (e: any) {
            toast.error(e?.message || "장바구니 담기에 실패했습니다.");
        } finally {
            setAdding(false);
        }
    };

    const handleDownloadNotice = async () => {
        if (!bid) return;

        const hasAttachments = (bid.attachments?.length ?? 0) > 0;
        if (hasAttachments) {
            const notice = (bid.attachments ?? []).find((a) => isLikelyNoticeFile(a.fileName));
            openDownload((notice ?? bid.attachments![0]).url);
            toast.success("첨부파일을 열었습니다.");
            return;
        }

        if (bid.bidUrl) {
            openDownload(bid.bidUrl);
            toast.info("공고 링크로 이동합니다.");
            return;
        }

        const baseName = safeFileName(`공고문_${bid.id}_${bid.title}`);
        const txt = buildTextNotice({ ...bid, checklist });
        downloadText(txt, `${baseName}.txt`);
        toast.info("첨부파일이 없어 텍스트 공고문으로 다운로드했습니다.");
    };

    const handleDownloadAiReport = () => {
        const pdfUrl = analysis?.pdfUrl ?? null;
        if (!pdfUrl) {
            toast.error("PDF 리포트가 아직 생성되지 않았습니다. AI 분석을 먼저 실행해 주세요.");
            return;
        }
        openDownload(pdfUrl);
    };

    if (loading) return <div className="p-6">불러오는 중...</div>;
    if (error) return <div className="p-6 text-red-600">{error}</div>;
    if (!bid) return null;

    const hasAttachments = (bid.attachments?.length ?? 0) > 0;
    const first = bid.attachments?.[0];
    const firstLooksNotice = first?.fileName ? isLikelyNoticeFile(first.fileName) : false;

    const showUploadGuide = hasAttachments && !firstLooksNotice;
    const showLinkGuide = !hasAttachments;

    const budgetNumber = Number(String(bid.budget ?? "").replace(/[^\d]/g, ""));
    const budgetLabel = Number.isFinite(budgetNumber) && budgetNumber > 0 ? budgetNumber.toLocaleString() : "데이터 준비 중";

    const predictedPoint = structured?.pricePrediction?.point ?? analysis?.predictedPrice ?? null;
    const predictedMin = structured?.pricePrediction?.min ?? null;
    const predictedMax = structured?.pricePrediction?.max ?? null;

    const risksParsed = structured?.pricePrediction?.risks ?? [];
    const actions72h = structured?.actions72h ?? [];
    const topBands = structured?.pricePrediction?.topBands ?? [];

    const dday = bid?.deadline ? getDDayNumber(bid.deadline) : null;

    const isEnded = !!dday?.isEnded;
    const isClosingSoon =
        !isEnded && typeof dday?.days === "number" && dday.days >= 0 && dday.days <= 3;


    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    뒤로가기
                </Button>

                <Button variant="ghost" size="sm" onClick={() => navigate("/bids")}>
                    목록으로
                </Button>

                <Button
                    size="sm"
                    className="gap-4 ml-auto"
                    onClick={handleAddToCart}
                    disabled={adding || !wishlistSynced || alreadyAdded}
                >
                    {alreadyAdded ? "장바구니 담김" : adding ? "담는 중..." : "장바구니 담기"}
                </Button>
            </div>

            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                                <Badge>{bid.type}</Badge>
                                {!isEnded && (
                                    <Badge variant="outline">{bid.status}</Badge>
                                )}
                                {isClosingSoon && (
                                    <Badge variant="destructive">마감임박</Badge>
                                )}

                                {isEnded && (
                                    <Badge variant="secondary">마감 종료</Badge>
                                )}
                            </div>

                            <CardTitle className="text-2xl mb-2">{bid.title}</CardTitle>

                            <CardDescription>
                                {structured?.summary?.noticeNo
                                    ? `공고번호: ${structured.summary.noticeNo}`
                                    : "AI 분석을 실행하면 공고 요약/요건/투찰가이드가 구조화되어 표시됩니다."}
                            </CardDescription>
                        </div>

                        <div className="shrink-0 flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={analyzing} className="gap-2">
                                <Sparkles className="h-4 w-4" />
                                {analyzing ? "분석 중..." : "AI 분석하기"}
                            </Button>

                            <Button variant="outline" size="sm" onClick={handleDownloadNotice} className="gap-2">
                                공고문 열기
                            </Button>

                            {bid.bidUrl && (
                                <Button variant="outline" size="sm" onClick={() => openDownload(bid.bidUrl!)} className="gap-2">
                                    공고 링크
                                </Button>
                            )}

                            {isAdmin && (
                                <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-2">
                                    삭제
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                        <div className="flex items-center gap-3 lg:col-span-2">
                            <Building className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">발주기관</p>
                                <p className="font-semibold">{bid.agency}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <MapPin className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">지역</p>
                                <p className="font-semibold">{bid.region}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <DollarSign className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">예산</p>
                                <p className="font-semibold whitespace-nowrap">{budgetLabel}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">{bid.bidCreated ? "공고게시일" : "입찰서 제출 시작일"}</p>

                                <p className="font-semibold whitespace-nowrap">{formatDateTime(bid.bidCreated ?? bid.announcementDate)}</p>

                                <p className="text-sm text-muted-foreground">마감일</p>
                                <p className="font-semibold text-red-600 whitespace-nowrap">{formatDateTime(bid.deadline)}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="min-w-0">
                                <p className="text-sm text-muted-foreground">첨부파일</p>

                                {hasAttachments ? (
                                    <div className="mt-1 space-y-1">
                                        {bid.attachments!.map((a) => (
                                            <button
                                                key={a.id}
                                                type="button"
                                                className="block text-left text-blue-600 hover:underline truncate"
                                                onClick={() => openDownload(a.url)}
                                                title={a.fileName}
                                            >
                                                {a.fileName}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-1 text-muted-foreground">없음</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {showUploadGuide && (
                        <div className="mt-4 w-full rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900 space-y-1">
                            <div className="font-semibold">⚠️ 공고문이 아닐 수 있습니다</div>
                            <div>현재 첨부파일은 내역서/도면일 가능성이 높아요.</div>
                            <div>공고문(PDF/HWP)을 챗봇에 업로드하면 AI 요약이 가능합니다.</div>
                            <div>👉 우측 하단 챗봇 버튼을 눌러 업로드해 주세요.</div>

                            {bid.bidUrl && (
                                <div className="pt-1">
                                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => openDownload(bid.bidUrl!)}>
                                        공고 링크에서 직접 확인
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {showLinkGuide && (
                        <div className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700 space-y-1">
                            <div className="font-semibold">📄 첨부파일이 제공되지 않았습니다</div>
                            <div>공고문은 공고 링크에서 직접 확인해 주세요.</div>

                            {bid.bidUrl && (
                                <div className="pt-1">
                                    <Button variant="outline" size="sm" className="h-8 px-3" onClick={() => openDownload(bid.bidUrl!)}>
                                        공고 링크 열기
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Main Content Tabs */}
            <Tabs defaultValue="summary" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="summary">AI 요약</TabsTrigger>
                    <TabsTrigger value="checklist">서류 체크리스트</TabsTrigger>
                    {/*<TabsTrigger value="risks">리스크 분석</TabsTrigger>*/}
                    <TabsTrigger value="price">투찰 가이드</TabsTrigger>
                </TabsList>

                {/* AI 요약 */}
                <TabsContent value="summary" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        공고 핵심 요약
                                    </CardTitle>
                                    <CardDescription>AI가 분석한 주요 입찰 요건</CardDescription>
                                </div>

                                <div className="shrink-0">
                                    <Button variant="outline" className="gap-2" onClick={handleDownloadAiReport}>
                                        <Sparkles className="h-4 w-4" />
                                        AI 분석 리포트 다운로드
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <div>
                                <h4 className="font-semibold mb-3">🧾 공고 요약</h4>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <div>공고명: {structured?.summary?.title ?? bid.title}</div>
                                    <div>공고번호: {structured?.summary?.noticeNo ?? "데이터 준비 중"}</div>
                                    <div>수요기관: {structured?.summary?.agency ?? bid.agency}</div>
                                    <div>지역: {structured?.summary?.region ?? bid.region}</div>
                                    <div>
                                        기초금액:{" "}
                                        {structured?.summary?.baseAmount ? structured.summary.baseAmount.toLocaleString() + " 원" : "데이터 준비 중"}
                                    </div>
                                    <div>
                                        추정가격:{" "}
                                        {structured?.summary?.estimatedPrice ? structured.summary.estimatedPrice.toLocaleString() + " 원" : "데이터 준비 중"}
                                    </div>
                                    <div>
                                        예가범위:{" "}
                                        {typeof structured?.summary?.priceRangePercent === "number"
                                            ? `${structured.summary.priceRangePercent}%`
                                            : "데이터 준비 중"}
                                    </div>
                                    <div>
                                        낙찰하한율:{" "}
                                        {typeof structured?.summary?.lowerBoundRate === "number"
                                            ? `${structured.summary.lowerBoundRate}%`
                                            : "데이터 준비 중"}
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/*1) 지역요건: 공고문 지역을 regionReq로 넣어서 여기 출력 */}
                            {renderListOrEmpty(
                                "📍 지역 요건",
                                (req?.regionReq && req.regionReq.length > 0)
                                    ? req.regionReq
                                    : (structured?.summary?.region
                                        ? [structured.summary.region]
                                        : (bid.region ? [bid.region] : [])),
                            )}                            <Separator />

                            {/*  2) 자격/실적은 각각 requirements에 맞게 출력 */}
                            {renderListOrEmpty("📋 참가자격", req?.eligibility)}
                            <Separator />
                            {renderListOrEmpty("📈 실적 요건", req?.performance)}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 체크리스트 */}
                <TabsContent value="checklist" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5" />
                                제출서류 체크리스트
                            </CardTitle>
                            <CardDescription>
                                진행률: {completedItems}/{checklist.length} ({completionRate.toFixed(0)}%)
                            </CardDescription>
                            <Progress value={completionRate} className="mt-2" />
                        </CardHeader>
                        <CardContent>
                            {checklist.length === 0 ? (
                                <div className="text-sm text-muted-foreground">체크리스트 데이터 준비 중</div>
                            ) : (
                                <div className="space-y-3">
                                    {checklist.map((item, index) => (
                                        <button
                                            key={`${item.item}-${index}`}
                                            type="button"
                                            onClick={() => {
                                                setChecklist((prev) => {
                                                    const updated = prev.map((x) =>
                                                        x.item === item.item ? { ...x, checked: !x.checked } : x
                                                    );

                                                    if (bid) {
                                                        localStorage.setItem(
                                                            checklistStorageKey(bid.id),
                                                            JSON.stringify(updated),
                                                        );
                                                    }

                                                    return updated;
                                                });

                                            }}
                                            className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border transition ${
                                                item.checked ? "bg-green-50 border-green-200" : "bg-gray-50 hover:bg-gray-100"
                                            }`}
                                        >
                                            {item.checked ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            ) : (
                                                <Clock className="h-5 w-5 text-gray-400" />
                                            )}

                                            <span className={item.checked ? "line-through text-muted-foreground" : ""}>{item.item}</span>

                                            <span className="ml-auto text-xs text-muted-foreground">{item.checked ? "완료" : "미완료"}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/*  제출서류가 파싱되면 체크리스트에 자동으로 붙는다는 안내 */}
                            {structured?.requirements?.documents?.length ? (
                                <div className="mt-4 text-xs text-muted-foreground">
                                    * AI가 파싱한 제출서류 목록이 체크리스트에 자동으로 추가됩니다.
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 리스크 */}
                <TabsContent value="risks" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                리스크 경고
                            </CardTitle>
                            <CardDescription>참여 전 확인이 필요한 사항</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {risksParsed.length === 0 ? (
                                <div className="text-sm text-muted-foreground">리스크 데이터 준비 중</div>
                            ) : (
                                <div className="space-y-3">
                                    {risksParsed.map((text, index) => (
                                        <div
                                            key={index}
                                            className="flex items-start gap-3 p-4 rounded-lg border bg-yellow-50 border-yellow-200"
                                        >
                                            <AlertTriangle className="h-5 w-5 mt-0.5 text-yellow-700" />
                                            <div>
                                                <Badge variant="outline" className="mb-2">
                                                    주의
                                                </Badge>
                                                <p className="text-sm">{text}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 투찰 가이드 */}
                <TabsContent value="price" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                투찰 범위 가이드
                            </CardTitle>
                            <CardDescription>AI 예측 기반 추천 투찰 범위 + 권고 액션</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                                <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-stretch">
                                    {/* 왼쪽: 신뢰구간 */}
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-2">신뢰구간(상위 3개)</p>

                                        {topBands.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">데이터 준비 중</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {topBands.map((b, i) => (
                                                    <div key={i} className="rounded-md border bg-white/60 p-3">
                                                        <div className="text-sm font-semibold">{i + 1}순위</div>

                                                        {/*  3) 구간 + 확률을 파싱된 값으로 대체해서 출력 */}
                                                        <div className="text-sm text-muted-foreground">구간: {b.bandRangeText}</div>
                                                        <div className="text-sm text-muted-foreground">사정율: {b.adjRateText}</div>
                                                        <div className="text-sm text-muted-foreground">확률: {b.probabilityText}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-px bg-slate-300/70" />

                                    {/* 오른쪽: 포인트 예측가 */}
                                    <div className="flex flex-col justify-center">
                                        <p className="text-sm text-muted-foreground mb-2">포인트 예측가</p>
                                        <p className="text-3xl font-bold text-blue-600">
                                            {Number.isFinite(Number(predictedPoint))
                                                ? `${Math.abs(Number(predictedPoint)).toLocaleString()} 원`
                                                : "데이터 준비 중"}                                        </p>

                                        <div className="mt-2 text-sm text-muted-foreground">
                                            {predictedMin && predictedMax
                                                ? `예상 범위: ${Number(predictedMin).toLocaleString()} ~ ${Number(predictedMax).toLocaleString()} 원`
                                                : null}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold mb-2"> 권고 액션(다음 72시간)</h4>
                                    {actions72h.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">데이터 준비 중</p>
                                    ) : (
                                        <ul className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">
                                            {actions72h.map((a, i) => (
                                                <li key={i}>{a}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-sm">
                                        <strong>💡 인사이트:</strong> 예가범위/낙찰하한율에 따라 실제 투찰 전략은 달라질 수 있어요. 공고문 원문과
                                        지역·자격요건을 먼저 확정한 뒤 투찰가를 결정하세요.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="pt-4 text-xs text-muted-foreground leading-relaxed">
                본 페이지에 제공되는 정보 및 AI 분석 결과는 참고용 자료이며, 실제 공고문 원문 및 나라장터(G2B) 공지 내용을 반드시
                우선 확인하시기 바랍니다.
                <br />
                당사는 본 자료의 정확성, 완전성 및 최신성을 보장하지 않으며, 이를 근거로 한 의사결정 및 입찰 결과에 대해 책임을 지지
                않습니다.
            </div>
        </div>
    );
}
