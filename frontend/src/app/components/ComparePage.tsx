 import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { fetchBidsBatch, type Bid } from "../api/bids";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

export function ComparePage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            const rawIds = searchParams.get("ids");
            if (!rawIds) return;

            const ids = Array.from(new Set(rawIds.split(",").map(Number).filter(Number.isFinite)));
            if (ids.length === 0) return;

            setLoading(true);
            try {
                const data = await fetchBidsBatch(ids);
                setBids(data);
            } catch (error) {
                console.error("Failed to fetch comparisons", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [searchParams]);

    if(loading) {
        return <div className="p-8 text-center text-gray-500 dark:text-gray-400">공고 정보를 불러오는 중입니다...</div>;
    }

    if(bids.length === 0) {
        return (
            <div className="p-8 text-center">
                <div className="mb-4 text-gray-500 dark:text-gray-400">선택된 공고가 없습니다.</div>
                <Button variant="outline" onClick={() => navigate("/bids")}>공고 목록으로 돌아가기</Button>
            </div>
        );
    }

    // Spec definition to iterate over
    const specs = [
        { label: "공고번호", render: (b: Bid) => <span className="text-xs text-muted-foreground">{b.realId}</span> },
        { label: "발주기관", render: (b: Bid) => b.organization || b.agency },
        { label: "지역", render: (b: Bid) => b.region || "-" },
        { label: "추정가격", render: (b: Bid) => Number(b.estimatePrice).toLocaleString() + " 원" },
        { label: "기초금액", render: (b: Bid) => b.basicPrice ? Number(b.basicPrice).toLocaleString() + " 원" : "-" },
        { label: "투찰시작", render: (b: Bid) => b.startDate ? new Date(b.startDate).toLocaleString() : "-" },
        { label: "투찰마감", render: (b: Bid) => b.endDate ? <span className="font-medium text-red-600">{new Date(b.endDate).toLocaleString()}</span> : "-" },
        { label: "개찰일시", render: (b: Bid) => b.openDate ? new Date(b.openDate).toLocaleString() : "-" },
        { label: "투찰범위", render: (b: Bid) => b.bidRange ? `${b.bidRange}%` : "-" },
        { label: "낙찰하한율", render: (b: Bid) => b.minimumBidRate ? `${b.minimumBidRate}%` : "-" },
        { label: "원문", render: (b: Bid) => b.bidURL ? <a href={b.bidURL} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline"><ExternalLink className="h-3 w-3" /> 보기</a> : "-" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">공고 비교</h2>
                    <p className="text-muted-foreground">선택한 {bids.length}개 공고의 상세 스펙을 비교합니다.</p>
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50/60 dark:bg-slate-700/60">
                        <TableRow>
                            <TableHead className="w-[150px] font-semibold bg-slate-100 dark:bg-slate-700">항목</TableHead>
                            {bids.map(b => (
                                <TableHead key={b.bidId} className="min-w-[250px]">
                                    <div className="py-2">
                                        <div className="line-clamp-2 text-sm font-semibold text-foreground leading-snug mb-1" title={b.name}>{b.name}</div>
                                        <Badge variant="outline" className="font-normal">{b.realId}</Badge>
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {specs.map((spec, idx) => (
                            <TableRow key={idx}>
                                <TableCell className="font-medium bg-slate-50/40 dark:bg-slate-700/40 text-muted-foreground">{spec.label}</TableCell>
                                {bids.map(b => (
                                    <TableCell key={b.bidId} className="align-top">
                                        {spec.render(b)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
