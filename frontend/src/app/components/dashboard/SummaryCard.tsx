import {
    FileText,
    Heart,
    AlertCircle,
    DollarSign,
    type LucideIcon,
} from "lucide-react";

export type DashboardKpi = {
    newBidsThisMonth: number;
    wishlistCount: number;
    closingSoon3Days: number;
    totalExpectedAmountEok: string;
};

type Item = {
    title: string;
    value: string;
    sub: string;
    icon: LucideIcon;
    highlight?: boolean;
    onClick?: () => void;
};

export function SummaryCards({
                                 loading,
                                 kpi,
                                 onSelectNew,
                                 onSelectClosingSoon,
                                 onGoWishlist,
                             }: {
    loading: boolean;
    kpi: DashboardKpi;
    onSelectNew: () => void;
    onSelectClosingSoon: () => void;
    onGoWishlist: () => void;
}) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="border rounded-2xl p-6 bg-white">
                        <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                        <div className="mt-4 h-8 w-24 bg-gray-100 rounded animate-pulse" />
                        <div className="mt-3 h-3 w-16 bg-gray-100 rounded animate-pulse" />
                    </div>
                ))}
            </div>
        );
    }

    const items: Item[] = [
        {
            title: "신규 공고",
            value: `${kpi.newBidsThisMonth}개`,
            sub: "오늘 시작한 공고",
            icon: FileText,
            onClick: onSelectNew,
        },
        {
            title: "관심 공고",
            value: `${kpi.wishlistCount}개`,
            sub: "장바구니",
            icon: Heart,
            onClick: onGoWishlist,
        },
        {
            title: "마감 임박",
            value: `${kpi.closingSoon3Days}개`,
            sub: "3일 이내",
            icon: AlertCircle,
            highlight: true,
            onClick: onSelectClosingSoon,
        },
        {
            title: "총 예상액",
            value: `${kpi.totalExpectedAmountEok}억`,
            sub: "관심 공고 합계",
            icon: DollarSign,
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {items.map((item) => {
                const Icon = item.icon;
                const Clickable = !!item.onClick;

                return Clickable ? (
                    <button
                        key={item.title}
                        type="button"
                        onClick={item.onClick}
                        className="border rounded-2xl p-6 bg-white flex justify-between text-left cursor-pointer hover:shadow-sm active:scale-[0.99] transition appearance-none"
                    >
                        <div className="space-y-2">
                            <div className="text-sm text-gray-500">{item.title}</div>
                            <div className="text-2xl font-semibold text-gray-900">
                                {item.value}
                            </div>
                            <div className="text-xs text-gray-400">{item.sub}</div>
                        </div>

                        <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                item.highlight
                                    ? "bg-orange-100 text-orange-500"
                                    : "bg-gray-100 text-gray-400"
                            }`}
                        >
                            <Icon size={18} />
                        </div>
                    </button>
                ) : (
                    <div
                        key={item.title}
                        className="border rounded-2xl p-6 bg-white flex justify-between text-left"
                    >
                        <div className="space-y-2">
                            <div className="text-sm text-gray-500">{item.title}</div>
                            <div className="text-2xl font-semibold text-gray-900">
                                {item.value}
                            </div>
                            <div className="text-xs text-gray-400">{item.sub}</div>
                        </div>

                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 text-gray-400">
                            <Icon size={18} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
