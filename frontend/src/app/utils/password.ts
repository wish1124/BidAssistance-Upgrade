export type PasswordRule = {
	key: string;
	label: string;
	ok: boolean;
};

export type PasswordPolicyContext = {
	user_id?: string;
	nickname?: string;
};

function has_alpha(s: string) {
	return /[A-Za-z]/.test(s);
}

function has_digit(s: string) {
	return /[0-9]/.test(s);
}

function has_special(s: string) {
	// 공백 제외 특수문자
	return /[^A-Za-z0-9\s]/.test(s);
}

function has_space(s: string) {
	return /\s/.test(s);
}

function has_repeated_char(s: string, n: number) {
	const re = new RegExp(`(.)\\1{${n - 1},}`);
	return re.test(s);
}

function normalize(s: string) {
	return (s || "").toLowerCase();
}

export function get_password_rules(password: string, ctx?: PasswordPolicyContext): PasswordRule[] {
	const p = password || "";
	const a = has_alpha(p);
	const d = has_digit(p);
	const sp = has_special(p);
	const space_ok = !has_space(p);

	const length_ok = p.length >= 8;
	const combo_ok = a && d && sp;

	const repeat_ok = !has_repeated_char(p, 4);

	const user_id = normalize(ctx?.user_id || "");
	const nickname = normalize(ctx?.nickname || "");
	const p_norm = normalize(p);
	const not_contains_id = user_id ? !p_norm.includes(user_id) : true;
	const not_contains_nick = nickname ? !p_norm.includes(nickname) : true;

	return [
		{
			key: "no_space",
			label: "공백(스페이스/탭/줄바꿈) 포함 불가",
			ok: space_ok,
		},
		{
			key: "length",
			label: "길이: 8자 이상",
			ok: length_ok,
		},
		{
			key: "combo",
			label: "영문/숫자/특수문자 각각 1개 이상 포함",
			ok: combo_ok,
		},
		{
			key: "repeat",
			label: "동일 문자 4회 이상 연속 사용 금지",
			ok: repeat_ok,
		},
		{
			key: "no_id",
			label: "이메일(아이디)와 유사한 비밀번호 사용 금지",
			ok: not_contains_id,
		},
		{
			key: "no_nick",
			label: "닉네임과 유사한 비밀번호 사용 금지",
			ok: not_contains_nick,
		},
	];
}

export function is_password_valid(password: string, ctx?: PasswordPolicyContext): boolean {
	return get_password_rules(password, ctx).every((r) => r.ok);
}
