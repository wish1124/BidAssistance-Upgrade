import { CheckCircle2, XCircle } from "lucide-react";
import {
	get_password_rules,
	type PasswordPolicyContext,
} from "../utils/password";

interface PasswordRulesProps {
	password: string;
	ctx?: PasswordPolicyContext;
}

export function PasswordRules({ password, ctx }: PasswordRulesProps) {
	const rules = get_password_rules(password, ctx);

	return (
		<div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
			<div className="font-medium text-slate-900 mb-2">비밀번호 규칙</div>
			<ul className="space-y-1">
				{rules.map((r) => (
					<li key={r.key} className="flex items-start gap-2">
						{r.ok ? (
							<CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600" />
						) : (
							<XCircle className="h-4 w-4 mt-0.5 text-rose-600" />
						)}
						<span className={r.ok ? "text-slate-700" : "text-slate-600"}>
							{r.label}
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}
