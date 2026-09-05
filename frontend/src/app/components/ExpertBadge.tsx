import type { FC } from "react";

/**
 * 등급 이름과 테두리 색상
 * 1: 곡괭이(파란색), 2: 굴삭기(초록색), 3: 지게차(노란색), 4: 불도저(주황색), 5: 포크레인(빨간색)
 */
const LEVELS: { name: string; borderColor: string; textColor: string }[] = [
	{ name: "곡괭이", borderColor: "border-blue-500", textColor: "text-blue-600 dark:text-blue-400" },
	{ name: "굴삭기", borderColor: "border-green-500", textColor: "text-green-600 dark:text-green-400" },
	{ name: "지게차", borderColor: "border-yellow-500", textColor: "text-yellow-600 dark:text-yellow-400" },
	{ name: "불도저", borderColor: "border-orange-500", textColor: "text-orange-600 dark:text-orange-400" },
	{ name: "포크레인", borderColor: "border-red-500", textColor: "text-red-600 dark:text-red-400" },
];

interface ExpertBadgeProps {
	level?: number;
}

export const ExpertBadge: FC<ExpertBadgeProps> = ({ level = 1 }) => {
	if (level === 0) {
		return (
			<span className="inline-flex items-center px-1.5 py-0.5 border-2 rounded border-purple-500 text-purple-600 dark:text-purple-400 text-xs font-semibold bg-white dark:bg-gray-800">
				관리자
			</span>
		);
	}

	const safeLevel = Math.max(1, Math.min(5, level)) - 1;
	const { name, borderColor, textColor } = LEVELS[safeLevel];

	return (
		<span className={`inline-flex items-center px-1.5 py-0.5 border-2 rounded ${borderColor} ${textColor} text-xs font-semibold bg-white dark:bg-gray-800`}>
			{name}
		</span>
	);
};

export default ExpertBadge;
