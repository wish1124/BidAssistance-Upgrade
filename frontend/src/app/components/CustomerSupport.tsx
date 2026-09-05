import { Badge } from "./ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "./ui/card";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "./ui/accordion";
import { Separator } from "./ui/separator";

type FaqItem = {
	id: string;
	q: string;
	a: JSX.Element;
};

function DotList({ items }: { items: string[] }) {
	return (
		<ul className="list-disc pl-6 space-y-2">
			{items.map((v) => (
				<li key={v} className="text-sm leading-relaxed">
					{v}
				</li>
			))}
		</ul>
	);
}

function InfoRow({
	label,
	value,
}: {
	label: string;
	value: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
			<p className="text-sm font-medium text-muted-foreground">{label}</p>
			<p className="text-sm">{value}</p>
		</div>
	);
}

export function CustomerSupportPage() {

	const supportEmail = "[support@mail.com]";
	const supportPhone = "[02-0000-0000]";
	const supportHours = "평일 09:00 ~ 18:00 (점심 12:00 ~ 13:00), 주말/공휴일 제외";
	const responseSla = "영업일 기준 1~2일 내 1차 답변";
	const emergencyGuide =
		"장애/보안 이슈 등 긴급 건은 제목에 [긴급]을 포함해 주세요.";

	const faq: FaqItem[] = [
		{
			id: "f1",
			q: "로그인이 안 돼요. 어떻게 해야 하나요?",
			a: (
				<div className="space-y-3">
					<DotList
						items={[
							"이메일/비밀번호 오타(대소문자, 공백 포함)를 확인해 주세요.",
							"비밀번호를 잊으셨다면 ‘비밀번호 재설정’에서 재설정을 진행해 주세요.",
							"브라우저 확장프로그램(광고 차단/보안) 영향이 있을 수 있어 시크릿 모드로 재시도해 주세요.",
							"동일 문제가 지속되면 오류 화면 캡처와 함께 문의해 주세요.",
						]}
					/>
				</div>
			),
		},
		{
			id: "f2",
			q: "비밀번호 재설정 메일이 안 와요.",
			a: (
				<div className="space-y-3">
					<DotList
						items={[
							"스팸함/프로모션함을 먼저 확인해 주세요.",
							"이메일 주소를 정확히 입력했는지 확인해 주세요.",
							"회사/기관 메일은 보안 정책에 따라 메일이 차단될 수 있습니다. 다른 메일로 시도하거나 고객센터로 문의해 주세요.",
						]}
					/>
				</div>
			),
		},
		{
			id: "f3",
			q: "입찰 정보/공고 데이터가 최신이 아닌 것 같아요.",
			a: (
				<div className="space-y-3">
					<p className="text-sm text-muted-foreground leading-relaxed">
						데이터는 수집/동기화 주기에 따라 반영 지연이 발생할 수 있습니다.
					</p>
					<DotList
						items={[
							"조회 조건(기간/기관/키워드/필터)을 다시 확인해 주세요.",
							"브라우저 캐시 영향이 있을 수 있어 새로고침(Ctrl+Shift+R) 또는 재로그인 후 확인해 주세요.",
							"특정 공고번호/URL을 포함해 문의하시면 더 빠르게 확인할 수 있습니다.",
						]}
					/>
				</div>
			),
		},
		{
			id: "f4",
			q: "커뮤니티에서 신고/삭제 요청을 하고 싶어요.",
			a: (
				<div className="space-y-3">
					<DotList
						items={[
							"권리 침해(명예훼손/저작권) 또는 개인정보 노출이 있는 경우 고객센터로 링크와 사유를 보내 주세요.",
							"운영 정책에 따라 임시조치 또는 삭제가 진행될 수 있습니다.",
							"사실관계 확인이 필요한 경우 추가 자료를 요청드릴 수 있습니다.",
						]}
					/>
				</div>
			),
		},
		{
			id: "f5",
			q: "첨부파일 업로드가 실패해요.",
			a: (
				<div className="space-y-3">
					<DotList
						items={[
							"파일 용량/형식을 확인해 주세요(회사 정책에 따라 제한이 있을 수 있습니다).",
							"파일명에 특수문자/공백이 많으면 실패할 수 있어 파일명을 단순화해 재시도해 주세요.",
							"동일 증상 재현 시: 업로드 시각, 파일 용량, 브라우저 종류를 함께 알려주세요.",
						]}
					/>
				</div>
			),
		},
		{
			id: "f6",
			q: "개인정보 관련 요청(열람/정정/삭제/처리정지)은 어디로 하면 되나요?",
			a: (
				<div className="space-y-3">
					<p className="text-sm leading-relaxed">
						개인정보 관련 요청은 고객센터로 접수해 주세요. 본인 확인 절차 후 처리됩니다.
					</p>
					<DotList
						items={[
							"요청 유형(열람/정정/삭제/처리정지)과 대상 정보를 구체적으로 작성해 주세요.",
							"요청 처리 과정에서 신분 확인 또는 추가 확인 자료를 요청할 수 있습니다.",
						]}
					/>
				</div>
			),
		},
	];

	return (
		<Card>
			<CardHeader className="space-y-2">
				<div className="flex items-start justify-between gap-3">
					<div className="space-y-1">
						<CardTitle>고객지원</CardTitle>
						<CardDescription>
							문의 접수, 장애 제보, 계정/결제(해당 시) 및 정책 관련 안내를 제공합니다.
						</CardDescription>
					</div>
					<Badge variant="secondary">Support</Badge>
				</div>
				<Separator />
			</CardHeader>

			<CardContent className="space-y-6">
				<section className="space-y-3">
					<h3 className="text-base font-semibold">문의 채널</h3>
					<div className="rounded-lg border p-4 space-y-3">
						<InfoRow label="이메일" value={supportEmail} />
						<InfoRow label="전화" value={supportPhone} />
						<InfoRow label="운영시간" value={supportHours} />
						<InfoRow label="응답 기준" value={responseSla} />
						<p className="text-xs text-muted-foreground leading-relaxed">
							{emergencyGuide} (가능하면 오류 화면 캡처/재현 경로/발생 시각을 함께 보내주세요)
						</p>
					</div>
				</section>

				<section className="space-y-3">
					<h3 className="text-base font-semibold">자주 묻는 질문(FAQ)</h3>

					<div className="rounded-lg border overflow-hidden">
						<Accordion type="multiple" className="w-full">
							{faq.map((item) => (
								<AccordionItem key={item.id} value={item.id} className="px-0">
									<AccordionTrigger className="px-6 py-4 text-left">
										{item.q}
									</AccordionTrigger>
									<AccordionContent className="px-6 pb-5 pt-1">
										<div className="space-y-3 leading-relaxed">{item.a}</div>
									</AccordionContent>
								</AccordionItem>
							))}
						</Accordion>
					</div>
				</section>

				<section className="space-y-3">
					<h3 className="text-base font-semibold">문의 작성 가이드</h3>
					<div className="rounded-lg border p-4 space-y-3">
						<DotList
							items={[
								"문의 유형: 로그인/계정, 공고/데이터, 커뮤니티, 파일 업로드, 정책/약관, 기타",
								"발생 시각 및 재현 경로: 어떤 화면에서 어떤 동작을 했는지 단계별로",
								"오류 메시지/스크린샷 첨부",
								"브라우저/OS 정보(예: Chrome 120 / Windows 11)",
							]}
						/>
						<p className="text-xs text-muted-foreground leading-relaxed">
							개인정보 보호를 위해 비밀번호, 주민등록번호, 금융정보 등 민감정보는
							문의 내용에 입력하지 마세요.
						</p>
					</div>
				</section>

				<section className="space-y-3">
					<h3 className="text-base font-semibold">처리 기준(요약)</h3>
					<div className="rounded-lg border p-4 space-y-2">
						<DotList
							items={[
								"장애/오류: 재현 가능 여부 확인 후 우선순위에 따라 순차 대응",
								"권리 침해/개인정보 노출: 임시조치 후 사실관계 확인 및 후속 처리",
								"정책/약관 문의: 최신 고지/버전 기준으로 안내",
							]}
						/>
					</div>
				</section>
			</CardContent>
		</Card>
	);
}
