"""
IDCTS Core v2.1 - Illegal Digital Content Tracking System
FastAPI 메인 애플리케이션 (Risk Score 통합)
"""

import os
import uuid
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .analyzer import analyze_url, extract_domain
from .cdn import classify_domains, get_primary_cdn
from .whois_lookup import lookup_whois
from .documents import (
    generate_summary_report,
    generate_legal_statement,
    generate_dmca_abuse_notice,
)
from .zipper import create_evidence_package
from .classifier import classify_content
from .priority import generate_takedown_priority
from .timeline import AnalysisTimeline
from .history import AnalysisHistory
from .risk_score import calculate_risk_score, detect_risk_factors


# FastAPI 앱 생성
app = FastAPI(
    title="IDCTS Core",
    description="""
## Illegal Digital Content Tracking System v2.1

불법 디지털 콘텐츠의 유통 구조를 분석하고 법적 대응을 위한 문서를 자동 생성하는 시스템입니다.

### 주요 기능
- URL 구조 분석 (프론트 → 중계 → CDN → 실제 호스팅)
- CDN 자동 식별 (Cloudflare, CDN77, CloudFront, Akamai 등)
- WHOIS 정보 조회
- **Risk Score 자동 계산 (0-100)**
- 법적 문서 자동 생성 (보고서, 진술서, DMCA Notice)
- 증거 패키지 ZIP 생성

### ⚠️ 주의사항
이 시스템은 **콘텐츠를 직접 삭제하지 않습니다.**
분석 결과와 문서를 제공하여 법적 대응을 지원합니다.
    """,
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 출력 디렉토리 설정
OUTPUT_DIR = Path(__file__).parent.parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

# 분석 히스토리
analysis_history = AnalysisHistory()


# === Request/Response Models ===

class AnalyzeRequest(BaseModel):
    """분석 요청"""
    url: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://example.com"
            }
        }


class RiskScoreResponse(BaseModel):
    """Risk Score 응답"""
    score: int
    level: str
    recommendation: str
    breakdown: dict


class AnalyzeResponse(BaseModel):
    """분석 응답"""
    case_id: str
    target_url: str
    detected_cdn: str
    domain_list: list[str]
    cdn_classification: dict[str, list[str]]
    whois_info: Optional[dict] = None
    risk_score: Optional[int] = None
    risk_level: Optional[str] = None
    risk_recommendation: Optional[str] = None
    risk_breakdown: Optional[dict] = None
    content_classification: Optional[dict] = None
    takedown_priority: Optional[list] = None
    zip_file_path: str
    download_url: str
    status: str
    message: str


class ErrorResponse(BaseModel):
    """에러 응답"""
    error: str
    detail: str


# === Helper Functions ===

def generate_case_id() -> str:
    """케이스 ID 생성"""
    date_str = datetime.now().strftime("%Y%m%d")
    unique_hash = hashlib.md5(
        f"{datetime.now().isoformat()}{uuid.uuid4()}".encode()
    ).hexdigest()[:8].upper()
    return f"IDCTS-{date_str}-{unique_hash}"


# === API Endpoints ===

@app.get("/", tags=["Info"])
async def root():
    """API 상태 확인"""
    return {
        "service": "IDCTS Core",
        "version": "2.1.0",
        "status": "running",
        "features": ["risk_score", "content_classification", "takedown_priority"],
        "docs": "/docs",
    }


@app.get("/health", tags=["Info"])
async def health_check():
    """헬스체크"""
    return {"status": "healthy", "version": "2.1.0"}


