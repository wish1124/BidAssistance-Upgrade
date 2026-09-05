import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "./ui/accordion";
import { Badge } from "./ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

type Section = {
	id: string;
	title: string;
	content: JSX.Element;
};

function DotList({ items }: { items: string[] }) {
	return (
		<ul className="list-disc pl-5 space-y-1">
			{items.map((v) => (
				<li key={v}>{v}</li>
			))}
		</ul>
	);
}

export function PrivacyPolicyPage() {
	const effectiveDate = "[2026-01-20]";
	const lastUpdated = "[2026-01-20]";
	const controller = "[입찰인사이트 운영팀/회사명]";
	const dpo = "[개인정보보호책임자 성명/직책]";
	const contact = "[연락처 또는 이메일]";
	const address = "[주소(선택)]";

	const sections: Section[] = [
		{
			id: "s1",
			title: "1. 처리하는 개인정보 항목",
			content: (
				<div className="space-y-3">
					<p className="text-sm text-muted-foreground">
						입찰인사이트(이하 “서비스”)는 최소한의 개인정보만을 수집·이용합니다.
						서비스 기능에 따라 수집 항목이 달라질 수 있으며, 추가 수집이 필요한 경우
						별도로 고지하고 동의를 받습니다.
					</p>

					<div className="space-y-2">
						<p className="font-medium">가. 회원가입/계정관리</p>
						<DotList
							items={[
								"필수: 이메일(아이디), 비밀번호(암호화 저장은 서버 정책에 따름), 닉네임/표시명",
								"선택: 마케팅 수신 동의 여부(이메일 등)",
							]}
						/>
					</div>

					<div className="space-y-2">
						<p className="font-medium">나. 서비스 이용 과정에서 생성·수집되는 정보</p>
						<DotList
							items={[
								"서비스 이용기록(접속일시, 접속 IP, 이용 로그, 오류 로그 등)",
								"쿠키/로컬스토리지 등 클라이언트 저장소에 저장되는 정보(세션 유지, 환경설정 등)",
								"게시글/댓글/첨부파일 등 이용자가 자발적으로 등록한 콘텐츠(개인정보 포함 가능)",
							]}
						/>
						<p className="text-xs text-muted-foreground">
							※ 첨부파일/게시글에 개인정보를 포함하지 않도록 주의해 주세요. 운영 정책에 따라
							개인정보가 포함된 콘텐츠는 마스킹 또는 삭제될 수 있습니다.
						</p>
					</div>
				</div>
			),
		},
		{
			id: "s2",
			title: "2. 개인정보의 처리 목적",
			content: (
				<div className="space-y-2">
					<DotList
						items={[
							"회원 식별, 가입 의사 확인, 본인 확인, 계정/부정이용 방지",
							"서비스 제공(입찰 정보 조회, 알림, 커뮤니티 등) 및 기능 개선",
							"고객문의 대응, 공지사항 전달, 민원 처리",
							"법령/내부 정책 준수 및 보안(로그 분석, 사고 대응, 분쟁 처리)",
							"(선택) 이벤트·프로모션 등 마케팅 정보 제공(동의한 경우에 한함)",
						]}
					/>
				</div>
			),
		},
		{
			id: "s3",
			title: "3. 개인정보의 보유 및 이용기간",
			content: (
				<div className="space-y-3">
					<p>
						원칙적으로 개인정보는 <b>수집·이용 목적 달성 시</b> 지체 없이 파기합니다.
						다만, 관련 법령 또는 내부 정책에 따라 아래와 같이 보관할 수 있습니다.
					</p>
					<DotList
						items={[
							"회원정보: 회원 탈퇴 시까지(단, 부정이용 방지/분쟁 처리 목적의 최소 정보는 내부 정책에 따라 별도 보관 가능)",
							"문의/민원 기록: 처리 완료 후 [보관기간] 또는 관계 법령에 따른 기간",
							"접속기록(로그): [보관기간] (보안 및 서비스 안정성 확보 목적)",
							"법령에 따른 보존이 필요한 경우: 해당 법령에서 정한 기간",
						]}
					/>
					<p className="text-xs text-muted-foreground">
						※ 실제 보관기간은 서비스/기관 성격 및 법령 적용 여부에 따라 달라질 수 있으므로
						운영 정책에 맞게 확정해 주세요.
					</p>
				</div>
			),
		},
		{
			id: "s4",
			title: "4. 개인정보의 파기 절차 및 방법",
			content: (
				<div className="space-y-2">
					<DotList
						items={[
							"파기 절차: 목적 달성/보관기간 경과 후 내부 절차에 따라 파기 대상 선별 → 승인 → 파기",
							"파기 방법(전자적 파일): 복구 불가능한 방법으로 영구 삭제",
							"파기 방법(출력물): 분쇄 또는 소각",
						]}
					/>
				</div>
			),
		},
		{
			id: "s5",
			title: "5. 개인정보의 제3자 제공",
			content: (
				<div className="space-y-2">
					<p>
						서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
						다만, 아래에 해당하는 경우에 한하여 제공할 수 있습니다.
					</p>
					<DotList
						items={[
							"이용자가 사전에 동의한 경우",
							"법령에 근거하거나 수사/감독기관의 적법한 절차에 따른 요청이 있는 경우",
							"긴급한 생명/신체/재산의 이익을 위해 필요한 경우(법령이 허용하는 범위 내)",
						]}
					/>
				</div>
			),
		},
		{
			id: "s6",
			title: "6. 개인정보 처리의 위탁",
			content: (
				<div className="space-y-2">
					<p>
						서비스는 원활한 개인정보 업무 처리를 위해 외부 전문업체에 일부 업무를 위탁할 수
						있으며, 위탁 시 관련 법령에 따라 안전하게 관리·감독합니다.
					</p>
					<DotList
						items={[
							"위탁업무 및 수탁자: [예: 클라우드/호스팅/이메일 발송/로그 분석 등 실제 사용 시 기재]",
							"위탁 기간: 위탁 계약 종료 시까지(또는 업무 목적 달성 시까지)",
						]}
					/>
					<p className="text-xs text-muted-foreground">
						※ 현재 위탁이 없다면 “해당 없음”으로 명시해도 됩니다.
					</p>
				</div>
			),
		},
		{
			id: "s7",
			title: "7. 정보주체의 권리·의무 및 행사 방법",
			content: (
				<div className="space-y-2">
					<DotList
						items={[
							"이용자는 언제든지 개인정보 열람, 정정·삭제, 처리정지 요구, 동의 철회를 요청할 수 있습니다.",
							"계정 정보는 [마이페이지/프로필]에서 직접 수정할 수 있습니다(서비스 제공 범위 내).",
							"기타 요청은 고객지원 또는 개인정보보호책임자에게 접수할 수 있습니다.",
						]}
					/>
					<p className="text-xs text-muted-foreground">
						※ 법령상 제한이 있는 경우 일부 권리 행사가 제한될 수 있습니다.
					</p>
				</div>
			),
		},
		{
			id: "s8",
			title: "8. 개인정보의 안전성 확보 조치",
			content: (
				<div className="space-y-2">
					<DotList
						items={[
							"관리적 조치: 내부관리계획 수립, 개인정보 취급자 최소화 및 교육",
							"기술적 조치: 접근권한 관리, 인증정보 보호, 주요 정보 암호화(서버 정책), 보안 취약점 점검",
							"물리적 조치: 전산실/자료보관실 접근 통제(해당 시)",
							"접속기록 보관 및 위변조 방지 조치(해당 시)",
						]}
					/>
				</div>
			),
		},
		{
			id: "s9",
			title: "9. 쿠키 등 자동수집장치의 설치·운영 및 거부",
			content: (
				<div className="space-y-2">
					<p>
						서비스는 사용자 경험 개선 및 세션 유지를 위해 쿠키 또는 로컬 저장소를 사용할 수
						있습니다. 이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 일부 기능이
						정상 동작하지 않을 수 있습니다.
					</p>
					<DotList
						items={[
							"설치·운영 목적: 로그인 상태 유지, 환경설정 저장, 이용 통계(해당 시)",
							"거부 방법: 브라우저 설정에서 쿠키 저장 차단/삭제",
						]}
					/>
				</div>
			),
		},
		{
			id: "s10",
			title: "10. 개인정보보호책임자 및 문의",
			content: (
				<div className="space-y-2">
					<DotList
						items={[
							`개인정보처리자(관리자): ${controller}`,
							`개인정보보호책임자: ${dpo}`,
							`문의: ${contact}`,
							address !== "[주소(선택)]" ? `주소: ${address}` : "주소: [필요 시 기재]",
						]}
					/>
					<p className="text-xs text-muted-foreground">
						※ 개인정보 관련 문의/불만처리/피해구제 요청은 위 연락처로 접수해 주세요.
					</p>
				</div>
			),
		},
		{
			id: "s11",
			title: "11. 고지의 의무(개정 안내)",
			content: (
				<div className="space-y-2">
					<p>
						본 개인정보처리방침의 내용 추가·삭제 및 수정이 있을 경우, 서비스 내 공지사항 또는
						별도 고지 방법을 통해 사전에 안내합니다.
					</p>
					<DotList
						items={[
							`시행일: ${effectiveDate}`,
							`최종 개정일: ${lastUpdated}`,
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
						<CardTitle>개인정보처리방침</CardTitle>
						<CardDescription>
							입찰인사이트는 개인정보보호법 등 관련 법령을 준수하며, 이용자의 개인정보를
							안전하게 처리하기 위해 노력합니다.
						</CardDescription>
					</div>
					<div className="flex flex-col items-end gap-2">
						<Badge variant="secondary">시행일 {effectiveDate}</Badge>
						<Badge variant="outline">최종 개정 {lastUpdated}</Badge>
					</div>
				</div>
				<Separator />
			</CardHeader>

			<CardContent className="p-0 overflow-hidden">
				<ScrollArea className="h-[72vh]">
					<div className="p-6 pr-8">
						<Accordion type="multiple" className="w-full">
							{sections.map((s) => (
								<AccordionItem key={s.id} value={s.id}>
									<AccordionTrigger>{s.title}</AccordionTrigger>
									<AccordionContent>
										<div className="space-y-3 leading-relaxed">{s.content}</div>
									</AccordionContent>
								</AccordionItem>
							))}
						</Accordion>
					</div>
				</ScrollArea>
			</CardContent>

			<CardFooter className="border-t py-3">
				<p className="text-xs text-muted-foreground">
					본 방침은 서비스 구성/기능 및 법령 적용 범위에 따라 수정이 필요할 수 있습니다.
					프로덕션 배포 전, 실제 수집항목·보관기간·위탁/제공 여부를 최종 확정해 주세요.
				</p>
			</CardFooter>
		</Card>
	);
}
