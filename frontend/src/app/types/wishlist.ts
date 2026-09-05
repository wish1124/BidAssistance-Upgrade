import type { BidStage } from "./bid";

export type WishlistItem = {
	id: number;
	userId: number;
	bidId: number;
	stage: BidStage;
	decidedAt?: string;
	submittedAt?: string;
	resultAt?: string;
	memo?: string;

	realId: string;
	title: string;
	agency: string;
	baseAmount: number | string;
	bidStart: string;
	bidEnd: string;
	openTime: string;
	region: string;
};
