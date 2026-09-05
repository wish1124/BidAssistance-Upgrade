export const ACCESS_CONTROL = {
	PASSWORD_MAX_AGE_DAYS: 90,
	MAX_FAILED_ATTEMPTS: 5,
	LOCK_MINUTES: 15,
	CAPTCHA_AFTER_ATTEMPTS: 3,
} as const;

type LoginGuardState = {
	count: number;
	lock_until?: number;
	last_failed_at?: number;
};

function now_ms() {
	return Date.now();
}

function key_login_guard(email: string) {
	return `login_guard:${(email || "").trim().toLowerCase()}`;
}

function safe_parse_json<T>(raw: string | null): T | null {
	if (!raw) return null;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

function clamp_int(n: unknown, fallback: number) {
	const v = typeof n === "number" ? n : Number(n);
	if (!Number.isFinite(v)) return fallback;
	return Math.max(0, Math.floor(v));
}

export function get_login_guard(email: string): LoginGuardState {
	const key = key_login_guard(email);
	const parsed = safe_parse_json<LoginGuardState>(localStorage.getItem(key));
	if (!parsed) return { count: 0 };

	return {
		count: clamp_int(parsed.count, 0),
		lock_until: typeof parsed.lock_until === "number" ? parsed.lock_until : undefined,
		last_failed_at:
			typeof parsed.last_failed_at === "number" ? parsed.last_failed_at : undefined,
	};
}

export function clear_login_guard(email: string) {
	localStorage.removeItem(key_login_guard(email));
}

export function is_login_locked(email: string) {
	const st = get_login_guard(email);
	if (!st.lock_until) return false;
	return st.lock_until > now_ms();
}

export function login_lock_remaining_ms(email: string) {
	const st = get_login_guard(email);
	if (!st.lock_until) return 0;
	return Math.max(0, st.lock_until - now_ms());
}

export function record_login_failure(email: string) {
	const st = get_login_guard(email);
	const next: LoginGuardState = {
		count: st.count + 1,
		last_failed_at: now_ms(),
	};

	if (next.count >= ACCESS_CONTROL.MAX_FAILED_ATTEMPTS) {
		next.lock_until = now_ms() + ACCESS_CONTROL.LOCK_MINUTES * 60 * 1000;
	}

	localStorage.setItem(key_login_guard(email), JSON.stringify(next));
	return next;
}

export function record_login_success(email: string) {
	clear_login_guard(email);
}

export function should_require_captcha(email: string) {
	const st = get_login_guard(email);
	return st.count >= ACCESS_CONTROL.CAPTCHA_AFTER_ATTEMPTS;
}

function key_pw_changed_at_user(user_id: string) {
	return `pw_changed_at:user:${String(user_id)}`;
}

function key_pw_changed_at_email(email: string) {
	return `pw_changed_at:email:${(email || "").trim().toLowerCase()}`;
}

export function set_password_changed_now_for_user(user_id: string) {
	localStorage.setItem(key_pw_changed_at_user(user_id), String(now_ms()));
}

export function set_password_changed_now_for_email(email: string) {
	localStorage.setItem(key_pw_changed_at_email(email), String(now_ms()));
}

export function migrate_password_changed_at(email: string, user_id: string) {
	const ekey = key_pw_changed_at_email(email);
	const raw = localStorage.getItem(ekey);
	if (!raw) return;

	const ts = Number(raw);
	if (Number.isFinite(ts) && ts > 0) {
		localStorage.setItem(key_pw_changed_at_user(user_id), String(ts));
	}
	localStorage.removeItem(ekey);
}

export function get_password_changed_at_ms(user_id: string) {
	const raw = localStorage.getItem(key_pw_changed_at_user(user_id));
	const ts = Number(raw);
	if (!Number.isFinite(ts) || ts <= 0) return null;
	return ts;
}

export function is_password_expired(user_id: string) {
	const ts = get_password_changed_at_ms(user_id);
	if (!ts) return false;

	const age_ms = now_ms() - ts;
	const max_ms = ACCESS_CONTROL.PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
	return age_ms >= max_ms;
}

export function ensure_password_changed_at_initialized(user_id: string) {
	const ts = get_password_changed_at_ms(user_id);
	if (ts) return;
	set_password_changed_now_for_user(user_id);
}

export function format_mmss(ms: number) {
	const total = Math.max(0, Math.ceil(ms / 1000));
	const m = Math.floor(total / 60);
	const s = total % 60;
	const mm = String(m).padStart(2, "0");
	const ss = String(s).padStart(2, "0");
	return `${mm}:${ss}`;
}
