const testEmail = import.meta.env.VITE_TEST_LOGIN_EMAIL?.trim() ?? "";
const testPassword = import.meta.env.VITE_TEST_LOGIN_PASSWORD ?? "";

export const ENABLE_TEST_LOGIN =
	import.meta.env.VITE_ENABLE_TEST_LOGIN === "true" &&
	Boolean(testEmail) &&
	Boolean(testPassword);

export const TEST_LOGIN = {
	email: testEmail,
	password: testPassword,
} as const;
