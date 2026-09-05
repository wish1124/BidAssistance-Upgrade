export function mask_name(name: string): string {
	const n = (name || "").trim();
	let out: string;

	if (!n) return "";
	if (n.includes(" ")) {
		out = n
			.split(/\s+/)
			.filter(Boolean)
			.map(mask_name)
			.join(" ");
		return out;
	}

	if (/^[가-힣]+$/.test(n)) {
		if (n.length === 1) return "*";
		if (n.length === 2) return `${n[0]}*`;
		return `${n[0]}${"*".repeat(n.length - 2)}${n[n.length - 1]}`;
	}

	if (n.length === 1) return "*";
	if (n.length === 2) return `${n[0]}*`;
	return `${n[0]}${"*".repeat(Math.max(1, n.length - 2))}${n[n.length - 1]}`;
}
