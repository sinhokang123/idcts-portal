import React, { useState, useRef } from 'react';

// IDCTS v2.1 고객 포털 - 불법 콘텐츠 추적 시스템
export default function IDCTSPortal() {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [harAnalysis, setHarAnalysis] = useState(null);
  const fileInputRef = useRef(null);
  
  const API_BASE = 'https://idcts-core-gmzv.onrender.com';

  const progressSteps = [
    { pct: 10, text: 'URL 구조 분석 중...' },
    { pct: 25, text: 'HTML 파싱 및 미디어 추출...' },
    { pct: 40, text: 'CDN 인프라 식별 중...' },
    { pct: 55, text: 'WHOIS 정보 조회 중...' },
    { pct: 70, text: '위험도 점수 계산 중...' },
    { pct: 85, text: '법적 문서 생성 중...' },
    { pct: 95, text: '증거 패키지 압축 중...' },
  ];

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(f => 
      f.name.endsWith('.har') || 
      f.type.startsWith('image/')
    );
    setUploadedFiles(prev => [...prev, ...validFiles]);
    
    // 🔥 HAR 파일이면 자동으로 분석!
    for (const file of validFiles) {
      if (file.name.endsWith('.har')) {
        await analyzeHarFile(file);
      }
    }
  };

  // 🔥 HAR 파일 분석 함수
  const analyzeHarFile = async (file) => {
    setProgressText('HAR 파일 분석 중...');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_BASE}/analyze-har`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('HAR 분석 실패');
      }
      
      const data = await response.json();
      setHarAnalysis(data);
      
    } catch (err) {
      console.error('HAR 분석 에러:', err);
      // 에러나도 계속 진행 가능하게
    }
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    // HAR 파일 삭제하면 분석 결과도 삭제
    if (uploadedFiles[index]?.name.endsWith('.har')) {
      setHarAnalysis(null);
    }
  };

  const analyzeUrl = async () => {
    if (!url.trim()) {
      setError('URL을 입력해주세요.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setProgress(0);

    let stepIndex = 0;
    const progressInterval = setInterval(() => {
      if (stepIndex < progressSteps.length) {
        setProgress(progressSteps[stepIndex].pct);
        setProgressText(progressSteps[stepIndex].text);
        stepIndex++;
      }
    }, 800);

    try {
      const response = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('분석 중 오류가 발생했습니다.');
      }

      const data = await response.json();
      
      // 🔥 HAR 분석 결과가 있으면 합치기
      if (harAnalysis) {
        data.har_analysis = harAnalysis;
      }
      
      setProgress(100);
      setProgressText('분석 완료!');
      
      setTimeout(() => {
        setResult(data);
        setIsAnalyzing(false);
      }, 500);

    } catch (err) {
      clearInterval(progressInterval);
      setError(err.message || '서버 연결에 실패했습니다.');
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (score) => {
    if (score >= 80) return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' };
    if (score >= 60) return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50' };
    if (score >= 40) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50' };
    return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' };
  };

  const getRiskLabel = (score) => {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  };

  const resetAnalysis = () => {
    setResult(null);
    setUrl('');
    setProgress(0);
    setProgressText('');
    setUploadedFiles([]);
    setHarAnalysis(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden relative">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/3 rounded-full blur-[150px]" />
        
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center">
              <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">IDCTS</h1>
              <p className="text-[10px] text-white/40 tracking-widest uppercase">Digital Content Tracker v2.1</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>시스템 정상</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        
        {!result ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black mb-4 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                불법 콘텐츠 추적 시스템
              </h2>
              <p className="text-white/50 text-lg">
                URL을 입력하면 유통 구조를 분석하고 법적 대응 문서를 자동 생성합니다
              </p>
            </div>

            {/* URL Input */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 rounded-2xl blur-xl opacity-50" />
              <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <label className="block text-sm font-medium text-white/60 mb-3">분석할 URL</label>
                <div className="flex gap-3">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/video/12345"
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    disabled={isAnalyzing}
                    onKeyPress={(e) => e.key === 'Enter' && !isAnalyzing && analyzeUrl()}
                  />
                  <button
                    onClick={analyzeUrl}
                    disabled={isAnalyzing}
                    className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/25"
                  >
                    {isAnalyzing ? '분석 중...' : '분석 시작'}
                  </button>
                </div>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="relative mb-6">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <label className="block text-sm font-medium text-white/60 mb-3">
                  🔥 HAR 파일 업로드 (네트워크 증거 분석)
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all"
                >
                  <svg className="w-10 h-10 mx-auto mb-3 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-white/50 text-sm mb-1">HAR 파일을 업로드하면 스트리밍 증거를 자동 분석합니다</p>
                  <p className="text-white/30 text-xs">.har 파일 (브라우저 개발자도구 → 네트워크 → HAR로 저장)</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".har,.png,.jpg,.jpeg"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-black/30 rounded-lg px-4 py-2">
                        <div className="flex items-center gap-3">
                          <span className="text-cyan-400">
                            {file.name.endsWith('.har') ? '📄' : '🖼️'}
                          </span>
                          <span className="text-sm text-white/70">{file.name}</span>
                          <span className="text-xs text-white/30">({(file.size / 1024).toFixed(1)} KB)</span>
                          {file.name.endsWith('.har') && harAnalysis && (
                            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                              ✓ 분석 완료
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => removeFile(idx)}
                          className="text-white/30 hover:text-red-400 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 🔥 HAR 분석 미리보기 */}
                {harAnalysis && (
                  <div className="mt-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">🔍</span>
                      <span className="font-bold text-purple-400">HAR 네트워크 분석 결과</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="bg-black/30 rounded-lg p-3">
                        <div className="text-xs text-white/40">총 요청</div>
                        <div className="text-xl font-bold text-white">{harAnalysis.total_requests || 0}</div>
                      </div>
                      <div className="bg-black/30 rounded-lg p-3">
                        <div className="text-xs text-white/40">도메인</div>
                        <div className="text-xl font-bold text-cyan-400">{harAnalysis.unique_domains?.length || 0}</div>
                      </div>
                      <div className="bg-black/30 rounded-lg p-3">
                        <div className="text-xs text-white/40">스트리밍 제공자</div>
                        <div className={`text-xl font-bold ${harAnalysis.is_streaming_provider ? 'text-red-400' : 'text-green-400'}`}>
                          {harAnalysis.is_streaming_provider ? 'YES' : 'NO'}
                        </div>
                      </div>
                    </div>
                    {harAnalysis.is_streaming_provider && (
                      <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <div className="text-xs text-red-400 font-bold mb-1">⚠️ 스트리밍 제공 증거 발견</div>
                        <div className="text-xs text-white/60">{harAnalysis.summary}</div>
                        <div className="text-xs text-white/40 mt-1">신뢰도: {harAnalysis.confidence}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                <p className="text-red-400 text-sm flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </p>
              </div>
            )}

            {/* Progress Bar */}
            {isAnalyzing && (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-white/60">{progressText}</span>
                  <span className="text-sm font-mono text-cyan-400">{progress}%</span>
                </div>
                <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Features Grid */}
            {!isAnalyzing && (
              <div className="grid grid-cols-4 gap-4 mt-12">
                {[
                  { icon: '🔍', title: 'URL 분석', desc: 'iframe, video 추출' },
                  { icon: '🌐', title: 'CDN 식별', desc: 'Cloudflare, Akamai 등' },
                  { icon: '📄', title: 'HAR 분석', desc: '네트워크 증거 추출' },
                  { icon: '📋', title: '문서 생성', desc: 'DMCA, 진술서 자동' },
                ].map((feature, i) => (
                  <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-4 text-center hover:border-white/10 transition-colors">
                    <div className="text-2xl mb-2">{feature.icon}</div>
                    <div className="text-sm font-medium text-white/80">{feature.title}</div>
                    <div className="text-xs text-white/40 mt-1">{feature.desc}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Results Section
          <div className="animate-fadeIn">
            {/* Header with Case ID & Risk Score */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="text-xs text-white/40 uppercase tracking-wider mb-1">분석 완료</div>
                <h2 className="text-2xl font-bold">{result.case_id}</h2>
                <p className="text-white/50 text-sm mt-1 break-all max-w-xl">{result.target_url}</p>
              </div>
              
              <div className={`${getRiskColor(result.risk_score || 0).bg} ${getRiskColor(result.risk_score || 0).border} border rounded-2xl p-4 text-center min-w-[140px]`}>
                <div className={`text-4xl font-black ${getRiskColor(result.risk_score || 0).text}`}>
                  {result.risk_score || 0}
                </div>
                <div className="text-xs text-white/50 mt-1">Risk Score</div>
                <div className={`text-sm font-bold ${getRiskColor(result.risk_score || 0).text} mt-1`}>
                  {result.risk_level || getRiskLabel(result.risk_score || 0)}
                </div>
              </div>
            </div>

            {/* Risk Recommendation */}
            {result.risk_recommendation && (
              <div className={`${getRiskColor(result.risk_score || 0).bg} ${getRiskColor(result.risk_score || 0).border} border rounded-xl p-4 mb-8`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚠️</span>
                  <span className={`font-bold ${getRiskColor(result.risk_score || 0).text}`}>권고 조치</span>
                </div>
                <p className="text-white/80 text-sm">{result.risk_recommendation}</p>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-3xl font-black text-cyan-400">{result.domain_list?.length || 0}</div>
                <div className="text-xs text-white/50 mt-1">발견된 도메인</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-3xl font-black text-emerald-400">{result.detected_cdn || 'N/A'}</div>
                <div className="text-xs text-white/50 mt-1">주요 CDN</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-3xl font-black text-purple-400">{Object.keys(result.cdn_classification || {}).length}</div>
                <div className="text-xs text-white/50 mt-1">CDN 유형</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-3xl font-black text-orange-400">
                  {result.whois_info ? '✓' : '✕'}
                </div>
                <div className="text-xs text-white/50 mt-1">WHOIS 정보</div>
              </div>
            </div>

            {/* 🔥 HAR Analysis Result - 결과에 표시! */}
            {(result.har_analysis || harAnalysis) && (
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-6 mb-8">
                <h3 className="text-sm font-bold text-white/80 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  🔥 HAR 네트워크 분석 (스트리밍 증거)
                </h3>
                
                {(() => {
                  const har = result.har_analysis || harAnalysis;
                  return (
                    <>
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="bg-black/30 rounded-lg p-3">
                          <div className="text-xs text-white/40">총 요청</div>
                          <div className="text-2xl font-bold text-white">{har.total_requests || 0}</div>
                        </div>
                        <div className="bg-black/30 rounded-lg p-3">
                          <div className="text-xs text-white/40">발견 도메인</div>
                          <div className="text-2xl font-bold text-cyan-400">{har.unique_domains?.length || 0}</div>
                        </div>
                        <div className="bg-black/30 rounded-lg p-3">
                          <div className="text-xs text-white/40">스트리밍 세그먼트</div>
                          <div className="text-2xl font-bold text-purple-400">{har.streaming_evidence?.total_segments || 0}</div>
                        </div>
                        <div className="bg-black/30 rounded-lg p-3">
                          <div className="text-xs text-white/40">직접 제공자 여부</div>
                          <div className={`text-2xl font-bold ${har.is_streaming_provider ? 'text-red-400' : 'text-green-400'}`}>
                            {har.is_streaming_provider ? '⚠️ YES' : '✓ NO'}
                          </div>
                        </div>
                      </div>

                      {har.is_streaming_provider && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                          <div className="text-sm font-bold text-red-400 mb-2">
                            ⚠️ 본 사이트는 CDN을 통해 직접 스트리밍을 제공하는 것으로 확인됨
                          </div>
                          <div className="text-xs text-white/60 mb-2">{har.summary}</div>
                          <div className="flex gap-4 text-xs">
                            <span className="text-white/40">신뢰도: <span className={har.confidence === 'HIGH' ? 'text-red-400' : 'text-yellow-400'}>{har.confidence}</span></span>
                            {har.streaming_evidence?.cdn_domain && (
                              <span className="text-white/40">CDN: <span className="text-cyan-400">{har.streaming_evidence.cdn_domain}</span></span>
                            )}
                          </div>
                        </div>
                      )}

                      {har.legal_evidence && (
                        <div className="mt-4 bg-black/30 rounded-xl p-4">
                          <div className="text-xs text-white/40 mb-2">법적 증거 요약</div>
                          <pre className="text-xs text-white/70 whitespace-pre-wrap font-mono">{har.legal_evidence}</pre>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Content Classification */}
            {result.content_classification && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                <h3 className="text-sm font-bold text-white/80 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  콘텐츠 분류
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-black/30 rounded-lg p-3">
                    <div className="text-xs text-white/40 uppercase mb-1">유형</div>
                    <div className="text-sm text-white/80 font-bold">{result.content_classification.category_name || 'Unknown'}</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-3">
                    <div className="text-xs text-white/40 uppercase mb-1">신뢰도</div>
                    <div className="text-sm text-white/80">{result.content_classification.confidence || 'N/A'}</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-3">
                    <div className="text-xs text-white/40 uppercase mb-1">미디어 타입</div>
                    <div className="text-sm text-white/80">{result.content_classification.media_type || 'Unknown'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Domain List */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white/80 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  발견된 도메인
                </h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {result.domain_list?.map((domain, i) => (
                    <div key={i} className="flex items-center gap-3 bg-black/30 rounded-lg px-3 py-2">
                      <span className="text-xs font-mono text-white/30 w-6">{i + 1}</span>
                      <span className="text-sm text-white/70 font-mono break-all">{domain}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CDN Classification */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white/80 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  CDN 분류
                </h3>
                <div className="space-y-3">
                  {Object.entries(result.cdn_classification || {}).map(([cdn, domains]) => (
                    <div key={cdn} className="bg-black/30 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white/90">{cdn}</span>
                        <span className="text-xs bg-white/10 px-2 py-1 rounded-full">{domains.length}개</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {domains.slice(0, 3).map((d, i) => (
                          <span key={i} className="text-xs bg-black/40 text-white/50 px-2 py-1 rounded font-mono">
                            {d.length > 25 ? d.substring(0, 25) + '...' : d}
                          </span>
                        ))}
                        {domains.length > 3 && (
                          <span className="text-xs text-white/30">+{domains.length - 3}개 더</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* WHOIS Info */}
            {result.whois_info && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                <h3 className="text-sm font-bold text-white/80 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  WHOIS 정보
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(result.whois_info).slice(0, 6).map(([key, value]) => (
                    <div key={key} className="bg-black/30 rounded-lg p-3">
                      <div className="text-xs text-white/40 uppercase mb-1">{key}</div>
                      <div className="text-sm text-white/80 break-all">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value || 'N/A')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Takedown Priority */}
            {result.takedown_priority && result.takedown_priority.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                <h3 className="text-sm font-bold text-white/80 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400" />
                  신고 대상 우선순위
                </h3>
                <div className="space-y-3">
                  {result.takedown_priority.map((item, i) => (
                    <div key={i} className="bg-black/30 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-black text-white/30">{item.rank || i + 1}</span>
                        <div>
                          <div className="font-bold text-white/90">{item.target}</div>
                          <div className="text-xs text-white/50">{item.type}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs px-2 py-1 rounded ${
                          item.difficulty === 'LOW' ? 'bg-green-500/20 text-green-400' :
                          item.difficulty === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          난이도: {item.difficulty}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 mb-8">
              <a
                href={`${API_BASE}${result.download_url}`}
                className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold py-4 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-cyan-500/25"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                증거 패키지 다운로드 (ZIP)
              </a>
              <button
                onClick={resetAnalysis}
                className="px-8 py-4 bg-white/5 border border-white/10 text-white/70 font-bold rounded-xl hover:bg-white/10 transition-all"
              >
                새 분석
              </button>
            </div>

            {/* Next Steps */}
            <div className="bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white/80 mb-4">📌 다음 단계</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-black/20 rounded-xl">
                  <div className="text-cyan-400 font-bold mb-1">1. 증거 패키지 다운로드</div>
                  <p className="text-sm text-white/50">ZIP 파일을 다운로드하여 안전하게 보관하세요.</p>
                </div>
                <div className="p-4 bg-black/20 rounded-xl">
                  <div className="text-emerald-400 font-bold mb-1">2. 진술서 작성</div>
                  <p className="text-sm text-white/50">legal_statement.txt에 개인정보를 기입하고 서명하세요.</p>
                </div>
                <div className="p-4 bg-black/20 rounded-xl">
                  <div className="text-purple-400 font-bold mb-1">3. 삭제 요청 발송</div>
                  <p className="text-sm text-white/50">dmca_or_abuse.txt를 CDN/호스팅 업체에 발송하세요.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/30">
          <div>© 2024 AboutUs Digital Undertaker. All rights reserved.</div>
          <div className="flex items-center gap-6">
            <span>IDCTS Core v2.1</span>
            <span>•</span>
            <span>분석 전용 시스템</span>
          </div>
        </div>
      </footer>

      {/* Custom Styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  );
}
