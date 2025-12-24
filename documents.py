"""
IDCTS 문서 생성 모듈 v2.1
- Risk Score 통합
"""

from datetime import datetime
from typing import Optional


def generate_summary_report(
    case_id: str,
    target_url: str,
    domain_list: list[str],
    cdn_classification: dict,
    detected_cdn: str,
    whois_info: Optional[dict],
    content_classification: Optional[dict] = None,
    risk_score: int = 0,
    risk_level: str = "UNKNOWN",
    risk_recommendation: str = "",
    takedown_priority: Optional[list] = None,
    timeline: Optional[dict] = None,
    distribution_structure: Optional[dict] = None,
) -> str:
    """기관 표준 분석 보고서 생성 v2.1"""
    
    now = datetime.now()
    timestamp = now.strftime("%Y-%m-%d %H:%M:%S KST")
    
    # 레벨별 이모지
    level_emoji = {
        "CRITICAL": "🔴",
        "HIGH": "🟠", 
        "MEDIUM": "🟡",
        "LOW": "🟢"
    }.get(risk_level, "⚪")
    
    report = f"""################################################################################
#                                                                              #
#                    IDCTS 분석 보고서 (Summary Report) v2.1                    #
#                         기관 제출용 표준본                                    #
#                                                                              #
################################################################################

================================================================================
1. 케이스 정보
================================================================================

  Case ID      : {case_id}
  분석 일시    : {timestamp}
  대상 URL     : {target_url}
  분석 버전    : IDCTS Core v2.1

================================================================================
2. 위험도 평가 (Risk Assessment)
================================================================================

  ┌─────────────────────────────────────────────────────────────┐
  │                                                             │
  │   {level_emoji} Risk Score: {risk_score}/100 ({risk_level})
  │                                                             │
  │   ▶ 권고 조치:                                              │
  │   {risk_recommendation[:55]}
  │   {risk_recommendation[55:] if len(risk_recommendation) > 55 else ''}
  │                                                             │
  └─────────────────────────────────────────────────────────────┘

  ■ 대응 우선순위: {'즉시 대응 필요' if risk_score >= 70 else '일반 대응'}
  ■ 예상 처리 난이도: {'높음' if detected_cdn == 'Unknown' else '보통'}

================================================================================
3. 콘텐츠 분류 결과
================================================================================
"""
    
    if content_classification:
        report += f"""
  ■ 콘텐츠 유형: {content_classification.get('category_name', 'Unknown')}
  ■ 분류 코드: {content_classification.get('category', 'UNKNOWN')}
  ■ 신뢰도: {content_classification.get('confidence', 'LOW')}
  ■ 미디어 유형: {content_classification.get('media_type', 'unknown')}
  
  ■ 분류 근거:
"""
        for reason in content_classification.get('reasons', []):
            report += f"    - {reason}\n"
        
        report += f"""
  ■ 법적 설명:
{content_classification.get('legal_description', 'N/A')}
"""
    else:
        report += "\n  콘텐츠 분류 정보 없음\n"
    
    report += f"""
================================================================================
4. CDN/인프라 분석 결과
================================================================================

  ■ 주요 CDN: {detected_cdn}
  ■ CDN별 도메인 현황:
"""
    
    for cdn_name, domains in cdn_classification.items():
        report += f"\n    [{cdn_name}] ({len(domains)}개)\n"
        for d in domains[:5]:
            report += f"      - {d}\n"
        if len(domains) > 5:
            report += f"      ... 외 {len(domains) - 5}개\n"
    
    report += f"""
================================================================================
5. 관련 도메인 목록 (총 {len(domain_list)}개)
================================================================================
"""
    
    for i, domain in enumerate(domain_list[:20], 1):
        report += f"  {i:3}. {domain}\n"
    if len(domain_list) > 20:
        report += f"  ... 외 {len(domain_list) - 20}개 도메인\n"
    
    # WHOIS 정보
    report += f"""
================================================================================
6. WHOIS 정보
================================================================================
"""
    
    if whois_info:
        report += f"""
  등록기관     : {whois_info.get('registrar', 'None')}
  국가         : {whois_info.get('country', 'None')}
  조직         : {whois_info.get('org', 'None')}
  Abuse 이메일 : {whois_info.get('emails', 'None')}
  생성일       : {whois_info.get('creation_date', 'None')}
  만료일       : {whois_info.get('expiration_date', 'None')}
"""
    else:
        report += "\n  WHOIS 정보를 조회할 수 없습니다. (Privacy Protection 또는 미등록)\n"
    
    # 신고 대상 우선순위
    if takedown_priority:
        report += f"""
================================================================================
7. 신고 대상 우선순위
================================================================================
"""
        for i, p in enumerate(takedown_priority, 1):
            report += f"""
[{i}순위] {p.get('type', 'Unknown')}: {p.get('target', 'N/A')}
    난이도: {p.get('difficulty', 'UNKNOWN')}
    연락처: {p.get('contact', 'N/A')}
    예상 응답: {p.get('response_time', '알 수 없음')}
    권고 조치: {p.get('action', 'N/A')}
"""
    
    # 타임라인
    if timeline:
        report += f"""
================================================================================
8. 분석 타임라인
================================================================================

  시작 시각: {timeline.get('start_time', 'N/A')}
  종료 시각: {timeline.get('end_time', 'N/A')}
  총 소요 시간: {timeline.get('total_duration', 'N/A')}
"""
    
    # 권고 조치 (강화된 버전)
    report += f"""
================================================================================
9. 권고 조치 (Recommended Actions)
================================================================================

  ╔═══════════════════════════════════════════════════════════════════════════╗
  ║  ▶ 핵심 권고: 해외 CDN/호스팅 사업자 대상 우선적 삭제 요청을 권고함        ║
  ╚═══════════════════════════════════════════════════════════════════════════╝

  [1단계] 증거 보존 (즉시)
     - 본 보고서 및 첨부 문서 안전하게 보관
     - 추가 스크린샷 및 HAR 파일 확보 권장
     - 원본 URL 아카이브 (archive.org 등)

  [2단계] CDN/호스팅 신고 (24-48시간 내)
     - 주요 CDN ({detected_cdn})에 Abuse Report 접수
     - 첨부된 dmca_or_abuse.txt 활용
     - 응답 없을 시 상위 호스팅 업체로 에스컬레이션

  [3단계] 도메인 등록기관 신고 (48-72시간 내)
     - WHOIS 정보 기반 registrar에 DMCA Notice 발송
     - ICANN UDRP 절차 검토 (필요시)

  [4단계] 관계 기관 신고 (병행)
     - 방송통신심의위원회 불법정보 신고 (https://www.kocsc.or.kr)
     - 필요시 경찰청 사이버수사대 신고

  [5단계] 모니터링 (지속)
     - 삭제 여부 주기적 확인
     - 미러 사이트 출현 감시
     - 재업로드 시 추가 신고

================================================================================
10. 주의사항 및 면책조항
================================================================================

  ※ 본 보고서는 자동 분석 결과이며, 법적 효력을 갖는 공식 문서가 아닙니다.
  ※ 실제 법적 조치 시에는 전문 법률 자문을 권장합니다.
  ※ 콘텐츠 분류는 자동화된 패턴 분석 결과이며, 오분류 가능성이 있습니다.
  ※ Risk Score는 참고용 지표이며, 최종 판단은 담당자의 검토가 필요합니다.
  ※ 본 시스템은 콘텐츠를 직접 삭제하지 않으며, 분석 및 문서 생성만 수행합니다.

################################################################################
#                                                                              #
#          Generated by IDCTS Core v2.1 (Illegal Digital Content              #
#                         Tracking System)                                     #
#                                                                              #
#                    © 2024 AboutUs Digital Undertaker                         #
#                         https://aboutusforyou.com                            #
#                                                                              #
################################################################################
"""
    
    return report


