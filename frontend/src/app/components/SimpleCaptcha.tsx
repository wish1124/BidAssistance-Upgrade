import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";

function gen_code(len: number) {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	let out = "";
	let i = 0;

	while (i < len) {
		out += alphabet[Math.floor(Math.random() * alphabet.length)];
		i += 1;
	}
	return out;
}

export function SimpleCaptcha(props: {
	required: boolean;
	onValidChange: (valid: boolean) => void;
}) {
	const { required, onValidChange } = props;
	const [code, setCode] = useState(() => gen_code(6));
	const [answer, setAnswer] = useState("");

	const is_valid = useMemo(() => {
		if (!required) return true;
		return answer.trim().toUpperCase() === code;
	}, [required, answer, code]);

	useEffect(() => {
		onValidChange(is_valid);
	}, [is_valid, onValidChange]);

	useEffect(() => {
		if (!required) return;
		setAnswer("");
		setCode(gen_code(6));
	}, [required]);

	const on_refresh = () => {
		setAnswer("");
		setCode(gen_code(6));
	};

	if (!required) return null;

	return (
		<div className="rounded-lg border bg-white p-3">
			<div className="flex items-center justify-between gap-2">
				<div className="text-sm text-muted-foreground">자동입력 방지</div>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={on_refresh}
					className="h-8 px-2"
					title="새 코드"
				>
					<RefreshCw className="h-4 w-4" />
				</Button>
			</div>

			<div className="mt-2 flex items-center gap-2">
				<div className="flex-1 rounded-md border bg-slate-50 px-3 py-2 font-mono text-lg tracking-widest text-center select-none">
					{code}
				</div>
				<Input
					value={answer}
					onChange={(e) => setAnswer(e.target.value)}
					placeholder="위 코드를 입력"
					className="h-11"
					autoComplete="off"
					spellCheck={false}
				/>
			</div>

			{!is_valid && (
				<div className="mt-2 text-xs text-red-600">코드가 일치하지 않습니다.</div>
			)}
		</div>
	);
}
