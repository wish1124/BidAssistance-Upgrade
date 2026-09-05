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

export function TermsAndConditionsPage() {
	const effectiveDate = "[2026-01-20]";
	const operator = "[입찰인사이트 운영팀/회사명]";
	const contact = "[고객지원 연락처 또는 이메일]";
	const jurisdiction = "대한민국";
	const governingCourt = "[관할 법원(예: 서울중앙지방법원)]";

	const sections: Section[] = [
		{
			id: "t1",
			title: "제1조 (목적)",
			content: (
				<div className="space-y-2">
					<p>
						본 약관은 {operator}(이하 “운영자”)가 제공하는 “입찰인사이트” 서비스(웹/앱 포함)의
						이용과 관련하여 운영자와 이용자 간의 권리·의무 및 책임사항, 기타 필요한 사항을
						규정함을 목적으로 합니다.
					</p>
				</div>
			),
		},
		{
			id: "t2",
			title: "제2조 (정의)",
			content: (
				<div className="space-y-2">
					<DotList
						items={[
							"“서비스”란 운영자가 제공하는 입찰 정보 조회, 알림, 커뮤니티, 고객지원 등 일체의 기능을 말합니다.",
							"“이용자”란 본 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.",
							"“회원”이란 이메일 등으로 계정을 생성하고 서비스에 로그인하여 이용하는 자를 말합니다.",
							"“콘텐츠”란 이용자가 서비스에 게시/업로드하는 글, 이미지, 파일, 링크 등 모든 자료를 말합니다.",
						]}
					/>
				</div>
			),
		},
		{
			id: "t3",
			title: "제3조 (약관의 효력 및 변경)",
			content: (
				<div className="space-y-2">
					<DotList
						items={[
							"본 약관은 서비스 화면에 게시하거나 기타 방법으로 공지함으로써 효력이 발생합니다.",
							"운영자는 관련 법령을 위배하지 않는 범위에서 약관을 변경할 수 있습니다.",
							"약관 변경 시 시행일 및 변경 사유를 명시하여 서비스 내 공지사항 등으로 사전 고지합니다.",
							"이용자가 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.",
						]}
					/>
				</div>
			),
		},
		{
			id: "t4",
			title: "제4조 (회원가입 및 계정관리)",
			content: (
				<div className="space-y-2">
					<DotList
						items={[
							"회원가입은 이용자가 약관 및 개인정보처리방침에 동의하고 필요한 정보를 입력하여 신청함으로써 성립합니다.",
							"이용자는 본인 명의의 정확한 정보를 제공해야 하며, 허위 정보 제공으로 발생하는 불이익은 이용자에게 있습니다.",
							"이용자는 계정정보(비밀번호 등)를 안전하게 관리할 책임이 있으며, 제3자에게 양도·대여·공유할 수 없습니다.",
							"운영자는 부정이용이 의심되는 경우 해당 계정에 대해 이용 제한 조치를 할 수 있습니다.",
						]}
					/>
				</div>
			),
		},
		{
			id: "t5",
			title: "제5조 (서비스의 제공 및 변경/중단)",
			content: (
				<div className="space-y-2">
					<DotList
						items={[
							"운영자는 안정적인 서비스 제공을 위해 서비스 내용을 변경하거나 기능을 추가/중단할 수 있습니다.",
							"정기점검, 시스템 장애, 천재지변 등 불가항력 사유로 서비스 제공이 일시 중단될 수 있습니다.",
							"중요한 변경 또는 중단이 예상되는 경우, 운영자는 사전에 공지합니다(긴급한 경우 사후 공지 가능).",
						]}
					/>
				</div>
			),
		},
		{
			id: "t6",
			title: "제6조 (이용자의 의무 및 금지행위)",
			content: (
				<div className="space-y-2">
					<p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
					<DotList
						items={[
							"타인의 개인정보/계정정보 도용 또는 무단 사용",
							"서비스의 정상 운영을 방해하는 행위(과도한 요청, 취약점 악용 시도 등)",
							"불법 정보, 음란물, 혐오/차별, 명예훼손, 저작권 침해 콘텐츠 게시",
							"악성코드/피싱 링크/유해 파일 업로드 또는 유포",
							"운영자 또는 제3자의 지식재산권/영업비밀 침해",
							"관련 법령 및 본 약관, 운영정책 위반 행위",
						]}
					/>
				</div>
			),
		},
		{
			id: "t7",
			title: "제7조 (콘텐츠의 관리 및 권리)",
			content: (
				<div className="space-y-2">
					<DotList
						items={[
							"이용자가 게시한 콘텐츠에 대한 권리는 이용자에게 귀속됩니다. 다만, 서비스 운영/노출/백업/전송을 위해 필요한 범위에서 운영자에게 이용 허락이 부여될 수 있습니다.",
							"이용자는 게시하는 콘텐츠가 제3자의 권리를 침해하지 않도록 보증하며, 침해로 인한 책임은 이용자에게 있습니다.",
							"운영자는 법령/약관/운영정책을 위반하거나 권리 침해 소지가 있는 콘텐츠를 사전 통지 없이 임시조치 또는 삭제할 수 있습니다.",
						]}
					/>
				</div>
			),
		},
		{
			id: "t8",
			title: "제8조 (개인정보 보호)",
			content: (
				<div className="space-y-2">
					<p>
						운영자는 관련 법령에 따라 이용자의 개인정보를 보호하며, 개인정보의 수집·이용·보관·파기 등에 관한 사항은
						“개인정보처리방침”에 따릅니다.
					</p>
				</div>
			),
		},
		{
			id: "t9",
			title: "제9조 (이용 제한 및 해지/탈퇴)",
			content: (
				<div className="space-y-2">
					<DotList
						items={[
							"이용자가 약관 또는 운영정책을 위반하는 경우 운영자는 경고, 이용정지, 게시물 삭제, 계정 제한 등의 조치를 할 수 있습니다.",
							"회원은 언제든지 서비스 내 제공되는 방법으로 탈퇴를 요청할 수 있습니다(단, 일부 정보는 법령/내부정책에 따라 보관될 수 있음).",
							"부정이용 방지 및 분쟁 처리를 위해 필요한 최소 정보는 일정 기간 별도 보관될 수 있습니다.",
						]}
					/>
				</div>
			),
		},
		{
			id: "t10",
			title: "제10조 (면책 및 책임 제한)",
			content: (
				<div className="space-y-2">
					<DotList
						items={[
							"운영자는 법령이 허용하는 범위 내에서 서비스 제공과 관련한 책임을 제한할 수 있습니다.",
							"운영자는 이용자가 게시한 정보/콘텐츠의 정확성·신뢰성에 대해 보증하지 않으며, 이용자가 이를 신뢰하여 발생한 손해에 대해 책임을 지지 않습니다.",
							"운영자는 무료로 제공되는 서비스의 장애/중단으로 발생한 손해에 대해 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.",
						]}
					/>
					<p className="text-xs text-muted-foreground">
						※ 유료 서비스가 있는 경우, 결제/환불/청약철회 및 책임 범위를 별도 조항으로 보강하는 것이 일반적입니다.
					</p>
				</div>
			),
		},
		{
			id: "t11",
			title: "제11조 (분쟁 해결 및 준거법)",
			content: (
				<div className="space-y-2">
					<DotList
						items={[
							`본 약관은 ${jurisdiction} 법령을 준거법으로 합니다.`,
							`서비스 이용과 관련하여 분쟁이 발생한 경우, 운영자와 이용자는 성실히 협의하여 해결합니다.`,
							`협의가 이루어지지 않을 경우 ${governingCourt}을(를) 전속 관할로 합니다(법령이 허용하는 범위 내).`,
						]}
					/>
				</div>
			),
		},
		{
			id: "t12",
			title: "부칙",
			content: (
				<div className="space-y-2">
					<DotList
						items={[
							`본 약관은 ${effectiveDate}부터 시행합니다.`,
							`문의: ${contact}`,
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
						<CardTitle>서비스 이용약관</CardTitle>
						<CardDescription>
							입찰인사이트 서비스 이용과 관련된 기본 규칙(권리·의무·책임사항)을 안내합니다.
						</CardDescription>
					</div>
					<div className="flex flex-col items-end gap-2">
						<Badge variant="secondary">시행일 {effectiveDate}</Badge>
						<Badge variant="outline">{operator}</Badge>
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
					약관은 서비스 기능/과금/운영정책(예: 유료 플랜, 환불, SLA, B2B 계약 조건 등)에 따라
					보강이 필요할 수 있습니다. 실제 운영 정책에 맞게 조항을 확정해 주세요.
				</p>
			</CardFooter>
		</Card>
	);
}
