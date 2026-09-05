import { useMemo, useState } from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

export type WeeklyTrendPoint = {
	week: string;
	value: number;
	range: string;
};

export type MonthlyWeeklyTrend = {
	month: string;
	points: WeeklyTrendPoint[];
};

function clamp(n: number, min: number, max: number): number {
	if (n < min) return min;
	if (n > max) return max;
	return n;
}

export function MonthlyTrendChart({
	data = [],
	loading = false,
}: {
	data?: MonthlyWeeklyTrend[];
	loading?: boolean;
}) {
	const monthCount = Math.max(1, data.length);
	const [idx, setIdx] = useState(0);
	const safeIdx = clamp(idx, 0, monthCount - 1);

	const current = useMemo(() => {
		if (!Array.isArray(data) || data.length === 0)
			return { month: "-", points: [] as WeeklyTrendPoint[] };
		return data[safeIdx] ?? { month: "-", points: [] as WeeklyTrendPoint[] };
	}, [data, safeIdx]);

	const canPrev = safeIdx > 0;
	const canNext = safeIdx < monthCount - 1;

	return (
		<div className="border rounded-2xl p-6 bg-white">
			<div className="mb-4 flex items-start justify-between gap-3">
				<div>
					<div className="font-semibold">월별 공고 추이</div>
					<div className="text-sm text-gray-400">
						끝나는 날(endDate) 기준 · 달력 주(일~토)
					</div>
				</div>

				<div className="flex items-center gap-2">
					<div className="text-sm text-gray-500 tabular-nums">{current.month}</div>
					<div className="text-xs text-gray-400 tabular-nums">{`${safeIdx + 1}/${monthCount}`}</div>

					<button
						type="button"
						className={[
							"h-9 w-9 rounded-full border bg-white inline-flex items-center justify-center",
							canPrev ? "hover:bg-gray-50" : "opacity-40 cursor-not-allowed",
						].join(" ")}
						disabled={!canPrev}
						onClick={() => setIdx((v) => clamp(v - 1, 0, monthCount - 1))}
						aria-label="이전 달"
						title="이전 달"
					>
						<span className="text-lg leading-none">‹</span>
					</button>

					<button
						type="button"
						className={[
							"h-9 w-9 rounded-full border bg-white inline-flex items-center justify-center",
							canNext ? "hover:bg-gray-50" : "opacity-40 cursor-not-allowed",
						].join(" ")}
						disabled={!canNext}
						onClick={() => setIdx((v) => clamp(v + 1, 0, monthCount - 1))}
						aria-label="다음 달"
						title="다음 달"
					>
						<span className="text-lg leading-none">›</span>
					</button>
				</div>
			</div>

			<div className="h-64">
				{loading ? (
					<div className="h-full w-full rounded-xl bg-gray-100 animate-pulse" />
				) : !current.points || current.points.length === 0 ? (
					<div className="h-full w-full rounded-xl bg-gray-50 flex items-center justify-center text-sm text-gray-400">
						데이터가 없습니다.
					</div>
				) : (
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={current.points} margin={{ top: 22, right: 12, left: 0, bottom: 0 }}>
							<CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
							<XAxis dataKey="week" interval={0} tickLine={false} axisLine={false} />
							<YAxis allowDecimals={false} tickLine={false} axisLine={false} />
							<Tooltip
								labelFormatter={(label, payload) => {
									const p = Array.isArray(payload) ? payload[0]?.payload : null;
									const range = p?.range ? ` (${String(p.range)})` : "";
									return `${String(label)}${range}`;
								}}
								formatter={(v) => [`${v}건`, "공고"]}
							/>
							<Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} dot={{ r: 4 }} />
						</LineChart>
					</ResponsiveContainer>
				)}
			</div>
		</div>
	);
}
