import { MessageSquareText } from "lucide-react";

export function ChatbotFloatingButton({ onClick }: { onClick: () => void }) {
	return (
		<div className="fixed right-4 md:right-6 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-50">
			<div className="rounded-full bg-gradient-to-r from-blue-500/70 via-cyan-400/60 to-indigo-500/70 p-[1px] shadow-lg hover:shadow-xl transition">
				<button
					type="button"
					onClick={onClick}
					aria-label="AI 도우미 열기"
					className={[
						"relative inline-flex items-center gap-2",
						"rounded-full px-4 py-3",
						"bg-slate-950/90 text-white backdrop-blur",
						"border border-white/10",
						"hover:bg-slate-950 hover:-translate-y-0.5 transition",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
					].join(" ")}
				>
					<span className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
						<MessageSquareText className="h-5 w-5" />
					</span>

					<span className="hidden sm:inline text-sm font-semibold tracking-[-0.01em]">
						AI 도우미
					</span>

					<span className="pointer-events-none absolute inset-0 rounded-full overflow-hidden">
						<span className="absolute -left-10 top-0 h-full w-16 rotate-12 bg-white/10 blur-md opacity-0 hover:opacity-100 transition-opacity" />
					</span>
				</button>
			</div>
		</div>
	);
}
