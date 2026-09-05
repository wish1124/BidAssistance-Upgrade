import type { FC } from "react";
import { Flame, Crown } from "lucide-react";
import type { Post } from "../types/community";
import { ExpertBadge } from "./ExpertBadge";
import { mask_name } from "../utils/masking";

interface TrendingPostsProps {
	posts: Post[];
	onClickPost: (post: Post) => void;
}

export const TrendingPosts: FC<TrendingPostsProps> = ({ posts, onClickPost }) => {
	if (posts.length === 0) return null;

	return (
		<div className="mb-6">
			<div className="flex items-center gap-2 mb-3">
				<Flame className="w-5 h-5 text-orange-500" />
				<h3 className="font-semibold text-lg">인기글</h3>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{posts.map((post, idx) => (
					<button
						key={post.id}
						type="button"
						onClick={() => onClickPost(post)}
						className="text-left p-4 rounded-xl border-2 border-amber-200 dark:border-amber-600/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 hover:shadow-lg hover:scale-[1.02] transition-all"
					>
						<div className="flex items-center gap-2 mb-2">
							{idx === 0 && <Crown className="w-4 h-4 text-amber-500" />}
							<span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
								{idx === 0 ? "🥇 1위" : idx === 1 ? "🥈 2위" : "🥉 3위"}
							</span>
						</div>

						<h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2 mb-2">
							{post.title}
						</h4>

						<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
							<span>{mask_name(post.authorName)}</span>
							{post.authorExpertLevel && (
								<ExpertBadge level={post.authorExpertLevel} />
							)}
							<span className="ml-auto">❤️ {post.likes}</span>
						</div>
					</button>
				))}
			</div>
		</div>
	);
};

export default TrendingPosts;