def generate_legal_statement(
    case_id: str,
    target_url: str,
    domain_list: list[str],
    risk_score: int = 0,
    risk_level: str = "UNKNOWN",
) -> str:
    """법적 진술서 v2.1"""
    
    now = datetime.now()
    date_str = now.strftime("%Y년 %m월 %d일")
    
    return f"""################################################################################
#                                                                              #
#                         법적 진술서 (Legal Statement)                         #
#                                                                              #
################################################################################

사건 번호: {case_id}
작성 일자: {date_str}

================================================================================
1. 당사자 정보
================================================================================

진술인 성명: ______________________________

생년월일: ______________________________

연락처: ______________________________

이메일: ______________________________

================================================================================
2. 대상 콘텐츠 정보
================================================================================

대상 URL: {target_url}

위험도 평가: {risk_score}점 ({risk_level})

관련 도메인 수: {len(domain_list)}개

주요 관련 도메인:
{chr(10).join(f'  - {d}' for d in domain_list[:10])}

================================================================================
3. 진술 내용
================================================================================

본인은 위 URL에 게시된 콘텐츠가 본인의 동의 없이 촬영/유포된 것임을 
진술합니다.

해당 콘텐츠로 인해 본인은 다음과 같은 피해를 입었습니다:

□ 정신적 고통
□ 사회적 평판 손상  
□ 경제적 피해
□ 기타: ______________________________

본인은 해당 콘텐츠의 즉각적인 삭제를 요청하며, 필요시 법적 조치를 
취할 의사가 있음을 밝힙니다.

================================================================================
4. 첨부 자료
================================================================================

□ 신분증 사본
□ 스크린샷
□ 기타 증거자료: ______________________________

================================================================================
5. 동의 및 서명
================================================================================

본인은 위 진술 내용이 사실임을 확인하며, 본 진술서가 콘텐츠 삭제 
요청 및 법적 절차에 활용되는 것에 동의합니다.

또한, 본 진술서에 허위 사실이 포함된 경우 그에 따른 법적 책임을 
질 것을 서약합니다.


서명: ______________________________

날짜: {date_str}


================================================================================
주의사항
================================================================================

※ 본 진술서는 콘텐츠 삭제 요청의 근거 자료로 활용됩니다.
※ 허위 진술 시 법적 책임이 따를 수 있습니다.
※ 원본은 안전하게 보관하시기 바랍니다.

################################################################################
#          Generated by IDCTS Core v2.1 - AboutUs Digital Undertaker          #
################################################################################
"""