@app.post(
    "/analyze",
    response_model=AnalyzeResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    tags=["Analysis"],
    summary="URL 분석 및 증거 패키지 생성 (v2.1 - Risk Score 포함)",
    description="""
대상 URL을 분석하여 유통 구조를 파악하고, 법적 대응을 위한 문서 패키지를 생성합니다.

### v2.1 신규 기능
- **Risk Score**: 0-100점 위험도 자동 계산
- **Risk Level**: CRITICAL / HIGH / MEDIUM / LOW
- **권고 조치**: 위험도 기반 대응 권고사항

### 분석 내용
1. HTML 내 iframe, video, source, img 태그 분석
2. 관련 URL 및 도메인 추출
3. CDN 유형 자동 식별
4. WHOIS 정보 조회
5. Risk Score 계산
6. 법적 문서 자동 생성
    """,
)
async def analyze_url_endpoint(request: AnalyzeRequest):
    """URL 분석 및 Risk Score 계산"""
    
    # 타임라인 시작
    timeline = AnalysisTimeline()
    timeline.start()
    
    try:
        target_url = request.url.strip()
        
        if not target_url:
            raise HTTPException(status_code=400, detail="URL이 비어있습니다.")
        
        if not target_url.startswith(("http://", "https://")):
            target_url = "https://" + target_url
        
        case_id = generate_case_id()
        
        # 1. URL 분석
        timeline.add_event("URL_ANALYSIS_START", "URL_ANALYSIS 시작")
        analysis_result = analyze_url(target_url)
        domain_list = analysis_result.get("domains", [])
        extracted_urls = analysis_result.get("urls", [])
        timeline.add_event(
            "URL_ANALYSIS_END", 
            "URL_ANALYSIS 완료",
            {"domains_found": len(domain_list)}
        )
        
        # 2. CDN 분류
        timeline.add_event("CDN_CLASSIFICATION_START", "CDN_CLASSIFICATION 시작")
        cdn_classification = classify_domains(domain_list)
        detected_cdn = get_primary_cdn(cdn_classification)
        timeline.add_event(
            "CDN_CLASSIFICATION_END",
            "CDN_CLASSIFICATION 완료",
            {"detected_cdn": detected_cdn}
        )
        
        # 3. WHOIS 조회
        timeline.add_event("WHOIS_LOOKUP_START", "WHOIS_LOOKUP 시작")
        main_domain = extract_domain(target_url)
        whois_info = lookup_whois(main_domain)
        timeline.add_event(
            "WHOIS_LOOKUP_END",
            "WHOIS_LOOKUP 완료",
            {"domain": main_domain}
        )
        
        # 4. 콘텐츠 분류
        timeline.add_event("CONTENT_CLASSIFICATION_START", "CONTENT_CLASSIFICATION 시작")
        content_classification = classify_content(
            url=target_url,
            domains=domain_list,
            extracted_urls=extracted_urls
        )
        timeline.add_event(
            "CONTENT_CLASSIFICATION_END",
            "CONTENT_CLASSIFICATION 완료",
            {
                "category": content_classification.get("category", "UNKNOWN"),
                "confidence": content_classification.get("confidence", "LOW")
            }
        )
        
        # 5. Risk Score 계산 (v2.1 신규)
        timeline.add_event("RISK_SCORE_START", "RISK_SCORE 계산 시작")
        risk_factors = detect_risk_factors(domain_list)
        risk_score_data = calculate_risk_score(
            detected_cdn=detected_cdn,
            domain_list=domain_list,
            whois_info=whois_info,
            content_type=content_classification.get("category", "UNKNOWN"),
            has_telegram=risk_factors.get("has_telegram", False),
            has_gambling_ads=risk_factors.get("has_gambling_ads", False),
        )
        timeline.add_event(
            "RISK_SCORE_END",
            "RISK_SCORE 계산 완료",
            {
                "score": risk_score_data.get("score", 0),
                "level": risk_score_data.get("level", "UNKNOWN")
            }
        )
        
        # 6. 신고 대상 우선순위
        timeline.add_event("PRIORITY_RANKING_START", "PRIORITY_RANKING 시작")
        takedown_priority = generate_takedown_priority(
            detected_cdn=detected_cdn,
            domain_list=domain_list,
            whois_info=whois_info,
            cdn_classification=cdn_classification
        )
        timeline.add_event(
            "PRIORITY_RANKING_END",
            "PRIORITY_RANKING 완료",
            {"total_targets": len(takedown_priority)}
        )
        
        # 타임라인 종료
        timeline.end()
        timeline_data = timeline.get_summary()
        
        # 7. 문서 생성
        summary_report = generate_summary_report(
            case_id=case_id,
            target_url=target_url,
            domain_list=domain_list,
            cdn_classification=cdn_classification,
            detected_cdn=detected_cdn,
            whois_info=whois_info,
            content_classification=content_classification,
            risk_score=risk_score_data.get("score", 0),
            risk_level=risk_score_data.get("level", "UNKNOWN"),
            risk_recommendation=risk_score_data.get("recommendation", ""),
            takedown_priority=takedown_priority,
            timeline=timeline_data,
        )
        
        legal_statement = generate_legal_statement(
            case_id=case_id,
            target_url=target_url,
            domain_list=domain_list,
            risk_score=risk_score_data.get("score", 0),
            risk_level=risk_score_data.get("level", "UNKNOWN"),
        )
        
        dmca_notice = generate_dmca_abuse_notice(
            case_id=case_id,
            target_url=target_url,
            domain_list=domain_list,
            detected_cdn=detected_cdn,
            content_type=content_classification.get("category_name", "Unknown"),
            risk_score=risk_score_data.get("score", 0),
            risk_level=risk_score_data.get("level", "UNKNOWN"),
        )
        
        # 8. ZIP 패키지 생성
        zip_path = create_evidence_package(
            case_id=case_id,
            summary_report=summary_report,
            legal_statement=legal_statement,
            dmca_notice=dmca_notice,
            output_dir=OUTPUT_DIR,
        )
        
        # 히스토리 저장
        analysis_history.add_record(
            case_id=case_id,
            target_url=target_url,
            detected_cdn=detected_cdn,
            domain_count=len(domain_list),
            risk_score=risk_score_data.get("score", 0),
            risk_level=risk_score_data.get("level", "UNKNOWN"),
        )
        
        return AnalyzeResponse(
            case_id=case_id,
            target_url=target_url,
            detected_cdn=detected_cdn,
            domain_list=domain_list,
            cdn_classification=cdn_classification,
            whois_info=whois_info,
            risk_score=risk_score_data.get("score", 0),
            risk_level=risk_score_data.get("level", "UNKNOWN"),
            risk_recommendation=risk_score_data.get("recommendation", ""),
            risk_breakdown=risk_score_data.get("breakdown", {}),
            content_classification=content_classification,
            takedown_priority=takedown_priority,
            zip_file_path=str(zip_path),
            download_url=f"/download/{zip_path.name}",
            status="success",
            message=f"분석 완료. Risk Score: {risk_score_data.get('score', 0)} ({risk_score_data.get('level', 'UNKNOWN')})",
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"분석 중 오류가 발생했습니다: {str(e)}"
        )


@app.get(
    "/download/{filename}",
    tags=["Download"],
    summary="증거 패키지 다운로드",
)
async def download_package(filename: str):
    """생성된 ZIP 패키지 다운로드"""
    
    file_path = OUTPUT_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/zip",
    )


@app.get(
    "/history",
    tags=["History"],
    summary="분석 히스토리 조회",
)
async def get_history(limit: int = 20):
    """최근 분석 히스토리 조회"""
    return analysis_history.get_recent(limit)


@app.get(
    "/stats",
    tags=["Stats"],
    summary="분석 통계",
)
async def get_stats():
    """분석 통계 조회"""
    return analysis_history.get_stats()