def generate_dmca_abuse_notice(
    case_id: str,
    target_url: str,
    domain_list: list[str],
    detected_cdn: str,
    content_type: str = "Unknown",
    risk_score: int = 0,
    risk_level: str = "UNKNOWN",
) -> str:
    """DMCA/Abuse Notice v2.1"""
    
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    
    # 긴급도 표시
    urgency = "URGENT" if risk_score >= 70 else "STANDARD"
    
    return f"""################################################################################
#                                                                              #
#                    DMCA TAKEDOWN NOTICE / ABUSE REPORT                       #
#                                                                              #
################################################################################

Case Reference: {case_id}
Date: {date_str}
Priority: {urgency} (Risk Score: {risk_score}/100)

================================================================================
RECIPIENT INFORMATION
================================================================================

To: [CDN/Hosting Provider Abuse Department]
    or appropriate abuse reporting channel
    
    CDN Provider: {detected_cdn}

================================================================================
SUBJECT
================================================================================

{urgency}: DMCA Takedown Request - {content_type}
Risk Assessment: {risk_level} ({risk_score}/100)

================================================================================
1. INFRINGING CONTENT LOCATION
================================================================================

Primary URL:
{target_url}

Associated Domains ({len(domain_list)} total):
{chr(10).join(f'  - {d}' for d in domain_list[:15])}
{f'  ... and {len(domain_list) - 15} more domains' if len(domain_list) > 15 else ''}

================================================================================
2. NATURE OF VIOLATION
================================================================================

The content at the above URL(s) constitutes:

[X] Non-consensual intimate imagery (NCII)
[X] Violation of privacy rights
[X] Potential criminal content under applicable laws

This content was uploaded and distributed WITHOUT the consent of the depicted
individual(s).

Risk Assessment Summary:
- Overall Risk Score: {risk_score}/100 ({risk_level})
- Recommended Action: {'Immediate takedown required' if risk_score >= 70 else 'Standard processing'}

================================================================================
3. REQUESTED ACTION
================================================================================

I hereby request that you:

a) Immediately remove or disable access to the infringing content
b) Preserve all associated metadata and logs for potential legal proceedings
c) Prevent re-upload of the same or similar content
d) Provide confirmation of the takedown action within {'24' if risk_score >= 70 else '48'} hours

================================================================================
4. STATEMENT OF GOOD FAITH
================================================================================

I have a good faith belief that the use of the material described above is
not authorized by the copyright owner, its agent, or the law.

================================================================================
5. STATEMENT OF ACCURACY
================================================================================

The information in this notification is accurate, and under penalty of
perjury, I am authorized to act on behalf of the owner of the exclusive
rights that are allegedly being infringed.

================================================================================
6. CONTACT INFORMATION
================================================================================

Name: [YOUR NAME]
Title/Position: [YOUR TITLE]
Organization: [YOUR ORGANIZATION]
Address: [YOUR ADDRESS]
Email: [YOUR EMAIL]
Phone: [YOUR PHONE]

================================================================================
7. ATTACHMENTS
================================================================================

The following documents are attached to support this request:

- Summary analysis report (summary_report.txt)
- Legal statement (legal_statement.txt)
- Evidence package ({case_id}.zip)
- [Additional evidence as needed]

================================================================================
SIGNATURE
================================================================================

I declare under penalty of perjury that the information in this notification
is accurate and that I am authorized to act on behalf of the rights holder.


Signature: _________________________

Printed Name: [YOUR NAME]

Date: {date_str}


################################################################################
LEGAL NOTICE
################################################################################

This takedown request is made pursuant to:
- Digital Millennium Copyright Act (17 U.S.C. § 512)
- EU General Data Protection Regulation (GDPR)
- Korean Act on Promotion of Information and Communications Network 
  Utilization and Information Protection (정보통신망법)
- Applicable international laws regarding non-consensual intimate imagery

Failure to comply may result in legal action.

################################################################################
#                                                                              #
#          Generated by IDCTS Core v2.1 - AboutUs Digital Undertaker          #
#                         https://aboutusforyou.com                            #
#                                                                              #
################################################################################
"""
